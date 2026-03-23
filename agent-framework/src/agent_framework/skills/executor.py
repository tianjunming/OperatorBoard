"""Skill executor for running skills."""

import asyncio
from typing import Any, Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor

from .base import BaseSkill, SkillContext
from .registry import SkillRegistry
from ..core.exceptions import SkillExecutionError, SkillNotFoundError
from ..core.types import SkillResult


class SkillExecutor:
    """
    Executor for running skills with lifecycle management.

    Provides async execution with validation and error handling.
    """

    def __init__(self, registry: Optional[SkillRegistry] = None):
        """
        Initialize the skill executor.

        Args:
            registry: Optional skill registry to use
        """
        self._registry = registry or SkillRegistry()
        self._active_skills: Dict[str, BaseSkill] = {}
        self._executor_pool: Optional[ThreadPoolExecutor] = None

    @property
    def registry(self) -> SkillRegistry:
        """Get the skill registry."""
        return self._registry

    @property
    def active_skills(self) -> Dict[str, BaseSkill]:
        """Get all active (loaded) skills."""
        return self._active_skills.copy()

    def load_skill(self, skill: BaseSkill) -> None:
        """
        Load a skill into the executor.

        Args:
            skill: Skill instance to load
        """
        if not skill.enabled:
            return
        self._active_skills[skill.name] = skill

    def load_skill_by_name(self, name: str, **kwargs) -> BaseSkill:
        """
        Load a skill by name from the registry.

        Args:
            name: Skill name
            **kwargs: Arguments to pass to the skill constructor
        Returns:
            Loaded skill instance
        """
        skill = self._registry.create_instance(name, **kwargs)
        self.load_skill(skill)
        return skill

    def unload_skill(self, name: str) -> None:
        """
        Unload a skill from the executor.

        Args:
            name: Skill name
        """
        if name in self._active_skills:
            del self._active_skills[name]

    async def execute(
        self,
        skill_name: str,
        input_data: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> SkillResult:
        """
        Execute a skill by name.

        Args:
            skill_name: Name of the skill to execute
            input_data: Input data for the skill
            metadata: Optional metadata to pass to context
        Returns:
            SkillResult with execution details
        """
        if skill_name not in self._active_skills:
            return SkillResult(
                skill_name=skill_name,
                success=False,
                output=None,
                error=f"Skill '{skill_name}' is not loaded",
            )

        skill = self._active_skills[skill_name]
        context = SkillContext(
            skill_name=skill_name,
            input_data=input_data or {},
            metadata=metadata or {},
        )

        try:
            if not await skill.validate(context):
                return SkillResult(
                    skill_name=skill_name,
                    success=False,
                    output=None,
                    error="Skill validation failed",
                )

            output = await skill.execute(context)
            return SkillResult(skill_name=skill_name, success=True, output=output)
        except Exception as e:
            return SkillResult(
                skill_name=skill_name,
                success=False,
                output=None,
                error=str(e),
            )
        finally:
            try:
                await skill.cleanup()
            except Exception:
                pass

    async def execute_many(
        self,
        executions: List[Dict[str, Any]],
    ) -> List[SkillResult]:
        """
        Execute multiple skills concurrently.

        Args:
            executions: List of executions with 'skill_name', 'input_data', 'metadata'
        Returns:
            List of SkillResults
        """
        tasks = []
        for exec_data in executions:
            skill_name = exec_data.get("skill_name")
            input_data = exec_data.get("input_data", {})
            metadata = exec_data.get("metadata", {})
            tasks.append(self.execute(skill_name, input_data, metadata))

        return await asyncio.gather(*tasks, return_exceptions=False)

    async def execute_chain(
        self,
        chain: List[Dict[str, Any]],
    ) -> List[SkillResult]:
        """
        Execute skills in sequence, passing output to the next.

        Args:
            chain: List of skill executions with 'skill_name', 'input_data'
        Returns:
            List of SkillResults, one per skill in the chain
        """
        results = []
        context: Dict[str, Any] = {}

        for exec_data in chain:
            skill_name = exec_data.get("skill_name")
            input_data = exec_data.get("input_data", {})

            input_data["previous_results"] = [r.output for r in results if r.success]

            result = await self.execute(skill_name, input_data)
            results.append(result)

            if not result.success:
                break

        return results

    def get_skill(self, name: str) -> Optional[BaseSkill]:
        """
        Get an active skill by name.

        Args:
            name: Skill name
        Returns:
            Skill if found and loaded, None otherwise
        """
        return self._active_skills.get(name)

    def list_skills(self) -> List[str]:
        """List all active skill names."""
        return list(self._active_skills.keys())

    def has_skill(self, name: str) -> bool:
        """Check if a skill is loaded."""
        return name in self._active_skills
