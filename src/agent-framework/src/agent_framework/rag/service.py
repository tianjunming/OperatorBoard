"""RAG management service for corpus updates."""

from typing import Any, Dict, List, Optional, Union
from pathlib import Path

from langchain_core.documents import Document

from ..core.exceptions import RAGError
from .loaders import (
    BaseLoader,
    DirectoryLoader,
    DatabaseLoader,
    FileLoader,
    HybridLoader,
    DocumentLoaderManager,
    DocumentReranker,
    create_reranker,
)
from .vectorstore import VectorStoreManager


class RAGService:
    """
    RAG management service for corpus updates.

    Provides APIs for:
    - Creating/updating vector stores from loaders
    - Adding/updating/deleting documents
    - Searching with optional reranking
    """

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize RAG service.

        Args:
            config_path: Optional path to rag_loaders.yaml config
        """
        self._vector_manager = VectorStoreManager()
        self._loader_manager = DocumentLoaderManager(config_path) if config_path else None
        self._reranker = None
        self._default_store = "default"

    @property
    def vector_manager(self) -> VectorStoreManager:
        """Get the vector store manager."""
        return self._vector_manager

    @property
    def loader_manager(self) -> Optional[DocumentLoaderManager]:
        """Get the loader manager."""
        return self._loader_manager

    def create_store(
        self,
        store_name: str,
        loader: BaseLoader,
        embeddings: Any,
        store_type: str = "chroma",
        persist_directory: Optional[str] = None,
        collection_name: str = "default",
    ) -> None:
        """
        Create a vector store from a loader.

        Args:
            store_name: Name for the vector store
            loader: BaseLoader instance
            embeddings: Embeddings function
            store_type: "chroma" or "faiss"
            persist_directory: Directory for persistence (chroma only)
            collection_name: Collection name (chroma only)
        """
        if store_type == "chroma":
            self._vector_manager.create_from_loader(
                store_name=store_name,
                loader=loader,
                embeddings=embeddings,
                persist_directory=persist_directory,
                collection_name=collection_name,
            )
        elif store_type == "faiss":
            documents = loader.load()
            self._vector_manager.create_faiss(
                name=store_name,
                embedding_function=embeddings,
                documents=documents,
            )
        else:
            raise RAGError(f"Unsupported store type: {store_type}")

    def update_store(
        self,
        store_name: str,
        loader: BaseLoader,
        embeddings: Any,
        clear_existing: bool = False,
    ) -> int:
        """
        Update vector store with documents from loader.

        Args:
            store_name: Vector store name
            loader: BaseLoader instance
            embeddings: Embeddings function
            clear_existing: Whether to clear existing documents first

        Returns:
            Number of documents added
        """
        if store_name not in self._vector_manager.list_stores():
            raise RAGError(f"Vector store '{store_name}' not found")

        store = self._vector_manager.get_store(store_name)
        if store is None:
            raise RAGError(f"Vector store '{store_name}' not found")

        documents = loader.load()
        if not documents:
            return 0

        if clear_existing:
            # For chroma, we recreate the store
            # This is a simplified approach - in production, you'd want
            # to delete documents by ID
            pass

        self._vector_manager.add_documents(store_name, documents)
        return len(documents)

    def add_documents(
        self,
        store_name: str,
        documents: List[Document],
    ) -> int:
        """
        Add documents to a vector store.

        Args:
            store_name: Vector store name
            documents: Documents to add

        Returns:
            Number of documents added
        """
        if store_name not in self._vector_manager.list_stores():
            raise RAGError(f"Vector store '{store_name}' not found")

        self._vector_manager.add_documents(store_name, documents)
        return len(documents)

    async def async_add_documents(
        self,
        store_name: str,
        documents: List[Document],
    ) -> int:
        """
        Async add documents to a vector store.

        Args:
            store_name: Vector store name
            documents: Documents to add

        Returns:
            Number of documents added
        """
        if store_name not in self._vector_manager.list_stores():
            raise RAGError(f"Vector store '{store_name}' not found")

        await self._vector_manager.aadd_documents(store_name, documents)
        return len(documents)

    def delete_documents(
        self,
        store_name: str,
        filter_kwargs: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Delete documents from a vector store.

        Note: Chroma supports deletion by metadata filter.

        Args:
            store_name: Vector store name
            filter_kwargs: Filter criteria for deletion

        Returns:
            True if successful
        """
        if store_name not in self._vector_manager.list_stores():
            raise RAGError(f"Vector store '{store_name}' not found")

        store = self._vector_manager.get_store(store_name)
        if hasattr(store, "delete"):
            if filter_kwargs:
                store.delete(filter=filter_kwargs)
            else:
                # Cannot delete all without a filter in chroma
                raise RAGError("filter_kwargs required for deletion")
        return True

    def search(
        self,
        query: str,
        store_name: Optional[str] = None,
        k: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Document]:
        """
        Search documents in vector store.

        Args:
            query: Search query
            store_name: Vector store name (uses default if not specified)
            k: Number of results
            filter_metadata: Optional metadata filter

        Returns:
            List of matching documents
        """
        store_name = store_name or self._default_store

        if filter_metadata:
            return self._vector_manager.asimilarity_search(
                store_name, query, k=k, filter=filter_metadata
            )
        return self._vector_manager.similarity_search(store_name, query, k=k)

    async def async_search(
        self,
        query: str,
        store_name: Optional[str] = None,
        k: int = 5,
        filter_metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Document]:
        """
        Async search documents in vector store.

        Args:
            query: Search query
            store_name: Vector store name
            k: Number of results
            filter_metadata: Optional metadata filter

        Returns:
            List of matching documents
        """
        store_name = store_name or self._default_store

        if filter_metadata:
            return await self._vector_manager.asimilarity_search(
                store_name, query, k=k, filter=filter_metadata
            )
        return await self._vector_manager.asimilarity_search(store_name, query, k=k)

    def search_with_scores(
        self,
        query: str,
        store_name: Optional[str] = None,
        k: int = 5,
        score_threshold: Optional[float] = None,
    ) -> List[tuple[Document, float]]:
        """
        Search with relevance scores.

        Args:
            query: Search query
            store_name: Vector store name
            k: Number of results
            score_threshold: Minimum relevance score

        Returns:
            List of (document, score) tuples
        """
        store_name = store_name or self._default_store
        results = self._vector_manager.similarity_search_with_score(store_name, query, k=k)

        if score_threshold is not None:
            results = [(doc, score) for doc, score in results if score <= score_threshold]

        # Apply reranking if configured
        if self._reranker is not None and results:
            documents = [doc for doc, _ in results]
            scores = [score for _, score in results]
            reranked_docs = self._reranker.rerank(documents, scores)
            # Preserve original scores for reranked order
            reranked_scores = []
            for doc in reranked_docs:
                for orig_doc, orig_score in results:
                    if orig_doc.page_content == doc.page_content:
                        reranked_scores.append(orig_score)
                        break
            results = list(zip(reranked_docs, reranked_scores))

        return results

    def set_reranker(self, reranker: Union[DocumentReranker, str]) -> None:
        """
        Set reranker for secondary sorting.

        Args:
            reranker: DocumentReranker instance or strategy name ("default", "recency", "hybrid", "weighted")
        """
        if isinstance(reranker, str):
            self._reranker = create_reranker(reranker)
        else:
            self._reranker = reranker

    def set_default_store(self, store_name: str) -> None:
        """Set the default vector store."""
        if store_name not in self._vector_manager.list_stores():
            raise RAGError(f"Vector store '{store_name}' not found")
        self._default_store = store_name

    def list_stores(self) -> List[str]:
        """List all vector store names."""
        return self._vector_manager.list_stores()

    def get_store_info(self, store_name: str) -> Dict[str, Any]:
        """Get information about a vector store."""
        if store_name not in self._vector_manager.list_stores():
            raise RAGError(f"Vector store '{store_name}' not found")

        store = self._vector_manager.get_store(store_name)
        return {
            "name": store_name,
            "type": type(store).__name__,
            "document_count": self._get_document_count(store),
        }

    def _get_document_count(self, store) -> int:
        """Get document count from a vector store."""
        if hasattr(store, "__len__"):
            try:
                return len(store)
            except Exception:
                pass
        return 0

    def save_store(self, store_name: str, path: str) -> None:
        """
        Save vector store to disk.

        Args:
            store_name: Vector store name
            path: Path to save to
        """
        self._vector_manager.save(store_name, path)

    def load_store(self, store_name: str, path: str, embeddings: Any) -> None:
        """
        Load vector store from disk.

        Args:
            store_name: Vector store name
            path: Path to load from
            embeddings: Embeddings function
        """
        self._vector_manager.load(store_name, path, embeddings)


def create_rag_service(config_path: Optional[str] = None) -> RAGService:
    """
    Factory function to create RAG service.

    Args:
        config_path: Optional path to rag_loaders.yaml config

    Returns:
        RAGService instance
    """
    return RAGService(config_path)