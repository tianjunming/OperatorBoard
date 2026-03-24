"""System data source for getting data from external systems."""

from typing import Any, Dict, List, Optional, Callable
import httpx
from enum import Enum


class DataSourceType(str, Enum):
    """Types of external data sources."""

    REST_API = "rest_api"
    GRAPHQL = "graphql"
    DATABASE = "database"
    MESSAGE_QUEUE = "message_queue"
    FILE = "file"


class SystemDataSource:
    """
    Unified interface for accessing external system data.

    Supports multiple data source types and provides
    a consistent interface for data retrieval.
    """

    def __init__(self, source_type: DataSourceType):
        """
        Initialize the data source.

        Args:
            source_type: Type of data source
        """
        self.source_type = source_type
        self._config: Dict[str, Any] = {}
        self._transformers: List[Callable] = []

    def configure(self, **config) -> None:
        """Configure the data source."""
        self._config.update(config)

    def add_transformer(self, transformer: Callable[[Any], Any]) -> None:
        """
        Add a data transformer.

        Transformers are applied to raw data before returning.

        Args:
            transformer: Function to transform data
        """
        self._transformers.append(transformer)

    def _apply_transformers(self, data: Any) -> Any:
        """Apply all transformers to data."""
        for transformer in self._transformers:
            data = transformer(data)
        return data

    async def fetch(
        self,
        query: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """
        Fetch data from the source.

        Args:
            query: Query or endpoint identifier
            params: Query parameters
        Returns:
            Fetched data
        """
        raise NotImplementedError

    async def fetch_all(self) -> List[Any]:
        """Fetch all available data."""
        raise NotImplementedError


class RESTDataSource(SystemDataSource):
    """
    REST API data source.

    Fetches data from RESTful APIs.
    """

    def __init__(self, base_url: str, **kwargs):
        """
        Initialize the REST data source.

        Args:
            base_url: Base URL of the API
            **kwargs: Additional configuration
        """
        super().__init__(DataSourceType.REST_API)
        self.base_url = base_url.rstrip("/")
        self._timeout = kwargs.get("timeout", 30.0)
        self._headers = kwargs.get("headers", {})

    async def fetch(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
    ) -> Any:
        """
        Fetch data from a REST endpoint.

        Args:
            endpoint: API endpoint
            params: Query parameters
        Returns:
            Response data
        """
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.get(url, params=params, headers=self._headers)
            response.raise_for_status()
            data = response.json()
            return self._apply_transformers(data)

    async def fetch_all(self) -> List[Any]:
        """Fetch from multiple endpoints."""
        endpoints = self._config.get("endpoints", [])
        results = []
        for endpoint in endpoints:
            try:
                data = await self.fetch(endpoint)
                if isinstance(data, list):
                    results.extend(data)
                else:
                    results.append(data)
            except Exception:
                pass
        return results


class DataAggregator:
    """
    Aggregates data from multiple system sources.

    Combines data from different sources and provides
    a unified query interface.
    """

    def __init__(self):
        """Initialize the aggregator."""
        self._sources: Dict[str, SystemDataSource] = {}

    def add_source(self, name: str, source: SystemDataSource) -> None:
        """
        Add a data source.

        Args:
            name: Source name
            source: Data source instance
        """
        self._sources[name] = source

    def remove_source(self, name: str) -> None:
        """Remove a data source."""
        if name in self._sources:
            del self._sources[name]

    async def fetch_from(
        self,
        source_name: str,
        query: str,
        **kwargs,
    ) -> Any:
        """
        Fetch data from a specific source.

        Args:
            source_name: Name of the source
            query: Query for the source
            **kwargs: Additional parameters
        Returns:
            Fetched data
        """
        if source_name not in self._sources:
            raise ValueError(f"Source '{source_name}' not found")
        return await self._sources[source_name].fetch(query, **kwargs)

    async def aggregate(
        self,
        queries: Dict[str, str],
    ) -> Dict[str, Any]:
        """
        Aggregate data from multiple sources.

        Args:
            queries: Dict mapping source names to queries
        Returns:
            Dict mapping source names to results
        """
        results = {}
        for source_name, query in queries.items():
            if source_name in self._sources:
                try:
                    results[source_name] = await self._sources[source_name].fetch(query)
                except Exception as e:
                    results[source_name] = {"error": str(e)}
        return results

    def list_sources(self) -> List[str]:
        """List all registered source names."""
        return list(self._sources.keys())
