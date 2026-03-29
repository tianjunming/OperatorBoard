"""Tests for the RAG module."""

import pytest
from unittest.mock import MagicMock, AsyncMock
from langchain_core.documents import Document

from agent_framework.rag.embeddings import EmbeddingsManager
from agent_framework.rag.vectorstore import VectorStoreManager
from agent_framework.rag.retriever import RAGRetriever
from agent_framework.core.exceptions import EmbeddingError, VectorStoreError


class TestEmbeddingsManager:
    """Tests for EmbeddingsManager."""

    def test_singleton_like_behavior(self):
        """Test that manager can be instantiated multiple times."""
        manager1 = EmbeddingsManager()
        manager2 = EmbeddingsManager()
        assert manager1 is not manager2

    def test_register_embeddings(self):
        """Test registering embeddings."""
        manager = EmbeddingsManager()
        mock_embeddings = MagicMock()
        mock_embeddings.embed_documents.return_value = [[1.0, 2.0]]
        mock_embeddings.embed_query.return_value = [1.0, 2.0]

        manager.register("test", mock_embeddings)
        assert manager.get("test") == mock_embeddings

    def test_get_nonexistent_embeddings(self):
        """Test getting nonexistent embeddings raises error."""
        manager = EmbeddingsManager()
        with pytest.raises(EmbeddingError):
            manager.get("nonexistent")

    def test_set_default(self):
        """Test setting default embeddings."""
        manager = EmbeddingsManager()
        mock_embeddings = MagicMock()
        mock_embeddings.embed_documents.return_value = [[1.0, 2.0]]
        mock_embeddings.embed_query.return_value = [1.0, 2.0]

        manager.register("test", mock_embeddings)
        manager.set_default("test")
        assert manager.get_default() == mock_embeddings

    def test_get_default_without_set(self):
        """Test getting default without setting raises error."""
        manager = EmbeddingsManager()
        with pytest.raises(EmbeddingError):
            manager.get_default()


class TestVectorStoreManager:
    """Tests for VectorStoreManager."""

    def test_create_faiss(self):
        """Test creating a FAISS vector store."""
        manager = VectorStoreManager()
        mock_embeddings = MagicMock()
        mock_embeddings.embed_documents.return_value = [[1.0, 2.0] * 128]
        mock_embeddings.embed_query.return_value = [1.0, 2.0] * 128

        documents = [Document(page_content="test content", metadata={})]
        store = manager.create_faiss("test", mock_embeddings, documents)
        assert store is not None
        assert "test" in manager.list_stores()

    def test_get_store(self):
        """Test getting a vector store."""
        manager = VectorStoreManager()
        mock_embeddings = MagicMock()
        mock_embeddings.embed_documents.return_value = [[1.0, 2.0] * 128]
        mock_embeddings.embed_query.return_value = [1.0, 2.0] * 128

        documents = [Document(page_content="test content", metadata={})]
        store = manager.create_faiss("test", mock_embeddings, documents)

        retrieved = manager.get_store("test")
        assert retrieved == store

    def test_get_nonexistent_store(self):
        """Test getting nonexistent store returns None."""
        manager = VectorStoreManager()
        assert manager.get_store("nonexistent") is None

    def test_delete_store(self):
        """Test deleting a vector store."""
        manager = VectorStoreManager()
        mock_embeddings = MagicMock()
        mock_embeddings.embed_documents.return_value = [[1.0, 2.0] * 128]
        mock_embeddings.embed_query.return_value = [1.0, 2.0] * 128

        documents = [Document(page_content="test content", metadata={})]
        manager.create_faiss("test", mock_embeddings, documents)
        manager.delete_store("test")
        assert "test" not in manager.list_stores()


class TestRAGRetriever:
    """Tests for RAGRetriever."""

    def test_creation(self):
        """Test creating a retriever."""
        vector_manager = VectorStoreManager()
        retriever = RAGRetriever(vector_manager)
        assert retriever.vector_manager == vector_manager
        assert retriever.default_k == 5

    def test_add_transformer(self):
        """Test adding a transformer."""
        vector_manager = VectorStoreManager()
        retriever = RAGRetriever(vector_manager)

        def transformer(doc):
            return doc

        retriever.add_transformer(transformer)
        assert len(retriever._transformers) == 1

    def test_set_default_store(self):
        """Test setting default store."""
        vector_manager = VectorStoreManager()
        mock_embeddings = MagicMock()
        mock_embeddings.embed_documents.return_value = [[1.0, 2.0] * 128]
        mock_embeddings.embed_query.return_value = [1.0, 2.0] * 128

        documents = [Document(page_content="test content", metadata={})]
        vector_manager.create_faiss("test", mock_embeddings, documents)

        retriever = RAGRetriever(vector_manager)
        retriever.set_default_store("test")
        assert retriever.default_store == "test"

    def test_set_invalid_default_store(self):
        """Test setting invalid default store raises error."""
        from agent_framework.core.exceptions import RAGError
        vector_manager = VectorStoreManager()
        retriever = RAGRetriever(vector_manager)

        with pytest.raises(RAGError):
            retriever.set_default_store("nonexistent")
