"""Base Agent - Abstract base class for all agents in the framework"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Callable
from langchain_openai import ChatOpenAI
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.tools import BaseTool

from framework.tool_registry import ToolRegistry
from framework.knowledge_manager import BaseKnowledgeManager


class BaseAgent(ABC):
    """Abstract base class for all agents"""

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o",
        temperature: float = 0,
        max_iterations: int = 10,
        verbose: bool = False,
        tools: Optional[List[BaseTool]] = None,
        knowledge_manager: Optional[BaseKnowledgeManager] = None,
        system_prompt: Optional[str] = None,
    ):
        self.api_key = api_key
        self.model = model
        self.temperature = temperature
        self.max_iterations = max_iterations
        self.verbose = verbose
        self._tools: List[BaseTool] = tools or []
        self._knowledge_manager = knowledge_manager
        self._tool_registry = ToolRegistry()

        # Register agent's own tools
        self._register_default_tools()

        # Initialize LLM
        self.llm = ChatOpenAI(
            api_key=api_key,
            model=model,
            temperature=temperature,
            verbose=verbose,
        )

        # Build system prompt
        self.system_prompt = system_prompt or self._build_system_prompt()

        # Initialize agent components
        self.prompt = self._build_prompt()
        self.agent = self._create_agent()
        self.executor = self._create_executor()

    @abstractmethod
    def _register_default_tools(self) -> None:
        """Register agent's default tools - override in subclass"""
        pass

    @abstractmethod
    def _build_system_prompt(self) -> str:
        """Build the system prompt for the agent - override in subclass"""
        return """You are a helpful AI Assistant."""

    def _build_prompt(self) -> ChatPromptTemplate:
        """Build the chat prompt template"""
        return ChatPromptTemplate.from_messages([
            ("system", self.system_prompt),
            MessagesPlaceholder(variable_name="chat_history", optional=True),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])

    def _create_agent(self):
        """Create the LangChain agent"""
        return create_openai_functions_agent(
            llm=self.llm,
            tools=self.get_all_tools(),
            prompt=self.prompt,
        )

    def _create_executor(self) -> AgentExecutor:
        """Create the agent executor"""
        return AgentExecutor(
            agent=self.agent,
            tools=self.get_all_tools(),
            verbose=self.verbose,
            max_iterations=self.max_iterations,
            handle_parsing_errors=True,
        )

    # ==================== Tool Management ====================

    def add_tool(self, tool: BaseTool) -> None:
        """Add a tool to the agent"""
        self._tools.append(tool)
        self._tool_registry.register(tool)
        self._rebuild_agent()

    def add_tools(self, tools: List[BaseTool]) -> None:
        """Add multiple tools to the agent"""
        for tool in tools:
            self.add_tool(tool)

    def remove_tool(self, name: str) -> bool:
        """Remove a tool from the agent"""
        self._tools = [t for t in self._tools if t.name != name]
        self._tool_registry.unregister(name)
        self._rebuild_agent()
        return True

    def get_tool(self, name: str) -> Optional[BaseTool]:
        """Get a tool by name"""
        return self._tool_registry.get_tool(name)

    def get_all_tools(self) -> List[BaseTool]:
        """Get all registered tools"""
        return self._tools.copy()

    def _rebuild_agent(self) -> None:
        """Rebuild the agent with updated tools"""
        self.agent = self._create_agent()
        self.executor = self._create_executor()

    # ==================== Knowledge Management ====================

    def set_knowledge_manager(self, km: BaseKnowledgeManager) -> None:
        """Set the knowledge manager"""
        self._knowledge_manager = km

    def get_knowledge_manager(self) -> Optional[BaseKnowledgeManager]:
        """Get the knowledge manager"""
        return self._knowledge_manager

    def add_knowledge(self, content: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Add knowledge to the knowledge base"""
        if self._knowledge_manager:
            self._knowledge_manager.add_knowledge(content, metadata)

    def search_knowledge(self, query: str, top_k: int = 3) -> str:
        """Search the knowledge base"""
        if self._knowledge_manager:
            results = self._knowledge_manager.search(query, top_k)
            return self._knowledge_manager.format_results(results)
        return "Knowledge base not configured."

    # ==================== Agent Execution ====================

    def run(self, query: str, chat_history: Optional[List] = None) -> str:
        """Run the agent with a query"""
        inputs = {"input": query}
        if chat_history:
            inputs["chat_history"] = chat_history

        response = self.executor.invoke(inputs)
        return response["output"]

    def chat(self, query: str) -> str:
        """Simple chat interface"""
        return self.run(query)

    # ==================== Lifecycle ====================

    def reset(self) -> None:
        """Reset the agent state"""
        self._tools.clear()
        self._register_default_tools()
        self._rebuild_agent()

    @classmethod
    def get_name(cls) -> str:
        """Get the agent name"""
        return cls.__name__

    @classmethod
    def get_description(cls) -> str:
        """Get the agent description"""
        return cls.__doc__ or "An AI agent"
