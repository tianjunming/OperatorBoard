"""Built-in tools for the framework"""
from typing import Any
from langchain_core.tools import tool
from datetime import datetime


@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression. Only for basic math: +, -, *, /, ()"""
    try:
        allowed_chars = set("0123456789+-*/.() ")
        if all(c in allowed_chars for c in expression):
            result = eval(expression)
            return f"Result: {result}"
        return "Error: Invalid characters in expression"
    except Exception as e:
        return f"Error: {str(e)}"


@tool
def get_current_time(format: str = "%Y-%m-%d %H:%M:%S") -> str:
    """Get the current time. Format: strftime format string."""
    try:
        return datetime.now().strftime(format)
    except Exception as e:
        return f"Error: {str(e)}"


@tool
def search_knowledge_base(query: str) -> str:
    """Search the knowledge base for relevant information."""
    # Note: This tool requires a knowledge_manager to be set on the agent
    return "Knowledge base tool - requires agent with knowledge manager configured."


# Built-in tools available in the framework
BUILTIN_TOOLS = [calculator, get_current_time]
