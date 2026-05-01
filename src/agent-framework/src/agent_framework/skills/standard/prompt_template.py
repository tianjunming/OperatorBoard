"""Skill 5: Prompt Template Safety Writing.

Prompt模板安全写法 - 避免{}占位符和Python format()冲突。

Usage:
    skill = PromptTemplateSkill()
    result = await skill.execute(SkillContext(
        skill_name="prompt_template",
        input_data={"template": "SELECT * FROM {table}"}
    ))
"""

from typing import Any, Dict
from agent_framework.skills.base import BaseSkill, SkillContext


class PromptTemplateSkill(BaseSkill):
    """Prompt Template Safety Writing.

    Prompt模板安全写法 - 解决{}占位符和代码占位符冲突的问题。

    Principles:
        1. Prompt占位符和代码占位符必须区分
        2. Prompt中使用{{}}表示字面大括号
        3. 示例代码块用{% raw %}{% endraw %}包裹
    """

    name = "prompt_template"
    description = "Prompt模板安全写法 - 避免占位符冲突"

    PRINCIPLES = [
        {
            "principle": 1,
            "description": "Prompt占位符和代码占位符必须区分",
            "wrong": 'Python f-string: f"SELECT * FROM {table}"',
            "correct": 'Jinja2: {{ table }}'
        },
        {
            "principle": 2,
            "description": "Prompt中使用{{}}表示字面大括号",
            "example": '输出格式是JSON → The format is {{"json"}}'
        },
        {
            "principle": 3,
            "description": "示例代码块用{% raw %}{% endraw %}包裹",
            "example": '{% raw %}{{"intent": "{{intent}}"}}{% endraw %}'
        }
    ]

    RECOMMENDED_ENGINES = [
        {"engine": "Jinja2", "language": "Python", "note": "Python生态最成熟"},
        {"engine": "Mustache", "language": "Multi", "note": "多语言通用"},
        {"engine": "Tera", "language": "Rust", "note": "Rust生态"}
    ]

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        """Execute prompt template analysis.

        Args:
            context: Optional 'template' to analyze

        Returns:
            Template safety guide
        """
        template = context.input_data.get("template", "")

        result = {
            "skill": self.name,
            "framework": "Prompt模板安全写法",
            "principles": self.PRINCIPLES,
            "recommended_engines": self.RECOMMENDED_ENGINES,
            "recommendation": "推荐使用Jinja2模板引擎"
        }

        if template:
            result["analysis"] = self._analyze_template(template)

        return result

    def _analyze_template(self, template: str) -> Dict[str, Any]:
        """分析模板安全性."""
        issues = []

        # 检查Python f-string风险
        if '{' in template and '}' in template:
            issues.append({
                "risk": "potential_collision",
                "description": "模板包含{}，可能与Python str.format()冲突",
                "suggestion": "考虑使用Jinja2模板引擎"
            })

        # 检查是否使用双大括号
        if '{{' in template and '}}' in template:
            return {
                "safe": True,
                "pattern": "Jinja2",
                "message": "使用Jinja2模板引擎，安全性良好"
            }

        return {
            "safe": False,
            "issues": issues,
            "suggestion": "推荐迁移到Jinja2模板引擎"
        }


class Jinja2TemplateHelper:
    """Jinja2模板助手 - 简化安全模板创建."""

    @staticmethod
    def create_template(template_str: str, **kwargs) -> str:
        """创建安全的Jinja2模板."""
        try:
            from jinja2 import Template
            t = Template(template_str)
            return t.render(**kwargs)
        except Exception as e:
            raise ValueError(f"Template rendering failed: {e}")

    @staticmethod
    def escape_braces(text: str) -> str:
        """转义大括号用于字面显示."""
        return text.replace("{", "{{").replace("}", "}}")
