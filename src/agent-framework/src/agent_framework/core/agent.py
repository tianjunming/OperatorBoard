"""Base agent class for the framework."""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

from langchain_core.documents import Document

from .types import AgentConfig
from ..tools.base import BaseTool
from ..skills.base import BaseSkill
from ..rag.retriever import RAGRetriever


class BaseAgent(ABC):
    """
    Abstract base class for agents.

    Provides the core interface for agent operations including
    tool management, skill execution, and RAG retrieval.
    """

    def __init__(self, config: AgentConfig):
        """
        Initialize the agent with configuration.

        Args:
            config: Agent configuration
        """
        self.config = config
        self._tools: Dict[str, BaseTool] = {}
        self._skills: Dict[str, BaseSkill] = {}
        self._rag_retriever: Optional[RAGRetriever] = None
        self._initialized = False

    @property
    def name(self) -> str:
        """Get the agent name."""
        return self.config.name

    @property
    def description(self) -> str:
        """Get the agent description."""
        return self.config.description

    @property
    def tools(self) -> Dict[str, BaseTool]:
        """Get all registered tools."""
        return self._tools.copy()

    @property
    def skills(self) -> Dict[str, BaseSkill]:
        """Get all registered skills."""
        return self._skills.copy()

    async def initialize(self) -> None:
        """Initialize the agent. Override in subclasses for custom initialization."""
        self._initialized = True

    async def add_tool(self, tool: BaseTool) -> None:
        """
        Add a tool to the agent.

        Args:
            tool: Tool to add
        """
        self._tools[tool.name] = tool

    async def remove_tool(self, tool_name: str) -> None:
        """
        Remove a tool from the agent.

        Args:
            tool_name: Name of the tool to remove
        """
        if tool_name in self._tools:
            del self._tools[tool_name]

    async def get_tool(self, tool_name: str) -> Optional[BaseTool]:
        """
        Get a tool by name.

        Args:
            tool_name: Name of the tool
        Returns:
            Tool if found, None otherwise
        """
        return self._tools.get(tool_name)

    async def add_skill(self, skill: BaseSkill) -> None:
        """
        Add a skill to the agent.

        Args:
            skill: Skill to add
        """
        self._skills[skill.name] = skill

    async def remove_skill(self, skill_name: str) -> None:
        """
        Remove a skill from the agent.

        Args:
            skill_name: Name of the skill to remove
        """
        if skill_name in self._skills:
            del self._skills[skill_name]

    async def get_skill(self, skill_name: str) -> Optional[BaseSkill]:
        """
        Get a skill by name.

        Args:
            skill_name: Name of the skill
        Returns:
            Skill if found, None otherwise
        """
        return self._skills.get(skill_name)

    def set_rag_retriever(self, retriever: RAGRetriever) -> None:
        """
        Set the RAG retriever for the agent.

        Args:
            retriever: RAG retriever instance
        """
        self._rag_retriever = retriever

    async def search_rag(self, query: str, top_k: Optional[int] = None) -> List[Document]:
        """
        Search the RAG knowledge base.

        Args:
            query: Search query
            top_k: Number of results to return
        Returns:
            List of relevant documents
        """
        if self._rag_retriever is None:
            return []
        k = top_k or self.config.rag_top_k
        return await self._rag_retriever.retrieve(query, k=k)

    @abstractmethod
    async def run(self, input: str) -> str:
        """
        Run the agent with the given input.

        Args:
            input: User input
        Returns:
            Agent response
        """
        pass

    async def cleanup(self) -> None:
        """Cleanup agent resources. Override in subclasses for custom cleanup."""
        self._tools.clear()
        self._skills.clear()
        self._rag_retriever = None
        self._initialized = False
