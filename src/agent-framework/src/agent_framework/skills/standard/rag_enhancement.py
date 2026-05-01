"""Skill 3: RAG Knowledge Enhancement Four Steps.

RAG知识增强四步法 - 解决LLM记性不好的问题。

Usage:
    skill = RAGEnhancementSkill()
    result = await skill.execute(SkillContext(
        skill_name="rag_enhancement",
        input_data={"phase": "all", "context": {...}}
    ))
"""

from typing import Any, Dict, List, Optional
from agent_framework.skills.base import BaseSkill, SkillContext


class RAGEnhancementSkill(BaseSkill):
    """RAG Knowledge Enhancement Four Steps.

    RAG知识增强四步法 - 不要让LLM死记硬背，按需检索，按需注入。

    Steps:
        Step 1: 知识分层 (文档/领域/系统/专业知识)
        Step 2: 向量化策略 (表级/指标级/领域级Chunk)
        Step 3: 检索增强时机 (查询分析/SQL生成/结果校验)
        Step 4: 效果验证 (A/B测试)
    """

    name = "rag_enhancement"
    description = "RAG知识增强四步法 - 解决LLM记性不好的问题"

    KNOWLEDGE_LAYERS = [
        {
            "layer": "文档知识",
            "content": "Schema、API文档",
            "purpose": "LLM知道有什么"
        },
        {
            "layer": "领域知识",
            "content": "业务规则、计算公式",
            "purpose": "LLM知道怎么算"
        },
        {
            "layer": "系统知识",
            "content": "接口契约、调用模式",
            "purpose": "LLM知道怎么用"
        },
        {
            "layer": "专业知识",
            "content": "运营商特定知识",
            "purpose": "LLM知道边界在哪"
        }
    ]

    VECTORIZATION_STRATEGIES = [
        {"strategy": "表级Chunk", "content": "每个表的Schema + 注释"},
        {"strategy": "指标级Chunk", "content": "每个指标的定义 + 公式 + 单位"},
        {"strategy": "领域级Chunk", "content": "频段分类、运营商归属"}
    ]

    RETRIEVAL_TIMING = [
        {"timing": "查询分析阶段", "injected": "表结构信息"},
        {"timing": "SQL生成阶段", "injected": "字段映射"},
        {"timing": "结果校验阶段", "injected": "业务规则"}
    ]

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        """Execute RAG enhancement analysis.

        Args:
            context: Optional 'phase' to focus on specific step

        Returns:
            RAG enhancement framework with all steps
        """
        phase = context.input_data.get("phase", "all")

        result = {
            "skill": self.name,
            "framework": "RAG知识增强四步法",
            "steps": self._get_steps()
        }

        if phase == "all":
            return result
        else:
            # Filter to specific step
            step_map = {f"step{i+1}": step for i, step in enumerate(result["steps"])}
            return step_map.get(phase, result)

    def _get_steps(self) -> List[Dict[str, Any]]:
        """获取四步框架."""
        return [
            {
                "step": 1,
                "name": "知识分层",
                "details": self.KNOWLEDGE_LAYERS,
                "output": "分层知识库"
            },
            {
                "step": 2,
                "name": "向量化策略",
                "details": self.VECTORIZATION_STRATEGIES,
                "output": "Chunk策略"
            },
            {
                "step": 3,
                "name": "检索增强时机",
                "details": self.RETRIEVAL_TIMING,
                "output": "注入点"
            },
            {
                "step": 4,
                "name": "效果验证",
                "details": [
                    {"method": "A/B测试", "description": "加RAG vs 不加RAG"},
                    {"expected": "准确率提升通常8-12%", "description": "对比基准"}
                ],
                "output": "验证报告"
            }
        ]


class RAGEnhancementStep1Skill(BaseSkill):
    """Step 1: Knowledge Layering."""

    name = "rag_step1_knowledge_layering"
    description = "知识分层 - Step 1 of RAG enhancement"

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        """Execute knowledge layering."""
        return {
            "step": 1,
            "name": "知识分层",
            "knowledge_layers": RAGEnhancementSkill.KNOWLEDGE_LAYERS
        }


class RAGEnhancementStep2Skill(BaseSkill):
    """Step 2: Vectorization Strategy."""

    name = "rag_step2_vectorization"
    description = "向量化策略 - Step 2 of RAG enhancement"

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        """Execute vectorization strategy."""
        return {
            "step": 2,
            "name": "向量化策略",
            "strategies": RAGEnhancementSkill.VECTORIZATION_STRATEGIES
        }
