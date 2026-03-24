"""
Agent Framework

A modular agent framework based on LangChain, supporting:
- Tool management with dynamic registration
- MCP (Model Context Protocol) service support
- RAG (Retrieval-Augmented Generation) with vector stores
- Reusable skill system
"""

__version__ = "0.1.0"

from . import config
from . import core
from . import tools
from . import mcp
from . import rag
from . import skills
from . import utils

__all__ = [
    "config",
    "core",
    "tools",
    "mcp",
    "rag",
    "skills",
    "utils",
]
