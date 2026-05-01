"""Skill 8: Multi-LLM Provider Abstraction Design.

多LLM Provider抽象设计 - 避免供应商锁定。

Usage:
    skill = LLMProviderAbstractionSkill()
    result = await skill.execute(SkillContext(
        skill_name="llm_provider_abstraction",
        input_data={"current_provider": "sqlcoder"}
    ))
"""

from typing import Any, Dict, List, Optional, Protocol
from agent_framework.skills.base import BaseSkill, SkillContext


class LLMProviderAbstractionSkill(BaseSkill):
    """Multi-LLM Provider Abstraction Design.

    多LLM Provider抽象设计 - 核心逻辑不依赖具体LLM实现。

    Core Principle:
        接口定义要完整（generate, embed, function_call）
        保留降级路径（任何一个失败都能切到备选）
        统一错误处理（Provider异常转成统一异常）

    Switching Strategies:
        - 效果优先: SQLCoder → GPT-4 → Claude
        - 安全优先: 内网LLM → OpenAI（数据出境前审批）
        - 成本优先: MiniMax → GPT-4（按调用量切换）
    """

    name = "llm_provider_abstraction"
    description = "多LLM Provider抽象设计 - 避免供应商锁定"

    PROVIDERS = [
        {
            "provider": "SQLCoder",
            "status": "当前生产",
            "strengths": ["自托管", "数据安全", "NL2SQL优化"],
            "use_case": "内网NL2SQL场景"
        },
        {
            "provider": "OpenAI",
            "status": "备选方案",
            "strengths": ["效果好", "生态成熟"],
            "use_case": "效果优先场景"
        },
        {
            "provider": "Claude",
            "status": "备选方案",
            "strengths": ["长上下文", "推理能力强"],
            "use_case": "复杂分析场景"
        },
        {
            "provider": "MiniMax",
            "status": "成本敏感时",
            "strengths": ["成本低", "中文支持好"],
            "use_case": "成本敏感场景"
        }
    ]

    SWITCHING_STRATEGIES = [
        {"strategy": "效果优先", "path": "SQLCoder → GPT-4 → Claude"},
        {"strategy": "安全优先", "path": "内网LLM → OpenAI（需审批）"},
        {"strategy": "成本优先", "path": "MiniMax → GPT-4"}
    ]

    KEY_PRACTICES = [
        "接口定义要完整（generate, embed, function_call）",
        "保留降级路径（任何一个失败都能切到备选）",
        "统一错误处理（Provider异常转成统一异常）"
    ]

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        """Execute LLM provider abstraction analysis.

        Args:
            context: Optional 'current_provider'

        Returns:
            Provider abstraction framework
        """
        current = context.input_data.get("current_provider", "")

        result = {
            "skill": self.name,
            "framework": "多LLM Provider抽象设计",
            "providers": self.PROVIDERS,
            "switching_strategies": self.SWITCHING_STRATEGIES,
            "key_practices": self.KEY_PRACTICES
        }

        if current:
            result["migration_guide"] = self._create_migration_guide(current)

        return result

    def _create_migration_guide(self, current: str) -> Dict[str, Any]:
        """创建迁移指南."""
        return {
            "current": current,
            "target_options": [p for p in self.PROVIDERS if p["provider"] != current],
            "migration_steps": [
                "1. 实现新Provider的抽象接口",
                "2. 配置切换策略和条件",
                "3. A/B测试验证效果",
                "4. 灰度切换流量",
                "5. 监控并调整"
            ],
            "rollback_plan": "切换回原Provider，确保可逆"
        }


class LLMProvider(Protocol):
    """LLM Provider抽象接口协议."""

    def generate(self, prompt: str, **kwargs) -> str:
        """生成文本."""
        ...

    def embed(self, text: str) -> List[float]:
        """生成嵌入向量."""
        ...
