"""RAG retriever implementation."""

from typing import Any, Dict, List, Optional, Union
from langchain_core.documents import Document
from langchain_core.callbacks import CallbackManagerForRetrieverRun

from .vectorstore import VectorStoreManager
from ..core.exceptions import RAGError


class RAGRetriever:
    """
    RAG (Retrieval-Augmented Generation) retriever.

    Provides retrieval capabilities for augmenting LLM responses.
    """

    def __init__(
        self,
        vector_store_manager: VectorStoreManager,
        default_store: str = "default",
        default_k: int = 5,
    ):
        """
        Initialize the RAG retriever.

        Args:
            vector_store_manager: Vector store manager
            default_store: Default vector store name
            default_k: Default number of results
        """
        self._vector_manager = vector_store_manager
        self._default_store = default_store
        self._default_k = default_k
        self._transformers: List[callable] = []

    @property
    def vector_manager(self) -> VectorStoreManager:
        """Get the vector store manager."""
        return self._vector_manager

    @property
    def default_store(self) -> str:
        """Get the default store name."""
        return self._default_store

    @property
    def default_k(self) -> int:
        """Get the default number of results."""
        return self._default_k

    def add_transformer(self, transformer: callable) -> None:
        """
        Add a document transformer.

        Transformers are applied to retrieved documents before returning.

        Args:
            transformer: Callable that takes a Document and returns a Document
        """
        self._transformers.append(transformer)

    def _apply_transformers(self, documents: List[Document]) -> List[Document]:
        """Apply all transformers to documents."""
        for transformer in self._transformers:
            documents = [transformer(doc) for doc in documents]
        return documents

    async def retrieve(
        self,
        query: str,
        k: Optional[int] = None,
        store_name: Optional[str] = None,
        filter_metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Document]:
        """
        Retrieve relevant documents.

        Args:
            query: Search query
            k: Number of results (default: self.default_k)
            store_name: Vector store name (default: self.default_store)
            filter_metadata: Optional metadata filter
        Returns:
            List of relevant documents
        """
        k = k or self._default_k
        store_name = store_name or self._default_store

        try:
            if filter_metadata:
                documents = await self._vector_manager.asimilarity_search(
                    store_name, query, k=k, filter=filter_metadata
                )
            else:
                documents = await self._vector_manager.asimilarity_search(
                    store_name, query, k=k
                )
            return self._apply_transformers(documents)
        except Exception as e:
            raise RAGError(f"Retrieval failed: {e}") from e

    async def retrieve_with_scores(
        self,
        query: str,
        k: Optional[int] = None,
        store_name: Optional[str] = None,
        score_threshold: Optional[float] = None,
    ) -> List[tuple[Document, float]]:
        """
        Retrieve documents with relevance scores.

        Args:
            query: Search query
            k: Number of results
            store_name: Vector store name
            score_threshold: Minimum relevance score (0-1, lower is more relevant)
        Returns:
            List of (document, score) tuples
        """
        k = k or self._default_k
        store_name = store_name or self._default_store

        try:
            results = self._vector_manager.similarity_search_with_score(
                store_name, query, k=k
            )

            if score_threshold is not None:
                results = [
                    (doc, score) for doc, score in results
                    if score <= score_threshold
                ]

            return results
        except Exception as e:
            raise RAGError(f"Scored retrieval failed: {e}") from e

    async def retrieve_by_documents(
        self,
        documents: List[Document],
        k: Optional[int] = None,
        store_name: Optional[str] = None,
    ) -> List[Document]:
        """
        Retrieve similar documents using document contents.

        Args:
            documents: Reference documents
            k: Number of results
            store_name: Vector store name
        Returns:
            List of similar documents
        """
        if not documents:
            return []

        k = k or self._default_k
        store_name = store_name or self._default_store

        try:
            store = self._vector_manager.get_store(store_name)
            if store is None:
                raise RAGError(f"Vector store '{store_name}' not found")

            texts = [doc.page_content for doc in documents]
            return await store.asimilarity_search(texts, k=k)
        except Exception as e:
            raise RAGError(f"Document retrieval failed: {e}") from e

    def set_default_store(self, store_name: str) -> None:
        """
        Set the default vector store.

        Args:
            store_name: Store name
        """
        if self._vector_manager.get_store(store_name) is None:
            raise RAGError(f"Vector store '{store_name}' not found")
        self._default_store = store_name

    def get_relevant_documents(
        self, query: str, k: Optional[int] = None
    ) -> List[Document]:
        """
        Sync interface for LangChain retriever compatibility.

        Args:
            query: Search query
            k: Number of results
        Returns:
            List of relevant documents
        """
        return self._sync_retrieve_impl(query, k)

    def _sync_retrieve_impl(
        self, query: str, k: Optional[int] = None
    ) -> List[Document]:
        """Sync implementation of retrieve."""
        import asyncio
        k = k or self._default_k
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        return loop.run_until_complete(self.retrieve(query, k=k))
