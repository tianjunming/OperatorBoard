"""Skill 4: LLM Exception Troubleshooting Three Axes.

LLM异常排查三板斧 - 快速定位LLM输出异常问题。

Usage:
    skill = LLMExceptionSkill()
    result = await skill.execute(SkillContext(
        skill_name="llm_exception",
        input_data={"phase": "all", "issue": "中文乱码"}
    ))
"""

from typing import Any, Dict, List
from agent_framework.skills.base import BaseSkill, SkillContext


class LLMExceptionSkill(BaseSkill):
    """LLM Exception Troubleshooting Three Axes.

    LLM异常排查三板斧 - 快速定位LLM输出异常问题。

    Three Axes:
        第一斧: 环境隔离验证 - 本地单独跑Prompt，排除干扰因素
        第二斧: 输入简化测试 - 把复杂输入逐步精简，找到触发点
        第三斧: 换LLM对照 - 用另一个LLM跑同样的Prompt
    """

    name = "llm_exception"
    description = "LLM异常排查三板斧 - 快速定位LLM输出异常问题"

    AXES = [
        {
            "axe": "第一斧",
            "name": "环境隔离验证",
            "steps": [
                "本地单独跑Prompt，看输出是否正常",
                "排除网络、代理、日志等干扰因素"
            ],
            "applicable": "初步排查，怀疑环境问题"
        },
        {
            "axe": "第二斧",
            "name": "输入简化测试",
            "steps": [
                "把复杂输入逐步精简，看哪个触发了异常",
                "常见触发点：中文、结构化输出、特殊字符"
            ],
            "applicable": "发现特定输入触发问题"
        },
        {
            "axe": "第三斧",
            "name": "换LLM对照",
            "steps": [
                "用另一个LLM跑同样的Prompt",
                "如果另一个正常 → 当前LLM的特有问题",
                "如果另一个也异常 → Prompt本身的问题"
            ],
            "applicable": "排除Prompt问题，确认LLM特性"
        }
    ]

    PRIORITY = "环境 > 输入 > Prompt > LLM特性"

    COMMON_TRIGGERS = [
        "中文编码",
        "结构化输出",
        "特殊字符",
        "超长上下文",
        "温度参数过高"
    ]

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        """Execute exception troubleshooting.

        Args:
            context: Optional 'phase' to focus, 'issue' to diagnose

        Returns:
            Troubleshooting guide
        """
        phase = context.input_data.get("phase", "all")
        issue = context.input_data.get("issue", "")

        result = {
            "skill": self.name,
            "framework": "LLM异常排查三板斧",
            "priority": self.PRIORITY,
            "axes": self.AXES,
            "common_triggers": self.COMMON_TRIGGERS
        }

        if issue:
            result["diagnosis"] = self._diagnose_issue(issue)

        return result

    def _diagnose_issue(self, issue: str) -> Dict[str, Any]:
        """诊断常见问题."""
        issue_lower = issue.lower()

        if "中文" in issue or "乱码" in issue or "unicode" in issue_lower:
            return {
                "likely_cause": "LLM对中文的结构化输出存在Unicode编码问题",
                "quick_fix": "尝试使用英文Prompt",
                "steps": [
                    "将中文Prompt转换为英文",
                    "测试输出是否正常",
                    "如果正常，确认是LLM中文编码问题"
                ]
            }

        if "格式" in issue or "json" in issue_lower or "结构" in issue:
            return {
                "likely_cause": "LLM输出的结构化数据格式不正确",
                "quick_fix": "简化Prompt中的格式要求，使用更明确的示例",
                "steps": [
                    "减少格式约束",
                    "添加明确的JSON示例",
                    "考虑使用function calling"
                ]
            }

        if "不一致" in issue or "随机" in issue or "不稳定" in issue:
            return {
                "likely_cause": "Temperature参数过高导致输出随机性大",
                "quick_fix": "降低temperature到0.1-0.3",
                "steps": [
                    "设置temperature=0.1",
                    "测试输出稳定性",
                    "逐步调整到可接受范围"
                ]
            }

        return {
            "likely_cause": "未知",
            "quick_fix": "使用三板斧逐步排查",
            "steps": self.AXES[0]["steps"]
        }
