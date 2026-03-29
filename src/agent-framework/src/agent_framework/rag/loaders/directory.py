"""目录加载器 - 从文件系统加载语料"""

import hashlib
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from langchain_core.documents import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter

from .base import BaseLoader


class DirectoryLoader(BaseLoader):
    """
    目录加载器 - 递归扫描目录下的文件

    支持格式: .txt, .md, .json, .csv, .pdf, .docx
    """

    SUPPORTED_EXTENSIONS = {
        ".txt",
        ".md",
        ".markdown",
        ".json",
        ".csv",
        ".pdf",
        ".docx",
    }

    def __init__(
        self,
        directory: str,
        glob_patterns: Optional[List[str]] = None,
        recursive: bool = True,
        exclude_patterns: Optional[List[str]] = None,
        extract_metadata: bool = True,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
    ):
        """
        Args:
            directory: 目录路径
            glob_patterns: Glob 模式列表，如 ["*.txt", "**/*.md"]
            recursive: 是否递归扫描子目录
            exclude_patterns: 排除模式，如 ["*.tmp", "__pycache__"]
            extract_metadata: 是否提取文件元数据
            chunk_size: 文本分块大小，0 表示不分块
            chunk_overlap: 分块重叠大小
        """
        self._directory = Path(directory)
        self._glob_patterns = glob_patterns or ["**/*"]
        self._recursive = recursive
        self._exclude_patterns = exclude_patterns or []
        self._extract_metadata = extract_metadata
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap

        self._cache: Optional[List[Document]] = None

    @property
    def source(self) -> str:
        return f"directory://{self._directory.absolute()}"

    def _should_include_file(self, file_path: Path) -> bool:
        """检查文件是否应该被包含"""
        if file_path.suffix.lower() not in self.SUPPORTED_EXTENSIONS:
            return False

        for pattern in self._exclude_patterns:
            if file_path.match(pattern):
                return False
        return True

    def _extract_file_metadata(self, file_path: Path) -> Dict[str, Any]:
        """提取文件元数据"""
        stat = file_path.stat()
        return {
            "source": str(file_path.absolute()),
            "file_name": file_path.name,
            "file_type": file_path.suffix.lower(),
            "file_size": stat.st_size,
            "modified_time": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "created_time": datetime.fromtimestamp(stat.st_ctime).isoformat(),
        }

    def _load_file(self, file_path: Path) -> Optional[Document]:
        """加载单个文件"""
        if not self._should_include_file(file_path):
            return None

        metadata = self._extract_file_metadata(file_path) if self._extract_metadata else {}
        metadata["loader"] = "DirectoryLoader"

        try:
            suffix = file_path.suffix.lower()
            if suffix == ".json":
                return self._load_json(file_path, metadata)
            elif suffix == ".csv":
                return self._load_csv(file_path, metadata)
            elif suffix in (".pdf", ".docx"):
                return self._load_binary(file_path, metadata)
            else:
                return self._load_text(file_path, metadata)
        except Exception as e:
            print(f"[DirectoryLoader] Failed to load {file_path}: {e}")
            return None

    def _load_text(self, file_path: Path, metadata: Dict) -> Document:
        """加载文本文件"""
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        return Document(page_content=content, metadata=metadata)

    def _load_json(self, file_path: Path, metadata: Dict) -> Document:
        """加载 JSON 文件"""
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, (dict, list)):
            content = json.dumps(data, ensure_ascii=False, indent=2)
        else:
            content = str(data)

        if isinstance(data, dict):
            metadata["json_keys"] = list(data.keys())
        elif isinstance(data, list):
            metadata["json_items"] = len(data)

        return Document(page_content=content, metadata=metadata)

    def _load_csv(self, file_path: Path, metadata: Dict) -> Document:
        """加载 CSV 文件"""
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        metadata["csv_rows"] = content.count("\n")
        return Document(page_content=content, metadata=metadata)

    def _load_binary(self, file_path: Path, metadata: Dict) -> Document:
        """加载 PDF/DOCX"""
        ext = file_path.suffix.lower()

        if ext == ".pdf":
            try:
                from pypdf import PdfReader

                reader = PdfReader(file_path)
                text = "\n".join([page.extract_text() for page in reader.pages])
                metadata["pdf_pages"] = len(reader.pages)
            except ImportError:
                text = f"[PDF: {file_path.name} - pypdf not installed]"
        elif ext == ".docx":
            try:
                import docx2txt

                text = docx2txt.process(file_path)
            except ImportError:
                text = f"[DOCX: {file_path.name} - docx2txt not installed]"
        else:
            text = f"[Unsupported binary format: {file_path.name}]"

        return Document(page_content=text, metadata=metadata)

    def load(self) -> List[Document]:
        """加载目录下所有支持的文档"""
        if self._cache is not None:
            return self._cache

        documents = []

        for pattern in self._glob_patterns:
            if self._recursive:
                files = self._directory.rglob(pattern)
            else:
                files = self._directory.glob(pattern)

            for file_path in files:
                if file_path.is_file():
                    doc = self._load_file(file_path)
                    if doc:
                        documents.append(doc)

        if self._chunk_size > 0 and documents:
            documents = self._chunk_documents(documents)

        self._cache = documents
        return documents

    def _chunk_documents(self, documents: List[Document]) -> List[Document]:
        """将文档分块"""
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self._chunk_size,
            chunk_overlap=self._chunk_overlap,
            length_function=len,
        )

        chunked = []
        for doc in documents:
            chunks = splitter.split_documents([doc])
            chunked.extend(chunks)

        return chunked

    @property
    def is_cached(self) -> bool:
        return self._cache is not None

    def invalidate_cache(self) -> None:
        """使缓存失效"""
        self._cache = None

    def load_from_config(config: Dict) -> "DirectoryLoader":
        """从配置字典创建加载器"""
        return DirectoryLoader(
            directory=config["path"],
            glob_patterns=config.get("glob_patterns"),
            recursive=config.get("recursive", True),
            exclude_patterns=config.get("exclude_patterns"),
            chunk_size=config.get("chunk_size", 1000),
            chunk_overlap=config.get("chunk_overlap", 200),
        )
