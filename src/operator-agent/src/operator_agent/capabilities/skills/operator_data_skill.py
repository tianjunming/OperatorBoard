"""Operator data fetching skill."""

from typing import Any, Dict, List, Optional
from datetime import datetime
import httpx

from agent_framework.skills import BaseSkill, SkillContext


class OperatorDataSkill(BaseSkill):
    """
    Skill for fetching latest operator data.

    Retrieves data from various operator systems including:
    - Network performance metrics
    - Subscriber statistics
    - Service usage patterns
    - Billing and revenue data
    """

    name: str = "operator_data_fetcher"
    description: str = "Fetch latest operator data from various sources"

    def __init__(
        self,
        data_sources: Optional[Dict[str, str]] = None,
        timeout: float = 60.0,
        **kwargs,
    ):
        """
        Initialize the operator data skill.

        Args:
            data_sources: Dict mapping data types to URLs
            timeout: Request timeout in seconds
        """
        super().__init__(**kwargs)
        self.data_sources = data_sources or {}
        self.timeout = timeout

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        """
        Execute the data fetching skill.

        Args:
            context: Skill context with input_data containing:
                - data_type: Type of data to fetch (network, subscriber, billing, etc.)
                - operator_id: Optional operator identifier
                - time_range: Optional time range for data
                - filters: Optional filters
        Returns:
            Fetched data
        """
        input_data = context.input_data
        data_type = input_data.get("data_type", "network")
        operator_id = input_data.get("operator_id")
        time_range = input_data.get("time_range")
        filters = input_data.get("filters", {})

        results = {}

        if data_type in ["network", "all"]:
            results["network"] = await self._fetch_network_data(
                operator_id, time_range, filters
            )

        if data_type in ["subscriber", "all"]:
            results["subscriber"] = await self._fetch_subscriber_data(
                operator_id, time_range, filters
            )

        if data_type in ["billing", "all"]:
            results["billing"] = await self._fetch_billing_data(
                operator_id, time_range, filters
            )

        if data_type in ["service", "all"]:
            results["service"] = await self._fetch_service_data(
                operator_id, time_range, filters
            )

        return {
            "timestamp": datetime.now().isoformat(),
            "data_type": data_type,
            "operator_id": operator_id,
            "results": results,
        }

    async def _fetch_network_data(
        self,
        operator_id: Optional[str],
        time_range: Optional[str],
        filters: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Fetch network performance data."""
        url = self.data_sources.get("network")
        if not url:
            return {"status": "unavailable", "message": "Network data source not configured"}

        params = {"operator_id": operator_id, "time_range": time_range}
        params.update(filters)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def _fetch_subscriber_data(
        self,
        operator_id: Optional[str],
        time_range: Optional[str],
        filters: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Fetch subscriber statistics."""
        url = self.data_sources.get("subscriber")
        if not url:
            return {"status": "unavailable", "message": "Subscriber data source not configured"}

        params = {"operator_id": operator_id, "time_range": time_range}
        params.update(filters)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def _fetch_billing_data(
        self,
        operator_id: Optional[str],
        time_range: Optional[str],
        filters: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Fetch billing and revenue data."""
        url = self.data_sources.get("billing")
        if not url:
            return {"status": "unavailable", "message": "Billing data source not configured"}

        params = {"operator_id": operator_id, "time_range": time_range}
        params.update(filters)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def _fetch_service_data(
        self,
        operator_id: Optional[str],
        time_range: Optional[str],
        filters: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Fetch service usage data."""
        url = self.data_sources.get("service")
        if not url:
            return {"status": "unavailable", "message": "Service data source not configured"}

        params = {"operator_id": operator_id, "time_range": time_range}
        params.update(filters)

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}


class MultiOperatorDataSkill(BaseSkill):
    """
    Skill for fetching data from multiple operators.

    Aggregates data from different operators for comparison
    and cross-operator analysis.
    """

    name: str = "multi_operator_data"
    description: str = "Fetch and compare data from multiple operators"

    def __init__(
        self,
        operators: Optional[List[Dict[str, Any]]] = None,
        **kwargs,
    ):
        """
        Initialize the multi-operator skill.

        Args:
            operators: List of operator configurations
        """
        super().__init__(**kwargs)
        self.operators = operators or []
        self._individual_skills: List[OperatorDataSkill] = []

        for op in self.operators:
            skill = OperatorDataSkill(data_sources=op.get("data_sources"))
            self._individual_skills.append(skill)

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        """
        Execute multi-operator data fetching.

        Args:
            context: Skill context
        Returns:
            Aggregated results from all operators
        """
        input_data = context.input_data
        data_type = input_data.get("data_type", "all")

        results = {}
        for i, operator in enumerate(self.operators):
            operator_id = operator.get("id", f"operator_{i}")
            skill_context = SkillContext(
                skill_name=self.name,
                input_data={
                    "data_type": data_type,
                    "operator_id": operator_id,
                    "time_range": input_data.get("time_range"),
                    "filters": input_data.get("filters", {}),
                },
            )
            skill = self._individual_skills[i]
            results[operator_id] = await skill.execute(skill_context)

        return {
            "timestamp": datetime.now().isoformat(),
            "operators_count": len(self.operators),
            "results": results,
        }
