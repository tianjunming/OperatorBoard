"""混合加载器 - 组合多个加载器"""

from typing import Any, Callable, Dict, List, Optional

from langchain_core.documents import Document

from .base import BaseLoader


class HybridLoader(BaseLoader):
    """
    混合加载器 - 组合多个加载器，统一检索接口

    支持权重配置和优先级设置
    """

    def __init__(
        self,
        loaders: List[BaseLoader],
        weights: Optional[Dict[str, float]] = None,
        priority: Optional[List[str]] = None,
        deduplicate: bool = True,
    ):
        """
        Args:
            loaders: 加载器列表
            weights: 各加载器权重 {"loader_source": 0.6, ...}
            priority: 加载优先级顺序（权重相同时）
            deduplicate: 是否去重（基于内容哈希）
        """
        self._loaders = {loader.source: loader for loader in loaders}
        self._weights = weights or {loader.source: 1.0 for loader in loaders}
        self._priority = priority or list(self._loaders.keys())
        self._deduplicate = deduplicate

        self._cache: Optional[List[Document]] = None

    @property
    def source(self) -> str:
        return f"hybrid://{len(self._loaders)}_sources"

    @property
    def loaders(self) -> Dict[str, BaseLoader]:
        return self._loaders.copy()

    def add_loader(self, loader: BaseLoader, weight: float = 1.0) -> None:
        """添加一个加载器"""
        self._loaders[loader.source] = loader
        self._weights[loader.source] = weight
        self._invalidate_cache()

    def remove_loader(self, source: str) -> bool:
        """移除一个加载器"""
        if source in self._loaders:
            del self._loaders[source]
            del self._weights[source]
            self._invalidate_cache()
            return True
        return False

    def set_weight(self, source: str, weight: float) -> None:
        """设置加载器权重"""
        if source in self._weights:
            self._weights[source] = weight
            self._invalidate_cache()

    def load(self) -> List[Document]:
        """加载所有加载器的文档并合并"""
        if self._cache is not None:
            return self._cache

        all_documents = []

        for src in self._priority:
            if src in self._loaders:
                loader = self._loaders[src]
                documents = loader.load()

                for doc in documents:
                    doc.metadata["weight"] = self._weights.get(src, 1.0)
                    doc.metadata["loader_source"] = src

                all_documents.extend(documents)

        if self._deduplicate:
            all_documents = self._deduplicate_documents(all_documents)

        self._cache = all_documents
        return all_documents

    def _deduplicate_documents(self, documents: List[Document]) -> List[Document]:
        """基于内容哈希去重"""
        seen_hashes = set()
        unique_docs = []

        for doc in documents:
            content_hash = hash(doc.page_content)
            if content_hash not in seen_hashes:
                seen_hashes.add(content_hash)
                unique_docs.append(doc)

        return unique_docs

    def _invalidate_cache(self) -> None:
        """使缓存失效"""
        self._cache = None

    @property
    def is_cached(self) -> bool:
        return self._cache is not None

    @property
    def metadata(self) -> Dict[str, Any]:
        return {
            **super().metadata,
            "loader_count": len(self._loaders),
            "weights": self._weights,
            "priority": self._priority,
            "deduplicate": self._deduplicate,
        }
