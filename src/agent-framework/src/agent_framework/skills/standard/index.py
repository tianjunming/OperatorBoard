"""Standard Skills Index.

LLM-Based SDD 可复用 Skills 索引表。

Skills Overview:

╔═══════════════════════════════════════════════════════════════════════╗
║                    LLM-Based SDD 可复用 Skill 索引                     ║
╠═══════════════════════════════════════════════════════════════════════╣
║ 阶段        │ Skill                              │ 解决的问题           ║
╠═════════════╪════════════════════════════════════╪═════════════════════╣
║ 技术选型     │ TechnologySelectionSkill           │ 决策框架混乱         ║
║             │ LLMProviderAbstractionSkill        │ 供应商锁定           ║
╠═════════════╪════════════════════════════════════╪═════════════════════╣
║ 意图识别     │ IntentCascadeSkill                 │ 不可解释性           ║
╠═════════════╪════════════════════════════════════╪═════════════════════╣
║ 知识管理     │ RAGEnhancementSkill                │ LLM 记性不好         ║
╠═════════════╪════════════════════════════════════╪═════════════════════╣
║ 开发调试     │ LLMExceptionSkill                  │ 输出异常定位         ║
║             │ PromptTemplateSkill                 │ 占位符冲突           ║
╠═════════════╪════════════════════════════════════╪═════════════════════╣
║ 安全合规     │ OutputSecuritySkill                │ SQL注入/全表扫描     ║
╠═════════════╪════════════════════════════════════╪═════════════════════╣
║ 架构设计     │ MultiAgentCollaborationSkill       │ Agent编排            ║
║             │ StreamingStateMachineSkill          │ SSE完整性            ║
╠═════════════╪════════════════════════════════════╪═════════════════════╣
║ 可靠性       │ SystemReliabilitySkill             │ 不知道测什么         ║
║             │ PreLaunchChecklistSkill            │ 上线遗漏             ║
╚═══════════════════════════════════════════════════════════════════════╝

Usage:

    from agent_framework.skills import (
        TechnologySelectionSkill,
        IntentCascadeSkill,
        # ...
    )

    # Execute a skill
    skill = TechnologySelectionSkill()
    result = await skill.execute(SkillContext(
        skill_name="technology_selection",
        input_data={"constraints": ["数据安全"], "options": [...]}
    ))
"""

# Re-export all skills for convenient access
from .technology_selection import TechnologySelectionSkill
from .intent_cascade import IntentCascadeSkill
from .rag_enhancement import RAGEnhancementSkill
from .llm_exception import LLMExceptionSkill
from .prompt_template import PromptTemplateSkill
from .output_security import OutputSecuritySkill
from .multi_agent_collaboration import MultiAgentCollaborationSkill
from .llm_provider_abstraction import LLMProviderAbstractionSkill
from .streaming_state_machine import StreamingStateMachineSkill
from .system_reliability import SystemReliabilitySkill
from .pre_launch_checklist import PreLaunchChecklistSkill

__all__ = [
    "TechnologySelectionSkill",
    "IntentCascadeSkill",
    "RAGEnhancementSkill",
    "LLMExceptionSkill",
    "PromptTemplateSkill",
    "OutputSecuritySkill",
    "MultiAgentCollaborationSkill",
    "LLMProviderAbstractionSkill",
    "StreamingStateMachineSkill",
    "SystemReliabilitySkill",
    "PreLaunchChecklistSkill",
]
