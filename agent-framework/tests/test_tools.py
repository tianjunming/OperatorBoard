"""Tests for the tools module."""

import pytest
from agent_framework.tools.base import BaseTool
from agent_framework.tools.registry import ToolRegistry
from agent_framework.tools.manager import ToolManager
from agent_framework.core.exceptions import ToolNotFoundError


class DummyTool(BaseTool):
    """Dummy tool for testing."""

    name = "dummy"
    description = "A dummy tool for testing"

    async def run(self, tool_input):
        """Run the dummy tool."""
        return f"Received: {tool_input}"


class TestToolRegistry:
    """Tests for ToolRegistry."""

    def test_singleton_pattern(self):
        """Test that registry is a singleton."""
        registry1 = ToolRegistry()
        registry2 = ToolRegistry()
        assert registry1 is registry2

    def test_register_tool_class(self):
        """Test registering a tool class."""
        registry = ToolRegistry()
        registry.clear()
        registry.register(DummyTool)
        assert "dummy" in registry.list_tools()

    def test_register_instance(self):
        """Test registering a tool instance."""
        registry = ToolRegistry()
        registry.clear()
        tool = DummyTool()
        registry.register_instance(tool)
        assert "dummy" in registry.list_instances()

    def test_get_tool_class(self):
        """Test getting a tool class."""
        registry = ToolRegistry()
        registry.clear()
        registry.register(DummyTool)
        assert registry.get("dummy") == DummyTool

    def test_get_tool_instance(self):
        """Test getting a tool instance."""
        registry = ToolRegistry()
        registry.clear()
        tool = DummyTool()
        registry.register_instance(tool)
        assert registry.get_instance("dummy") == tool

    def test_get_nonexistent_tool(self):
        """Test getting a nonexistent tool raises error."""
        registry = ToolRegistry()
        registry.clear()
        with pytest.raises(ToolNotFoundError):
            registry.get("nonexistent")

    def test_create_instance(self):
        """Test creating a tool instance."""
        registry = ToolRegistry()
        registry.clear()
        registry.register(DummyTool)
        instance = registry.create_instance("dummy")
        assert isinstance(instance, DummyTool)


class TestToolManager:
    """Tests for ToolManager."""

    def test_load_tool(self):
        """Test loading a tool."""
        manager = ToolManager()
        tool = DummyTool()
        manager.load_tool(tool)
        assert "dummy" in manager.list_tools()

    def test_load_disabled_tool(self):
        """Test that disabled tools are not loaded."""
        manager = ToolManager()
        tool = DummyTool()
        tool.enabled = False
        manager.load_tool(tool)
        assert "dummy" not in manager.list_tools()

    @pytest.mark.asyncio
    async def test_invoke_tool(self):
        """Test invoking a tool."""
        manager = ToolManager()
        tool = DummyTool()
        manager.load_tool(tool)

        result = await manager.invoke_tool("dummy", {"input": "test"})
        assert result.success
        assert "Received:" in result.output

    @pytest.mark.asyncio
    async def test_invoke_nonexistent_tool(self):
        """Test invoking a nonexistent tool."""
        manager = ToolManager()
        result = await manager.invoke_tool("nonexistent", {})
        assert not result.success
        assert "not loaded" in result.error

    def test_has_tool(self):
        """Test checking if a tool is loaded."""
        manager = ToolManager()
        tool = DummyTool()
        manager.load_tool(tool)
        assert manager.has_tool("dummy")
        assert not manager.has_tool("nonexistent")
