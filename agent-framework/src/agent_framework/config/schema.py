"""Pydantic models for configuration validation."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class AgentConfigModel(BaseModel):
    """Agent configuration schema."""

    name: str = Field(..., description="Agent name")
    description: str = Field(default="", description="Agent description")
    model_name: str = Field(default="claude-3-sonnet-20240229", description="LLM model name")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=4096, gt=0)
    system_prompt: str = Field(default="You are a helpful AI assistant.")
    tools: Dict[str, Any] = Field(default_factory=dict)
    skills: Dict[str, Any] = Field(default_factory=dict)
    rag: Dict[str, Any] = Field(default_factory=dict)


class ToolConfigModel(BaseModel):
    """Tool configuration schema."""

    name: str = Field(..., description="Tool name")
    description: str = Field(..., description="Tool description")
    enabled: bool = Field(default=True)
    config: Dict[str, Any] = Field(default_factory=dict)


class ToolsConfigModel(BaseModel):
    """Tools configuration schema."""

    tools: Dict[str, ToolConfigModel] = Field(default_factory=dict)


class SkillConfigModel(BaseModel):
    """Skill configuration schema."""

    name: str = Field(..., description="Skill name")
    description: str = Field(..., description="Skill description")
    enabled: bool = Field(default=True)
    config: Dict[str, Any] = Field(default_factory=dict)


class SkillsConfigModel(BaseModel):
    """Skills configuration schema."""

    skills: Dict[str, SkillConfigModel] = Field(default_factory=dict)


class MCPServerConfigModel(BaseModel):
    """MCP server configuration schema."""

    name: str = Field(..., description="Server name")
    description: str = Field(..., description="Server description")
    command: str = Field(..., description="Command to start server")
    args: List[str] = Field(default_factory=list)
    enabled: bool = Field(default=True)
    env: Dict[str, str] = Field(default_factory=dict)


class MCPConfigModel(BaseModel):
    """MCP configuration schema."""

    servers: Dict[str, MCPServerConfigModel] = Field(default_factory=dict)
    client: Dict[str, Any] = Field(default_factory=dict)


class FrameworkConfig(BaseModel):
    """Root framework configuration."""

    agent: AgentConfigModel
    tools: Optional[ToolsConfigModel] = None
    skills: Optional[SkillsConfigModel] = None
    mcp: Optional[MCPConfigModel] = None
