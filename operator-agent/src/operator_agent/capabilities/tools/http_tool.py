"""HTTP Service Tool for calling microservice APIs."""

from typing import Any, Dict, Optional
import httpx

from agent_framework.tools import BaseTool


class HTTPServiceTool(BaseTool):
    """
    Tool for calling HTTP-based microservice APIs.

    Supports GET, POST, PUT, DELETE methods with configurable
    base URL, headers, and authentication.
    """

    name: str = "http_service"
    description: str = "Call HTTP-based microservice APIs"

    def __init__(
        self,
        base_url: str,
        default_headers: Optional[Dict[str, str]] = None,
        timeout: float = 30.0,
        auth_token: Optional[str] = None,
        **kwargs,
    ):
        """
        Initialize the HTTP service tool.

        Args:
            base_url: Base URL for the microservice
            default_headers: Default headers to include
            timeout: Request timeout in seconds
            auth_token: Optional authentication token
        """
        super().__init__(**kwargs)
        self.base_url = base_url.rstrip("/")
        self.default_headers = default_headers or {}
        self.timeout = timeout
        self.auth_token = auth_token
        self._client: Optional[httpx.AsyncClient] = None

    async def run(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute an HTTP request.

        Args:
            tool_input: Dict with keys:
                - method: HTTP method (GET, POST, PUT, DELETE)
                - path: API path (appended to base_url)
                - params: Query parameters (optional)
                - json_data: JSON body (optional)
                - headers: Additional headers (optional)

        Returns:
            Response data
        """
        method = tool_input.get("method", "GET").upper()
        path = tool_input.get("path", "/")
        params = tool_input.get("params")
        json_data = tool_input.get("json_data")
        headers = tool_input.get("headers", {})

        url = f"{self.base_url}/{path.lstrip('/')}"

        request_headers = {**self.default_headers, **headers}
        if self.auth_token:
            request_headers["Authorization"] = f"Bearer {self.auth_token}"

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.request(
                method=method,
                url=url,
                params=params,
                json=json_data,
                headers=request_headers,
            )
            response.raise_for_status()
            return {
                "status_code": response.status_code,
                "data": response.json() if response.text else None,
                "headers": dict(response.headers),
            }


class HTTPServiceToolFactory:
    """Factory for creating HTTPServiceTool instances."""

    @staticmethod
    def create_from_config(config: Dict[str, Any]) -> HTTPServiceTool:
        """
        Create an HTTPServiceTool from configuration.

        Args:
            config: Tool configuration with base_url, timeout, etc.
        Returns:
            HTTPServiceTool instance
        """
        return HTTPServiceTool(
            base_url=config.get("base_url", "http://localhost:8080"),
            default_headers=config.get("headers", {}),
            timeout=config.get("timeout", 30.0),
            auth_token=config.get("auth_token"),
        )
