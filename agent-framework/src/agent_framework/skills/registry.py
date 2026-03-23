"""Skill registry for managing skill registration and lookup."""

from typing import Dict, Type, Optional
import threading

from .base import BaseSkill
from ..core.exceptions import SkillNotFoundError


class SkillRegistry:
    """
    Singleton registry for managing skills.

    Provides thread-safe skill registration and lookup.
    """

    _instance: Optional["SkillRegistry"] = None
    _lock = threading.Lock()

    def __new__(cls) -> "SkillRegistry":
        """Get or create the singleton instance."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._skills: Dict[str, Type[BaseSkill]] = {}
                    cls._instance._instances: Dict[str, BaseSkill] = {}
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        """Initialize the registry (called after singleton creation)."""
        pass

    @property
    def skills(self) -> Dict[str, Type[BaseSkill]]:
        """Get all registered skill classes."""
        return self._skills.copy()

    @property
    def instances(self) -> Dict[str, BaseSkill]:
        """Get all skill instances."""
        return self._instances.copy()

    def register(self, skill_class: Type[BaseSkill], name: Optional[str] = None) -> None:
        """
        Register a skill class.

        Args:
            skill_class: Skill class to register
            name: Optional custom name for the skill
        """
        skill_name = name or skill_class.name
        if not skill_name:
            raise ValueError("Skill must have a name")
        self._skills[skill_name] = skill_class

    def register_instance(self, skill: BaseSkill) -> None:
        """
        Register a skill instance.

        Args:
            skill: Skill instance to register
        """
        if not skill.name:
            raise ValueError("Skill instance must have a name")
        self._instances[skill.name] = skill

    def get(self, name: str) -> Type[BaseSkill]:
        """
        Get a skill class by name.

        Args:
            name: Skill name
        Returns:
            Skill class
        Raises:
            SkillNotFoundError: If skill not found
        """
        if name not in self._skills:
            raise SkillNotFoundError(f"Skill '{name}' not found in registry")
        return self._skills[name]

    def get_instance(self, name: str) -> BaseSkill:
        """
        Get a skill instance by name.

        Args:
            name: Skill name
        Returns:
            Skill instance
        Raises:
            SkillNotFoundError: If skill not found
        """
        if name not in self._instances:
            raise SkillNotFoundError(f"Skill instance '{name}' not found in registry")
        return self._instances[name]

    def create_instance(self, name: str, **kwargs) -> BaseSkill:
        """
        Create a skill instance by name.

        Args:
            name: Skill name
            **kwargs: Arguments to pass to the skill constructor
        Returns:
            Skill instance
        """
        skill_class = self.get(name)
        return skill_class(**kwargs)

    def unregister(self, name: str) -> None:
        """
        Unregister a skill class.

        Args:
            name: Skill name
        """
        if name in self._skills:
            del self._skills[name]

    def unregister_instance(self, name: str) -> None:
        """
        Unregister a skill instance.

        Args:
            name: Skill name
        """
        if name in self._instances:
            del self._instances[name]

    def clear(self) -> None:
        """Clear all registered skills."""
        self._skills.clear()
        self._instances.clear()

    def list_skills(self) -> list[str]:
        """List all registered skill names."""
        return list(self._skills.keys())

    def list_instances(self) -> list[str]:
        """List all registered skill instance names."""
        return list(self._instances.keys())
