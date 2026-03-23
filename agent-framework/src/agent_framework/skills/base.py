"""Base skill class for the framework."""

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field


class SkillContext(BaseModel):
    """Context passed to skill execution."""

    skill_name: str
    input_data: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseSkill(ABC):
    """
    Abstract base class for skills.

    Skills are reusable capabilities that can be composed
    and executed within an agent.
    """

    name: str
    description: str
    enabled: bool = True
    config: Dict[str, Any] = {}

    def __init__(self, **data):
        """Initialize the skill."""
        if not hasattr(self, "config"):
            self.config = {}
        if not hasattr(self, "enabled"):
            self.enabled = True
        if "config" in data:
            self.config = data.pop("config")

    @abstractmethod
    async def execute(self, context: SkillContext) -> Any:
        """
        Execute the skill.

        Args:
            context: Execution context with input data
        Returns:
            Skill execution result
        """
        pass

    async def validate(self, context: SkillContext) -> bool:
        """
        Validate the skill can execute with the given context.

        Args:
            context: Execution context
        Returns:
            True if valid, False otherwise
        """
        return True

    async def cleanup(self) -> None:
        """Cleanup resources after execution."""
        pass


class AsyncSkill(BaseSkill):
    """
    Skill with async-only execution.

    Subclasses must implement the async execute method.
    """

    @abstractmethod
    async def execute(self, context: SkillContext) -> Any:
        """Async execute implementation."""
        pass


class SyncSkill(BaseSkill):
    """
    Skill that wraps sync execution.

    Subclasses implement _execute, which is called in an async context.
    """

    @abstractmethod
    def _execute(self, context: SkillContext) -> Any:
        """Sync execute implementation."""
        pass

    async def execute(self, context: SkillContext) -> Any:
        """Async wrapper for sync execution."""
        return self._execute(context)
