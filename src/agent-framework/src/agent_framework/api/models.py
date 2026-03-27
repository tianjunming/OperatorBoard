"""Standard API request/response models for agent framework."""

from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class BaseAgentRequest(BaseModel):
    """Base request model for agent operations."""

    query: str = Field(..., description="User query or command")
    session_id: Optional[str] = Field(None, description="Session ID for tracking")
    context: Optional[Dict[str, Any]] = Field(None, description="Additional context")


class BaseAgentResponse(BaseModel):
    """Base response model for agent operations."""

    result: Any = Field(..., description="Agent response result")
    session_id: Optional[str] = Field(None, description="Session ID")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Response metadata")


class CapabilityInfo(BaseModel):
    """Information about agent capabilities."""

    name: str
    description: str
    tools: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    has_rag: bool = False
    has_mcp: bool = False
