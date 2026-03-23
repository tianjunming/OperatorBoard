"""MCP client for communicating with other agents."""

from typing import Any, Dict, List, Optional
import httpx

from agent_framework.mcp import MCPClient


class AgentMCPClient:
    """
    MCP client for inter-agent communication.

    Allows the operator agent to request data and actions
    from other agents in the system.
    """

    def __init__(
        self,
        agent_registry_url: str,
        timeout: float = 30.0,
    ):
        """
        Initialize the agent MCP client.

        Args:
            agent_registry_url: URL of the agent registry service
            timeout: Request timeout in seconds
        """
        self.agent_registry_url = agent_registry_url.rstrip("/")
        self.timeout = timeout

    async def list_agents(self) -> List[Dict[str, Any]]:
        """
        List all available agents.

        Returns:
            List of agent metadata
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(f"{self.agent_registry_url}/agents")
            response.raise_for_status()
            return response.json().get("agents", [])

    async def get_agent(self, agent_id: str) -> Dict[str, Any]:
        """
        Get agent details.

        Args:
            agent_id: Agent identifier
        Returns:
            Agent details
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.agent_registry_url}/agents/{agent_id}"
            )
            response.raise_for_status()
            return response.json()

    async def request_agent_data(
        self,
        agent_id: str,
        data_request: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Request data from a specific agent.

        Args:
            agent_id: Target agent ID
            data_request: Request specification with keys:
                - data_type: Type of data requested
                - filters: Optional filters
                - format: Response format preference
        Returns:
            Agent response
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.agent_registry_url}/agents/{agent_id}/data",
                json=data_request,
            )
            response.raise_for_status()
            return response.json()

    async def invoke_agent_capability(
        self,
        agent_id: str,
        capability: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Invoke a specific capability on an agent.

        Args:
            agent_id: Target agent ID
            capability: Capability name to invoke
            params: Capability parameters
        Returns:
            Capability execution result
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.agent_registry_url}/agents/{agent_id}/capabilities/{capability}",
                json=params or {},
            )
            response.raise_for_status()
            return response.json()

    async def broadcast_query(
        self,
        query: str,
        agent_types: Optional[List[str]] = None,
    ) -> List[Dict[str, Any]]:
        """
        Broadcast a query to multiple agents.

        Args:
            query: Query to broadcast
            agent_types: Filter by agent types (optional)
        Returns:
            List of responses from agents
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.agent_registry_url}/broadcast",
                json={
                    "query": query,
                    "agent_types": agent_types,
                },
            )
            response.raise_for_status()
            return response.json().get("responses", [])


class AgentCapabilityRegistry:
    """
    Registry of capabilities available from other agents.

    Maintains a local cache of agent capabilities for
    efficient capability lookup.
    """

    def __init__(self):
        """Initialize the registry."""
        self._capabilities: Dict[str, Dict[str, Any]] = {}
        self._agent_types: Dict[str, List[str]] = {}

    def register_capability(
        self,
        agent_id: str,
        capability: str,
        metadata: Dict[str, Any],
    ) -> None:
        """
        Register an agent capability.

        Args:
            agent_id: Agent identifier
            capability: Capability name
            metadata: Capability metadata
        """
        key = f"{agent_id}:{capability}"
        self._capabilities[key] = {
            "agent_id": agent_id,
            "capability": capability,
            **metadata,
        }

        if agent_id not in self._agent_types:
            self._agent_types[agent_id] = []
        if capability not in self._agent_types[agent_id]:
            self._agent_types[agent_id].append(capability)

    def find_capability(
        self,
        data_type: str,
    ) -> List[Dict[str, Any]]:
        """
        Find agents that can provide a specific data type.

        Args:
            data_type: Type of data needed
        Returns:
            List of matching capabilities
        """
        results = []
        for cap in self._capabilities.values():
            if cap.get("provides_data_type") == data_type:
                results.append(cap)
        return results

    def get_agent_capabilities(self, agent_id: str) -> List[str]:
        """
        Get all capabilities for an agent.

        Args:
            agent_id: Agent identifier
        Returns:
            List of capability names
        """
        return self._agent_types.get(agent_id, [])

    def list_all(self) -> Dict[str, Dict[str, Any]]:
        """Get all registered capabilities."""
        return self._capabilities.copy()
