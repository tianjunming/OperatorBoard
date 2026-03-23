"""Vector store management for RAG."""

from typing import Any, Dict, List, Optional, Union
from pathlib import Path

from langchain_core.documents import Document
from langchain_core.vectorstores import VectorStore as LangChainVectorStore
from langchain_community.vectorstores import Chroma as ChromaVectorStore
from langchain_community.vectorstores import FAISS as FAISSVectorStore
from langchain_openai import OpenAIEmbeddings
from langchain_community.embeddings import HuggingFaceEmbeddings

from ..core.exceptions import VectorStoreError


class VectorStoreManager:
    """
    Manager for vector stores.

    Supports ChromaDB and FAISS backends.
    """

    TYPE_CHROMA = "chroma"
    TYPE_FAISS = "faiss"

    def __init__(self):
        """Initialize the vector store manager."""
        self._stores: Dict[str, LangChainVectorStore] = {}
        self._embeddings: Dict[str, Any] = {}

    def create_chroma(
        self,
        name: str,
        persist_directory: Optional[str] = None,
        collection_name: str = "default",
        embeddings: Optional[Any] = None,
    ) -> ChromaVectorStore:
        """
        Create a Chroma vector store.

        Args:
            name: Store name
            persist_directory: Directory for persistence
            collection_name: Collection name
            embeddings: Embeddings to use
        Returns:
            Chroma vector store
        """
        try:
            store = ChromaVectorStore(
                persist_directory=persist_directory,
                embedding_function=embeddings,
                collection_name=collection_name,
            )
            self._stores[name] = store
            return store
        except Exception as e:
            raise VectorStoreError(f"Failed to create Chroma store: {e}") from e

    def create_faiss(
        self,
        name: str,
        embedding_function: Any,
    ) -> FAISSVectorStore:
        """
        Create a FAISS vector store.

        Args:
            name: Store name
            embedding_function: Embeddings to use
        Returns:
            FAISS vector store
        """
        try:
            store = FAISSVectorStore(embedding_function=embedding_function)
            self._stores[name] = store
            return store
        except Exception as e:
            raise VectorStoreError(f"Failed to create FAISS store: {e}") from e

    def add_documents(
        self,
        store_name: str,
        documents: List[Document],
        **kwargs
    ) -> None:
        """
        Add documents to a vector store.

        Args:
            store_name: Store name
            documents: Documents to add
            **kwargs: Additional arguments
        """
        if store_name not in self._stores:
            raise VectorStoreError(f"Vector store '{store_name}' not found")
        self._stores[store_name].add_documents(documents, **kwargs)

    async def aadd_documents(
        self,
        store_name: str,
        documents: List[Document],
        **kwargs
    ) -> None:
        """
        Async add documents to a vector store.

        Args:
            store_name: Store name
            documents: Documents to add
            **kwargs: Additional arguments
        """
        if store_name not in self._stores:
            raise VectorStoreError(f"Vector store '{store_name}' not found")
        await self._stores[store_name].aadd_documents(documents, **kwargs)

    def similarity_search(
        self,
        store_name: str,
        query: str,
        k: int = 4,
        **kwargs
    ) -> List[Document]:
        """
        Search for similar documents.

        Args:
            store_name: Store name
            query: Search query
            k: Number of results
            **kwargs: Additional arguments
        Returns:
            List of similar documents
        """
        if store_name not in self._stores:
            raise VectorStoreError(f"Vector store '{store_name}' not found")
        return self._stores[store_name].similarity_search(query, k=k, **kwargs)

    async def asimilarity_search(
        self,
        store_name: str,
        query: str,
        k: int = 4,
        **kwargs
    ) -> List[Document]:
        """
        Async search for similar documents.

        Args:
            store_name: Store name
            query: Search query
            k: Number of results
            **kwargs: Additional arguments
        Returns:
            List of similar documents
        """
        if store_name not in self._stores:
            raise VectorStoreError(f"Vector store '{store_name}' not found")
        return await self._stores[store_name].asimilarity_search(query, k=k, **kwargs)

    def similarity_search_with_score(
        self,
        store_name: str,
        query: str,
        k: int = 4,
        **kwargs
    ) -> List[tuple[Document, float]]:
        """
        Search with relevance scores.

        Args:
            store_name: Store name
            query: Search query
            k: Number of results
            **kwargs: Additional arguments
        Returns:
            List of (document, score) tuples
        """
        if store_name not in self._stores:
            raise VectorStoreError(f"Vector store '{store_name}' not found")
        return self._stores[store_name].similarity_search_with_score(query, k=k, **kwargs)

    def get_store(self, name: str) -> Optional[LangChainVectorStore]:
        """
        Get a vector store by name.

        Args:
            name: Store name
        Returns:
            Vector store if found
        """
        return self._stores.get(name)

    def delete_store(self, name: str) -> None:
        """
        Delete a vector store.

        Args:
            name: Store name
        """
        if name in self._stores:
            del self._stores[name]

    def list_stores(self) -> List[str]:
        """List all vector store names."""
        return list(self._stores.keys())

    def save(self, store_name: str, path: str) -> None:
        """
        Save a vector store to disk.

        Args:
            store_name: Store name
            path: Path to save to
        """
        if store_name not in self._stores:
            raise VectorStoreError(f"Vector store '{store_name}' not found")

        store = self._stores[store_name]
        if hasattr(store, "save"):
            store.save(path)
        else:
            raise VectorStoreError(f"Vector store '{store_name}' does not support saving")

    def load(self, store_name: str, path: str, embeddings: Any) -> None:
        """
        Load a vector store from disk.

        Args:
            store_name: Store name
            path: Path to load from
            embeddings: Embeddings to use
        """
        try:
            path_obj = Path(path)
            if not path_obj.exists():
                raise VectorStoreError(f"Path does not exist: {path}")

            if str(path).endswith(".db") or ".chroma" in str(path):
                store = ChromaVectorStore(
                    persist_directory=str(path),
                    embedding_function=embeddings,
                )
            else:
                store = FAISSVectorStore.load(str(path), embeddings)

            self._stores[store_name] = store
        except Exception as e:
            raise VectorStoreError(f"Failed to load vector store: {e}") from e
