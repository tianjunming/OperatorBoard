"""Data aggregator skill for combining and processing operator data."""

from typing import Any, Dict, List, Optional
from datetime import datetime
from collections import defaultdict

from agent_framework.skills import BaseSkill, SkillContext


class DataAggregatorSkill(BaseSkill):
    """
    Skill for aggregating and processing data from multiple sources.

    Combines data from different operators and data types,
    performs calculations, and provides summarized views.
    """

    name: str = "data_aggregator"
    description: str = "Aggregate and summarize data from multiple sources"

    def __init__(self, **kwargs):
        """Initialize the data aggregator skill."""
        super().__init__(**kwargs)

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        """
        Execute data aggregation.

        Args:
            context: Skill context with input_data containing:
                - data_sets: List of data sets to aggregate
                - aggregation_type: Type of aggregation (sum, avg, min, max, etc.)
                - group_by: Field to group by
                - filters: Optional filters to apply
        Returns:
            Aggregated data results
        """
        input_data = context.input_data
        data_sets = input_data.get("data_sets", [])
        aggregation_type = input_data.get("aggregation_type", "merge")
        group_by = input_data.get("group_by")
        filters = input_data.get("filters", {})

        if aggregation_type == "merge":
            result = self._merge_data_sets(data_sets)
        elif aggregation_type == "sum":
            result = self._sum_numeric_fields(data_sets, group_by)
        elif aggregation_type == "avg":
            result = self._average_numeric_fields(data_sets, group_by)
        elif aggregation_type == "compare":
            result = self._compare_data_sets(data_sets)
        else:
            result = {"error": f"Unknown aggregation type: {aggregation_type}"}

        return {
            "timestamp": datetime.now().isoformat(),
            "aggregation_type": aggregation_type,
            "data_sets_count": len(data_sets),
            "result": result,
        }

    def _merge_data_sets(self, data_sets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Merge multiple data sets into one list."""
        merged = []
        for dataset in data_sets:
            if isinstance(dataset, list):
                merged.extend(dataset)
            elif isinstance(dataset, dict):
                merged.append(dataset)
        return merged

    def _sum_numeric_fields(
        self, data_sets: List[Dict[str, Any]], group_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """Sum numeric fields across data sets."""
        if group_by:
            grouped = defaultdict(lambda: defaultdict(float))
            for dataset in data_sets:
                if isinstance(dataset, dict):
                    key = dataset.get(group_by, "unknown")
                    for field, value in dataset.items():
                        if isinstance(value, (int, float)) and field != group_by:
                            grouped[key][field] += value
            return {k: dict(v) for k, v in grouped.items()}

        totals = defaultdict(float)
        for dataset in data_sets:
            if isinstance(dataset, dict):
                for field, value in dataset.items():
                    if isinstance(value, (int, float)):
                        totals[field] += value
        return dict(totals)

    def _average_numeric_fields(
        self, data_sets: List[Dict[str, Any]], group_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """Average numeric fields across data sets."""
        if group_by:
            grouped = defaultdict(lambda: {"sum": defaultdict(float), "count": defaultdict(int)})
            for dataset in data_sets:
                if isinstance(dataset, dict):
                    key = dataset.get(group_by, "unknown")
                    for field, value in dataset.items():
                        if isinstance(value, (int, float)) and field != group_by:
                            grouped[key]["sum"][field] += value
                            grouped[key]["count"][field] += 1

            result = {}
            for key, data in grouped.items():
                result[key] = {
                    field: data["sum"][field] / data["count"][field]
                    if data["count"][field] > 0 else 0
                    for field in data["sum"]
                }
            return result

        totals = defaultdict(float)
        counts = defaultdict(int)
        for dataset in data_sets:
            if isinstance(dataset, dict):
                for field, value in dataset.items():
                    if isinstance(value, (int, float)):
                        totals[field] += value
                        counts[field] += 1
        return {
            field: totals[field] / counts[field] if counts[field] > 0 else 0
            for field in totals
        }

    def _compare_data_sets(self, data_sets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Compare data sets side by side."""
        comparison = {
            "datasets": [],
            "common_fields": set(),
            "all_fields": set(),
        }

        if not data_sets:
            return comparison

        for i, dataset in enumerate(data_sets):
            if isinstance(dataset, dict):
                comparison["datasets"].append({
                    "index": i,
                    "data": dataset,
                    "fields": set(dataset.keys()),
                })
                if i == 0:
                    comparison["common_fields"] = set(dataset.keys())
                else:
                    comparison["common_fields"] &= set(dataset.keys())
                comparison["all_fields"] |= set(dataset.keys())

        comparison["common_fields"] = list(comparison["common_fields"])
        comparison["all_fields"] = list(comparison["all_fields"])

        return comparison


class DataEnricherSkill(BaseSkill):
    """
    Skill for enriching data with additional context.

    Adds derived fields, lookups, and transformations
    to raw data.
    """

    name: str = "data_enricher"
    description: str = "Enrich data with additional context and derived fields"

    def __init__(
        self,
        enrichment_rules: Optional[Dict[str, Any]] = None,
        lookup_tables: Optional[Dict[str, Dict[str, str]]] = None,
        **kwargs,
    ):
        """
        Initialize the data enricher.

        Args:
            enrichment_rules: Rules for deriving new fields
            lookup_tables: Tables for value lookups
        """
        super().__init__(**kwargs)
        self.enrichment_rules = enrichment_rules or {}
        self.lookup_tables = lookup_tables or {}

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        """
        Execute data enrichment.

        Args:
            context: Skill context with input_data containing:
                - data: Data to enrich
                - rules: Optional override rules
                - lookups: Optional override lookup tables
        Returns:
            Enriched data
        """
        input_data = context.input_data
        data = input_data.get("data", {})
        rules = input_data.get("rules", self.enrichment_rules)
        lookups = input_data.get("lookups", self.lookup_tables)

        enriched = self._deep_copy(data)
        self._apply_enrichment_rules(enriched, rules)
        self._apply_lookups(enriched, lookups)

        return {
            "timestamp": datetime.now().isoformat(),
            "original": data,
            "enriched": enriched,
            "rules_applied": list(rules.keys()),
        }

    def _deep_copy(self, obj: Any) -> Any:
        """Create a deep copy of an object."""
        if isinstance(obj, dict):
            return {k: self._deep_copy(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._deep_copy(item) for item in obj]
        else:
            return obj

    def _apply_enrichment_rules(
        self, data: Any, rules: Dict[str, Any]
    ) -> None:
        """Apply enrichment rules to data."""
        if isinstance(data, dict):
            for field, rule in rules.items():
                if field in data:
                    rule_type = rule.get("type")
                    if rule_type == "derived":
                        data[f"{field}_derived"] = self._compute_derived(
                            data[field], rule
                        )
                    elif rule_type == "calculated":
                        data[f"{field}_calculated"] = self._compute_calculated(
                            data, rule
                        )
            for value in data.values():
                self._apply_enrichment_rules(value, rules)

        elif isinstance(data, list):
            for item in data:
                self._apply_enrichment_rules(item, rules)

    def _compute_derived(self, value: Any, rule: Dict[str, Any]) -> Any:
        """Compute a derived value."""
        operation = rule.get("operation", "identity")
        if operation == "upper":
            return str(value).upper()
        elif operation == "lower":
            return str(value).lower()
        elif operation == "length":
            return len(str(value))
        elif operation == "round":
            return round(float(value), rule.get("decimals", 2))
        return value

    def _compute_calculated(self, data: Dict[str, Any], rule: Dict[str, Any]) -> Any:
        """Compute a calculated field."""
        formula = rule.get("formula")
        if not formula:
            return None

        try:
            return eval(formula, {"__builtins__": {}}, data)
        except Exception:
            return None

    def _apply_lookups(
        self, data: Any, lookups: Dict[str, Dict[str, str]]
    ) -> None:
        """Apply lookup tables to data."""
        if isinstance(data, dict):
            for field, lookup_table in lookups.items():
                if field in data and data[field] in lookup_table:
                    data[f"{field}_label"] = lookup_table[data[field]]
            for value in data.values():
                self._apply_lookups(value, lookups)

        elif isinstance(data, list):
            for item in data:
                self._apply_lookups(item, lookups)
