"""Tool Registry - Allows agents to register and manage their tools"""
from typing import Any, Callable, Dict, List, Optional
from langchain_core.tools import BaseTool, tool


class ToolRegistry:
    """A registry for managing tools that can be used by agents"""

    _instance: Optional["ToolRegistry"] = None
    _tools: Dict[str, BaseTool] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._tools = {}
        return cls._instance

    def register(self, tool: BaseTool) -> None:
        """Register a tool"""
        self._tools[tool.name] = tool

    def register_function(
        self,
        name: str,
        description: str,
        func: Callable,
        args_schema: Optional[type] = None,
    ) -> None:
        """Register a function as a tool dynamically"""
        @tool(name=name, description=description, args_schema=args_schema)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        self._tools[name] = wrapper

    def unregister(self, name: str) -> bool:
        """Unregister a tool by name"""
        if name in self._tools:
            del self._tools[name]
            return True
        return False

    def get_tool(self, name: str) -> Optional[BaseTool]:
        """Get a tool by name"""
        return self._tools.get(name)

    def get_all_tools(self) -> List[BaseTool]:
        """Get all registered tools"""
        return list(self._tools.values())

    def get_tools_by_tag(self, tag: str) -> List[BaseTool]:
        """Get tools filtered by a tag (metadata)"""
        return [
            t for t in self._tools.values()
            if t.metadata and t.metadata.get("tags") and tag in t.metadata.get("tags", [])
        ]

    def clear(self) -> None:
        """Clear all registered tools"""
        self._tools.clear()

    def list_tool_names(self) -> List[str]:
        """List all registered tool names"""
        return list(self._tools.keys())


# Decorator for easy tool registration
def register_tool(name: str = None, description: str = None, tags: List[str] = None):
    """Decorator to register a function as a tool"""
    def decorator(func: Callable) -> Callable:
        tool_name = name or func.__name__

        @tool(
            name=tool_name,
            description=description or func.__doc__ or f"Tool: {tool_name}",
        )
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        if tags:
            wrapper.metadata = {"tags": tags}

        # Auto-register
        registry = ToolRegistry()
        registry.register(wrapper)
        return wrapper
    return decorator


# Global registry instance
registry = ToolRegistry()
