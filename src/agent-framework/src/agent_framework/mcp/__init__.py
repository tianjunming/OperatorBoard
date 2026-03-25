"""MCP module for Model Context Protocol support."""

from .protocol import (
    MCPProtocol,
    MCPProtocolVersion,
    MCPRequest,
    MCPResponse,
    MCPNotification,
    MCPTool,
    MCPToolCallParams,
    MCPToolCallResult,
    MCPServerDefinition,
)
from .client import MCPClient
from .server import (
    MCPServerConnection,
    MCPServerManager,
    MCPServerTransport,
    MCPTransportFactory,
    StdioTransport,
)
from .transport import (
    HTTPTransport,
    HTTPTransportClient,
    WebSocketTransport,
    WebSocketServer,
)

__all__ = [
    # Protocol
    "MCPProtocol",
    "MCPProtocolVersion",
    "MCPRequest",
    "MCPResponse",
    "MCPNotification",
    "MCPTool",
    "MCPToolCallParams",
    "MCPToolCallResult",
    "MCPServerDefinition",
    # Client
    "MCPClient",
    # Server
    "MCPServerConnection",
    "MCPServerManager",
    "MCPServerTransport",
    "MCPTransportFactory",
    "StdioTransport",
    # Transport
    "HTTPTransport",
    "HTTPTransportClient",
    "WebSocketTransport",
    "WebSocketServer",
]
