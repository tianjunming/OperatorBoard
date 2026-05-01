"""Skill 2: Intent Detection Cascade Architecture.

LLM与规则引擎级联架构 - 解决LLM意图识别的不可解释性问题。

Usage:
    skill = IntentCascadeSkill()
    result = await skill.execute(SkillContext(
        skill_name="intent_cascade",
        input_data={"query": "北京联通有多少站点"}
    ))
"""

from typing import Any, Dict, Optional, Tuple
from agent_framework.skills.base import BaseSkill, SkillContext


class IntentCascadeSkill(BaseSkill):
    """Cascade Architecture for LLM and Rule Engine.

    意图识别级联设计 - 先用规则引擎处理明确的、高频的查询模式，
    剩余的模糊查询走 LLM 意图检测。

    Architecture:
        查询 → 规则引擎匹配
                  ├─ 匹配成功 → 直接路由 (可解释)
                  └─ 匹配失败 → LLM 意图检测 → 路由

    Benefits:
        - 明确的 query 有解释
        - 模糊的 query 有兜底
        - 维护两套系统，出问题时知道去哪看日志
    """

    name = "intent_cascade"
    description = "LLM与规则引擎级联架构 - 解决意图识别的不可解释性"

    # 高频模式规则 (简化示例)
    HIGH_FREQUENCY_PATTERNS = [
        {"pattern": r"有多少", "intent": "count_query"},
        {"pattern": r"站点|小区", "intent": "site_data"},
        {"pattern": r"指标|速率|性能", "intent": "indicator_data"},
        {"pattern": r"运营商|有哪些", "intent": "operator_list"},
    ]

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        """Execute intent cascade analysis.

        Args:
            context: Must contain 'query' (str)

        Returns:
            Cascade analysis result with routing decision
        """
        query = context.input_data.get("query", "")

        # Step 1: 规则引擎匹配
        rule_result = self._rule_based_match(query)

        # Step 2: 如果规则匹配失败，使用LLM
        if rule_result["matched"]:
            routing = "direct"
            confidence = 1.0
            method = "rule_engine"
        else:
            routing = "llm_detection"
            confidence = 0.85  # LLM typical confidence
            method = "llm"

        return {
            "skill": self.name,
            "framework": "意图识别级联设计",
            "query": query,
            "step1_rule_engine": rule_result,
            "step2_routing": {
                "method": method,
                "confidence": confidence,
                "route": routing
            },
            "explanation": self._get_explanation(rule_result, method),
            "适用场景": [
                "明确的query需要可解释性（如业务审核）",
                "模糊的query需要LLM的泛化能力",
                "高频固定模式用规则，低频变化模式用LLM"
            ]
        }

    def _rule_based_match(self, query: str) -> Dict[str, Any]:
        """规则引擎匹配."""
        for rule in self.HIGH_FREQUENCY_PATTERNS:
            import re
            if re.search(rule["pattern"], query):
                return {
                    "matched": True,
                    "intent": rule["intent"],
                    "confidence": 1.0,
                    "method": "rule_engine",
                    "matched_pattern": rule["pattern"]
                }

        return {
            "matched": False,
            "intent": None,
            "confidence": 0.0,
            "method": "rule_engine",
            "matched_pattern": None
        }

    def _get_explanation(self, rule_result: Dict, method: str) -> str:
        """获取解释."""
        if rule_result["matched"]:
            return f"规则引擎匹配成功: {rule_result['intent']}"
        else:
            return "规则引擎未匹配，启用LLM意图检测作为兜底"
