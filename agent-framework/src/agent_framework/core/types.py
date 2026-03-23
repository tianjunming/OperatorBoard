"""Core type definitions for the agent framework."""

from typing import Protocol, Any, Dict, List, Optional, runtime_checkable
from pydantic import BaseModel, Field


@runtime_checkable
class ToolProtocol(Protocol):
    """Protocol for tools in the framework."""

    name: str
    description: str

    async def ainvoke(self, tool_input: Dict[str, Any]) -> str:
        """Invoke the tool with the given input."""
        ...


@runtime_checkable
class SkillProtocol(Protocol):
    """Protocol for skills in the framework."""

    name: str
    description: str

    async def execute(self, context: Dict[str, Any]) -> Any:
        """Execute the skill with the given context."""
        ...


class ToolDefinition(BaseModel):
    """Definition of a tool."""

    name: str = Field(..., description="Unique name of the tool")
    description: str = Field(..., description="Description of what the tool does")
    enabled: bool = Field(default=True, description="Whether the tool is enabled")
    config: Dict[str, Any] = Field(default_factory=dict, description="Tool configuration")


class SkillDefinition(BaseModel):
    """Definition of a skill."""

    name: str = Field(..., description="Unique name of the skill")
    description: str = Field(..., description="Description of what the skill does")
    enabled: bool = Field(default=True, description="Whether the skill is enabled")
    config: Dict[str, Any] = Field(default_factory=dict, description="Skill configuration")


class MCPServerDefinition(BaseModel):
    """Definition of an MCP server."""

    name: str = Field(..., description="Unique name of the MCP server")
    description: str = Field(..., description="Description of the MCP server")
    command: str = Field(..., description="Command to start the server")
    args: List[str] = Field(default_factory=list, description="Command arguments")
    enabled: bool = Field(default=True, description="Whether the server is enabled")
    env: Dict[str, str] = Field(default_factory=dict, description="Environment variables")


class AgentConfig(BaseModel):
    """Configuration for an agent."""

    name: str = Field(..., description="Name of the agent")
    description: str = Field(default="", description="Description of the agent")
    model_name: str = Field(default="claude-3-sonnet-20240229", description="Model to use")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=4096, gt=0)
    system_prompt: str = Field(default="You are a helpful AI assistant.")
    tools_enabled: bool = Field(default=True)
    skills_enabled: bool = Field(default=True)
    rag_enabled: bool = Field(default=True)
    rag_top_k: int = Field(default=5, ge=1)


class ToolResult(BaseModel):
    """Result from a tool execution."""

    tool_name: str
    success: bool
    output: Any
    error: Optional[str] = None


class SkillResult(BaseModel):
    """Result from a skill execution."""

    skill_name: str
    success: bool
    output: Any
    error: Optional[str] = None
