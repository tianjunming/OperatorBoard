"""MCP server connection management."""

import asyncio
import subprocess
from typing import Any, Dict, List, Optional, Union

from .client import MCPClient
from .protocol import MCPServerDefinition
from ..core.exceptions import MCPConnectionError


class MCPTransportFactory:
    """Factory for creating MCP transport instances."""

    @staticmethod
    def create_transport(
        definition: MCPServerDefinition,
        request_handler: Optional[callable] = None,
    ) -> "MCPServerTransport":
        """
        Create a transport instance based on server definition.

        Args:
            definition: Server definition
            request_handler: Optional request handler callback
        Returns:
            Transport instance
        """
        if definition.transport == "http":
            from .transport.http import HTTPTransport
            return HTTPTransport(
                host="0.0.0.0",
                port=definition.port or 8080,
                request_handler=request_handler,
            )
        elif definition.transport == "websocket":
            from .transport.websocket import WebSocketServer
            server = WebSocketServer(
                host="0.0.0.0",
                port=definition.port or 8080,
                path="/ws",
            )
            if request_handler:
                server.set_request_handler(request_handler)
            return server
        elif definition.transport == "stdio":
            return StdioTransport(
                command=definition.command,
                args=definition.args,
                env=definition.env,
            )
        else:
            raise ValueError(f"Unsupported transport type: {definition.transport}")


class StdioTransport:
    """
    Stdio transport for MCP protocol.

    Communicates with MCP server via stdin/stdout pipes.
    """

    def __init__(
        self,
        command: str,
        args: Optional[List[str]] = None,
        env: Optional[Dict[str, str]] = None,
    ):
        """
        Initialize stdio transport.

        Args:
            command: Server command
            args: Command arguments
            env: Environment variables
        """
        self.command = command
        self.args = args or []
        self.env = env or {}
        self._process: Optional[subprocess.Popen] = None
        self._reader_task: Optional[asyncio.Task] = None
        self._pending_futures: Dict[str, asyncio.Future] = {}

    @property
    def is_connected(self) -> bool:
        """Check if process is running."""
        return self._process is not None and self._process.poll() is None

    async def start(self) -> None:
        """Start the server process."""
        if self.is_connected:
            return

        full_env = {**subprocess.os.environ, **self.env}
        self._process = subprocess.Popen(
            [self.command] + self.args,
            env=full_env,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        self._reader_task = asyncio.create_task(self._read_loop())

    async def stop(self) -> None:
        """Stop the server process."""
        if self._reader_task:
            self._reader_task.cancel()
            try:
                await self._reader_task
            except asyncio.CancelledError:
                pass
            self._reader_task = None

        if self._process:
            self._process.terminate()
            try:
                self._process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._process.kill()
                self._process.wait()
            self._process = None

    async def send(self, message: Dict[str, Any]) -> None:
        """Send message to server via stdin."""
        if not self.is_connected:
            raise MCPConnectionError("Process not running")
        import json
        self._process.stdin.write(json.dumps(message).encode() + b"\n")
        self._process.stdin.flush()

    async def _read_loop(self) -> None:
        """Read messages from stdout."""
        import json
        try:
            for line in self._process.stdout:
                if asyncio.current_task().cancelled():
                    break
                try:
                    data = json.loads(line.decode().strip())
                    msg_id = data.get("id")
                    if msg_id and msg_id in self._pending_futures:
                        future = self._pending_futures.pop(msg_id)
                        if "error" in data:
                            future.set_exception(Exception(data["error"].get("message", "Unknown")))
                        else:
                            future.set_result(data)
                except json.JSONDecodeError:
                    pass
        except asyncio.CancelledError:
            raise
        except Exception:
            pass


class MCPServerTransport:
    """
    Base class for MCP server transports.
    """

    async def start(self) -> None:
        """Start the transport."""
        raise NotImplementedError

    async def stop(self) -> None:
        """Stop the transport."""
        raise NotImplementedError

    @property
    def is_connected(self) -> bool:
        """Check if connected."""
        return True


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
        self._transport: Optional[MCPServerTransport] = None
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

        if self.definition.transport == "stdio":
            await self._start_stdio()
        else:
            await self._start_http()

    async def _start_stdio(self) -> None:
        """Start server using stdio transport."""
        try:
            self._transport = StdioTransport(
                command=self.definition.command,
                args=self.definition.args,
                env=self.definition.env,
            )
            await self._transport.start()
            self._connected = True
        except FileNotFoundError:
            raise MCPConnectionError(f"Command not found: {self.definition.command}")
        except Exception as e:
            await self.cleanup()
            raise MCPConnectionError(f"Failed to start server '{self.name}': {e}") from e

    async def _start_http(self) -> None:
        """Start server using HTTP transport."""
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
        if self._transport:
            await self._transport.stop()
            self._transport = None
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
        return self.definition.port or 8080

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
