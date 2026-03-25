"""Embeddings management for RAG."""

from typing import Any, Dict, List, Optional, Union
import os

from langchain_core.embeddings import Embeddings

from ..core.exceptions import EmbeddingError


def _get_openai_embeddings():
    """Lazy import for OpenAI embeddings."""
    from langchain_openai import OpenAIEmbeddings
    return OpenAIEmbeddings


def _get_huggingface_embeddings():
    """Lazy import for HuggingFace embeddings."""
    from langchain_community.embeddings import HuggingFaceEmbeddings
    return HuggingFaceEmbeddings


class EmbeddingsManager:
    """
    Manager for embeddings models.

    Supports multiple embedding backends.
    """

    PROVIDER_OPENAI = "openai"
    PROVIDER_HUGGINGFACE = "huggingface"

    def __init__(self):
        """Initialize the embeddings manager."""
        self._embeddings: Dict[str, Embeddings] = {}
        self._default_provider: Optional[str] = None

    def register(self, name: str, embeddings: Embeddings) -> None:
        """
        Register an embeddings model.

        Args:
            name: Provider name
            embeddings: Embeddings instance
        """
        self._embeddings[name] = embeddings

    def get(self, name: str) -> Embeddings:
        """
        Get an embeddings model by name.

        Args:
            name: Provider name
        Returns:
            Embeddings instance
        Raises:
            EmbeddingError: If provider not found
        """
        if name not in self._embeddings:
            raise EmbeddingError(f"Embeddings provider '{name}' not found")
        return self._embeddings[name]

    def set_default(self, name: str) -> None:
        """
        Set the default embeddings provider.

        Args:
            name: Provider name
        """
        if name not in self._embeddings:
            raise EmbeddingError(f"Embeddings provider '{name}' not found")
        self._default_provider = name

    def get_default(self) -> Embeddings:
        """
        Get the default embeddings provider.

        Returns:
            Default embeddings instance
        Raises:
            EmbeddingError: If no default set
        """
        if self._default_provider is None:
            raise EmbeddingError("No default embeddings provider set")
        return self.get(self._default_provider)

    @classmethod
    def create_openai(
        cls,
        model: str = "text-embedding-3-small",
        api_key: Optional[str] = None,
        **kwargs
    ):
        """
        Create OpenAI embeddings.

        Args:
            model: Model name
            api_key: Optional API key
            **kwargs: Additional arguments
        Returns:
            OpenAI embeddings instance
        """
        OpenAIEmbeddings = _get_openai_embeddings()
        return OpenAIEmbeddings(model=model, api_key=api_key or os.getenv("OPENAI_API_KEY"), **kwargs)

    @classmethod
    def create_huggingface(
        cls,
        model_name: str = "sentence-transformers/all-MiniLM-L6-v2",
        **kwargs
    ):
        """
        Create HuggingFace embeddings.

        Args:
            model_name: Model name
            **kwargs: Additional arguments
        Returns:
            HuggingFace embeddings instance
        """
        HuggingFaceEmbeddings = _get_huggingface_embeddings()
        return HuggingFaceEmbeddings(model_name=model_name, **kwargs)

    def create_and_register(
        self,
        name: str,
        provider: str,
        **kwargs
    ) -> Embeddings:
        """
        Create and register an embeddings model.

        Args:
            name: Provider name
            provider: Provider type (openai, huggingface)
            **kwargs: Provider-specific arguments
        Returns:
            Created embeddings instance
        """
        if provider == self.PROVIDER_OPENAI:
            embeddings = self.create_openai(**kwargs)
        elif provider == self.PROVIDER_HUGGINGFACE:
            embeddings = self.create_huggingface(**kwargs)
        else:
            raise EmbeddingError(f"Unknown provider: {provider}")

        self.register(name, embeddings)
        return embeddings


class ConfigurableEmbeddings(Embeddings):
    """
    Embeddings wrapper that allows configuration after creation.
    """

    def __init__(self, embeddings: Embeddings):
        """
        Initialize with an embeddings instance.

        Args:
            embeddings: Base embeddings to wrap
        """
        self._embeddings = embeddings

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed documents."""
        return self._embeddings.embed_documents(texts)

    def embed_query(self, text: str) -> List[float]:
        """Embed a query."""
        return self._embeddings.embed_query(text)

    async def aembed_documents(self, texts: List[str]) -> List[List[float]]:
        """Async embed documents."""
        return await self._embeddings.aembed_documents(texts)

    async def aembed_query(self, text: str) -> List[float]:
        """Async embed a query."""
        return await self._embeddings.aembed_query(text)
