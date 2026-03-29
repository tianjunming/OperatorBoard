"""RAG 语料加载器基类"""

from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional

from langchain_core.documents import Document


class BaseLoader(ABC):
    """语料加载器抽象基类"""

    @abstractmethod
    def load(self) -> List[Document]:
        """加载文档并返回 Document 列表"""
        pass

    @property
    @abstractmethod
    def source(self) -> str:
        """返回语料来源标识"""

    @property
    def metadata(self) -> Dict[str, Any]:
        """返回加载器元数据（子类可重写）"""
        return {
            "loader_type": self.__class__.__name__,
            "loaded_at": datetime.now().isoformat(),
        }

    @property
    def is_cached(self) -> bool:
        """是否使用缓存"""
        return False

    def refresh(self) -> List[Document]:
        """刷新缓存（子类可重写）"""
        return self.load()
