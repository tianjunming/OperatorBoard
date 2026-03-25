"""HTTP transport for MCP protocol."""

import asyncio
import json
import uuid
from typing import Any, Callable, Dict, Optional

try:
    from fastapi import FastAPI, Request, Response
    from fastapi.middleware.cors import CORSMiddleware
    from starlette.websockets import WebSocket, WebSocketDisconnect
    import uvicorn
    HAS_FASTAPI = True
except ImportError:
    HAS_FASTAPI = False

from ..protocol import MCPProtocol, MCPRequest, MCPResponse, MCPNotification


class HTTPTransport:
    """
    HTTP transport layer for MCP protocol.

    Provides HTTP endpoint for JSON-RPC 2.0 request/response handling.
    """

    def __init__(
        self,
        host: str = "0.0.0.0",
        port: int = 8080,
        request_handler: Optional[Callable] = None,
    ):
        """
        Initialize HTTP transport.

        Args:
            host: Server host
            port: Server port
            request_handler: Callback for handling incoming requests
        """
        if not HAS_FASTAPI:
            raise ImportError("FastAPI is required for HTTP transport. Install with: pip install fastapi uvicorn")

        self.host = host
        self.port = port
        self.request_handler = request_handler
        self._app: Optional[FastAPI] = None
        self._server: Optional[uvicorn.Server] = None
        self._websocket_connections: Dict[str, WebSocket] = {}

    def _create_app(self) -> FastAPI:
        """Create FastAPI application."""
        app = FastAPI(title="MCP HTTP Transport")

        app.add_middleware(
            CORSMiddleware,
            allow_origins=["*"],
            allow_methods=["*"],
            allow_headers=["*"],
        )

        @app.post("/mcp")
        async def handle_request(request: Request) -> Response:
            """Handle incoming MCP JSON-RPC request."""
            try:
                body = await request.json()
                message = MCPProtocol.parse_message(body)

                if self.request_handler:
                    result = await self.request_handler(message)
                    if result is None:
                        return Response(status_code=204)
                    return Response(
                        content=json.dumps(result),
                        media_type="application/json",
                    )
                return Response(
                    content=json.dumps(MCPProtocol.create_error_response(
                        str(uuid.uuid4()),
                        -32601,
                        "No handler registered",
                    )),
                    media_type="application/json",
                )
            except ValueError as e:
                return Response(
                    content=json.dumps(MCPProtocol.create_error_response(
                        str(uuid.uuid4()),
                        -32700,
                        f"Parse error: {e}",
                    )),
                    media_type="application/json",
                    status_code=400,
                )
            except Exception as e:
                return Response(
                    content=json.dumps(MCPProtocol.create_error_response(
                        str(uuid.uuid4()),
                        -32603,
                        f"Internal error: {e}",
                    )),
                    media_type="application/json",
                    status_code=500,
                )

        @app.get("/health")
        async def health() -> Dict[str, str]:
            """Health check endpoint."""
            return {"status": "healthy"}

        @app.websocket("/ws/{client_id}")
        async def websocket_endpoint(websocket: WebSocket, client_id: str):
            """WebSocket endpoint for streaming notifications."""
            await websocket.accept()
            self._websocket_connections[client_id] = websocket
            try:
                while True:
                    data = await websocket.receive_text()
                    message = json.loads(data)
                    if self.request_handler:
                        result = await self.request_handler(message)
                        if result:
                            await websocket.send_text(json.dumps(result))
            except WebSocketDisconnect:
                pass
            finally:
                self._websocket_connections.pop(client_id, None)

        return app

    async def start(self) -> None:
        """Start the HTTP server."""
        self._app = self._create_app()
        config = uvicorn.Config(
            self._app,
            host=self.host,
            port=self.port,
            log_level="info",
        )
        self._server = uvicorn.Server(config)
        await self._server.serve()

    async def stop(self) -> None:
        """Stop the HTTP server."""
        if self._server:
            self._server.should_exit = True

    async def broadcast(self, message: Dict[str, Any]) -> None:
        """
        Broadcast notification to all WebSocket connections.

        Args:
            message: Message to broadcast
        """
        for client_id, websocket in list(self._websocket_connections.items()):
            try:
                await websocket.send_text(json.dumps(message))
            except Exception:
                self._websocket_connections.pop(client_id, None)

    @property
    def url(self) -> str:
        """Get server URL."""
        return f"http://{self.host}:{self.port}"


class HTTPTransportClient:
    """
    HTTP client for MCP transport.

    Sends JSON-RPC requests over HTTP POST.
    """

    def __init__(self, base_url: str):
        """
        Initialize HTTP transport client.

        Args:
            base_url: Base URL of the MCP server
        """
        self.base_url = base_url.rstrip("/")
        self._client: Optional[Any] = None

    async def __aenter__(self) -> "HTTPTransportClient":
        """Async context manager entry."""
        import httpx
        self._client = httpx.AsyncClient(timeout=30.0)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def send(self, message: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Send a message and wait for response.

        Args:
            message: JSON-RPC message
        Returns:
            Response message or None for notifications
        """
        if not self._client:
            raise RuntimeError("Client not connected. Use async context manager.")

        response = await self._client.post(
            f"{self.base_url}/mcp",
            json=message,
            headers={"Content-Type": "application/json"},
        )

        if response.status_code == 204:
            return None

        response.raise_for_status()
        return response.json()

    async def send_notification(self, method: str, params: Optional[Dict[str, Any]] = None) -> None:
        """
        Send a notification (no response expected).

        Args:
            method: Method name
            params: Optional parameters
        """
        message = MCPProtocol.create_notification(method, params)
        await self.send(message)
