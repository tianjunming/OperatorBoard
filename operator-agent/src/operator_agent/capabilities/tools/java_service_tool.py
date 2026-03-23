"""Java Microservice Tool for calling Java-based microservice APIs."""

from typing import Any, Dict, List, Optional
import httpx

from agent_framework.tools import BaseTool


class JavaMicroserviceTool(BaseTool):
    """
    Tool specifically designed for calling Java Spring Boot microservice APIs.

    Provides conveniences for common Java service patterns like
    REST endpoints, Swagger/OpenAPI conventions, and Spring Security.
    """

    name: str = "java_microservice"
    description: str = "Call Java Spring Boot microservice APIs with automatic JSON serialization"

    def __init__(
        self,
        service_name: str,
        base_url: str,
        api_prefix: str = "/api",
        timeout: float = 60.0,
        api_key: Optional[str] = None,
        **kwargs,
    ):
        """
        Initialize the Java microservice tool.

        Args:
            service_name: Name of the Java service
            base_url: Base URL of the service
            api_prefix: API prefix (default: /api)
            timeout: Request timeout in seconds
            api_key: Optional API key for authentication
        """
        super().__init__(**kwargs)
        self.service_name = service_name
        self.base_url = base_url.rstrip("/")
        self.api_prefix = api_prefix.rstrip("/")
        self.timeout = timeout
        self.api_key = api_key

    async def run(self, tool_input: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a Java microservice API call.

        Args:
            tool_input: Dict with keys:
                - endpoint: API endpoint (e.g., "/users/{id}")
                - method: HTTP method (default: GET)
                - path_params: Path parameters for URL templating
                - query_params: Query string parameters
                - body: Request body for POST/PUT
                - headers: Additional headers

        Returns:
            API response as dict
        """
        endpoint = tool_input.get("endpoint", "/")
        method = tool_input.get("method", "GET").upper()
        path_params = tool_input.get("path_params", {})
        query_params = tool_input.get("query_params")
        body = tool_input.get("body")
        headers = tool_input.get("headers", {})

        # Substitute path parameters in endpoint
        for key, value in path_params.items():
            endpoint = endpoint.replace(f"{{{key}}}", str(value))

        url = f"{self.base_url}{self.api_prefix}{endpoint}"

        request_headers = {"Content-Type": "application/json", **headers}
        if self.api_key:
            request_headers["X-API-Key"] = self.api_key

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.request(
                method=method,
                url=url,
                params=query_params,
                json=body,
                headers=request_headers,
            )

            return {
                "service": self.service_name,
                "endpoint": endpoint,
                "method": method,
                "status_code": response.status_code,
                "data": response.json() if response.text else None,
                "error": None if response.is_success else response.text,
            }

    async def call_endpoint(
        self,
        endpoint: str,
        method: str = "GET",
        path_params: Optional[Dict[str, Any]] = None,
        query_params: Optional[Dict[str, Any]] = None,
        body: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """
        Convenience method to call a specific endpoint.

        Args:
            endpoint: API endpoint
            method: HTTP method
            path_params: Path parameters
            query_params: Query parameters
            body: Request body
        Returns:
            API response
        """
        return await self.run({
            "endpoint": endpoint,
            "method": method,
            "path_params": path_params or {},
            "query_params": query_params,
            "body": body,
        })

    async def batch_call(
        self, calls: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Execute multiple API calls.

        Args:
            calls: List of call specifications
        Returns:
            List of responses
        """
        import asyncio
        tasks = [self.run(call) for call in calls]
        return await asyncio.gather(*tasks)


class JavaServiceRegistry:
    """
    Registry for managing multiple Java microservice tools.

    Allows centralized management of service connections.
    """

    def __init__(self):
        """Initialize the registry."""
        self._services: Dict[str, JavaMicroserviceTool] = {}

    def register(self, service_name: str, tool: JavaMicroserviceTool) -> None:
        """Register a Java microservice tool."""
        self._services[service_name] = tool

    def get(self, service_name: str) -> Optional[JavaMicroserviceTool]:
        """Get a service by name."""
        return self._services.get(service_name)

    def list_services(self) -> List[str]:
        """List all registered service names."""
        return list(self._services.keys())

    async def call_service(
        self,
        service_name: str,
        endpoint: str,
        **kwargs,
    ) -> Dict[str, Any]:
        """Call a registered service."""
        service = self.get(service_name)
        if not service:
            return {"error": f"Service '{service_name}' not found"}
        return await service.call_endpoint(endpoint, **kwargs)
