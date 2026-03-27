"""Base FastAPI server for agent framework."""

from typing import Any, Dict, Optional, Type

from fastapi import FastAPI
from pydantic import BaseModel

from .errors import APIError, ErrorCode, get_error_response
from .models import CapabilityInfo


class BaseAgentServer:
    """
    Base class for agent API servers.

    Provides common functionality:
    - Singleton agent instance management
    - Standard health check endpoint
    - Standard capabilities endpoint
    - Error handling

    Subclasses should:
    1. Set the `agent_class` class variable to the agent class
    2. Implement `create_agent()` to create agent instance
    3. Optionally add custom endpoints in `setup_routes()`
    """

    agent_class: Type = None
    app: Optional[FastAPI] = None
    _agent: Optional[Any] = None

    def __init__(
        self,
        title: str = "Agent API",
        version: str = "1.0.0",
        description: str = "Agent API Server",
    ):
        """
        Initialize the base agent server.

        Args:
            title: API title
            version: API version
            description: API description
        """
        self.title = title
        self.version = version
        self.description = description
        self._app: Optional[FastAPI] = None

    @property
    def app(self) -> FastAPI:
        """Get or create the FastAPI app."""
        if self._app is None:
            self._app = FastAPI(
                title=self.title,
                version=self.version,
                description=self.description,
            )
            self._setup_default_routes()
            self.setup_routes()
        return self._app

    @app.setter
    def app(self, value: FastAPI):
        """Allow setting app directly."""
        self._app = value

    def _setup_default_routes(self) -> None:
        """Setup default routes (health, capabilities)."""

        @self._app.get("/health")
        async def health_check() -> Dict[str, Any]:
            """Health check endpoint."""
            return {"status": "healthy", "service": self.title}

        @self._app.get("/capabilities")
        async def get_capabilities() -> CapabilityInfo:
            """Get agent capabilities."""
            agent = await self.get_agent()
            caps = self._get_capabilities_from_agent(agent)
            return CapabilityInfo(**caps)

    def setup_routes(self) -> None:
        """
        Setup custom routes.

        Override in subclasses to add custom endpoints.
        """
        pass

    async def get_agent(self) -> Any:
        """
        Get or create the agent singleton.

        Returns:
            Agent instance

        Raises:
            APIError: If agent cannot be created
        """
        if self._agent is None:
            if self.agent_class is None:
                raise APIError(
                    code=ErrorCode.AGENT_NOT_INITIALIZED,
                    message="Agent class not configured",
                    status_code=500,
                )
            self._agent = await self.create_agent()
        return self._agent

    async def create_agent(self) -> Any:
        """
        Create the agent instance.

        Override in subclasses to customize agent creation.

        Returns:
            Created agent instance
        """
        raise NotImplementedError("Subclasses must implement create_agent()")

    def _get_capabilities_from_agent(self, agent: Any) -> Dict[str, Any]:
        """
        Extract capabilities from agent.

        Supports different agent implementations.

        Args:
            agent: Agent instance

        Returns:
            Capabilities dict
        """
        if hasattr(agent, "get_capabilities"):
            return agent.get_capabilities()
        elif hasattr(agent, "get_capabilities_summary"):
            return agent.get_capabilities_summary()
        else:
            return {
                "name": getattr(agent, "name", "Unknown"),
                "description": getattr(agent, "description", ""),
                "tools": list(getattr(agent, "_tools", {}).keys()),
                "skills": list(getattr(agent, "_skills", {}).keys()),
            }

    def set_agent(self, agent: Any) -> None:
        """
        Set the agent instance directly.

        Args:
            agent: Agent instance to use
        """
        self._agent = agent

    def run(
        self,
        host: str = "0.0.0.0",
        port: int = 8000,
        **kwargs,
    ) -> None:
        """
        Run the server.

        Args:
            host: Server host
            port: Server port
            **kwargs: Additional uvicorn arguments
        """
        import uvicorn

        uvicorn.run(self.app, host=host, port=port, **kwargs)
