"""数据库加载器 - 从 MySQL 加载语料"""

from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from langchain_core.documents import Document

from .base import BaseLoader


class DatabaseLoader(BaseLoader):
    """
    数据库加载器 - 从 MySQL 查询生成 Document

    支持自定义 SQL 查询模板和行转换函数
    """

    def __init__(
        self,
        connection_config: Dict[str, Any],
        query_template: str,
        row_to_document: Optional[Callable[[Dict], Document]] = None,
        params: Optional[Dict[str, Any]] = None,
        name_column: str = "name",
        content_column: str = "content",
        metadata_columns: Optional[List[str]] = None,
        refresh_interval: Optional[int] = None,
    ):
        """
        Args:
            connection_config: MySQL 连接配置 {
                "host": str,
                "port": int,
                "user": str,
                "password": str,
                "database": str,
            }
            query_template: SQL 查询模板
            row_to_document: 行转换函数 (row: Dict) -> Document
            params: 查询参数
            name_column: 文档名称列
            content_column: 文档内容列
            metadata_columns: 元数据列列表
            refresh_interval: 刷新间隔（秒），None 表示不自动刷新
        """
        self._conn_config = connection_config
        self._query_template = query_template
        self._row_to_doc = row_to_document
        self._params = params or {}
        self._name_col = name_column
        self._content_col = content_column
        self._meta_cols = metadata_columns or []
        self._refresh_interval = refresh_interval

        self._connection = None
        self._cache: Optional[List[Document]] = None
        self._last_refresh: Optional[datetime] = None

    @property
    def source(self) -> str:
        return f"mysql://{self._conn_config['host']}:{self._conn_config['port']}/{self._conn_config['database']}"

    def _connect(self):
        """建立数据库连接"""
        try:
            import mysql.connector

            if self._connection is None or not self._connection.is_connected():
                self._connection = mysql.connector.connect(**self._conn_config)
        except ImportError:
            raise ImportError(
                "mysql-connector-python is required. Install with: pip install mysql-connector-python"
            )

    def _disconnect(self):
        """关闭数据库连接"""
        if self._connection and self._connection.is_connected():
            self._connection.close()
            self._connection = None

    def _execute_query(self) -> List[Dict[str, Any]]:
        """执行查询并返回结果"""
        self._connect()
        cursor = self._connection.cursor(dictionary=True)

        try:
            query = self._query_template.format(**self._params)
            cursor.execute(query)
            results = cursor.fetchall()
            return results
        finally:
            cursor.close()

    def load(self) -> List[Document]:
        """从数据库加载文档"""
        if self._cache is not None and not self._should_refresh():
            return self._cache

        try:
            rows = self._execute_query()
            documents = []

            for row in rows:
                metadata = {
                    "loader": "DatabaseLoader",
                    "source": self.source,
                    "loaded_at": datetime.now().isoformat(),
                }

                for col in self._meta_cols:
                    if col in row:
                        metadata[col] = row[col]

                if self._row_to_doc:
                    doc = self._row_to_doc(row)
                else:
                    name = row.get(self._name_col, "Untitled")
                    content = row.get(self._content_col, "")
                    doc = Document(page_content=content, metadata={**metadata, "name": name})

                documents.append(doc)

            self._cache = documents
            self._last_refresh = datetime.now()
            return documents

        except Exception as e:
            print(f"[DatabaseLoader] Query failed: {e}")
            return self._cache or []
        finally:
            self._disconnect()

    def _should_refresh(self) -> bool:
        """检查是否需要刷新"""
        if self._refresh_interval is None:
            return False
        if self._last_refresh is None:
            return True

        elapsed = (datetime.now() - self._last_refresh).total_seconds()
        return elapsed >= self._refresh_interval

    def refresh(self) -> List[Document]:
        """强制刷新缓存"""
        self._cache = None
        return self.load()

    @property
    def is_cached(self) -> bool:
        return self._cache is not None

    @property
    def metadata(self) -> Dict[str, Any]:
        return {
            **super().metadata,
            "refresh_interval": self._refresh_interval,
            "last_refresh": self._last_refresh.isoformat() if self._last_refresh else None,
            "query": (
                self._query_template[:100] + "..."
                if len(self._query_template) > 100
                else self._query_template
            ),
        }

    def load_from_config(config: Dict) -> "DatabaseLoader":
        """从配置字典创建加载器"""
        import os

        conn_config = config["connection"]
        for key, value in conn_config.items():
            if isinstance(value, str) and value.startswith("${") and value.endswith("}"):
                env_var = value[2:-1]
                conn_config[key] = os.getenv(env_var, "")

        return DatabaseLoader(
            connection_config=conn_config,
            query_template=config["query_template"],
            params=config.get("params", {}),
            metadata_columns=config.get("metadata_columns", []),
            refresh_interval=config.get("refresh_interval"),
        )
