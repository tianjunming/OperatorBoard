"""Configuration loader for operator-agent."""

import os
from typing import Any, Dict, List, Optional
import yaml

from pathlib import Path


class OperatorAgentConfig:
    """Configuration manager for operator-agent."""

    def __init__(self, config_dir: Optional[str] = None):
        """
        Initialize the configuration.

        Args:
            config_dir: Directory containing config files. Defaults to ./configs
        """
        if config_dir is None:
            self.config_dir = Path(__file__).parent.parent.parent / "configs"
        else:
            self.config_dir = Path(config_dir)

    def load_tools_config(self) -> Dict[str, Any]:
        """Load tools configuration from tools.yaml."""
        tools_file = self.config_dir / "tools.yaml"
        if not tools_file.exists():
            return {}

        with open(tools_file, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}

    def get_java_services(self) -> List[Dict[str, str]]:
        """
        Get configured Java services.

        Returns:
            List of Java service configurations
        """
        tools_config = self.load_tools_config()
        java_services = []

        for tool_name, tool_config in tools_config.get("tools", {}).items():
            if not tool_config.get("enabled", True):
                continue

            config = tool_config.get("config", {})
            if "base_url" in config:
                java_services.append({
                    "name": config.get("service_name", tool_name),
                    "base_url": self._expand_env_vars(config.get("base_url", "")),
                    "api_prefix": config.get("api_prefix", "/api"),
                    "timeout": config.get("timeout", 60),
                })

        return java_services

    def _expand_env_vars(self, value: str) -> str:
        """Expand environment variables in config values."""
        if not isinstance(value, str):
            return value

        import re
        pattern = r'\$\{([^}:]+)(?::([^}]*))?\}'

        def replacer(match):
            env_var = match.group(1)
            default = match.group(2) or ""
            return os.environ.get(env_var, default)

        return re.sub(pattern, replacer, value)


def load_operator_config(config_dir: Optional[str] = None) -> OperatorAgentConfig:
    """Load operator agent configuration."""
    return OperatorAgentConfig(config_dir)
