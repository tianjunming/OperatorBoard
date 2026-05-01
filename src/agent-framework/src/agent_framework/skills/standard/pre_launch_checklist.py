"""Skill 11: LLM Feature Pre-Launch Checklist.

LLM功能上线前检查 - 确保新功能稳妥发布。

Usage:
    skill = PreLaunchChecklistSkill()
    result = await skill.execute(SkillContext(
        skill_name="pre_launch_checklist",
        input_data={"check_type": "all"}
    ))
"""

from typing import Any, Dict, List, Optional
from agent_framework.skills.base import BaseSkill, SkillContext


class PreLaunchChecklistSkill(BaseSkill):
    """LLM Feature Pre-Launch Checklist.

    LLM功能上线前检查 - 上线前必须确认的检查项。

    Checklist Categories:
        1. Prompt版本化 - 所有Prompt有版本号
        2. 降级链路测试 - 模拟各种失败场景
        3. 日志埋点 - 请求ID串联全链路
        4. 监控告警 - 成功率、延迟、降级次数
    """

    name = "pre_launch_checklist"
    description = "LLM功能上线前检查 - 确保新功能稳妥发布"

    CHECKLIST = [
        {
            "category": "1. Prompt版本化",
            "items": [
                "所有Prompt有版本号",
                "每次修改有changelog记录",
                "旧版本保留用于回滚"
            ],
            "required": True
        },
        {
            "category": "2. 降级链路测试",
            "items": [
                "模拟LLM超时 → 验证降级触发",
                "模拟LLM返回错误格式 → 验证异常处理",
                "模拟LLM返回恶意内容 → 验证安全护栏"
            ],
            "required": True
        },
        {
            "category": "3. 日志埋点",
            "items": [
                "请求ID（串联全链路）",
                "Prompt版本号",
                "LLM输出摘要（脱敏）",
                "耗时分析（LLM + 后处理）"
            ],
            "required": True
        },
        {
            "category": "4. 监控告警",
            "items": [
                "成功率 < 95% → 告警",
                "延迟 > 5s → 告警",
                "降级次数突增 → 告警"
            ],
            "required": True
        }
    ]

    COMMON_PITFALLS = [
        {
            "pitfall": "中文Prompt在某些LLM上有编码问题",
            "solution": "换英文Prompt",
            "severity": "high"
        },
        {
            "pitfall": "JSON解析需要健壮的异常处理",
            "solution": "使用try-catch和降级逻辑",
            "severity": "high"
        },
        {
            "pitfall": "temperature设置影响稳定性",
            "solution": "建议从0.1开始调",
            "severity": "medium"
        },
        {
            "pitfall": "API Key必须通过环境变量注入",
            "solution": "使用环境变量，不要硬编码",
            "severity": "critical"
        },
        {
            "pitfall": "示例不是越多越好",
            "solution": "3-5个精选",
            "severity": "medium"
        },
        {
            "pitfall": "角色设定需要在Prompt开头重复",
            "solution": "LLM在长Prompt中会遗忘",
            "severity": "low"
        }
    ]

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        """Execute pre-launch checklist.

        Args:
            context: Optional 'check_type' to focus

        Returns:
            Pre-launch checklist with common pitfalls
        """
        check_type = context.input_data.get("check_type", "all")

        result = {
            "skill": self.name,
            "framework": "LLM功能上线前检查",
            "checklist": self.CHECKLIST,
            "common_pitfalls": self.COMMON_PITFALLS
        }

        if check_type != "all":
            result["focused_category"] = self._get_focused_category(check_type)

        return result

    def _get_focused_category(self, category: str) -> Dict[str, Any]:
        """获取聚焦的检查项."""
        for item in self.CHECKLIST:
            if category.lower() in item["category"].lower():
                return item
        return {"category": category, "items": [], "found": False}


class PreLaunchChecker:
    """上线前检查器 - 用于自动化检查."""

    def __init__(self):
        self.results = []

    def check_prompt_versioning(self, prompts: Dict[str, str]) -> Dict[str, Any]:
        """检查Prompt版本化."""
        issues = []

        for name, prompt in prompts.items():
            if not any(char.isdigit() for char in prompt[-10:]):
                issues.append(f"Prompt '{name}' 可能缺少版本号")

        return {
            "check": "Prompt版本化",
            "passed": len(issues) == 0,
            "issues": issues
        }

    def check_degradation_chain(self, service) -> Dict[str, Any]:
        """检查降级链路."""
        issues = []

        # 检查是否有降级逻辑
        if not hasattr(service, "fallback"):
            issues.append("服务缺少fallback方法")

        if not hasattr(service, "circuit_breaker"):
            issues.append("服务缺少熔断机制")

        return {
            "check": "降级链路",
            "passed": len(issues) == 0,
            "issues": issues
        }

    def check_logging(self, service) -> Dict[str, Any]:
        """检查日志埋点."""
        issues = []

        required_fields = ["request_id", "prompt_version", "llm_output", "duration"]
        for field in required_fields:
            if not hasattr(service, field):
                issues.append(f"缺少日志字段: {field}")

        return {
            "check": "日志埋点",
            "passed": len(issues) == 0,
            "issues": issues
        }

    def run_all_checks(self, prompts: Dict, service) -> Dict[str, Any]:
        """运行所有检查."""
        checks = [
            self.check_prompt_versioning(prompts),
            self.check_degradation_chain(service),
            self.check_logging(service)
        ]

        return {
            "total": len(checks),
            "passed": sum(1 for c in checks if c["passed"]),
            "failed": sum(1 for c in checks if not c["passed"]),
            "checks": checks
        }
