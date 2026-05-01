"""Skill 1: Technology Selection Decision Framework.

技术选型决策框架 - 每次技术选型时问自己三个问题。

Usage:
    skill = TechnologySelectionSkill()
    result = await skill.execute(SkillContext(
        skill_name="technology_selection",
        input_data={"constraints": ["数据安全", "合规", "成本"], "options": [...]}
    ))
"""

from typing import Any, Dict, List
from agent_framework.skills.base import BaseSkill, SkillContext


class TechnologySelectionSkill(BaseSkill):
    """Technology Selection Decision Framework.

    每次技术选型时问自己三个问题，帮助做出明智的决策。

    Questions:
        1. 硬约束是什么？(数据安全、合规、成本...)
        2. 能接受多少妥协？(效果 vs 安全 vs 成本)
        3. 方案的工程化代价是什么？(部署、运维、更新...)
    """

    name = "technology_selection"
    description = "技术选型决策框架 - 每次技术选型时问自己三个问题"

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        """Execute technology selection analysis.

        Args:
            context: Must contain 'constraints' (list) and 'options' (list)

        Returns:
            Selection result with reasoning
        """
        constraints = context.input_data.get("constraints", [])
        options = context.input_data.get("options", [])

        result = {
            "skill": self.name,
            "framework": "技术选型三问法",
            "questions": [
                {
                    "question": "问题1：我的硬约束是什么？",
                    "guidance": "数据安全、合规、成本、延迟... 这类约束不能妥协，必须排在最前面",
                    "answer": self._analyze_constraints(constraints)
                },
                {
                    "question": "问题2：我能接受多少妥协？",
                    "guidance": "效果 vs 安全 vs 成本的三选一，明确底线，避免选型时摇摆不定",
                    "answer": self._analyze_compromises(options)
                },
                {
                    "question": "问题3：方案的工程化代价是什么？",
                    "guidance": "不能只看效果，要看落地成本。GPU部署、模型更新、Prompt调优...",
                    "answer": self._analyze_engineering_cost(options)
                }
            ],
            "recommendation": self._make_recommendation(constraints, options)
        }

        return result

    def _analyze_constraints(self, constraints: List[str]) -> Dict[str, Any]:
        """分析硬约束."""
        return {
            "identified": constraints,
            "prioritized": sorted(constraints, key=lambda x: self._constraint_priority(x)),
            "must_have": [c for c in constraints if self._is_must_have(c)]
        }

    def _analyze_compromises(self, options: List[Dict]) -> Dict[str, Any]:
        """分析可接受的妥协."""
        return {
            "options_count": len(options),
            "trade_offs": [
                {"option": opt.get("name"), "trade_off": opt.get("trade_off", "未知")}
                for opt in options
            ]
        }

    def _analyze_engineering_cost(self, options: List[Dict]) -> Dict[str, Any]:
        """分析工程化代价."""
        return {
            "options_count": len(options),
            "costs": [
                {"option": opt.get("name"), "cost": opt.get("cost", "未知")}
                for opt in options
            ]
        }

    def _make_recommendation(
        self, constraints: List[str], options: List[Dict]
    ) -> Dict[str, Any]:
        """生成推荐."""
        if not options:
            return {"decision": "需要更多选项", "reason": "没有提供可选方案"}

        # 按约束优先级排序
        sorted_options = sorted(
            options,
            key=lambda x: sum(
                self._constraint_priority(c) for c in constraints if c in x.get("constraints", [])
            ),
            reverse=True
        )

        return {
            "recommended": sorted_options[0].get("name") if sorted_options else None,
            "alternatives": [o.get("name") for o in sorted_options[1:]],
            "reasoning": "基于硬约束匹配度和可接受妥协程度"
        }

    def _constraint_priority(self, constraint: str) -> int:
        """约束优先级 (越高越重要)."""
        priorities = {
            "数据安全": 10,
            "合规": 9,
            "隐私": 8,
            "成本": 5,
            "延迟": 4,
            "效果": 3,
            "性能": 3
        }
        return priorities.get(constraint, 1)

    def _is_must_have(self, constraint: str) -> bool:
        """是否必须满足."""
        must_have = {"数据安全", "合规", "隐私"}
        return constraint in must_have
