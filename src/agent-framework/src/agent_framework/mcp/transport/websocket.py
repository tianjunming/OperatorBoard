"""WebSocket transport for MCP protocol."""

import asyncio
import json
import uuid
from typing import Any, Callable, Dict, List, Optional

try:
    import websockets
    from websockets.client import WebSocketClientProtocol
    HAS_WEBSOCKETS = True
except ImportError:
    HAS_WEBSOCKETS = False

from ..protocol import MCPProtocol


class WebSocketTransport:
    """
    WebSocket transport layer for MCP protocol.

    Provides bidirectional streaming communication for notifications
    and streaming responses.
    """

    def __init__(
        self,
        uri: str,
        ping_interval: float = 30.0,
        ping_timeout: float = 10.0,
    ):
        """
        Initialize WebSocket transport.

        Args:
            uri: WebSocket server URI (e.g., "ws://localhost:8080/ws/client1")
            ping_interval: Interval for ping/pong in seconds
            ping_timeout: Timeout for ping response in seconds
        """
        if not HAS_WEBSOCKETS:
            raise ImportError("websockets is required for WebSocket transport. Install with: pip install websockets")

        self.uri = uri
        self.ping_interval = ping_interval
        self.ping_timeout = ping_timeout
        self._socket: Optional[WebSocketClientProtocol] = None
        self._reader_task: Optional[asyncio.Task] = None
        self._handlers: Dict[str, Callable] = {}
        self._response_futures: Dict[str, asyncio.Future] = {}

    @property
    def is_connected(self) -> bool:
        """Check if WebSocket is connected."""
        return self._socket is not None and self._socket.open

    async def connect(self) -> None:
        """Connect to WebSocket server."""
        if self.is_connected:
            return

        self._socket = await websockets.connect(
            self.uri,
            ping_interval=self.ping_interval,
            ping_timeout=self.ping_timeout,
        )
        self._reader_task = asyncio.create_task(self._reader_loop())

    async def disconnect(self) -> None:
        """Disconnect from WebSocket server."""
        if self._reader_task:
            self._reader_task.cancel()
            try:
                await self._reader_task
            except asyncio.CancelledError:
                pass
            self._reader_task = None

        if self._socket:
            await self._socket.close()
            self._socket = None

        # Cancel pending futures
        for future in self._response_futures.values():
            if not future.done():
                future.cancel()
        self._response_futures.clear()

    async def _reader_loop(self) -> None:
        """Background task to read messages from WebSocket."""
        try:
            async for message in self._socket:
                await self._handle_message(message)
        except asyncio.CancelledError:
            raise
        except Exception:
            pass

    async def _handle_message(self, message: str) -> None:
        """Handle incoming WebSocket message."""
        try:
            data = json.loads(message)
            parsed = MCPProtocol.parse_message(data)

            # Check if this is a response to a pending request
            msg_id = parsed.get("id")
            if msg_id and msg_id in self._response_futures:
                future = self._response_futures.pop(msg_id)
                if "error" in parsed:
                    future.set_exception(Exception(parsed["error"].get("message", "Unknown error")))
                else:
                    future.set_result(parsed)
                return

            # Handle as notification/ping
            method = parsed.get("method", "")
            if method in self._handlers:
                handler = self._handlers[method]
                result = handler(parsed)
                if asyncio.iscoroutine(result):
                    await result

        except json.JSONDecodeError:
            pass
        except Exception:
            pass

    def register_handler(self, method: str, handler: Callable) -> None:
        """
        Register a handler for a method.

        Args:
            method: Method name to handle
            handler: Async callback function
        """
        self._handlers[method] = handler

    async def send_request(
        self,
        method: str,
        params: Optional[Dict[str, Any]] = None,
        timeout: float = 30.0,
    ) -> Any:
        """
        Send a request and wait for response.

        Args:
            method: Method name
            params: Optional parameters
            timeout: Response timeout in seconds
        Returns:
            Response result
        """
        if not self.is_connected:
            raise RuntimeError("Not connected to WebSocket server")

        request_id = str(uuid.uuid4())
        message = MCPProtocol.create_request(request_id, method, params)

        future = asyncio.get_event_loop().create_future()
        self._response_futures[request_id] = future

        await self._socket.send(json.dumps(message))

        try:
            return await asyncio.wait_for(future, timeout=timeout)
        except asyncio.TimeoutError:
            self._response_futures.pop(request_id, None)
            raise TimeoutError(f"Request {method} timed out after {timeout}s")

    async def send_notification(
        self,
        method: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Send a notification (no response expected).

        Args:
            method: Method name
            params: Optional parameters
        """
        if not self.is_connected:
            raise RuntimeError("Not connected to WebSocket server")

        message = MCPProtocol.create_notification(method, params)
        await self._socket.send(json.dumps(message))

    async def send_raw(self, data: Dict[str, Any]) -> None:
        """
        Send raw JSON data.

        Args:
            data: Data to send
        """
        if not self.is_connected:
            raise RuntimeError("Not connected to WebSocket server")

        await self._socket.send(json.dumps(data))

    async def __aenter__(self) -> "WebSocketTransport":
        """Async context manager entry."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.disconnect()


class WebSocketServer:
    """
    WebSocket server for MCP protocol.

    Manages multiple client connections and handles routing.
    """

    def __init__(
        self,
        host: str = "0.0.0.0",
        port: int = 8080,
        path: str = "/ws",
    ):
        """
        Initialize WebSocket server.

        Args:
            host: Server host
            port: Server port
            path: WebSocket endpoint path
        """
        if not HAS_WEBSOCKETS:
            raise ImportError("websockets is required for WebSocket server. Install with: pip install websockets")

        self.host = host
        self.port = port
        self.path = path
        self._server = None
        self._clients: Dict[str, WebSocketClientProtocol] = {}
        self._request_handler: Optional[Callable] = None

    def set_request_handler(self, handler: Callable) -> None:
        """
        Set the request handler callback.

        Args:
            handler: Async function to handle incoming messages
        """
        self._request_handler = handler

    async def _handle_client(
        self,
        websocket: WebSocketClientProtocol,
        client_id: str,
    ) -> None:
        """Handle a single client connection."""
        self._clients[client_id] = websocket
        try:
            async for message in websocket:
                if self._request_handler:
                    response = await self._request_handler(json.loads(message))
                    if response:
                        await websocket.send(json.dumps(response))
        except asyncio.CancelledError:
            raise
        except Exception:
            pass
        finally:
            self._clients.pop(client_id, None)

    async def start(self) -> None:
        """Start the WebSocket server."""
        self._server = await websockets.serve(
            self._handle_client,
            self.host,
            self.port,
            path=self.path,
        )

    async def stop(self) -> None:
        """Stop the WebSocket server."""
        if self._server:
            self._server.close()
            await self._server.wait_closed()
            self._server = None
        self._clients.clear()

    async def broadcast(self, message: Dict[str, Any]) -> None:
        """
        Broadcast message to all connected clients.

        Args:
            message: Message to broadcast
        """
        dead_clients = []
        for client_id, client in self._clients.items():
            try:
                await client.send(json.dumps(message))
            except Exception:
                dead_clients.append(client_id)

        for client_id in dead_clients:
            self._clients.pop(client_id, None)

    @property
    def client_count(self) -> int:
        """Get number of connected clients."""
        return len(self._clients)

    @property
    def uri(self) -> str:
        """Get server URI."""
        return f"ws://{self.host}:{self.port}{self.path}"
