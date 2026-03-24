"""Example: Creating a custom agent using the framework"""
from framework.base_agent import BaseAgent
from framework.tool_registry import ToolRegistry, register_tool
from framework.knowledge_manager import BaseKnowledgeManager
from langchain_core.tools import tool
from typing import List


# Example 1: Create a custom knowledge manager
class MyKnowledgeManager(BaseKnowledgeManager):
    """Simple in-memory knowledge manager"""

    def __init__(self):
        self.docs: List[str] = []

    def search(self, query: str, top_k: int = 3) -> List[str]:
        """Simple keyword-based search"""
        query_lower = query.lower()
        results = [doc for doc in self.docs if query_lower in doc.lower()]
        return results[:top_k]

    def add_knowledge(self, content: str, metadata: dict = None) -> None:
        """Add knowledge to memory"""
        self.docs.append(content)

    def clear(self) -> None:
        """Clear all knowledge"""
        self.docs.clear()


# Example 2: Define custom tools using decorators
@register_tool(name="weather查询", description="查询指定城市的天气")
def get_weather(city: str) -> str:
    """Get weather for a city (simulated)"""
    return f"{city}今天的天气是晴天，25°C"


@register_tool(name="翻译", description="将文本翻译成指定语言")
def translate(text: str, target_lang: str = "English") -> str:
    """Translate text (simulated)"""
    return f"[{target_lang}] {text}"


# Example 3: Create a custom agent
class MyAgent(BaseAgent):
    """My custom agent with specialized tools and knowledge"""

    def _register_default_tools(self) -> None:
        """Register the default tools for MyAgent"""
        registry = ToolRegistry()

        # Use the pre-registered tools from decorators
        weather_tool = registry.get_tool("weather查询")
        translate_tool = registry.get_tool("翻译")

        if weather_tool:
            self._tools.append(weather_tool)
        if translate_tool:
            self._tools.append(translate_tool)

        # Add custom tool directly
        @registry.register_function(
            name="greet",
            description="Generate a greeting message",
        )
        def greet(name: str) -> str:
            return f"Hello, {name}! Welcome!"

        greet_tool = registry.get_tool("greet")
        if greet_tool:
            self._tools.append(greet_tool)

    def _build_system_prompt(self) -> str:
        """Build the system prompt"""
        return """You are a helpful assistant with weather and translation capabilities.

Available tools:
- weather_query: Get weather information for any city
- translate: Translate text to different languages
- greet: Generate greeting messages

Be helpful and use the appropriate tool when needed."""


def main():
    """Demonstrate custom agent creation"""
    from config import OPENAI_API_KEY

    # Create custom knowledge manager
    km = MyKnowledgeManager()
    km.add_knowledge("Python is a programming language")
    km.add_knowledge("JavaScript is used for web development")

    # Create custom agent
    agent = MyAgent(
        api_key=OPENAI_API_KEY,
        verbose=True,
        knowledge_manager=km,
    )

    # Run a conversation
    print("\n=== Custom Agent Demo ===\n")

    queries = [
        "Hello, I'm Alice",
        "What's the weather in Beijing?",
        "Translate 'Thank you' to Japanese",
    ]

    for query in queries:
        print(f"You: {query}")
        response = agent.chat(query)
        print(f"Agent: {response}\n")


if __name__ == "__main__":
    main()
