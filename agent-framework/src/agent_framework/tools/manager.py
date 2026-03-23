"""Tool manager for loading and invoking tools."""

from typing import Any, Dict, List, Optional

from .base import BaseTool
from .registry import ToolRegistry
from ..core.exceptions import ToolExecutionError, ToolNotFoundError
from ..core.types import ToolResult


class ToolManager:
    """
    Manager for tool loading, invocation, and lifecycle management.
    """

    def __init__(self, registry: Optional[ToolRegistry] = None):
        """
        Initialize the tool manager.

        Args:
            registry: Optional tool registry to use
        """
        self._registry = registry or ToolRegistry()
        self._active_tools: Dict[str, BaseTool] = {}

    @property
    def registry(self) -> ToolRegistry:
        """Get the tool registry."""
        return self._registry

    @property
    def active_tools(self) -> Dict[str, BaseTool]:
        """Get all active (loaded) tools."""
        return self._active_tools.copy()

    def load_tool(self, tool: BaseTool) -> None:
        """
        Load a tool into the manager.

        Args:
            tool: Tool instance to load
        """
        if not tool.enabled:
            return
        self._active_tools[tool.name] = tool

    def load_tool_by_name(self, name: str, **kwargs) -> BaseTool:
        """
        Load a tool by name from the registry.

        Args:
            name: Tool name
            **kwargs: Arguments to pass to the tool constructor
        Returns:
            Loaded tool instance
        """
        tool = self._registry.create_instance(name, **kwargs)
        self.load_tool(tool)
        return tool

    def unload_tool(self, name: str) -> None:
        """
        Unload a tool from the manager.

        Args:
            name: Tool name
        """
        if name in self._active_tools:
            del self._active_tools[name]

    async def invoke_tool(self, tool_name: str, tool_input: Dict[str, Any]) -> ToolResult:
        """
        Invoke a tool by name.

        Args:
            tool_name: Name of the tool to invoke
            tool_input: Input to pass to the tool
        Returns:
            ToolResult with execution details
        """
        if tool_name not in self._active_tools:
            return ToolResult(
                tool_name=tool_name,
                success=False,
                output=None,
                error=f"Tool '{tool_name}' is not loaded",
            )

        tool = self._active_tools[tool_name]
        try:
            output = await tool.ainvoke(tool_input)
            return ToolResult(tool_name=tool_name, success=True, output=output)
        except Exception as e:
            return ToolResult(
                tool_name=tool_name,
                success=False,
                output=None,
                error=str(e),
            )

    async def invoke_tools(
        self, tool_calls: List[Dict[str, Any]]
    ) -> List[ToolResult]:
        """
        Invoke multiple tools.

        Args:
            tool_calls: List of tool calls with 'name' and 'input' keys
        Returns:
            List of ToolResults
        """
        results = []
        for call in tool_calls:
            tool_name = call.get("name")
            tool_input = call.get("input", {})
            if tool_name:
                result = await self.invoke_tool(tool_name, tool_input)
                results.append(result)
        return results

    def get_tool(self, name: str) -> Optional[BaseTool]:
        """
        Get an active tool by name.

        Args:
            name: Tool name
        Returns:
            Tool if found and loaded, None otherwise
        """
        return self._active_tools.get(name)

    def list_tools(self) -> List[str]:
        """List all active tool names."""
        return list(self._active_tools.keys())

    def has_tool(self, name: str) -> bool:
        """Check if a tool is loaded."""
        return name in self._active_tools
