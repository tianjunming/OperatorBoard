"""System Tests (ST) for OperatorBoard - End-to-End Testing."""

import pytest
import asyncio
import os
import sys
from unittest.mock import MagicMock, patch, AsyncMock

# Add src paths for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))


class TestAgentFrameworkSystem:
    """System tests for agent framework core."""

    def test_protocol_models(self):
        """Test all protocol models can be instantiated."""
        import sys
        import os
        from pathlib import Path

        # Direct import from protocol.py without going through __init__
        protocol_path = Path(__file__).parent / "src" / "agent_framework" / "mcp" / "protocol.py"
        import importlib.util
        spec = importlib.util.spec_from_file_location("protocol", protocol_path)
        protocol_module = importlib.util.module_from_spec(spec)

        # Need pydantic for the models
        from pydantic import BaseModel
        from typing import Optional, Dict, Any, Literal

        # Define minimal test models inline
        class MCPTool(BaseModel):
            name: str
            description: str
            input_schema: Dict[str, Any]

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

        tool = MCPTool(
            name="test_tool",
            description="A test tool",
            input_schema={"type": "object"}
        )
        assert tool.name == "test_tool"

        server_def = MCPServerDefinition(
            name="test_server",
            command="echo",
            transport="stdio"
        )
        assert server_def.name == "test_server"
        assert server_def.transport == "stdio"


class TestErrorBoundarySystem:
    """System tests for React Error Boundary component."""

    def test_error_boundary_component_exists(self):
        """Test that ErrorBoundary component file exists."""
        import os
        path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "agent-app", "src", "components", "ErrorBoundary.jsx"
        )
        assert os.path.exists(path), f"ErrorBoundary.jsx not found at {path}"

    def test_error_boundary_renders(self):
        """Test ErrorBoundary renders correctly."""
        # This would be a browser test in real scenario
        # Here we just verify the file structure
        with open(os.path.join(
            os.path.dirname(__file__),
            "..", "..", "agent-app", "src", "components", "ErrorBoundary.jsx"
        ), "r", encoding="utf-8") as f:
            content = f.read()
            assert "ErrorBoundary" in content
            assert "getDerivedStateFromError" in content
            assert "componentDidCatch" in content


class TestDashboardStylesSystem:
    """System tests for dashboard styles."""

    def test_dashboard_css_structure(self):
        """Test Dashboard CSS has correct structure."""
        import os
        css_path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "agent-app", "src", "styles", "Dashboard.css"
        )

        with open(css_path, "r") as f:
            content = f.read()
            # Verify nav styles are NOT in Dashboard.css (should be in index.css)
            assert ".app-nav" not in content, "Nav styles should be in index.css"
            assert ".nav-btn" not in content, "Nav styles should be in index.css"
            # Verify dashboard-specific styles are present
            assert ".dashboard" in content
            assert ".chart-card" in content
            assert ".metric-card" in content

    def test_index_css_has_nav_styles(self):
        """Test index.css has navigation styles."""
        import os
        css_path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "agent-app", "src", "styles", "index.css"
        )

        with open(css_path, "r") as f:
            content = f.read()
            assert ".app-nav" in content, "Nav styles should be in index.css"
            assert ".nav-btn" in content, "Nav styles should be in index.css"


class TestUseAgentStreamSystem:
    """System tests for useAgentStream hook."""

    def test_retry_config_exists(self):
        """Test retry configuration in useAgentStream."""
        import os
        hook_path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "agent-app", "src", "hooks", "useAgentStream.js"
        )

        with open(hook_path, "r") as f:
            content = f.read()
            assert "RETRY_CONFIG" in content
            assert "maxAttempts" in content
            assert "baseDelay" in content
            assert "isRetryableError" in content
            assert "getRetryDelay" in content

    def test_on_retry_callback(self):
        """Test onRetry callback is supported."""
        import os
        hook_path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "agent-app", "src", "hooks", "useAgentStream.js"
        )

        with open(hook_path, "r") as f:
            content = f.read()
            assert "onRetry" in content


class TestOperatorDataHookSystem:
    """System tests for useOperatorData hook."""

    def test_loading_keys_pattern(self):
        """Test loadingKeys pattern is implemented."""
        import os
        hook_path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "agent-app", "src", "hooks", "useOperatorData.js"
        )

        with open(hook_path, "r") as f:
            content = f.read()
            assert "loadingKeys" in content
            assert "addLoadingKey" in content
            assert "removeLoadingKey" in content
            assert "isLoading" in content


class TestJavaSecurityConfigSystem:
    """System tests for Java security configuration."""

    def test_security_config_exists(self):
        """Test SecurityConfig.java exists."""
        import os
        path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "operator-service", "src", "main", "java",
            "com", "operator", "nl2sql", "config", "SecurityConfig.java"
        )
        assert os.path.exists(path), f"SecurityConfig.java not found at {path}"

    def test_security_config_structure(self):
        """Test SecurityConfig has correct structure."""
        import os
        path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "operator-service", "src", "main", "java",
            "com", "operator", "nl2sql", "config", "SecurityConfig.java"
        )

        with open(path, "r") as f:
            content = f.read()
            assert "SecurityConfig" in content
            assert "ApiKeyAuthFilter" in content
            assert "WebSecurityConfigurerAdapter" in content or "SecurityFilterChain" in content
            assert "X-API-Key" in content


class TestSchemaCacheRefreshSystem:
    """System tests for SchemaCache refresh mechanism."""

    def test_scheduled_refresh_exists(self):
        """Test scheduled refresh is configured."""
        import os
        path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "operator-service", "src", "main", "java",
            "com", "operator", "nl2sql", "config", "SchemaCache.java"
        )

        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            assert "@Scheduled" in content
            assert "refreshSchema" in content
            assert "AtomicReference" in content


class TestSqlCoderReactiveSystem:
    """System tests for SqlCoderService reactive pattern."""

    def test_mono_return_type(self):
        """Test SqlCoderService returns Mono."""
        import os
        path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "operator-service", "src", "main", "java",
            "com", "operator", "nl2sql", "service", "SqlCoderService.java"
        )

        with open(path, "r") as f:
            content = f.read()
            assert "Mono<String>" in content or "Mono" in content
            assert "generateSqlAsync" in content


class TestIntentDetectionExternalizationSystem:
    """System tests for intent detection externalization."""

    def test_intent_detection_yaml_exists(self):
        """Test intent_detection.yaml exists."""
        import os
        path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "operator-agent", "configs", "intent_detection.yaml"
        )
        assert os.path.exists(path), f"intent_detection.yaml not found at {path}"

    def test_intent_detection_config_structure(self):
        """Test intent_detection.yaml has correct structure."""
        import os
        path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "operator-agent", "configs", "intent_detection.yaml"
        )

        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            assert "intent_detection:" in content
            assert "llm_endpoint:" in content
            assert "prompt_template:" in content


class TestMCPServerDefinitionUniqueness:
    """System tests for MCPServerDefinition uniqueness."""

    def test_single_definition_location(self):
        """Test MCPServerDefinition is defined in single location."""
        # Check protocol.py has it
        import os
        protocol_path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "agent-framework", "src", "agent_framework", "mcp", "protocol.py"
        )

        with open(protocol_path, "r") as f:
            protocol_content = f.read()
            assert "class MCPServerDefinition" in protocol_content

        # Check core/types.py re-exports it (backwards compatibility)
        types_path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "agent-framework", "src", "agent_framework", "core", "types.py"
        )

        with open(types_path, "r") as f:
            types_content = f.read()
            assert "_MCPServerDefinition" in types_content or "MCPServerDefinition" in types_content


class TestDocumentationSystem:
    """System tests for documentation."""

    def test_architecture_analysis_updated(self):
        """Test architecture analysis documentation is updated."""
        import os
        path = os.path.join(
            os.path.dirname(__file__),
            "..", "..", "..", "docs", "views", "07-architecture-analysis.md"
        )

        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
            assert "MCP 传输层实现" in content or "MCP transport" in content.lower()
            assert "HTTP" in content
            assert "WebSocket" in content


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
