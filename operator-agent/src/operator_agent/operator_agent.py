"""Operator Agent implementation with all capabilities."""

from typing import Any, Dict, List, Optional
from langchain_core.documents import Document

from agent_framework.core import BaseAgent, AgentConfig
from agent_framework.tools import BaseTool
from agent_framework.skills import BaseSkill, SkillContext
from agent_framework.rag import RAGRetriever

from .capabilities.tools import HTTPServiceTool, JavaMicroserviceTool
from .capabilities.rag import TelecomRAGRetriever, TelecomVectorStore
from .capabilities.mcp import AgentMCPClient, SystemDataSource, RESTDataSource
from .capabilities.skills import (
    OperatorDataSkill,
    MultiOperatorDataSkill,
    DataAggregatorSkill,
    DataEnricherSkill,
    ReportGeneratorSkill,
)


class OperatorAgent(BaseAgent):
    """
    Operator Agent - a production-ready agent built on agent-framework.

    Key capabilities:
    - Tools: HTTP/Java microservice API calls via HTTPServiceTool, JavaMicroserviceTool
    - RAG: Telecom simulation knowledge retrieval via TelecomRAGRetriever
    - MCP: Inter-agent and system data access via AgentMCPClient, SystemDataSource
    - Skills: Operator data fetching and summarization via OperatorDataSkill, etc.
    """

    def __init__(self, config: AgentConfig):
        """Initialize the Operator Agent."""
        super().__init__(config)

        # Capability managers
        self._java_service_registry: Dict[str, JavaMicroserviceTool] = {}
        self._http_services: Dict[str, HTTPServiceTool] = {}
        self._mcp_clients: Dict[str, AgentMCPClient] = {}
        self._system_sources: Dict[str, SystemDataSource] = {}
        self._telecom_rag: Optional[TelecomRAGRetriever] = None

        # Execution tracking
        self._tool_results: Dict[str, Any] = {}
        self._execution_history: List[Dict[str, Any]] = []

    async def initialize(self) -> None:
        """Initialize the agent and all its components."""
        await super().initialize()
        self._log("OperatorAgent initialized with capabilities")

    async def run(self, input: str) -> str:
        """
        Run the agent with user input.

        Args:
            input: User input string
        Returns:
            Agent response
        """
        self._execution_history.append({"input": input, "type": "user_input"})
        response = f"OperatorAgent received: {input}"
        self._execution_history.append({"output": response, "type": "agent_response"})
        return response

    # ============ Tool Management ============

    async def add_java_service(
        self,
        service_name: str,
        base_url: str,
        api_prefix: str = "/api",
        **kwargs,
    ) -> JavaMicroserviceTool:
        """
        Add a Java microservice tool.

        Args:
            service_name: Name of the service
            base_url: Base URL of the service
            api_prefix: API prefix (default: /api)
            **kwargs: Additional configuration
        Returns:
            Created JavaMicroserviceTool
        """
        tool = JavaMicroserviceTool(
            service_name=service_name,
            base_url=base_url,
            api_prefix=api_prefix,
            **kwargs,
        )
        await self.add_tool(tool)
        self._java_service_registry[service_name] = tool
        return tool

    async def add_http_service(
        self,
        service_name: str,
        base_url: str,
        **kwargs,
    ) -> HTTPServiceTool:
        """
        Add an HTTP service tool.

        Args:
            service_name: Name of the service
            base_url: Base URL of the service
            **kwargs: Additional configuration
        Returns:
            Created HTTPServiceTool
        """
        tool = HTTPServiceTool(base_url=base_url, **kwargs)
        await self.add_tool(tool)
        self._http_services[service_name] = tool
        return tool

    async def call_java_service(
        self,
        service_name: str,
        endpoint: str,
        method: str = "GET",
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Call a Java microservice.

        Args:
            service_name: Service name
            endpoint: API endpoint
            method: HTTP method
            **kwargs: Additional parameters
        Returns:
            API response
        """
        tool = self._java_service_registry.get(service_name)
        if not tool:
            return {"error": f"Service '{service_name}' not found"}

        return await tool.call_endpoint(endpoint, method=method, **kwargs)

    # ============ NL2SQL Service Methods ============

    async def query_nl2sql(
        self,
        natural_language_query: str,
        max_results: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Query operator data using natural language via NL2SQL service.

        Args:
            natural_language_query: Natural language query
            max_results: Maximum number of results
        Returns:
            Query results with generated SQL and data
        """
        body = {"naturalLanguageQuery": natural_language_query}
        if max_results:
            body["maxResults"] = max_results

        return await self.call_java_service(
            service_name="nl2sql-service",
            endpoint="/query",
            method="POST",
            body=body,
        )

    async def get_latest_indicators(
        self,
        operator_name: Optional[str] = None,
        frequency_bands: Optional[List[str]] = None,
        limit: int = 100,
    ) -> Dict[str, Any]:
        """
        Get latest indicator data from the nl2sql service.

        Args:
            operator_name: Filter by operator name
            frequency_bands: Filter by frequency bands
            limit: Maximum number of results
        Returns:
            Latest indicator data
        """
        params = {"limit": limit}
        if operator_name:
            params["operatorName"] = operator_name
        if frequency_bands:
            params["frequencyBands"] = frequency_bands

        return await self.call_java_service(
            service_name="nl2sql-service",
            endpoint="/indicators/latest",
            method="GET",
            query_params=params,
        )

    async def compare_indicators(
        self,
        operator_name: str,
        current_month: str,
        compare_month: str,
        site_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Compare indicators between two months.

        Args:
            operator_name: Operator name
            current_month: Current month (YYYY-MM)
            compare_month: Compare month (YYYY-MM)
            site_code: Optional site code filter
        Returns:
            Comparison results with change rates
        """
        params = {
            "operatorName": operator_name,
            "currentMonth": current_month,
            "compareMonth": compare_month,
        }
        if site_code:
            params["siteCode"] = site_code

        return await self.call_java_service(
            service_name="nl2sql-service",
            endpoint="/indicators/compare",
            method="GET",
            query_params=params,
        )

    async def get_indicator_trend(
        self,
        operator_name: str,
        start_time: str,
        end_time: str,
        cell_id: Optional[str] = None,
        site_code: Optional[str] = None,
        limit: int = 1000,
    ) -> Dict[str, Any]:
        """
        Get indicator trend data for a time range.

        Args:
            operator_name: Operator name
            start_time: Start datetime (ISO format)
            end_time: End datetime (ISO format)
            cell_id: Optional cell ID filter
            site_code: Optional site code filter
            limit: Maximum number of results
        Returns:
            Trend data
        """
        params = {
            "operatorName": operator_name,
            "startTime": start_time,
            "endTime": end_time,
            "limit": limit,
        }
        if cell_id:
            params["cellId"] = cell_id
        if site_code:
            params["siteCode"] = site_code

        return await self.call_java_service(
            service_name="nl2sql-service",
            endpoint="/indicators/trend",
            method="GET",
            query_params=params,
        )

    async def get_available_times(
        self,
        operator_name: Optional[str] = None,
        site_code: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Get available time points in the database.

        Args:
            operator_name: Optional operator filter
            site_code: Optional site code filter
        Returns:
            List of available time points
        """
        params = {}
        if operator_name:
            params["operatorName"] = operator_name
        if site_code:
            params["siteCode"] = site_code

        return await self.call_java_service(
            service_name="nl2sql-service",
            endpoint="/times",
            method="GET",
            query_params=params,
        )

    # ============ RAG Management ============

    def set_telecom_rag(self, retriever: TelecomRAGRetriever) -> None:
        """
        Set the telecom RAG retriever.

        Args:
            retriever: TelecomRAGRetriever instance
        """
        self._telecom_rag = retriever

    async def query_telecom_knowledge(
        self,
        query: str,
        category: Optional[str] = None,
        k: int = 5,
    ) -> List[Document]:
        """
        Query telecom simulation knowledge.

        Args:
            query: Search query
            category: Category filter (protocols, simulations, equipment)
            k: Number of results
        Returns:
            List of relevant documents
        """
        if not self._telecom_rag:
            return []

        if category == "protocols":
            return await self._telecom_rag.retrieve_protocol_info(query, k=k)
        elif category == "simulations":
            return await self._telecom_rag.retrieve_simulation_configs(query, k=k)
        elif category == "equipment":
            return await self._telecom_rag.retrieve_equipment_info(query, k=k)
        else:
            return await self._telecom_rag._retriever.retrieve(query, k=k)

    # ============ MCP Management ============

    async def add_mcp_client(
        self,
        client_name: str,
        agent_registry_url: str,
        **kwargs,
    ) -> AgentMCPClient:
        """
        Add an MCP client for agent communication.

        Args:
            client_name: Name for this client
            agent_registry_url: URL of the agent registry
            **kwargs: Additional configuration
        Returns:
            Created AgentMCPClient
        """
        client = AgentMCPClient(agent_registry_url=agent_registry_url, **kwargs)
        self._mcp_clients[client_name] = client
        return client

    async def request_agent_data(
        self,
        client_name: str,
        agent_id: str,
        data_request: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Request data from another agent.

        Args:
            client_name: MCP client name
            agent_id: Target agent ID
            data_request: Data request specification
        Returns:
            Agent response
        """
        client = self._mcp_clients.get(client_name)
        if not client:
            return {"error": f"MCP client '{client_name}' not found"}
        return await client.request_agent_data(agent_id, data_request)

    def add_system_source(
        self,
        source_name: str,
        source: SystemDataSource,
    ) -> None:
        """
        Add a system data source.

        Args:
            source_name: Name for this source
            source: SystemDataSource instance
        """
        self._system_sources[source_name] = source

    async def fetch_system_data(
        self,
        source_name: str,
        query: str,
        **kwargs,
    ) -> Any:
        """
        Fetch data from a system source.

        Args:
            source_name: Source name
            query: Query for the source
            **kwargs: Additional parameters
        Returns:
            Fetched data
        """
        source = self._system_sources.get(source_name)
        if not source:
            return {"error": f"System source '{source_name}' not found"}
        return await source.fetch(query, **kwargs)

    # ============ Skill Management ============

    async def fetch_operator_data(
        self,
        data_type: str = "all",
        operator_id: Optional[str] = None,
        time_range: Optional[str] = None,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Fetch operator data using OperatorDataSkill.

        Args:
            data_type: Type of data (network, subscriber, billing, service, all)
            operator_id: Operator identifier
            time_range: Time range for data
            **kwargs: Additional parameters
        Returns:
            Fetched operator data
        """
        skill = OperatorDataSkill()
        context = SkillContext(
            skill_name="operator_data_fetcher",
            input_data={
                "data_type": data_type,
                "operator_id": operator_id,
                "time_range": time_range,
                "filters": kwargs,
            },
        )
        return await skill.execute(context)

    async def aggregate_data(
        self,
        data_sets: List[Dict[str, Any]],
        aggregation_type: str = "merge",
        group_by: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Aggregate data using DataAggregatorSkill.

        Args:
            data_sets: List of data sets to aggregate
            aggregation_type: Type of aggregation
            group_by: Field to group by
        Returns:
            Aggregated results
        """
        skill = DataAggregatorSkill()
        context = SkillContext(
            skill_name="data_aggregator",
            input_data={
                "data_sets": data_sets,
                "aggregation_type": aggregation_type,
                "group_by": group_by,
            },
        )
        return await skill.execute(context)

    async def generate_report(
        self,
        data: Dict[str, Any],
        report_type: str = "summary",
        format: str = "markdown",
        title: str = "Operator Data Report",
    ) -> Dict[str, Any]:
        """
        Generate a report using ReportGeneratorSkill.

        Args:
            data: Data to include in report
            report_type: Type of report
            format: Output format
            title: Report title
        Returns:
            Generated report
        """
        skill = ReportGeneratorSkill()
        context = SkillContext(
            skill_name="report_generator",
            input_data={
                "data": data,
                "report_type": report_type,
                "format": format,
                "title": title,
            },
        )
        return await skill.execute(context)

    # ============ Utility Methods ============

    def get_execution_history(self) -> List[Dict[str, Any]]:
        """Get the execution history."""
        return self._execution_history.copy()

    def get_capabilities_summary(self) -> Dict[str, Any]:
        """Get a summary of all registered capabilities."""
        return {
            "tools": {
                "java_services": list(self._java_service_registry.keys()),
                "http_services": list(self._http_services.keys()),
            },
            "mcp_clients": list(self._mcp_clients.keys()),
            "system_sources": list(self._system_sources.keys()),
            "telecom_rag": self._telecom_rag is not None,
            "skills": {
                "count": len(self._skills),
                "names": list(self._skills.keys()),
            },
        }

    def _log(self, message: str) -> None:
        """Log a message."""
        print(f"[OperatorAgent] {message}")


class OperatorAgentFactory:
    """Factory for creating OperatorAgent instances."""

    @staticmethod
    def create_default() -> OperatorAgent:
        """Create a default OperatorAgent."""
        config = AgentConfig(
            name="OperatorAgent",
            description="A production operator agent with tool and skill support",
            model_name="claude-3-sonnet-20240229",
        )
        return OperatorAgent(config)

    @staticmethod
    def create_with_config(config: AgentConfig) -> OperatorAgent:
        """Create an OperatorAgent with custom config."""
        return OperatorAgent(config)

    @staticmethod
    async def create_with_capabilities(
        config: AgentConfig,
        java_services: Optional[List[Dict[str, str]]] = None,
        http_services: Optional[List[Dict[str, str]]] = None,
        mcp_clients: Optional[List[Dict[str, str]]] = None,
    ) -> OperatorAgent:
        """
        Create an OperatorAgent with configured capabilities.

        Args:
            config: Agent configuration
            java_services: List of Java service configs
            http_services: List of HTTP service configs
            mcp_clients: List of MCP client configs
        Returns:
            Configured OperatorAgent
        """
        agent = OperatorAgent(config)
        await agent.initialize()

        if java_services:
            for svc in java_services:
                await agent.add_java_service(
                    service_name=svc["name"],
                    base_url=svc["base_url"],
                    api_prefix=svc.get("api_prefix", "/api"),
                )

        if http_services:
            for svc in http_services:
                await agent.add_http_service(
                    service_name=svc["name"],
                    base_url=svc["base_url"],
                )

        if mcp_clients:
            for client in mcp_clients:
                await agent.add_mcp_client(
                    client_name=client["name"],
                    agent_registry_url=client["registry_url"],
                )

        return agent

    @staticmethod
    async def create_from_config(
        config: AgentConfig,
        config_dir: Optional[str] = None,
    ) -> OperatorAgent:
        """
        Create an OperatorAgent loading services from YAML config.

        Args:
            config: Agent configuration
            config_dir: Directory containing config files
        Returns:
            Configured OperatorAgent
        """
        from .config import load_operator_config

        operator_config = load_operator_config(config_dir)
        java_services = operator_config.get_java_services()

        return await OperatorAgentFactory.create_with_capabilities(
            config=config,
            java_services=java_services if java_services else None,
        )
