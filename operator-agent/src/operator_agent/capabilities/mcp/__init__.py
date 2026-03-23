"""MCP module for getting data from other agents and systems."""

from .agent_mcp_client import AgentMCPClient
from .system_data_source import SystemDataSource

__all__ = [
    "AgentMCPClient",
    "SystemDataSource",
]
