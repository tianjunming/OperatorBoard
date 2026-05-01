"""Skill 7: Multi-Agent Collaboration Three Questions.

Multi-Agent协作三问 - 设计Multi-Agent架构时的核心问题。

Usage:
    skill = MultiAgentCollaborationSkill()
    result = await skill.execute(SkillContext(
        skill_name="multi_agent_collaboration",
        input_data={"task": "复杂NL2SQL查询"}
    ))
"""

from typing import Any, Dict, List, Optional
from agent_framework.skills.base import BaseSkill, SkillContext


class MultiAgentCollaborationSkill(BaseSkill):
    """Multi-Agent Collaboration Three Questions.

    Multi-Agent协作三问 - 让专业的Agent做专业的事。

    Questions:
        问题1: 任务能否并行？
        问题2: 谁来汇总结果？
        问题3: 某个Agent失败了怎么办？

    Collaboration Patterns:
        - Planner-Agent模式: 任务拆解 + 分发 + 汇总
        - 流水线模式: 上一个Agent输出作为下一个输入
        - 广播模式: 一个任务同时发给多个Agent，取最优
    """

    name = "multi_agent_collaboration"
    description = "Multi-Agent协作三问 - 设计Multi-Agent架构时的核心问题"

    THREE_QUESTIONS = [
        {
            "question": "问题1：任务能否并行？",
            "analysis": {
                "if_independent": "子任务相互独立 → Specialist Agent 并行执行",
                "if_dependent": "有依赖关系 → 按依赖顺序串行"
            },
            "action": "分析任务依赖关系"
        },
        {
            "question": "问题2：谁来汇总结果？",
            "analysis": {
                "if_simple": "结果简单 → 直接返回给用户",
                "if_complex": "结果复杂 → Verifier Agent 校验 + 整合"
            },
            "action": "确定结果汇总策略"
        },
        {
            "question": "问题3：某个Agent失败了怎么办？",
            "analysis": {
                "degradation": "降级策略: LLM专家 → 规则引擎 → 预设回复",
                "circuit_breaker": "熔断机制: 连续失败N次 → 切换策略"
            },
            "action": "设计容错机制"
        }
    ]

    COLLABORATION_PATTERNS = [
        {
            "pattern": "Planner-Agent模式",
            "description": "任务拆解 + 分发 + 汇总",
            "use_case": "复杂查询需要多步骤处理"
        },
        {
            "pattern": "流水线模式",
            "description": "上一个Agent输出作为下一个输入",
            "use_case": "顺序依赖的处理流程"
        },
        {
            "pattern": "广播模式",
            "description": "一个任务同时发给多个Agent，取最优",
            "use_case": "需要多角度验证的场景"
        }
    ]

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        """Execute multi-agent collaboration analysis.

        Args:
            context: Optional 'task' to analyze

        Returns:
            Collaboration framework with questions and patterns
        """
        task = context.input_data.get("task", "")

        result = {
            "skill": self.name,
            "framework": "Multi-Agent协作三问",
            "three_questions": self.THREE_QUESTIONS,
            "collaboration_patterns": self.COLLABORATION_PATTERNS
        }

        if task:
            result["task_analysis"] = self._analyze_task(task)

        return result

    def _analyze_task(self, task: str) -> Dict[str, Any]:
        """分析任务特点."""
        # 简化的任务分析
        is_complex = any(keyword in task for keyword in ["复杂", "多步", "分析"])
        has_dependencies = any(keyword in task for keyword in ["首先", "然后", "最后"])

        return {
            "task": task,
            "is_complex": is_complex,
            "has_dependencies": has_dependencies,
            "recommended_pattern": self._recommend_pattern(is_complex, has_dependencies)
        }

    def _recommend_pattern(self, is_complex: bool, has_dependencies: bool) -> str:
        """推荐协作模式."""
        if is_complex and has_dependencies:
            return "Planner-Agent模式"
        elif has_dependencies:
            return "流水线模式"
        else:
            return "广播模式"
