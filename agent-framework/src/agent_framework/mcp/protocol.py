"""MCP protocol implementation."""

from typing import Any, Dict, List, Optional, Literal
from pydantic import BaseModel, Field
from enum import Enum


class MCPMessageType(str, Enum):
    """MCP message types."""

    REQUEST = "request"
    RESPONSE = "response"
    NOTIFICATION = "notification"
    ERROR = "error"


class MCPProtocolVersion(BaseModel):
    """MCP protocol version."""

    major: int = Field(default=1)
    minor: int = Field(default=0)


class MCPRequest(BaseModel):
    """MCP request message."""

    jsonrpc: Literal["2.0"] = "2.0"
    id: str
    method: str
    params: Optional[Dict[str, Any]] = None


class MCPResponse(BaseModel):
    """MCP response message."""

    jsonrpc: Literal["2.0"] = "2.0"
    id: str
    result: Optional[Any] = None
    error: Optional[Dict[str, Any]] = None


class MCPNotification(BaseModel):
    """MCP notification message."""

    jsonrpc: Literal["2.0"] = "2.0"
    method: str
    params: Optional[Dict[str, Any]] = None


class MCPError(BaseModel):
    """MCP error object."""

    code: int
    message: str
    data: Optional[Any] = None


class MCPInitializeParams(BaseModel):
    """Parameters for MCP initialize request."""

    protocol_version: MCPProtocolVersion
    capabilities: Dict[str, Any]
    client_info: Dict[str, str]


class MCPInitializeResult(BaseModel):
    """Result of MCP initialize request."""

    protocol_version: MCPProtocolVersion
    capabilities: Dict[str, Any]
    server_info: Dict[str, str]


class MCPTool(BaseModel):
    """MCP tool definition."""

    name: str
    description: str
    input_schema: Dict[str, Any]


class MCPToolCallParams(BaseModel):
    """Parameters for MCP tool call."""

    name: str
    arguments: Optional[Dict[str, Any]] = None


class MCPToolCallResult(BaseModel):
    """Result of MCP tool call."""

    tool: str
    success: bool
    output: Optional[str] = None
    error: Optional[str] = None


class MCPProtocol:
    """
    MCP protocol handler.

    Handles serialization and deserialization of MCP messages.
    """

    JSONRPC_VERSION = "2.0"

    @classmethod
    def create_request(
        cls, request_id: str, method: str, params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create an MCP request.

        Args:
            request_id: Unique request ID
            method: Method name
            params: Optional parameters
        Returns:
            Request dict
        """
        return {
            "jsonrpc": cls.JSONRPC_VERSION,
            "id": request_id,
            "method": method,
            "params": params,
        }

    @classmethod
    def create_response(
        cls, request_id: str, result: Optional[Any] = None, error: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create an MCP response.

        Args:
            request_id: Request ID to respond to
            result: Result data
            error: Error data
        Returns:
            Response dict
        """
        response = {
            "jsonrpc": cls.JSONRPC_VERSION,
            "id": request_id,
        }
        if error is not None:
            response["error"] = error
        else:
            response["result"] = result
        return response

    @classmethod
    def create_notification(
        cls, method: str, params: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create an MCP notification.

        Args:
            method: Method name
            params: Optional parameters
        Returns:
            Notification dict
        """
        return {
            "jsonrpc": cls.JSONRPC_VERSION,
            "method": method,
            "params": params,
        }

    @classmethod
    def parse_message(cls, message: Dict[str, Any]) -> Dict[str, Any]:
        """
        Parse and validate an MCP message.

        Args:
            message: Raw message dict
        Returns:
            Parsed message
        """
        if message.get("jsonrpc") != cls.JSONRPC_VERSION:
            raise ValueError("Invalid JSONRPC version")
        return message

    @classmethod
    def create_error_response(
        cls, request_id: str, code: int, message: str, data: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Create an error response.

        Args:
            request_id: Request ID
            code: Error code
            message: Error message
            data: Optional error data
        Returns:
            Error response dict
        """
        return cls.create_response(
            request_id,
            error={"code": code, "message": message, "data": data},
        )
