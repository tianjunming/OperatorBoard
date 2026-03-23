"""Tool registry for managing tool registration and lookup."""

from typing import Dict, Type, Optional
import threading

from .base import BaseTool
from ..core.exceptions import ToolNotFoundError


class ToolRegistry:
    """
    Singleton registry for managing tools.

    Provides thread-safe tool registration and lookup.
    """

    _instance: Optional["ToolRegistry"] = None
    _lock = threading.Lock()

    def __new__(cls) -> "ToolRegistry":
        """Get or create the singleton instance."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._tools: Dict[str, Type[BaseTool]] = {}
                    cls._instance._instances: Dict[str, BaseTool] = {}
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        """Initialize the registry (called after singleton creation)."""
        pass

    @property
    def tools(self) -> Dict[str, Type[BaseTool]]:
        """Get all registered tool classes."""
        return self._tools.copy()

    @property
    def instances(self) -> Dict[str, BaseTool]:
        """Get all tool instances."""
        return self._instances.copy()

    def register(self, tool_class: Type[BaseTool], name: Optional[str] = None) -> None:
        """
        Register a tool class.

        Args:
            tool_class: Tool class to register
            name: Optional custom name for the tool
        """
        tool_name = name or tool_class.name
        if not tool_name:
            raise ValueError("Tool must have a name")
        self._tools[tool_name] = tool_class

    def register_instance(self, tool: BaseTool) -> None:
        """
        Register a tool instance.

        Args:
            tool: Tool instance to register
        """
        if not tool.name:
            raise ValueError("Tool instance must have a name")
        self._instances[tool.name] = tool

    def get(self, name: str) -> Type[BaseTool]:
        """
        Get a tool class by name.

        Args:
            name: Tool name
        Returns:
            Tool class
        Raises:
            ToolNotFoundError: If tool not found
        """
        if name not in self._tools:
            raise ToolNotFoundError(f"Tool '{name}' not found in registry")
        return self._tools[name]

    def get_instance(self, name: str) -> BaseTool:
        """
        Get a tool instance by name.

        Args:
            name: Tool name
        Returns:
            Tool instance
        Raises:
            ToolNotFoundError: If tool not found
        """
        if name not in self._instances:
            raise ToolNotFoundError(f"Tool instance '{name}' not found in registry")
        return self._instances[name]

    def create_instance(self, name: str, **kwargs) -> BaseTool:
        """
        Create a tool instance by name.

        Args:
            name: Tool name
            **kwargs: Arguments to pass to the tool constructor
        Returns:
            Tool instance
        """
        tool_class = self.get(name)
        return tool_class(**kwargs)

    def unregister(self, name: str) -> None:
        """
        Unregister a tool class.

        Args:
            name: Tool name
        """
        if name in self._tools:
            del self._tools[name]

    def unregister_instance(self, name: str) -> None:
        """
        Unregister a tool instance.

        Args:
            name: Tool name
        """
        if name in self._instances:
            del self._instances[name]

    def clear(self) -> None:
        """Clear all registered tools."""
        self._tools.clear()
        self._instances.clear()

    def list_tools(self) -> list[str]:
        """List all registered tool names."""
        return list(self._tools.keys())

    def list_instances(self) -> list[str]:
        """List all registered tool instance names."""
        return list(self._instances.keys())
