"""检索结果二次排序器"""

from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Union

from langchain_core.documents import Document


class SortOrder(Enum):
    """排序顺序"""

    ASC = "asc"
    DESC = "desc"


class SortField(Enum):
    """排序字段"""

    SCORE = "score"  # 向量相似度分数
    TIME = "time"  # 文档时间
    WEIGHT = "weight"  # 加载器权重
    SOURCE = "source"  # 来源
    SIZE = "size"  # 文档大小


@dataclass
class RerankConfig:
    """二次排序配置"""

    field: SortField
    order: SortOrder = SortOrder.DESC


class DocumentReranker:
    """
    检索结果二次排序器

    支持基于多维度对检索结果进行重新排序：
    - 向量相似度分数
    - 文档时间（更新的优先）
    - 加载器权重
    - 文档来源
    - 文档大小
    """

    def __init__(
        self,
        configs: Optional[List[RerankConfig]] = None,
        time_field: str = "modified_time",
        weight_field: str = "weight",
    ):
        """
        Args:
            configs: 排序配置列表，按优先级排序
            time_field: 时间字段名
            weight_field: 权重字段名
        """
        self._configs = configs or [RerankConfig(field=SortField.SCORE)]
        self._time_field = time_field
        self._weight_field = weight_field

    def add_config(self, config: RerankConfig) -> None:
        """添加排序配置"""
        self._configs.append(config)

    def clear_configs(self) -> None:
        """清空排序配置"""
        self._configs = []

    def rerank(
        self,
        documents: List[Document],
        scores: Optional[List[float]] = None,
    ) -> List[Document]:
        """
        对文档列表进行二次排序

        Args:
            documents: 文档列表
            scores: 对应的相似度分数列表（可选）
        Returns:
            排序后的文档列表
        """
        if not documents:
            return []

        # 构建排序键
        scored_docs = []
        for i, doc in enumerate(documents):
            score = scores[i] if scores and i < len(scores) else 0.0
            scored_docs.append((doc, score, self._extract_sort_keys(doc)))

        # 多级排序
        scored_docs.sort(key=lambda x: self._make_sort_key(x[2]), reverse=True)

        return [doc for doc, score, keys in scored_docs]

    def _extract_sort_keys(self, doc: Document) -> Dict[str, Any]:
        """提取文档的排序键"""
        metadata = doc.metadata or {}

        # 时间
        time_value = None
        time_str = metadata.get(self._time_field)
        if time_str:
            try:
                time_value = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                try:
                    time_value = datetime.fromtimestamp(float(time_str))
                except (ValueError, TypeError):
                    time_value = datetime.min

        # 权重
        weight_value = metadata.get(self._weight_field, 1.0)

        # 来源
        source_value = metadata.get("source", "") or metadata.get("loader_source", "")

        # 大小
        size_value = len(doc.page_content)

        return {
            SortField.SCORE.value: 0,  # 将在 _make_sort_key 中设置
            SortField.TIME.value: time_value or datetime.min,
            SortField.WEIGHT.value: weight_value,
            SortField.SOURCE.value: source_value,
            SortField.SIZE.value: size_value,
        }

    def _make_sort_key(self, keys: Dict[str, Any]) -> tuple:
        """根据配置生成排序键"""
        sort_key = []
        for config in self._configs:
            field = config.field.value
            if field in keys:
                value = keys[field]
                if isinstance(value, datetime):
                    # datetime 转换为时间戳用于排序
                    value = value.timestamp()
                sort_key.append(value)
            else:
                sort_key.append(None)
        return tuple(sort_key)

    def rerank_with_custom_scores(
        self,
        documents: List[Document],
        score_func: Callable[[Document], float],
    ) -> List[Document]:
        """
        使用自定义评分函数重新排序

        Args:
            documents: 文档列表
            score_func: 评分函数，接收 Document 返回分数
        Returns:
            排序后的文档列表
        """
        scored_docs = [(doc, score_func(doc)) for doc in documents]
        scored_docs.sort(key=lambda x: x[1], reverse=True)
        return [doc for doc, score in scored_docs]


class HybridReranker(DocumentReranker):
    """
    混合排序器

    结合向量相似度、语义相关性和自定义规则进行排序
    """

    def __init__(
        self,
        base_score_weight: float = 0.7,
        recency_weight: float = 0.2,
        weight_weight: float = 0.1,
        **kwargs,
    ):
        """
        Args:
            base_score_weight: 基础分数（相似度）权重
            recency_weight: 时效性权重
            weight_weight: 加载器权重
        """
        super().__init__(**kwargs)
        self._base_score_weight = base_score_weight
        self._recency_weight = recency_weight
        self._weight_weight = weight_weight

    def rerank_with_hybrid_score(
        self,
        documents: List[Document],
        base_scores: List[float],
        reference_time: Optional[datetime] = None,
    ) -> List[Document]:
        """
        使用混合评分重新排序

        综合考虑：
        1. 向量相似度分数
        2. 时效性（文档新旧程度）
        3. 来源权重

        Args:
            documents: 文档列表
            base_scores: 向量相似度分数
            reference_time: 参考时间（默认当前时间）
        Returns:
            排序后的文档列表
        """
        if not documents:
            return []

        reference_time = reference_time or datetime.now()
        scored_docs = []

        for i, doc in enumerate(documents):
            base_score = base_scores[i] if i < len(base_scores) else 0.0

            # 时效性分数
            recency_score = self._calculate_recency_score(doc, reference_time)

            # 来源权重
            source_weight = doc.metadata.get(self._weight_field, 1.0)

            # 混合分数
            hybrid_score = (
                self._base_score_weight * base_score
                + self._recency_weight * recency_score
                + self._weight_weight * source_weight
            )

            scored_docs.append((doc, hybrid_score))

        scored_docs.sort(key=lambda x: x[1], reverse=True)
        return [doc for doc, score in scored_docs]

    def _calculate_recency_score(
        self,
        doc: Document,
        reference_time: datetime,
        half_life_days: float = 30.0,
    ) -> float:
        """
        计算时效性分数

        使用指数衰减，半衰期为 half_life_days 天

        Args:
            doc: 文档
            reference_time: 参考时间
            half_life_days: 半衰期（天）
        Returns:
            0-1 之间的时效性分数
        """
        import math

        time_str = doc.metadata.get(self._time_field)
        if not time_str:
            return 0.5  # 无时间信息的文档给中间分数

        try:
            doc_time = datetime.fromisoformat(time_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            try:
                doc_time = datetime.fromtimestamp(float(time_str))
            except (ValueError, TypeError):
                return 0.5

        days_diff = (reference_time - doc_time).total_seconds() / (24 * 3600)
        decay = math.exp(-0.693 * days_diff / half_life_days)
        return min(1.0, max(0.0, decay))


def create_reranker(
    strategy: str = "default",
    **kwargs,
) -> DocumentReranker:
    """
    工厂函数：创建排序器

    Args:
        strategy: 排序策略
            - "default": 默认基于相似度
            - "recency": 强调时效性
            - "hybrid": 混合排序
            - "weighted": 强调来源权重
        **kwargs: 传递给排序器的额外参数
    Returns:
        排序器实例
    """
    strategies = {
        "default": lambda: DocumentReranker(
            configs=[RerankConfig(field=SortField.SCORE, order=SortOrder.DESC)]
        ),
        "recency": lambda: DocumentReranker(
            configs=[
                RerankConfig(field=SortField.TIME, order=SortOrder.DESC),
                RerankConfig(field=SortField.SCORE, order=SortOrder.DESC),
            ]
        ),
        "hybrid": lambda: HybridReranker(**kwargs),
        "weighted": lambda: DocumentReranker(
            configs=[
                RerankConfig(field=SortField.WEIGHT, order=SortOrder.DESC),
                RerankConfig(field=SortField.SCORE, order=SortOrder.DESC),
            ]
        ),
    }

    creator = strategies.get(strategy, strategies["default"])
    return creator()
