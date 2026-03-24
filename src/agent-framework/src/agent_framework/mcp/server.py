"""MCP server connection management."""

import asyncio
import subprocess
from typing import Any, Dict, List, Optional

from .client import MCPClient
from .protocol import MCPServerDefinition
from ..core.exceptions import MCPConnectionError


class MCPServerConnection:
    """
    Manages the lifecycle of an MCP server connection.

    Handles process spawning, connection, and cleanup.
    """

    def __init__(self, definition: MCPServerDefinition):
        """
        Initialize the server connection.

        Args:
            definition: Server definition with connection details
        """
        self.definition = definition
        self._client: Optional[MCPClient] = None
        self._process: Optional[subprocess.Popen] = None
        self._connected = False

    @property
    def name(self) -> str:
        """Get the server name."""
        return self.definition.name

    @property
    def is_connected(self) -> bool:
        """Check if connected to the server."""
        return self._connected and self._client is not None

    @property
    def client(self) -> Optional[MCPClient]:
        """Get the MCP client."""
        return self._client

    async def start(self) -> None:
        """Start the MCP server and establish connection."""
        if self._connected:
            return

        if not self.definition.enabled:
            raise MCPConnectionError(f"Server '{self.name}' is disabled")

        try:
            self._process = subprocess.Popen(
                [self.definition.command] + self.definition.args,
                env={**subprocess.os.environ, **self.definition.env},
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
            await asyncio.sleep(2)

            if self._process.poll() is not None:
                raise MCPConnectionError(f"Server process exited with code {self._process.returncode}")

            self._client = MCPClient(f"http://localhost:{self._get_port()}")
            await self._client.connect()
            self._connected = True

        except FileNotFoundError:
            raise MCPConnectionError(f"Command not found: {self.definition.command}")
        except Exception as e:
            await self.cleanup()
            raise MCPConnectionError(f"Failed to start server '{self.name}': {e}") from e

    async def stop(self) -> None:
        """Stop the MCP server and disconnect."""
        await self.cleanup()

    async def cleanup(self) -> None:
        """Clean up all resources."""
        if self._client:
            await self._client.disconnect()
            self._client = None
        self._connected = False

        if self._process:
            self._process.terminate()
            try:
                self._process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._process.kill()
                self._process.wait()
            self._process = None

    def _get_port(self) -> int:
        """Get the port from server definition or default."""
        return 8080

    async def __aenter__(self) -> "MCPServerConnection":
        """Async context manager entry."""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.cleanup()


class MCPServerManager:
    """
    Manages multiple MCP server connections.

    Provides centralized access to all MCP servers.
    """

    def __init__(self):
        """Initialize the server manager."""
        self._connections: Dict[str, MCPServerConnection] = {}

    @property
    def connections(self) -> Dict[str, MCPServerConnection]:
        """Get all server connections."""
        return self._connections.copy()

    def add_server(self, definition: MCPServerDefinition) -> MCPServerConnection:
        """
        Add a server connection.

        Args:
            definition: Server definition
        Returns:
            Server connection
        """
        connection = MCPServerConnection(definition)
        self._connections[definition.name] = connection
        return connection

    async def start_server(self, name: str) -> None:
        """
        Start a server by name.

        Args:
            name: Server name
        """
        if name not in self._connections:
            raise MCPConnectionError(f"Server '{name}' not found")
        await self._connections[name].start()

    async def stop_server(self, name: str) -> None:
        """
        Stop a server by name.

        Args:
            name: Server name
        """
        if name not in self._connections:
            raise MCPConnectionError(f"Server '{name}' not found")
        await self._connections[name].stop()

    async def start_all(self) -> None:
        """Start all enabled servers."""
        for connection in self._connections.values():
            if connection.definition.enabled:
                try:
                    await connection.start()
                except MCPConnectionError:
                    pass

    async def stop_all(self) -> None:
        """Stop all servers."""
        for connection in self._connections.values():
            try:
                await connection.cleanup()
            except Exception:
                pass
        self._connections.clear()

    def get_server(self, name: str) -> Optional[MCPServerConnection]:
        """
        Get a server connection by name.

        Args:
            name: Server name
        Returns:
            Server connection if found
        """
        return self._connections.get(name)

    def list_servers(self) -> List[str]:
        """List all server names."""
        return list(self._connections.keys())
