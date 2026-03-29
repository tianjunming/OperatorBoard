"""Vector store management for RAG."""

from typing import Any, Dict, List, Optional, Union
from pathlib import Path

from langchain_core.documents import Document
from langchain_core.vectorstores import VectorStore as LangChainVectorStore

from ..core.exceptions import VectorStoreError
from .loaders import BaseLoader


def _get_chroma_vectorstore():
    """Lazy import for Chroma vectorstore."""
    from langchain_community.vectorstores import Chroma as ChromaVectorStore
    return ChromaVectorStore


def _get_faiss_vectorstore():
    """Lazy import for FAISS vectorstore."""
    from langchain_community.vectorstores import FAISS as FAISSVectorStore
    return FAISSVectorStore


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
    ):
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
        ChromaVectorStore = _get_chroma_vectorstore()
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
    ):
        """
        Create a FAISS vector store.

        Args:
            name: Store name
            embedding_function: Embeddings to use
        Returns:
            FAISS vector store
        """
        FAISSVectorStore = _get_faiss_vectorstore()
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
        ChromaVectorStore = _get_chroma_vectorstore()
        FAISSVectorStore = _get_faiss_vectorstore()
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

    def add_loader_documents(
        self,
        store_name: str,
        loader: BaseLoader,
        **kwargs
    ) -> int:
        """
        从加载器添加文档到向量存储.

        Args:
            store_name: 向量存储名称
            loader: BaseLoader 实例
            **kwargs: 额外参数传递给 loader.load()
        Returns:
            添加的文档数量
        """
        if store_name not in self._stores:
            raise VectorStoreError(f"Vector store '{store_name}' not found")

        documents = loader.load()
        if documents:
            self._stores[store_name].add_documents(documents, **kwargs)
        return len(documents)

    async def aadd_loader_documents(
        self,
        store_name: str,
        loader: BaseLoader,
        **kwargs
    ) -> int:
        """异步版本 add_loader_documents"""
        if store_name not in self._stores:
            raise VectorStoreError(f"Vector store '{store_name}' not found")

        documents = loader.load()
        if documents:
            await self._stores[store_name].aadd_documents(documents, **kwargs)
        return len(documents)

    def create_from_loader(
        self,
        store_name: str,
        loader: BaseLoader,
        embeddings: Any,
        persist_directory: Optional[str] = None,
        collection_name: str = "default",
        **kwargs
    ) -> LangChainVectorStore:
        """
        从加载器创建向量存储.

        Args:
            store_name: 存储名称
            loader: BaseLoader 实例
            embeddings: Embeddings 函数
            persist_directory: 持久化目录
            collection_name: 集合名称
        Returns:
            创建的向量存储
        """
        ChromaVectorStore = _get_chroma_vectorstore()

        documents = loader.load()

        if persist_directory:
            store = ChromaVectorStore.from_documents(
                documents=documents,
                embedding=embeddings,
                persist_directory=persist_directory,
                collection_name=collection_name,
            )
        else:
            store = ChromaVectorStore.from_documents(
                documents=documents,
                embedding=embeddings,
                collection_name=collection_name,
            )

        self._stores[store_name] = store
        return store

    def create_hybrid(
        self,
        store_name: str,
        loaders: List[BaseLoader],
        embeddings: Any,
        weights: Optional[Dict[str, float]] = None,
        persist_directory: Optional[str] = None,
        collection_name: str = "default",
        **kwargs
    ) -> LangChainVectorStore:
        """
        从多个加载器创建混合向量存储.

        Args:
            store_name: 存储名称
            loaders: 加载器列表
            embeddings: Embeddings 函数
            weights: 权重字典
            persist_directory: 持久化目录
        Returns:
            创建的向量存储
        """
        from .loaders import HybridLoader

        hybrid_loader = HybridLoader(loaders, weights)
        return self.create_from_loader(
            store_name=store_name,
            loader=hybrid_loader,
            embeddings=embeddings,
            persist_directory=persist_directory,
            collection_name=collection_name,
            **kwargs
        )
