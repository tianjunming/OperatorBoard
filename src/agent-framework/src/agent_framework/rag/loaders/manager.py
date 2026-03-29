"""文档加载器管理器 - 统一管理所有语料加载器"""

import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union

import yaml

from langchain_core.documents import Document

from .base import BaseLoader
from .database import DatabaseLoader
from .directory import DirectoryLoader
from .hybrid import HybridLoader


class DocumentLoaderManager:
    """
    文档加载器管理器 - 统一管理所有语料加载器

    支持从 YAML 配置加载和运行时注册
    """

    def __init__(self, config_path: Optional[str] = None):
        """
        Args:
            config_path: 配置文件路径
        """
        self._loaders: Dict[str, BaseLoader] = {}
        self._cache: Dict[str, List[Document]] = {}
        self._cache_ttl: int = 3600
        self._cache_timestamps: Dict[str, datetime] = {}

        if config_path:
            self.load_config(config_path)

    def load_config(self, config_path: str) -> None:
        """从 YAML 配置文件加载加载器"""
        path = Path(config_path)
        if not path.exists():
            raise FileNotFoundError(f"Config file not found: {config_path}")

        with open(path, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f)

        rag_config = config.get("rag_loaders", {})

        directory_sources = rag_config.get("directory_sources", [])
        for dir_cfg in directory_sources:
            if not dir_cfg.get("enabled", True):
                continue

            loader = DirectoryLoader.load_from_config(dir_cfg)
            self.register_loader(dir_cfg["name"], loader)

        database_sources = rag_config.get("database_sources", [])
        for db_cfg in database_sources:
            if not db_cfg.get("enabled", True):
                continue

            try:
                loader = DatabaseLoader.load_from_config(db_cfg)
                self.register_loader(db_cfg["name"], loader)
            except ImportError as e:
                print(f"[DocumentLoaderManager] Skipping database loader '{db_cfg['name']}': {e}")

        hybrid_sources = rag_config.get("hybrid_sources", [])
        for hybrid_cfg in hybrid_sources:
            if not hybrid_cfg.get("enabled", True):
                continue

            sub_loaders = [
                self._loaders[src]
                for src in hybrid_cfg.get("sources", [])
                if src in self._loaders
            ]

            if sub_loaders:
                hybrid_loader = HybridLoader(
                    loaders=sub_loaders,
                    weights=hybrid_cfg.get("weights"),
                    priority=hybrid_cfg.get("priority"),
                    deduplicate=hybrid_cfg.get("deduplicate", True),
                )
                self.register_loader(hybrid_cfg["name"], hybrid_loader)

    def _resolve_env_vars(self, config: Dict) -> Dict:
        """解析配置中的环境变量 {VAR_NAME}"""
        resolved = {}
        for key, value in config.items():
            if isinstance(value, str) and value.startswith("${") and value.endswith("}"):
                env_var = value[2:-1]
                resolved[key] = os.getenv(env_var, "")
            else:
                resolved[key] = value
        return resolved

    def register_loader(self, name: str, loader: BaseLoader) -> None:
        """注册一个加载器"""
        self._loaders[name] = loader

    def get_loader(self, name: str) -> Optional[BaseLoader]:
        """获取已注册的加载器"""
        return self._loaders.get(name)

    def load_all(self) -> Dict[str, List[Document]]:
        """加载所有已注册加载器的文档"""
        results = {}
        for name, loader in self._loaders.items():
            results[name] = loader.load()
            self._cache[name] = results[name]
            self._cache_timestamps[name] = datetime.now()
        return results

    def load(self, name: str) -> List[Document]:
        """加载指定加载器的文档"""
        if name not in self._loaders:
            raise KeyError(f"Loader '{name}' not found")

        loader = self._loaders[name]
        documents = loader.load()
        self._cache[name] = documents
        self._cache_timestamps[name] = datetime.now()
        return documents

    def refresh(self, name: str) -> List[Document]:
        """刷新指定加载器的缓存"""
        if name not in self._loaders:
            raise KeyError(f"Loader '{name}' not found")

        loader = self._loaders[name]
        documents = loader.refresh() if hasattr(loader, "refresh") else loader.load()
        self._cache[name] = documents
        self._cache_timestamps[name] = datetime.now()
        return documents

    def refresh_all(self) -> Dict[str, List[Document]]:
        """刷新所有加载器的缓存"""
        results = {}
        for name, loader in self._loaders.items():
            documents = loader.refresh() if hasattr(loader, "refresh") else loader.load()
            self._cache[name] = documents
            self._cache_timestamps[name] = datetime.now()
            results[name] = documents
        return results

    def set_cache_ttl(self, seconds: int) -> None:
        """设置缓存 TTL"""
        self._cache_ttl = seconds

    def list_loaders(self) -> List[str]:
        """列出所有已注册的加载器名称"""
        return list(self._loaders.keys())

    def remove_loader(self, name: str) -> bool:
        """移除加载器"""
        if name in self._loaders:
            del self._loaders[name]
            if name in self._cache:
                del self._cache[name]
            if name in self._cache_timestamps:
                del self._cache_timestamps[name]
            return True
        return False

    def get_cache_info(self, name: str) -> Optional[Dict[str, Any]]:
        """获取加载器缓存信息"""
        if name not in self._loaders:
            return None

        loader = self._loaders[name]
        return {
            "name": name,
            "is_cached": loader.is_cached,
            "cached_at": self._cache_timestamps.get(name),
            "document_count": len(self._cache.get(name, [])),
        }

    def clear_cache(self, name: Optional[str] = None) -> None:
        """清除缓存"""
        if name:
            if name in self._cache:
                del self._cache[name]
            if name in self._cache_timestamps:
                del self._cache_timestamps[name]
            if name in self._loaders:
                loader = self._loaders[name]
                if hasattr(loader, "invalidate_cache"):
                    loader.invalidate_cache()
        else:
            self._cache.clear()
            self._cache_timestamps.clear()
            for loader in self._loaders.values():
                if hasattr(loader, "invalidate_cache"):
                    loader.invalidate_cache()
