"""Base tool class for the framework."""

from typing import Any, Dict, Optional
from langchain_core.tools import BaseTool as LangChainBaseTool

from ..core.exceptions import ToolExecutionError


class BaseTool(LangChainBaseTool):
    """
    Base class for tools in the agent framework.

    Extends langchain_core.tools.BaseTool with async support
    and additional metadata.
    """

    name: str
    description: str
    enabled: bool = True
    config: Dict[str, Any] = {}

    def __init__(self, **data):
        """Initialize the tool."""
        super().__init__(**data)
        if not hasattr(self, "config"):
            self.config = {}
        if not hasattr(self, "enabled"):
            self.enabled = True

    async def ainvoke(self, tool_input: Dict[str, Any]) -> str:
        """
        Async invoke the tool.

        Args:
            tool_input: Input to the tool
        Returns:
            Tool output as string
        """
        try:
            result = await self._arun(tool_input)
            return str(result)
        except Exception as e:
            raise ToolExecutionError(f"Tool {self.name} execution failed: {e}") from e

    async def _arun(self, tool_input: Dict[str, Any]) -> Any:
        """
        Internal async run implementation.

        Override this in subclasses for custom async behavior.
        """
        return await self.run(tool_input)

    async def run(self, tool_input: Dict[str, Any]) -> Any:
        """
        Sync run implementation.

        Override this in subclasses for custom behavior.
        """
        raise NotImplementedError(f"Tool {self.name} does not implement run()")


class AsyncTool(BaseTool):
    """
    Tool that supports both sync and async execution.

    Subclasses must implement the async _arun method.
    """

    async def _arun(self, tool_input: Dict[str, Any]) -> Any:
        """Override this method for async tool implementation."""
        raise NotImplementedError
