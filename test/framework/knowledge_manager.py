"""Base Knowledge Manager - Abstract base for agent knowledge management"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class BaseKnowledgeManager(ABC):
    """Abstract base class for knowledge managers"""

    @abstractmethod
    def search(self, query: str, top_k: int = 3) -> List[str]:
        """Search the knowledge base for relevant information"""
        pass

    @abstractmethod
    def add_knowledge(self, content: str, metadata: Optional[Dict[str, Any]] = None) -> None:
        """Add new knowledge to the base"""
        pass

    @abstractmethod
    def clear(self) -> None:
        """Clear all knowledge"""
        pass

    def format_results(self, results: List[str]) -> str:
        """Format search results for agent consumption"""
        if not results:
            return "No relevant information found."
        return "\n\n".join(f"[{i+1}] {r}" for i, r in enumerate(results))
