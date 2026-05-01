"""Skill 6: LLM Output Security Validation Framework.

LLM输出安全校验框架 - 解决SQL注入/全表扫描问题。

Usage:
    skill = OutputSecuritySkill()
    result = await skill.execute(SkillContext(
        skill_name="output_security",
        input_data={"sql": "SELECT * FROM site_info"}
    ))
"""

from typing import Any, Dict, List, Optional
from agent_framework.skills.base import BaseSkill, SkillContext


class OutputSecuritySkill(BaseSkill):
    """LLM Output Security Validation Framework.

    LLM输出安全校验框架 - Prompt约束是"建议"，代码校验是"法律"。

    Validation Layers:
        Layer 1: 语法安全 (必须) - SELECT开头、LIMIT、禁止注释
        Layer 2: 业务安全 (建议) - 禁止未授权表、跨运营商关联
        Layer 3: 语义校验 (可选) - 执行计划分析、结果合理性检查
    """

    name = "output_security"
    description = "LLM输出安全校验框架 - 解决SQL注入/全表扫描问题"

    DANGEROUS_KEYWORDS = [
        "DROP", "DELETE", "INSERT", "UPDATE",
        "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE"
    ]

    VALIDATION_LAYERS = [
        {
            "layer": 1,
            "name": "语法安全",
            "required": True,
            "rules": [
                "必须以SELECT开头（禁止INSERT/DROP/DELETE）",
                "必须包含LIMIT（防止全表扫描）",
                "禁止注释（-- /* */）",
                "禁止子查询嵌套超过3层"
            ]
        },
        {
            "layer": 2,
            "name": "业务安全",
            "required": False,
            "rules": [
                "禁止查询未授权的表",
                "禁止跨运营商数据关联",
                "结果集大小限制（防内存溢出）"
            ]
        },
        {
            "layer": 3,
            "name": "语义校验",
            "required": False,
            "rules": [
                "SQL执行计划分析（检测全表扫描）",
                "结果合理性检查（数值范围、记录数）",
                "历史相似查询比对（检测异常模式）"
            ]
        }
    ]

    FALLBACK_STRATEGY = "校验失败 → 走预设查询 → 友好错误"

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        """Execute security validation.

        Args:
            context: Must contain 'sql' to validate

        Returns:
            Validation result with pass/fail and issues
        """
        sql = context.input_data.get("sql", "")
        layer = context.input_data.get("layer", 1)

        result = {
            "skill": self.name,
            "framework": "LLM输出安全校验框架",
            "validation_layers": self.VALIDATION_LAYERS,
            "fallback_strategy": self.FALLBACK_STRATEGY
        }

        if sql:
            validation_result = self._validate_sql(sql, layer)
            result["validation"] = validation_result
            result["recommendation"] = self._get_recommendation(validation_result)

        return result

    def _validate_sql(self, sql: str, layer: int = 1) -> Dict[str, Any]:
        """校验SQL安全性."""
        issues = []

        # Layer 1: 语法安全
        if not sql.strip().upper().startswith("SELECT"):
            issues.append({"layer": 1, "issue": "必须以SELECT开头", "severity": "error"})

        for keyword in self.DANGEROUS_KEYWORDS:
            if keyword in sql.upper():
                issues.append({"layer": 1, "issue": f"禁止关键词: {keyword}", "severity": "error"})

        if "LIMIT" not in sql.upper():
            issues.append({"layer": 1, "issue": "缺少LIMIT防止全表扫描", "severity": "warning"})

        if "--" in sql or "/*" in sql:
            issues.append({"layer": 1, "issue": "禁止注释", "severity": "error"})

        # Count nested SELECTs
        select_count = sql.upper().count("SELECT")
        if select_count > 3:
            issues.append({"layer": 1, "issue": "子查询嵌套超过3层", "severity": "warning"})

        return {
            "sql": sql,
            "passed": len([i for i in issues if i["severity"] == "error"]) == 0,
            "issues": issues,
            "layer_applied": layer
        }

    def _get_recommendation(self, validation: Dict) -> str:
        """获取建议."""
        if validation["passed"]:
            return "SQL通过安全校验"
        else:
            errors = [i["issue"] for i in validation["issues"] if i["severity"] == "error"]
            return f"校验失败: {', '.join(errors)}"


class SqlSafetyValidator:
    """SQL安全校验器 - 可独立使用的校验工具."""

    def __init__(self, require_limit: bool = True, max_nested_selects: int = 3):
        self.require_limit = require_limit
        self.max_nested_selects = max_nested_selects
        self.dangerous_keywords = OutputSecuritySkill.DANGEROUS_KEYWORDS

    def validate(self, sql: str) -> bool:
        """校验SQL是否安全."""
        if not sql.strip().upper().startswith("SELECT"):
            return False

        for keyword in self.dangerous_keywords:
            if keyword in sql.upper():
                return False

        if self.require_limit and "LIMIT" not in sql.upper():
            return False

        if sql.upper().count("SELECT") > self.max_nested_selects:
            return False

        return True

    def get_issues(self, sql: str) -> List[str]:
        """获取所有问题."""
        issues = []

        if not sql.strip().upper().startswith("SELECT"):
            issues.append("必须以SELECT开头")

        for keyword in self.dangerous_keywords:
            if keyword in sql.upper():
                issues.append(f"禁止关键词: {keyword}")

        if self.require_limit and "LIMIT" not in sql.upper():
            issues.append("缺少LIMIT")

        if sql.upper().count("SELECT") > self.max_nested_selects:
            issues.append("子查询嵌套过深")

        return issues
