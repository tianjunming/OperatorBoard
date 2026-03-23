"""Report generator skill for creating formatted reports."""

from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum

from agent_framework.skills import BaseSkill, SkillContext


class ReportFormat(str, Enum):
    """Supported report formats."""

    JSON = "json"
    MARKDOWN = "markdown"
    HTML = "html"
    CSV = "csv"
    TEXT = "text"


class ReportGeneratorSkill(BaseSkill):
    """
    Skill for generating formatted reports from data.

    Supports multiple output formats and provides
    customizable report templates.
    """

    name: str = "report_generator"
    description: str = "Generate formatted reports from operator data"

    def __init__(
        self,
        default_format: ReportFormat = ReportFormat.MARKDOWN,
        **kwargs,
    ):
        """
        Initialize the report generator.

        Args:
            default_format: Default output format
        """
        super().__init__(**kwargs)
        self.default_format = ReportFormat(default_format)

    async def execute(self, context: SkillContext) -> Dict[str, Any]:
        """
        Execute report generation.

        Args:
            context: Skill context with input_data containing:
                - data: Data to include in report
                - report_type: Type of report (summary, detailed, comparison)
                - format: Output format (json, markdown, html, csv, text)
                - title: Report title
                - include_timestamp: Whether to include timestamp
        Returns:
            Generated report
        """
        input_data = context.input_data
        data = input_data.get("data", {})
        report_type = input_data.get("report_type", "summary")
        format_str = input_data.get("format", self.default_format)
        title = input_data.get("title", "Operator Data Report")
        include_timestamp = input_data.get("include_timestamp", True)

        report_format = ReportFormat(format_str)

        if report_format == ReportFormat.JSON:
            content = self._generate_json_report(data, title, include_timestamp)
        elif report_format == ReportFormat.MARKDOWN:
            content = self._generate_markdown_report(
                data, title, report_type, include_timestamp
            )
        elif report_format == ReportFormat.HTML:
            content = self._generate_html_report(
                data, title, report_type, include_timestamp
            )
        elif report_format == ReportFormat.CSV:
            content = self._generate_csv_report(data)
        else:
            content = self._generate_text_report(
                data, title, report_type, include_timestamp
            )

        return {
            "timestamp": datetime.now().isoformat(),
            "format": report_format.value,
            "report_type": report_type,
            "title": title,
            "content": content,
        }

    def _generate_json_report(
        self,
        data: Dict[str, Any],
        title: str,
        include_timestamp: bool,
    ) -> str:
        """Generate JSON format report."""
        import json
        report = {
            "title": title,
            "data": data,
        }
        if include_timestamp:
            report["generated_at"] = datetime.now().isoformat()
        return json.dumps(report, indent=2, ensure_ascii=False)

    def _generate_markdown_report(
        self,
        data: Dict[str, Any],
        title: str,
        report_type: str,
        include_timestamp: bool,
    ) -> str:
        """Generate Markdown format report."""
        lines = [
            f"# {title}",
            "",
        ]

        if include_timestamp:
            lines.append(f"_Generated: {datetime.now().isoformat()}_")
            lines.append("")

        if report_type == "summary":
            lines.extend(self._markdown_summary(data))
        elif report_type == "detailed":
            lines.extend(self._markdown_detailed(data))
        elif report_type == "comparison":
            lines.extend(self._markdown_comparison(data))
        else:
            lines.extend(self._markdown_default(data))

        return "\n".join(lines)

    def _markdown_summary(self, data: Dict[str, Any]) -> List[str]:
        """Generate summary section for markdown."""
        lines = ["## Summary", ""]
        if isinstance(data, dict):
            for key, value in data.items():
                if isinstance(value, (int, float)):
                    lines.append(f"- **{key}**: {value:,}")
                else:
                    lines.append(f"- **{key}**: {value}")
        elif isinstance(data, list):
            lines.append(f"- Total items: {len(data)}")
        return lines

    def _markdown_detailed(self, data: Dict[str, Any]) -> List[str]:
        """Generate detailed section for markdown."""
        lines = ["## Detailed Report", ""]
        if isinstance(data, dict):
            for key, value in data.items():
                lines.append(f"### {key}")
                if isinstance(value, dict):
                    for k, v in value.items():
                        lines.append(f"- {k}: {v}")
                elif isinstance(value, list):
                    for item in value:
                        lines.append(f"- {item}")
                else:
                    lines.append(str(value))
                lines.append("")
        return lines

    def _markdown_comparison(self, data: Dict[str, Any]) -> List[str]:
        """Generate comparison section for markdown."""
        lines = ["## Comparison", ""]
        if isinstance(data, dict):
            lines.append("| Item | Value |")
            lines.append("|------|-------|")
            for key, value in data.items():
                lines.append(f"| {key} | {value} |")
        return lines

    def _markdown_default(self, data: Dict[str, Any]) -> List[str]:
        """Generate default markdown section."""
        lines = ["## Data", ""]
        lines.append("```")
        lines.append(str(data))
        lines.append("```")
        return lines

    def _generate_html_report(
        self,
        data: Dict[str, Any],
        title: str,
        report_type: str,
        include_timestamp: bool,
    ) -> str:
        """Generate HTML format report."""
        timestamp_html = (
            f'<p class="timestamp">Generated: {datetime.now().isoformat()}</p>'
            if include_timestamp
            else ""
        )

        data_html = self._html_data_section(data, report_type)

        return f"""<!DOCTYPE html>
<html>
<head>
    <title>{title}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 40px; }}
        h1 {{ color: #333; }}
        table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #4CAF50; color: white; }}
        .timestamp {{ color: #666; font-style: italic; }}
    </style>
</head>
<body>
    <h1>{title}</h1>
    {timestamp_html}
    {data_html}
</body>
</html>"""

    def _html_data_section(self, data: Dict[str, Any], report_type: str) -> str:
        """Generate HTML data section."""
        if isinstance(data, dict):
            rows = []
            for key, value in data.items():
                rows.append(f"<tr><td>{key}</td><td>{value}</td></tr>")
            return f"<table><thead><tr><th>Field</th><th>Value</th></tr></thead><tbody>{''.join(rows)}</tbody></table>"
        return f"<pre>{data}</pre>"

    def _generate_csv_report(self, data: Dict[str, Any]) -> str:
        """Generate CSV format report."""
        import csv
        import io

        output = io.StringIO()
        if isinstance(data, dict):
            writer = csv.DictWriter(output, fieldnames=data.keys())
            writer.writeheader()
            writer.writerow(data)
        elif isinstance(data, list) and data:
            writer = csv.DictWriter(output, fieldnames=data[0].keys())
            writer.writeheader()
            for row in data:
                writer.writerow(row)

        return output.getvalue()

    def _generate_text_report(
        self,
        data: Dict[str, Any],
        title: str,
        report_type: str,
        include_timestamp: bool,
    ) -> str:
        """Generate plain text format report."""
        lines = [
            "=" * 60,
            title.center(60),
            "=" * 60,
            "",
        ]

        if include_timestamp:
            lines.append(f"Generated: {datetime.now().isoformat()}")
            lines.append("")

        if isinstance(data, dict):
            for key, value in data.items():
                lines.append(f"{key}: {value}")
        elif isinstance(data, list):
            for i, item in enumerate(data, 1):
                lines.append(f"{i}. {item}")

        lines.append("")
        lines.append("=" * 60)

        return "\n".join(lines)
