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
            # Path: operator_agent/config/operator_config.py -> operator_agent/config -> operator_agent -> operator-agent -> configs
            self.config_dir = Path(__file__).parent.parent.parent.parent / "configs"
        else:
            self.config_dir = Path(config_dir)

    def load_defaults_config(self) -> Dict[str, Any]:
        """Load defaults configuration from defaults.yaml."""
        defaults_file = self.config_dir / "defaults.yaml"
        if not defaults_file.exists():
            return {}

        with open(defaults_file, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}

    def get_default_llm_model(self) -> str:
        """Get default LLM model from defaults config."""
        defaults = self.load_defaults_config()
        defaults_dict = defaults.get("defaults", {})
        return defaults_dict.get("llm_model", "MiniMax-M2.1")

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
                    "api_key": self._expand_env_vars(config.get("api_key", "")),
                })

        return java_services

    def get_intent_detection_config(self) -> Dict[str, Any]:
        """
        Get intent detection configuration.

        Returns:
            Intent detection config with expanded env vars
        """
        intent_file = self.config_dir / "intent_detection.yaml"
        if not intent_file.exists():
            return self._default_intent_detection_config()

        with open(intent_file, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}

        intent_config = config.get("intent_detection", {})
        default_model = self.get_default_llm_model()
        return {
            "enabled": intent_config.get("enabled", True),
            "llm_endpoint": self._expand_env_vars(intent_config.get("llm_endpoint", "http://localhost:8081/v1/completions")),
            "llm_model": self._expand_env_vars(intent_config.get("llm_model", default_model)) or default_model,
            "api_key": self._expand_env_vars(intent_config.get("api_key", "")),
            "timeout": intent_config.get("timeout", 30),
            "max_tokens": intent_config.get("max_tokens", 200),
            "temperature": intent_config.get("temperature", 0.1),
            "prompt_template": intent_config.get("prompt_template", ""),
        }

    def _default_intent_detection_config(self) -> Dict[str, Any]:
        """Return default intent detection config."""
        return {
            "enabled": True,
            "llm_endpoint": "http://localhost:8081/v1/completions",
            "llm_model": "MiniMax-M2.1",
            "timeout": 30,
            "max_tokens": 200,
            "temperature": 0.1,
            "prompt_template": "",
        }

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
