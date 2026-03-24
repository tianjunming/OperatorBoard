"""Telecom RAG retriever for knowledge queries."""

from typing import Any, Dict, List, Optional, Tuple
from langchain_core.documents import Document

from agent_framework.rag import RAGRetriever


class TelecomRAGRetriever:
    """
    RAG retriever specialized for telecom simulation knowledge.

    Provides intelligent retrieval of telecom-related information
    with domain-specific filtering and ranking.
    """

    def __init__(self, base_retriever: RAGRetriever):
        """
        Initialize the telecom RAG retriever.

        Args:
            base_retriever: Base RAGRetriever instance
        """
        self._retriever = base_retriever

    async def retrieve_protocol_info(
        self,
        query: str,
        protocol_types: Optional[List[str]] = None,
        k: int = 5,
    ) -> List[Document]:
        """
        Retrieve protocol-related information.

        Args:
            query: Search query
            protocol_types: Filter by specific protocol types
            k: Number of results
        Returns:
            List of relevant documents
        """
        filter_meta = {"type": "protocol"}
        if protocol_types:
            filter_meta["name"] = {"$in": protocol_types}

        return await self._retriever.retrieve(
            query=query,
            k=k,
            filter_metadata=filter_meta,
        )

    async def retrieve_simulation_configs(
        self,
        query: str,
        network_type: Optional[str] = None,
        k: int = 5,
    ) -> List[Document]:
        """
        Retrieve simulation configurations.

        Args:
            query: Search query
            network_type: Filter by network type (5G, LTE, etc.)
            k: Number of results
        Returns:
            List of relevant documents
        """
        filter_meta: Dict[str, Any] = {"type": "simulation_config"}
        if network_type:
            filter_meta["network_type"] = network_type

        return await self._retriever.retrieve(
            query=query,
            k=k,
            filter_metadata=filter_meta,
        )

    async def retrieve_equipment_info(
        self,
        query: str,
        equipment_type: Optional[str] = None,
        k: int = 5,
    ) -> List[Document]:
        """
        Retrieve equipment information.

        Args:
            query: Search query
            equipment_type: Filter by equipment type
            k: Number of results
        Returns:
            List of relevant documents
        """
        filter_meta: Dict[str, Any] = {"type": "equipment"}
        if equipment_type:
            filter_meta["equipment_type"] = equipment_type

        return await self._retriever.retrieve(
            query=query,
            k=k,
            filter_metadata=filter_meta,
        )

    async def retrieve_with_scoring(
        self,
        query: str,
        k: int = 5,
        score_threshold: float = 1.0,
    ) -> List[Tuple[Document, float]]:
        """
        Retrieve documents with relevance scores.

        Args:
            query: Search query
            k: Number of results
            score_threshold: Maximum score threshold (lower = more relevant)
        Returns:
            List of (document, score) tuples
        """
        return await self._retriever.retrieve_with_scores(
            query=query,
            k=k,
            score_threshold=score_threshold,
        )

    async def retrieve_comprehensive(
        self,
        query: str,
        k: int = 3,
    ) -> Dict[str, List[Document]]:
        """
        Retrieve comprehensive information across all categories.

        Args:
            query: Search query
            k: Results per category
        Returns:
            Dict mapping category to documents
        """
        protocols = await self.retrieve_protocol_info(query, k=k)
        simulations = await self.retrieve_simulation_configs(query, k=k)
        equipment = await self.retrieve_equipment_info(query, k=k)

        return {
            "protocols": protocols,
            "simulations": simulations,
            "equipment": equipment,
        }


class TelecomQueryEnhancer:
    """
    Enhances queries with telecom-specific terminology.

    Helps improve retrieval quality by expanding queries
    with related telecom terms.
    """

    TERM_MAPPING = {
        "5g": ["5G NR", "New Radio", "NR", "5G standalone"],
        "4g": ["LTE", "4G LTE", "Long Term Evolution"],
        "voice": ["VoNR", "VoLTE", "Voice over NR", "Voice over LTE"],
        "core": ["5GC", "EPC", "Core Network", "Core"],
        "ran": ["gNB", "eNB", "Radio Access Network", "Base Station"],
        "simulation": ["emulation", "modeling", "network simulation"],
    }

    @classmethod
    def expand_query(cls, query: str) -> List[str]:
        """
        Expand a query with related telecom terms.

        Args:
            query: Original query
        Returns:
            List of expanded queries
        """
        query_lower = query.lower()
        expanded = [query]

        for key, terms in cls.TERM_MAPPING.items():
            if key in query_lower:
                expanded.extend(terms)

        return list(set(expanded))

    @classmethod
    def build_context_query(
        cls,
        query: str,
        context_type: str,
    ) -> str:
        """
        Build a context-aware query.

        Args:
            query: Original query
            context_type: Type of context (protocol, simulation, equipment)
        Returns:
            Enhanced query string
        """
        prefix_map = {
            "protocol": "network protocol parameters configuration",
            "simulation": "simulation parameters configuration setup",
            "equipment": "equipment specifications configuration",
        }
        prefix = prefix_map.get(context_type, "")
        return f"{prefix} {query}".strip()
