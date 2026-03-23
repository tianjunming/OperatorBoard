"""Tests for the skills module."""

import pytest
from agent_framework.skills.base import BaseSkill, SkillContext
from agent_framework.skills.registry import SkillRegistry
from agent_framework.skills.executor import SkillExecutor
from agent_framework.core.exceptions import SkillNotFoundError


class DummySkill(BaseSkill):
    """Dummy skill for testing."""

    name = "dummy_skill"
    description = "A dummy skill for testing"

    async def execute(self, context):
        """Execute the dummy skill."""
        return f"Executed: {context.input_data}"


class TestSkillContext:
    """Tests for SkillContext."""

    def test_creation(self):
        """Test creating a skill context."""
        context = SkillContext(
            skill_name="test",
            input_data={"key": "value"},
            metadata={"meta": "data"},
        )
        assert context.skill_name == "test"
        assert context.input_data == {"key": "value"}
        assert context.metadata == {"meta": "data"}

    def test_default_values(self):
        """Test default values."""
        context = SkillContext(skill_name="test")
        assert context.input_data == {}
        assert context.metadata == {}


class TestSkillRegistry:
    """Tests for SkillRegistry."""

    def test_singleton_pattern(self):
        """Test that registry is a singleton."""
        registry1 = SkillRegistry()
        registry2 = SkillRegistry()
        assert registry1 is registry2

    def test_register_skill_class(self):
        """Test registering a skill class."""
        registry = SkillRegistry()
        registry.clear()
        registry.register(DummySkill)
        assert "dummy_skill" in registry.list_skills()

    def test_register_instance(self):
        """Test registering a skill instance."""
        registry = SkillRegistry()
        registry.clear()
        skill = DummySkill()
        registry.register_instance(skill)
        assert "dummy_skill" in registry.list_instances()

    def test_get_skill_class(self):
        """Test getting a skill class."""
        registry = SkillRegistry()
        registry.clear()
        registry.register(DummySkill)
        assert registry.get("dummy_skill") == DummySkill

    def test_get_skill_instance(self):
        """Test getting a skill instance."""
        registry = SkillRegistry()
        registry.clear()
        skill = DummySkill()
        registry.register_instance(skill)
        assert registry.get_instance("dummy_skill") == skill

    def test_get_nonexistent_skill(self):
        """Test getting a nonexistent skill raises error."""
        registry = SkillRegistry()
        registry.clear()
        with pytest.raises(SkillNotFoundError):
            registry.get("nonexistent")

    def test_create_instance(self):
        """Test creating a skill instance."""
        registry = SkillRegistry()
        registry.clear()
        registry.register(DummySkill)
        instance = registry.create_instance("dummy_skill")
        assert isinstance(instance, DummySkill)


class TestSkillExecutor:
    """Tests for SkillExecutor."""

    def test_load_skill(self):
        """Test loading a skill."""
        executor = SkillExecutor()
        skill = DummySkill()
        executor.load_skill(skill)
        assert "dummy_skill" in executor.list_skills()

    def test_load_disabled_skill(self):
        """Test that disabled skills are not loaded."""
        executor = SkillExecutor()
        skill = DummySkill()
        skill.enabled = False
        executor.load_skill(skill)
        assert "dummy_skill" not in executor.list_skills()

    @pytest.mark.asyncio
    async def test_execute_skill(self):
        """Test executing a skill."""
        executor = SkillExecutor()
        skill = DummySkill()
        executor.load_skill(skill)

        context = SkillContext(
            skill_name="dummy_skill",
            input_data={"test": "value"},
        )
        result = await executor.execute("dummy_skill", {"test": "value"})
        assert result.success
        assert "Executed:" in result.output

    @pytest.mark.asyncio
    async def test_execute_nonexistent_skill(self):
        """Test executing a nonexistent skill."""
        executor = SkillExecutor()
        result = await executor.execute("nonexistent")
        assert not result.success
        assert "not loaded" in result.error

    @pytest.mark.asyncio
    async def test_execute_chain(self):
        """Test executing skills in a chain."""
        executor = SkillExecutor()
        skill = DummySkill()
        executor.load_skill(skill)

        chain = [
            {"skill_name": "dummy_skill", "input_data": {"step": 1}},
            {"skill_name": "dummy_skill", "input_data": {"step": 2}},
        ]

        results = await executor.execute_chain(chain)
        assert len(results) == 2
        assert all(r.success for r in results)

    def test_has_skill(self):
        """Test checking if a skill is loaded."""
        executor = SkillExecutor()
        skill = DummySkill()
        executor.load_skill(skill)
        assert executor.has_skill("dummy_skill")
        assert not executor.has_skill("nonexistent")
