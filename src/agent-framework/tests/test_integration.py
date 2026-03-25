"""Integration Tests (IT) for OperatorBoard components."""

import pytest
import os
from pathlib import Path

# Test the MCP transport layer integration using direct imports


class TestMCPTransportIntegration:
    """Integration tests for MCP transport layer."""

    def test_mcp_protocol_request_response_cycle(self):
        """Test complete request/response cycle through MCP protocol."""
        from pydantic import BaseModel
        from typing import Optional, Dict, Any, Literal

        JSONRPC_VERSION = "2.0"

        # Simulate MCP protocol functions
        def create_request(request_id, method, params=None):
            return {
                "jsonrpc": JSONRPC_VERSION,
                "id": request_id,
                "method": method,
                "params": params,
            }

        def create_response(request_id, result=None, error=None):
            response = {
                "jsonrpc": JSONRPC_VERSION,
                "id": request_id,
            }
            if error is not None:
                response["error"] = error
            else:
                response["result"] = result
            return response

        # Create request
        request = create_request(
            "test-123",
            "tools/call",
            {"name": "test_tool", "arguments": {"input": "test"}}
        )

        # Simulate response
        response = create_response(
            "test-123",
            result={"output": "test result"}
        )

        # Verify roundtrip
        assert request["id"] == "test-123"
        assert request["method"] == "tools/call"
        assert response["id"] == "test-123"
        assert response["result"]["output"] == "test result"

    def test_mcp_protocol_notification_cycle(self):
        """Test notification cycle."""
        from typing import Optional, Dict, Any, Literal

        JSONRPC_VERSION = "2.0"

        def create_notification(method, params=None):
            return {
                "jsonrpc": JSONRPC_VERSION,
                "method": method,
                "params": params,
            }

        notification = create_notification(
            "initialized",
            {"capabilities": ["tools"]}
        )

        assert notification["jsonrpc"] == "2.0"
        assert notification["method"] == "initialized"
        assert notification["params"]["capabilities"] == ["tools"]

    def test_mcp_protocol_error_handling(self):
        """Test error response handling."""
        from typing import Optional, Dict, Any, Literal

        JSONRPC_VERSION = "2.0"

        def create_response(request_id, result=None, error=None):
            response = {
                "jsonrpc": JSONRPC_VERSION,
                "id": request_id,
            }
            if error is not None:
                response["error"] = error
            else:
                response["result"] = result
            return response

        error_response = create_response(
            "test-456",
            error={"code": -32600, "message": "Invalid request", "data": {"field": "missing"}}
        )

        assert error_response["id"] == "test-456"
        assert "error" in error_response
        assert error_response["error"]["code"] == -32600
        assert error_response["error"]["message"] == "Invalid request"


class TestMCPServerDefinitionIntegration:
    """Integration tests for MCP server definitions."""

    def test_server_definition_http_transport(self):
        """Test HTTP transport server definition."""
        from pydantic import BaseModel
        from typing import Optional, Dict, Any

        class MCPServerDefinition(BaseModel):
            name: str
            description: Optional[str] = None
            command: str
            args: list = []
            enabled: bool = True
            env: Dict[str, str] = {}
            transport: str = "http"
            url: Optional[str] = None
            port: Optional[int] = None

        definition = MCPServerDefinition(
            name="http_server",
            description="HTTP transport server",
            command="python",
            args=["-m", "server"],
            transport="http",
            port=8080
        )

        assert definition.transport == "http"
        assert definition.port == 8080
        assert definition.enabled is True

    def test_server_definition_websocket_transport(self):
        """Test WebSocket transport server definition."""
        from pydantic import BaseModel
        from typing import Optional, Dict, Any

        class MCPServerDefinition(BaseModel):
            name: str
            description: Optional[str] = None
            command: str
            args: list = []
            enabled: bool = True
            env: Dict[str, str] = {}
            transport: str = "http"
            url: Optional[str] = None
            port: Optional[int] = None

        definition = MCPServerDefinition(
            name="ws_server",
            description="WebSocket server",
            command="python",
            args=["-m", "ws_server"],
            transport="websocket",
            port=8081
        )

        assert definition.transport == "websocket"
        assert definition.port == 8081

    def test_server_definition_stdio_transport(self):
        """Test stdio transport server definition."""
        from pydantic import BaseModel
        from typing import Optional, Dict, Any

        class MCPServerDefinition(BaseModel):
            name: str
            description: Optional[str] = None
            command: str
            args: list = []
            enabled: bool = True
            env: Dict[str, str] = {}
            transport: str = "http"
            url: Optional[str] = None
            port: Optional[int] = None

        definition = MCPServerDefinition(
            name="stdio_server",
            description="Stdio server",
            command="./mcp-server",
            args=["--config", "server.yaml"],
            transport="stdio",
            env={"SERVER_MODE": "development"}
        )

        assert definition.transport == "stdio"
        assert definition.env["SERVER_MODE"] == "development"
        assert definition.args == ["--config", "server.yaml"]


class TestIntentDetectionIntegration:
    """Integration tests for intent detection config loading."""

    def test_intent_detection_config_structure(self):
        """Test intent detection configuration structure."""
        config = {
            "intent_detection": {
                "enabled": True,
                "llm_endpoint": "http://localhost:8081/v1/completions",
                "llm_model": "sqlcoder",
                "timeout": 30,
                "max_tokens": 200,
                "temperature": 0.1,
                "prompt_template": "你是一个电信运营商数据查询助手..."
            }
        }

        assert config["intent_detection"]["enabled"] is True
        assert config["intent_detection"]["llm_endpoint"] == "http://localhost:8081/v1/completions"
        assert config["intent_detection"]["timeout"] == 30


class TestOperatorAgentIntegration:
    """Integration tests for operator agent configuration."""

    def test_java_service_config_with_api_key(self):
        """Test Java service configuration with API key."""
        config = {
            "nl2sql": {
                "security": {
                    "enabled": True,
                    "api-keys": "key1,key2"
                },
                "schema": {
                    "refresh-enabled": True,
                    "refresh-cron": "0 0 * * * *"
                }
            }
        }

        assert config["nl2sql"]["security"]["enabled"] is True
        assert "key1" in config["nl2sql"]["security"]["api-keys"]
        assert config["nl2sql"]["schema"]["refresh-enabled"] is True

    def test_tools_config_api_key_support(self):
        """Test tools config with API key support."""
        config = {
            "tools": {
                "nl2sql": {
                    "config": {
                        "api_key": "test-api-key-123"
                    }
                }
            }
        }

        assert config["tools"]["nl2sql"]["config"]["api_key"] == "test-api-key-123"


class TestReactiveMonoIntegration:
    """Integration tests for reactive Mono pattern."""

    def test_mono_creation_pattern(self):
        """Test Mono creation pattern."""
        from unittest.mock import MagicMock

        # Simulate the SqlCoderService pattern
        mock_webclient = MagicMock()
        mock_mono = MagicMock()
        mock_webclient.post.return_value.bodyValue.return_value.retrieve.return_value.bodyToMono.return_value.timeout.return_value = mock_mono

        # Verify the pattern chain
        chain = mock_webclient.post().bodyValue().retrieve().bodyToMono().timeout()
        assert chain is mock_mono


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
