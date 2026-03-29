"""Tests for the RAG loaders module."""

import os
import tempfile
import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch
from langchain_core.documents import Document

from agent_framework.rag.loaders import (
    BaseLoader,
    DirectoryLoader,
    DatabaseLoader,
    HybridLoader,
    DocumentLoaderManager,
)


class TestDirectoryLoader:
    """Tests for DirectoryLoader."""

    def setup_method(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()

    def teardown_method(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_source_property(self):
        """Test source property returns correct format."""
        loader = DirectoryLoader(self.temp_dir)
        assert loader.source == f"directory://{Path(self.temp_dir).absolute()}"

    def test_metadata_property(self):
        """Test metadata property."""
        loader = DirectoryLoader(self.temp_dir)
        metadata = loader.metadata
        assert metadata["loader_type"] == "DirectoryLoader"
        assert "loaded_at" in metadata

    def test_load_empty_directory(self):
        """Test loading empty directory."""
        loader = DirectoryLoader(self.temp_dir)
        documents = loader.load()
        assert documents == []

    def test_load_text_file(self):
        """Test loading a text file."""
        text_file = Path(self.temp_dir) / "test.txt"
        text_file.write_text("Hello, world!", encoding="utf-8")

        loader = DirectoryLoader(self.temp_dir)
        documents = loader.load()

        assert len(documents) == 1
        assert documents[0].page_content == "Hello, world!"
        assert documents[0].metadata["file_name"] == "test.txt"
        assert documents[0].metadata["file_type"] == ".txt"

    def test_load_markdown_file(self):
        """Test loading a markdown file."""
        md_file = Path(self.temp_dir) / "test.md"
        md_file.write_text("# Header\n\nContent here.", encoding="utf-8")

        loader = DirectoryLoader(self.temp_dir)
        documents = loader.load()

        assert len(documents) == 1
        assert "# Header" in documents[0].page_content

    def test_load_json_file(self):
        """Test loading a JSON file."""
        import json

        json_file = Path(self.temp_dir) / "test.json"
        data = {"name": "test", "value": 123}
        json_file.write_text(json.dumps(data), encoding="utf-8")

        loader = DirectoryLoader(self.temp_dir)
        documents = loader.load()

        assert len(documents) == 1
        assert "name" in documents[0].page_content
        assert documents[0].metadata["json_keys"] == ["name", "value"]

    def test_load_csv_file(self):
        """Test loading a CSV file."""
        csv_file = Path(self.temp_dir) / "test.csv"
        csv_file.write_text("name,value\ntest,123\ntest2,456", encoding="utf-8")

        loader = DirectoryLoader(self.temp_dir)
        documents = loader.load()

        assert len(documents) == 1
        assert "name,value" in documents[0].page_content
        assert documents[0].metadata["csv_rows"] == 2

    def test_recursive_loading(self):
        """Test recursive directory loading."""
        subdir = Path(self.temp_dir) / "subdir"
        subdir.mkdir()
        (subdir / "nested.txt").write_text("nested content", encoding="utf-8")

        loader = DirectoryLoader(self.temp_dir, recursive=True)
        documents = loader.load()

        assert len(documents) == 1
        assert documents[0].page_content == "nested content"

    def test_non_recursive_loading(self):
        """Test non-recursive directory loading."""
        subdir = Path(self.temp_dir) / "subdir"
        subdir.mkdir()
        (subdir / "nested.txt").write_text("nested content", encoding="utf-8")

        loader = DirectoryLoader(self.temp_dir, recursive=False)
        documents = loader.load()

        assert len(documents) == 0

    def test_glob_pattern_filtering(self):
        """Test glob pattern filtering."""
        (Path(self.temp_dir) / "test.txt").write_text("txt content", encoding="utf-8")
        (Path(self.temp_dir) / "test.md").write_text("# markdown", encoding="utf-8")
        (Path(self.temp_dir) / "other.txt").write_text("other content", encoding="utf-8")

        loader = DirectoryLoader(
            self.temp_dir,
            glob_patterns=["**/*.md"],
            recursive=True
        )
        documents = loader.load()

        assert len(documents) == 1
        assert documents[0].metadata["file_name"] == "test.md"

    def test_exclude_patterns(self):
        """Test exclude patterns."""
        (Path(self.temp_dir) / "test.txt").write_text("content", encoding="utf-8")
        (Path(self.temp_dir) / "exclude.tmp").write_text("tmp content", encoding="utf-8")
        (Path(self.temp_dir) / "subdir").mkdir()
        (Path(self.temp_dir) / "subdir" / "nested.txt").write_text("nested", encoding="utf-8")

        loader = DirectoryLoader(
            self.temp_dir,
            recursive=True,
            exclude_patterns=["*.tmp", "__pycache__"]
        )
        documents = loader.load()

        file_names = [d.metadata["file_name"] for d in documents]
        assert "exclude.tmp" not in file_names

    def test_caching(self):
        """Test document caching."""
        text_file = Path(self.temp_dir) / "test.txt"
        text_file.write_text("content", encoding="utf-8")

        loader = DirectoryLoader(self.temp_dir)
        assert not loader.is_cached

        documents1 = loader.load()
        assert loader.is_cached
        assert len(documents1) == 1

        text_file.write_text("modified", encoding="utf-8")
        documents2 = loader.load()

        assert documents2[0].page_content == "content"

    def test_invalidate_cache(self):
        """Test cache invalidation."""
        text_file = Path(self.temp_dir) / "test.txt"
        text_file.write_text("content", encoding="utf-8")

        loader = DirectoryLoader(self.temp_dir)
        loader.load()

        assert loader.is_cached
        loader.invalidate_cache()
        assert not loader.is_cached

    def test_chunking(self):
        """Test document chunking."""
        content = "A" * 2000
        text_file = Path(self.temp_dir) / "test.txt"
        text_file.write_text(content, encoding="utf-8")

        loader = DirectoryLoader(self.temp_dir, chunk_size=500, chunk_overlap=50)
        documents = loader.load()

        assert len(documents) > 1

    def test_load_from_config(self):
        """Test creating loader from config dict."""
        config = {
            "path": self.temp_dir,
            "glob_patterns": ["**/*.txt"],
            "recursive": True,
            "chunk_size": 1000,
            "chunk_overlap": 100,
        }

        loader = DirectoryLoader.load_from_config(config)
        assert loader._directory == Path(self.temp_dir)
        assert loader._chunk_size == 1000


class TestDatabaseLoader:
    """Tests for DatabaseLoader."""

    def test_source_property(self):
        """Test source property."""
        config = {
            "host": "localhost",
            "port": 3306,
            "user": "root",
            "password": "password",
            "database": "test_db",
        }
        loader = DatabaseLoader(
            connection_config=config,
            query_template="SELECT * FROM test"
        )
        assert loader.source == "mysql://localhost:3306/test_db"

    def test_metadata_property(self):
        """Test metadata property."""
        config = {"host": "localhost", "port": 3306, "user": "root", "password": "p", "database": "db"}
        loader = DatabaseLoader(
            connection_config=config,
            query_template="SELECT 1",
            refresh_interval=3600
        )
        metadata = loader.metadata
        assert metadata["refresh_interval"] == 3600
        assert metadata["loader_type"] == "DatabaseLoader"

    def test_is_cached_initially_false(self):
        """Test is_cached returns False initially."""
        config = {"host": "localhost", "port": 3306, "user": "root", "password": "p", "database": "db"}
        loader = DatabaseLoader(
            connection_config=config,
            query_template="SELECT 1"
        )
        assert not loader.is_cached

    def test_load_from_config(self):
        """Test creating loader from config dict with env var."""
        with patch.dict(os.environ, {"DB_HOST": "production-db"}):
            config = {
                "connection": {
                    "host": "${DB_HOST}",
                    "port": 3306,
                    "user": "root",
                    "password": "p",
                    "database": "db",
                },
                "query_template": "SELECT * FROM test",
                "refresh_interval": 60,
            }

            loader = DatabaseLoader.load_from_config(config)
            assert loader._conn_config["host"] == "production-db"
            assert loader._refresh_interval == 60


class TestHybridLoader:
    """Tests for HybridLoader."""

    def test_source_property(self):
        """Test source property."""
        mock_loader1 = MagicMock(spec=BaseLoader)
        mock_loader1.source = "source1"
        mock_loader2 = MagicMock(spec=BaseLoader)
        mock_loader2.source = "source2"

        hybrid = HybridLoader([mock_loader1, mock_loader2])
        assert hybrid.source == "hybrid://2_sources"

    def test_add_loader(self):
        """Test adding a loader."""
        mock_loader = MagicMock(spec=BaseLoader)
        mock_loader.source = "new_source"
        mock_loader.load.return_value = []

        hybrid = HybridLoader([])
        hybrid.add_loader(mock_loader, weight=0.5)

        assert "new_source" in hybrid.loaders

    def test_remove_loader(self):
        """Test removing a loader."""
        mock_loader = MagicMock(spec=BaseLoader)
        mock_loader.source = "source1"
        mock_loader.load.return_value = []

        hybrid = HybridLoader([mock_loader])
        result = hybrid.remove_loader("source1")

        assert result is True
        assert "source1" not in hybrid.loaders

    def test_remove_nonexistent_loader(self):
        """Test removing nonexistent loader."""
        hybrid = HybridLoader([])
        result = hybrid.remove_loader("nonexistent")
        assert result is False

    def test_set_weight(self):
        """Test setting loader weight."""
        mock_loader = MagicMock(spec=BaseLoader)
        mock_loader.source = "source1"
        mock_loader.load.return_value = []

        hybrid = HybridLoader([mock_loader], weights={"source1": 1.0})
        hybrid.set_weight("source1", 0.5)

        assert hybrid._weights["source1"] == 0.5

    def test_load_combines_documents(self):
        """Test loading combines documents from all loaders."""
        doc1 = Document(page_content="doc1", metadata={"source": "loader1"})
        doc2 = Document(page_content="doc2", metadata={"source": "loader2"})

        mock_loader1 = MagicMock(spec=BaseLoader)
        mock_loader1.source = "source1"
        mock_loader1.load.return_value = [doc1]

        mock_loader2 = MagicMock(spec=BaseLoader)
        mock_loader2.source = "source2"
        mock_loader2.load.return_value = [doc2]

        hybrid = HybridLoader([mock_loader1, mock_loader2])
        documents = hybrid.load()

        assert len(documents) == 2
        content_set = {d.page_content for d in documents}
        assert content_set == {"doc1", "doc2"}

    def test_load_with_weights(self):
        """Test loading applies weights to metadata."""
        doc = Document(page_content="doc1", metadata={})

        mock_loader = MagicMock(spec=BaseLoader)
        mock_loader.source = "source1"
        mock_loader.load.return_value = [doc]

        hybrid = HybridLoader([mock_loader], weights={"source1": 0.7})
        documents = hybrid.load()

        assert documents[0].metadata["weight"] == 0.7
        assert documents[0].metadata["loader_source"] == "source1"

    def test_deduplication(self):
        """Test deduplication of documents."""
        doc1 = Document(page_content="same_content", metadata={})

        mock_loader1 = MagicMock(spec=BaseLoader)
        mock_loader1.source = "source1"
        mock_loader1.load.return_value = [doc1]

        mock_loader2 = MagicMock(spec=BaseLoader)
        mock_loader2.source = "source2"
        mock_loader2.load.return_value = [doc1]

        hybrid = HybridLoader([mock_loader1, mock_loader2], deduplicate=True)
        documents = hybrid.load()

        assert len(documents) == 1

    def test_caching(self):
        """Test caching of loaded documents."""
        doc = Document(page_content="doc1", metadata={})

        mock_loader = MagicMock(spec=BaseLoader)
        mock_loader.source = "source1"
        mock_loader.load.return_value = [doc]

        hybrid = HybridLoader([mock_loader])
        assert not hybrid.is_cached

        hybrid.load()
        assert hybrid.is_cached

    def test_metadata_includes_loader_info(self):
        """Test metadata includes loader count and weights."""
        mock_loader = MagicMock(spec=BaseLoader)
        mock_loader.source = "source1"
        mock_loader.load.return_value = []

        hybrid = HybridLoader(
            [mock_loader],
            weights={"source1": 0.8},
            priority=["source1"]
        )
        metadata = hybrid.metadata

        assert metadata["loader_count"] == 1
        assert metadata["weights"] == {"source1": 0.8}


class TestDocumentLoaderManager:
    """Tests for DocumentLoaderManager."""

    def test_list_loaders_empty(self):
        """Test listing loaders when none registered."""
        manager = DocumentLoaderManager()
        assert manager.list_loaders() == []

    def test_register_and_get_loader(self):
        """Test registering and getting a loader."""
        mock_loader = MagicMock(spec=BaseLoader)
        mock_loader.source = "test_source"

        manager = DocumentLoaderManager()
        manager.register_loader("test", mock_loader)

        assert "test" in manager.list_loaders()
        assert manager.get_loader("test") == mock_loader

    def test_get_nonexistent_loader(self):
        """Test getting nonexistent loader returns None."""
        manager = DocumentLoaderManager()
        assert manager.get_loader("nonexistent") is None

    def test_remove_loader(self):
        """Test removing a loader."""
        mock_loader = MagicMock(spec=BaseLoader)
        mock_loader.source = "test"

        manager = DocumentLoaderManager()
        manager.register_loader("test", mock_loader)
        result = manager.remove_loader("test")

        assert result is True
        assert "test" not in manager.list_loaders()

    def test_load_single(self):
        """Test loading a single loader."""
        doc = Document(page_content="test", metadata={})

        mock_loader = MagicMock(spec=BaseLoader)
        mock_loader.source = "test"
        mock_loader.load.return_value = [doc]

        manager = DocumentLoaderManager()
        manager.register_loader("test", mock_loader)
        documents = manager.load("test")

        assert len(documents) == 1
        assert documents[0].page_content == "test"

    def test_load_nonexistent_raises_error(self):
        """Test loading nonexistent loader raises KeyError."""
        manager = DocumentLoaderManager()

        with pytest.raises(KeyError):
            manager.load("nonexistent")

    def test_load_all(self):
        """Test loading all registered loaders."""
        doc1 = Document(page_content="doc1", metadata={})
        doc2 = Document(page_content="doc2", metadata={})

        mock_loader1 = MagicMock(spec=BaseLoader)
        mock_loader1.source = "source1"
        mock_loader1.load.return_value = [doc1]

        mock_loader2 = MagicMock(spec=BaseLoader)
        mock_loader2.source = "source2"
        mock_loader2.load.return_value = [doc2]

        manager = DocumentLoaderManager()
        manager.register_loader("loader1", mock_loader1)
        manager.register_loader("loader2", mock_loader2)

        results = manager.load_all()

        assert len(results) == 2
        assert len(results["loader1"]) == 1
        assert len(results["loader2"]) == 1

    def test_refresh(self):
        """Test refreshing a loader."""
        doc = Document(page_content="updated", metadata={})

        mock_loader = MagicMock(spec=BaseLoader)
        mock_loader.source = "test"
        mock_loader.load.return_value = [Document(page_content="original", metadata={})]
        mock_loader.refresh.return_value = [doc]

        manager = DocumentLoaderManager()
        manager.register_loader("test", mock_loader)
        manager.load("test")

        documents = manager.refresh("test")

        assert documents[0].page_content == "updated"
        mock_loader.refresh.assert_called_once()

    def test_cache_info(self):
        """Test getting cache info."""
        mock_loader = MagicMock(spec=BaseLoader)
        mock_loader.source = "test"
        mock_loader.is_cached = True

        manager = DocumentLoaderManager()
        manager.register_loader("test", mock_loader)

        info = manager.get_cache_info("test")
        assert info["name"] == "test"
        assert info["is_cached"] is True

    def test_clear_cache_single(self):
        """Test clearing cache for single loader."""
        mock_loader = MagicMock(spec=BaseLoader)
        mock_loader.source = "test"
        mock_loader.is_cached = True
        mock_loader.load.return_value = []
        mock_loader.invalidate_cache = MagicMock()

        manager = DocumentLoaderManager()
        manager.register_loader("test", mock_loader)

        manager.clear_cache("test")
        mock_loader.invalidate_cache.assert_called_once()

    def test_clear_cache_all(self):
        """Test clearing cache for all loaders."""
        mock_loader1 = MagicMock(spec=BaseLoader)
        mock_loader1.source = "source1"
        mock_loader1.is_cached = True
        mock_loader1.invalidate_cache = MagicMock()

        mock_loader2 = MagicMock(spec=BaseLoader)
        mock_loader2.source = "source2"
        mock_loader2.is_cached = True
        mock_loader2.invalidate_cache = MagicMock()

        manager = DocumentLoaderManager()
        manager.register_loader("loader1", mock_loader1)
        manager.register_loader("loader2", mock_loader2)

        manager.clear_cache()

        mock_loader1.invalidate_cache.assert_called_once()
        mock_loader2.invalidate_cache.assert_called_once()
