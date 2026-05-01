"""Skill 10: System Reliability Self-Check Checklist.

系统可靠性自检清单 - 确保LLM系统生产可用。

Usage:
    skill = SystemReliabilitySkill()
    result = await skill.execute(SkillContext(
        skill_name="system_reliability",
        input_data={"check_type": "all"}
    ))
"""

from typing import Any, Dict, List, Optional
from agent_framework.skills.base import BaseSkill, SkillContext


class SystemReliabilitySkill(BaseSkill):
    """System Reliability Self-Check Checklist.

    系统可靠性自检清单 - 可靠性比单点能力更重要。

    Core Metrics:
        - LLM调用成功率 (目标 > 95%)
        - LLM平均响应延迟 (目标 < 3s)
        - 降级触发次数 (监控是否有异常)
        - 错误类型分布 (定位高频错误模式)

    Reliability Practices:
        - 多级降级: LLM → 规则引擎 → 预设查询 → 友好错误
        - 熔断机制: 连续失败N次后自动切换策略
        - 监控告警: 实时追踪各项指标
    """

    name = "system_reliability"
    description = "系统可靠性自检清单 - 确保LLM系统生产可用"

    DEGRADATION_CHAIN = [
        "LLM 失败",
        "规则引擎兜底",
        "预设查询",
        "友好错误"
    ]

    CIRCUIT_BREAKER_CONFIG = [
        {
            "parameter": "连续失败次数N",
            "default": 5,
            "action": "触发熔断"
        },
        {
            "parameter": "熔断期间",
            "default": "跳过LLM直接走降级",
            "action": "保护系统"
        },
        {
            "parameter": "熔断恢复",
            "default": "逐步放量(10% → 50% → 100%)",
            "action": "避免二次冲击"
        }
    ]

    MONITORING_METRICS = [
        {
            "metric": "LLM调用成功率",
            "target": "> 95%",
            "alert": "< 95% → 告警"
        },
        {
            "metric": "LLM平均响应延迟",
            "target": "< 3s",
            "alert": "> 3s → 告警"
        },
        {
            "metric": "降级触发次数",
            "target": "越少越好",
            "alert": "突增 → 告警"
        },
        {
            "metric": "错误类型分布",
            "target": "均衡分布",
            "alert": "某类突增 → 定位问题"
        }
    ]

    CAPACITY_PLANNING = [
        {
            "item": "预估峰值QPS",
            "action": "确认LLM部署容量"
        },
        {
            "item": "队列缓冲",
            "action": "超过容量的请求排队"
        },
        {
            "item": "超时策略",
            "action": "排队超过X秒放弃"
        }
    ]

    CHECK_ITEMS = [
        {
            "category": "降级链路检查",
            "items": [
                "LLM失败 → 规则引擎兜底",
                "规则引擎失败 → 预设查询",
                "预设查询失败 → 友好错误",
                "每一级都要测试，确保能正常切换"
            ]
        },
        {
            "category": "熔断机制检查",
            "items": [
                "连续失败N次(如5次) → 触发熔断",
                "熔断期间 → 跳过LLM直接走降级",
                "熔断恢复 → 逐步放量(10% → 50% → 100%)"
            ]
        },
        {
            "category": "监控指标检查",
            "items": [
                "LLM调用成功率(目标 > 95%)",
                "LLM平均响应延迟(目标 < 3s)",
                "降级触发次数(监控是否有异常)",
                "错误类型分布(定位高频错误模式)"
            ]
        },
        {
            "category": "容量规划检查",
            "items": [
                "预估峰值QPS → 确认LLM部署容量",
                "队列缓冲(超过容量的请求排队)",
                "超时策略(排队超过X秒放弃)"
            ]
        }
    ]

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        """Execute reliability self-check.

        Args:
            context: Optional 'check_type' to focus

        Returns:
            Reliability checklist
        """
        check_type = context.input_data.get("check_type", "all")

        result = {
            "skill": self.name,
            "framework": "系统可靠性自检清单",
            "degradation_chain": self.DEGRADATION_CHAIN,
            "circuit_breaker": self.CIRCUIT_BREAKER_CONFIG,
            "monitoring_metrics": self.MONITORING_METRICS,
            "capacity_planning": self.CAPACITY_PLANNING,
            "check_items": self.CHECK_ITEMS
        }

        if check_type != "all":
            result["focused_check"] = self._get_focused_check(check_type)

        return result

    def _get_focused_check(self, check_type: str) -> Dict[str, Any]:
        """获取聚焦检查项."""
        check_map = {item["category"]: item for item in self.CHECK_ITEMS}
        return check_map.get(check_type, {"category": check_type, "items": []})


class CircuitBreaker:
    """熔断器实现."""

    def __init__(self, failure_threshold: int = 5, recovery_timeout: int = 60):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "closed"  # closed, open, half_open

    def record_success(self) -> None:
        """记录成功."""
        self.failure_count = 0
        self.state = "closed"

    def record_failure(self) -> None:
        """记录失败."""
        self.failure_count += 1
        self.last_failure_time = __import__("time").time()

        if self.failure_count >= self.failure_threshold:
            self.state = "open"

    def can_execute(self) -> bool:
        """是否可以执行."""
        if self.state == "closed":
            return True

        if self.state == "open":
            # Check recovery timeout
            if self.last_failure_time:
                elapsed = __import__("time").time() - self.last_failure_time
                if elapsed > self.recovery_timeout:
                    self.state = "half_open"
                    return True
            return False

        return True  # half_open
