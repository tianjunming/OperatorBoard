"""文件加载器 - 从单个文件加载语料"""

import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

from langchain_core.documents import Document

from .base import BaseLoader


class FileLoader(BaseLoader):
    """
    文件加载器 - 从单个文件加载语料

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
        file_path: Union[str, Path],
        extract_metadata: bool = True,
        chunk_size: int = 0,
        chunk_overlap: int = 0,
    ):
        """
        Args:
            file_path: 文件路径
            extract_metadata: 是否提取文件元数据
            chunk_size: 文本分块大小，0 表示不分块
            chunk_overlap: 分块重叠大小
        """
        self._file_path = Path(file_path)
        self._extract_metadata = extract_metadata
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap

        if not self._file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        if self._file_path.suffix.lower() not in self.SUPPORTED_EXTENSIONS:
            raise ValueError(
                f"Unsupported file type: {self._file_path.suffix}. "
                f"Supported: {', '.join(self.SUPPORTED_EXTENSIONS)}"
            )

    @property
    def source(self) -> str:
        return f"file://{self._file_path.absolute()}"

    def _extract_file_metadata(self) -> Dict[str, Any]:
        """提取文件元数据"""
        stat = self._file_path.stat()
        return {
            "source": str(self._file_path.absolute()),
            "file_name": self._file_path.name,
            "file_type": self._file_path.suffix.lower(),
            "file_size": stat.st_size,
            "modified_time": datetime.fromtimestamp(stat.st_m_mtime).isoformat(),
            "created_time": datetime.fromtimestamp(stat.st_ctime).isoformat(),
        }

    def _load_text(self) -> Document:
        """加载文本文件"""
        with open(self._file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        return Document(page_content=content, metadata=self._build_metadata())

    def _load_json(self) -> Document:
        """加载 JSON 文件"""
        with open(self._file_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if isinstance(data, (dict, list)):
            content = json.dumps(data, ensure_ascii=False, indent=2)
        else:
            content = str(data)

        metadata = self._build_metadata()
        if isinstance(data, dict):
            metadata["json_keys"] = list(data.keys())
        elif isinstance(data, list):
            metadata["json_items"] = len(data)

        return Document(page_content=content, metadata=metadata)

    def _load_csv(self) -> Document:
        """加载 CSV 文件"""
        with open(self._file_path, "r", encoding="utf-8") as f:
            content = f.read()

        metadata = self._build_metadata()
        metadata["csv_rows"] = content.count("\n")
        return Document(page_content=content, metadata=metadata)

    def _load_binary(self) -> Document:
        """加载 PDF/DOCX"""
        ext = self._file_path.suffix.lower()
        text = ""

        if ext == ".pdf":
            try:
                from pypdf import PdfReader

                reader = PdfReader(self._file_path)
                text = "\n".join([page.extract_text() for page in reader.pages])
                metadata = self._build_metadata()
                metadata["pdf_pages"] = len(reader.pages)
            except ImportError:
                text = f"[PDF: {self._file_path.name} - pypdf not installed]"
                metadata = self._build_metadata()
        elif ext == ".docx":
            try:
                import docx2txt

                text = docx2txt.process(self._file_path)
                metadata = self._build_metadata()
            except ImportError:
                text = f"[DOCX: {self._file_path.name} - docx2txt not installed]"
                metadata = self._build_metadata()
        else:
            text = f"[Unsupported binary format: {self._file_path.name}]"
            metadata = self._build_metadata()

        return Document(page_content=text, metadata=metadata)

    def _build_metadata(self) -> Dict[str, Any]:
        """构建元数据"""
        if self._extract_metadata:
            return {
                **self._extract_file_metadata(),
                "loader": "FileLoader",
            }
        return {"loader": "FileLoader"}

    def load(self) -> List[Document]:
        """加载文件并返回 Document 列表"""
        suffix = self._file_path.suffix.lower()

        if suffix == ".json":
            doc = self._load_json()
        elif suffix == ".csv":
            doc = self._load_csv()
        elif suffix in (".pdf", ".docx"):
            doc = self._load_binary()
        else:
            doc = self._load_text()

        if self._chunk_size > 0:
            return self._chunk_document(doc)
        return [doc]

    def _chunk_document(self, doc: Document) -> List[Document]:
        """将文档分块"""
        try:
            from langchain_text_splitters import RecursiveCharacterTextSplitter
        except ImportError:
            from langchain.text_splitter import RecursiveCharacterTextSplitter

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self._chunk_size,
            chunk_overlap=self._chunk_overlap,
            length_function=len,
        )
        return splitter.split_documents([doc])

    @property
    def file_path(self) -> Path:
        """获取文件路径"""
        return self._file_path

    @property
    def file_name(self) -> str:
        """获取文件名"""
        return self._file_path.name

    @property
    def file_type(self) -> str:
        """获取文件类型"""
        return self._file_path.suffix.lower()

    @classmethod
    def from_config(cls, config: Dict) -> "FileLoader":
        """从配置字典创建加载器"""
        return cls(
            file_path=config["path"],
            extract_metadata=config.get("extract_metadata", True),
            chunk_size=config.get("chunk_size", 0),
            chunk_overlap=config.get("chunk_overlap", 0),
        )
