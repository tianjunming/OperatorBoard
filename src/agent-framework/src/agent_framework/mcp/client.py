"""MCP client implementation."""

import asyncio
import json
import uuid
from typing import Any, Callable, Dict, List, Optional

import httpx

from .protocol import MCPProtocol, MCPRequest, MCPResponse, MCPTool
from ..core.exceptions import MCPConnectionError, MCPProtocolError


class MCPClient:
    """
    Async MCP client for communicating with MCP servers.

    Supports JSON-RPC 2.0 protocol over HTTP.
    """

    def __init__(
        self,
        server_url: str,
        timeout: float = 30.0,
        retry_attempts: int = 3,
        retry_delay: float = 1.0,
    ):
        """
        Initialize the MCP client.

        Args:
            server_url: URL of the MCP server
            timeout: Request timeout in seconds
            retry_attempts: Number of retry attempts on failure
            retry_delay: Delay between retries in seconds
        """
        self.server_url = server_url
        self.timeout = timeout
        self.retry_attempts = retry_attempts
        self.retry_delay = retry_delay
        self._client: Optional[httpx.AsyncClient] = None
        self._connected = False
        self._request_handlers: Dict[str, Callable] = {}
        self._session_id: Optional[str] = None

    @property
    def is_connected(self) -> bool:
        """Check if the client is connected."""
        return self._connected

    async def connect(self) -> None:
        """Connect to the MCP server."""
        if self._connected:
            return

        try:
            self._client = httpx.AsyncClient(timeout=self.timeout)
            self._session_id = str(uuid.uuid4())
            self._connected = True
        except Exception as e:
            raise MCPConnectionError(f"Failed to connect to MCP server: {e}") from e

    async def disconnect(self) -> None:
        """Disconnect from the MCP server."""
        if self._client:
            await self._client.aclose()
            self._client = None
        self._connected = False
        self._session_id = None

    async def send_request(
        self, method: str, params: Optional[Dict[str, Any]] = None
    ) -> Any:
        """
        Send a request to the MCP server.

        Args:
            method: Method name
            params: Optional parameters
        Returns:
            Response result
        """
        if not self._connected or not self._client:
            raise MCPConnectionError("Not connected to MCP server")

        request_id = str(uuid.uuid4())
        message = MCPProtocol.create_request(request_id, method, params)

        for attempt in range(self.retry_attempts):
            try:
                response = await self._client.post(
                    self.server_url,
                    json=message,
                    headers={"Content-Type": "application/json"},
                )
                response.raise_for_status()
                data = response.json()

                if "error" in data:
                    raise MCPProtocolError(
                        f"MCP error: {data['error'].get('message', 'Unknown error')}"
                    )

                return data.get("result")
            except httpx.HTTPError as e:
                if attempt == self.retry_attempts - 1:
                    raise MCPConnectionError(f"Request failed after {self.retry_attempts} attempts: {e}") from e
                await asyncio.sleep(self.retry_delay)

    async def send_notification(
        self, method: str, params: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Send a notification to the MCP server (no response expected).

        Args:
            method: Method name
            params: Optional parameters
        """
        if not self._connected or not self._client:
            raise MCPConnectionError("Not connected to MCP server")

        message = MCPProtocol.create_notification(method, params)
        try:
            await self._client.post(
                self.server_url,
                json=message,
                headers={"Content-Type": "application/json"},
            )
        except httpx.HTTPError as e:
            raise MCPConnectionError(f"Notification failed: {e}") from e

    async def initialize(
        self, client_info: Dict[str, str], capabilities: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Initialize the MCP session.

        Args:
            client_info: Client information
            capabilities: Client capabilities
        Returns:
            Server info and capabilities
        """
        return await self.send_request("initialize", {
            "protocolVersion": {"major": 1, "minor": 0},
            "clientInfo": client_info,
            "capabilities": capabilities,
        })

    async def list_tools(self) -> List[MCPTool]:
        """
        List available tools from the server.

        Returns:
            List of available tools
        """
        result = await self.send_request("tools/list")
        return [MCPTool(**tool) for tool in result.get("tools", [])]

    async def call_tool(
        self, tool_name: str, arguments: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Call a tool on the server.

        Args:
            tool_name: Name of the tool to call
            arguments: Tool arguments
        Returns:
            Tool output
        """
        result = await self.send_request("tools/call", {
            "name": tool_name,
            "arguments": arguments or {},
        })
        return result.get("output", "")

    async def ping(self) -> bool:
        """
        Ping the server to check connectivity.

        Returns:
            True if server responds
        """
        try:
            await self.send_notification("ping")
            return True
        except Exception:
            return False

    async def __aenter__(self) -> "MCPClient":
        """Async context manager entry."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.disconnect()
