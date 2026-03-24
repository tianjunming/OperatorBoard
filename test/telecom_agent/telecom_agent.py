"""Telecom Agent - An agent specialized in telecommunications data analysis"""
import sys
import os

# Add project root to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import List, Optional
from langchain_core.tools import BaseTool

from framework.base_agent import BaseAgent
from framework.tool_registry import ToolRegistry


class TelecomAgent(BaseAgent):
    """Telecom Agent - Specialized agent for telecommunications data analysis

    This agent connects to the Java data service (port 8081) to provide:
    - Carrier information queries
    - Network performance statistics
    - Frequency band analysis
    - PRB utilization monitoring
    - Historical data analysis
    """

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o",
        temperature: float = 0,
        max_iterations: int = 10,
        verbose: bool = False,
        data_service_url: str = "http://localhost:8081/api/query",
    ):
        self._data_service_url = data_service_url
        self._data_service_available = False
        self._tools_initialized = False

        super().__init__(
            api_key=api_key,
            model=model,
            temperature=temperature,
            max_iterations=max_iterations,
            verbose=verbose,
        )

    def _register_default_tools(self) -> None:
        """Register telecom-specific tools"""
        registry = ToolRegistry()

        # Try to import and register data service tools
        try:
            from telecom_agent.data_service_tools import (
                query_telecom_data,
                get_carrier_info,
                get_network_stats,
                get_high_prb_sites,
                get_frequency_band_analysis,
                TELECOM_TOOLS,
            )

            for t in TELECOM_TOOLS:
                registry.register(t)
                self._tools.append(t)

            self._data_service_available = True
            self._tools_initialized = True

        except ImportError as e:
            print(f"Warning: Data service tools not available: {e}")
            self._data_service_available = False

        # Add built-in tools
        try:
            from tools import calculator, get_current_time
            registry.register(calculator)
            registry.register(get_current_time)
            self._tools.append(calculator)
            self._tools.append(get_current_time)
        except ImportError:
            pass

    def _build_system_prompt(self) -> str:
        """Build the system prompt for Telecom Agent"""
        base_prompt = """You are a specialized Telecom Data Analyst Agent.

Your capabilities:
1. Carrier Information - Query and compare mobile carriers (中国移动, 中国联通, 中国电信)
2. Network Statistics - Analyze uplink/downlink rates, site counts, coverage
3. Frequency Band Analysis - Analyze D频段, F频段, 1800MHz, 2100MHz bands
4. PRB Utilization - Identify high-load cells and sites
5. Historical Trends - Analyze network performance over time

Data Source: Java Microservice (MySQL database via port 8081)

When answering user queries:
- Use the data service tools to fetch real data
- Provide specific numbers and comparisons when available
- Format data in a clear, readable way with tables if appropriate
- If data service is unavailable, inform the user

Example queries you can handle:
- "显示所有运营商信息"
- "中国移动的站点数量和平均速率"
- "PRB利用率高于50%的站点"
- "各运营商的统计对比"
- "查询历史数据趋势"
"""

        if not self._data_service_available:
            base_prompt += """

⚠️ WARNING: Data service is currently unavailable. Please ensure the Java microservice is running on port 8081."""

        return base_prompt

    def is_data_service_available(self) -> bool:
        """Check if the data service is available"""
        return self._data_service_available

    def get_data_service_url(self) -> str:
        """Get the data service URL"""
        return self._data_service_url

    def check_data_service_health(self) -> dict:
        """Check the health of the data service"""
        if not self._data_service_available:
            return {"available": False, "message": "Data service tools not loaded"}

        try:
            import requests
            response = requests.get(
                f"{self._data_service_url}?type=carriers",
                timeout=5
            )
            if response.status_code == 200:
                return {"available": True, "message": "Data service is healthy"}
            else:
                return {"available": False, "message": f"Service returned status {response.status_code}"}
        except Exception as e:
            return {"available": False, "message": f"Connection failed: {str(e)}"}


class TelecomAgentWithRAG(TelecomAgent):
    """Telecom Agent with RAG knowledge base support"""

    def __init__(
        self,
        api_key: str,
        model: str = "gpt-4o",
        temperature: float = 0,
        max_iterations: int = 10,
        verbose: bool = False,
        data_service_url: str = "http://localhost:8081/api/query",
        knowledge_dir: str = None,
    ):
        self._knowledge_dir = knowledge_dir
        super().__init__(
            api_key=api_key,
            model=model,
            temperature=temperature,
            max_iterations=max_iterations,
            verbose=verbose,
            data_service_url=data_service_url,
        )

    def _register_default_tools(self) -> None:
        """Register telecom tools and RAG knowledge base"""
        # First register telecom tools
        super()._register_default_tools()

        # Add knowledge base if directory is provided
        if self._knowledge_dir:
            try:
                from knowledge_base import KnowledgeManager

                km = KnowledgeManager()
                km.load_knowledge(self._knowledge_dir)
                self.set_knowledge_manager(km)

                # Register knowledge search tool
                registry = ToolRegistry()

                @registry.register_function(
                    name="search_telecom_knowledge",
                    description="Search the telecom knowledge base for documentation, policies, and procedures.",
                )
                def search_kb(query: str) -> str:
                    results = km.search(query)
                    if results:
                        return "\n\n".join(results)
                    return "No relevant knowledge found."

                kb_tool = registry.get_tool("search_telecom_knowledge")
                if kb_tool:
                    self._tools.append(kb_tool)

            except ImportError as e:
                print(f"Warning: Could not load knowledge base: {e}")

    def _build_system_prompt(self) -> str:
        """Build system prompt with RAG capabilities"""
        base = super()._build_system_prompt()
        return base + """

Additional Capability:
- You also have access to a telecom knowledge base for policy and procedure queries.
- Use knowledge base for "how to", "policy", "procedure" type questions.
- Use data service for real-time network statistics and metrics.
"""
