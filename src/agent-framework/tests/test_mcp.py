"""Tests for the MCP module."""

import pytest
from agent_framework.mcp.protocol import MCPProtocol, MCPTool
from agent_framework.mcp.client import MCPClient
from agent_framework.mcp.server import MCPServerConnection, MCPServerManager
from agent_framework.core.types import MCPServerDefinition
from agent_framework.core.exceptions import MCPConnectionError


class TestMCPProtocol:
    """Tests for MCP protocol."""

    def test_create_request(self):
        """Test creating a request."""
        request = MCPProtocol.create_request(
            "test-id",
            "test_method",
            {"param": "value"},
        )
        assert request["jsonrpc"] == "2.0"
        assert request["id"] == "test-id"
        assert request["method"] == "test_method"
        assert request["params"] == {"param": "value"}

    def test_create_request_without_params(self):
        """Test creating a request without params."""
        request = MCPProtocol.create_request("test-id", "test_method")
        assert request["params"] is None

    def test_create_response(self):
        """Test creating a response."""
        response = MCPProtocol.create_response("test-id", {"result": "value"})
        assert response["jsonrpc"] == "2.0"
        assert response["id"] == "test-id"
        assert response["result"] == {"result": "value"}

    def test_create_error_response(self):
        """Test creating an error response."""
        response = MCPProtocol.create_response(
            "test-id",
            error={"code": -32600, "message": "Invalid request"},
        )
        assert "error" in response
        assert response["error"]["code"] == -32600

    def test_create_notification(self):
        """Test creating a notification."""
        notification = MCPProtocol.create_notification(
            "ping",
            {"timestamp": 123},
        )
        assert notification["jsonrpc"] == "2.0"
        assert notification["method"] == "ping"
        assert notification["params"] == {"timestamp": 123}


class TestMCPTool:
    """Tests for MCP tool model."""

    def test_tool_definition(self):
        """Test creating a tool definition."""
        tool = MCPTool(
            name="test_tool",
            description="A test tool",
            input_schema={"type": "object"},
        )
        assert tool.name == "test_tool"
        assert tool.description == "A test tool"
        assert tool.input_schema == {"type": "object"}


class TestMCPServerConnection:
    """Tests for MCP server connection."""

    def test_server_connection_creation(self):
        """Test creating a server connection."""
        definition = MCPServerDefinition(
            name="test_server",
            description="Test server",
            command="echo",
            args=["test"],
        )
        connection = MCPServerConnection(definition)
        assert connection.name == "test_server"
        assert not connection.is_connected

    def test_disabled_server_raises_error(self):
        """Test that disabled server raises error on start."""
        definition = MCPServerDefinition(
            name="disabled_server",
            description="Disabled server",
            command="echo",
            enabled=False,
        )
        connection = MCPServerConnection(definition)

        import asyncio
        with pytest.raises(MCPConnectionError):
            asyncio.get_event_loop().run_until_complete(connection.start())


class TestMCPServerManager:
    """Tests for MCP server manager."""

    def test_add_server(self):
        """Test adding a server to the manager."""
        manager = MCPServerManager()
        definition = MCPServerDefinition(
            name="test_server",
            description="Test server",
            command="echo",
        )
        connection = manager.add_server(definition)
        assert connection.name == "test_server"

    def test_get_server(self):
        """Test getting a server from the manager."""
        manager = MCPServerManager()
        definition = MCPServerDefinition(
            name="test_server",
            description="Test server",
            command="echo",
        )
        manager.add_server(definition)
        server = manager.get_server("test_server")
        assert server is not None
        assert server.name == "test_server"

    def test_get_nonexistent_server(self):
        """Test getting a nonexistent server."""
        manager = MCPServerManager()
        server = manager.get_server("nonexistent")
        assert server is None

    def test_list_servers(self):
        """Test listing servers."""
        manager = MCPServerManager()
        definition1 = MCPServerDefinition(
            name="server1",
            description="Server 1",
            command="echo",
        )
        definition2 = MCPServerDefinition(
            name="server2",
            description="Server 2",
            command="echo",
        )
        manager.add_server(definition1)
        manager.add_server(definition2)
        assert len(manager.list_servers()) == 2
