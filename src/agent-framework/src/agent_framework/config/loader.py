"""YAML configuration loader."""

import os
import re
from pathlib import Path
from typing import Any, Dict, Optional, Union

import yaml

from .schema import FrameworkConfig, AgentConfigModel, ToolsConfigModel, SkillsConfigModel, MCPConfigModel
from ..core.exceptions import ConfigurationError


class ConfigLoader:
    """
    Loader for YAML configuration files.

    Supports environment variable substitution with ${VAR} or ${VAR:default}.
    """

    ENV_PATTERN = re.compile(r"\$\{([^}:]+)(?::([^}]*))?\}")

    def __init__(self, config_dir: Optional[Union[str, Path]] = None):
        """
        Initialize the config loader.

        Args:
            config_dir: Directory containing config files
        """
        self._config_dir = Path(config_dir) if config_dir else Path("configs")
        self._configs: Dict[str, Dict[str, Any]] = {}

    @property
    def config_dir(self) -> Path:
        """Get the config directory."""
        return self._config_dir

    def _substitute_env_vars(self, value: Any) -> Any:
        """
        Substitute environment variables in a value.

        Supports ${VAR} and ${VAR:default} syntax.

        Args:
            value: Value to process
        Returns:
            Value with substituted env vars
        """
        if isinstance(value, str):
            def replace_env(match):
                var_name = match.group(1)
                default = match.group(2)
                return os.environ.get(var_name, default or "")

            return self.ENV_PATTERN.sub(replace_env, value)
        elif isinstance(value, dict):
            return {k: self._substitute_env_vars(v) for k, v in value.items()}
        elif isinstance(value, list):
            return [self._substitute_env_vars(item) for item in value]
        return value

    def load(self, config_name: str) -> Dict[str, Any]:
        """
        Load a configuration file by name.

        Args:
            config_name: Name of config file (without .yaml extension)
        Returns:
            Loaded and processed configuration dict
        """
        if config_name in self._configs:
            return self._configs[config_name]

        config_path = self._config_dir / f"{config_name}.yaml"
        if not config_path.exists():
            raise ConfigurationError(f"Config file not found: {config_path}")

        try:
            with open(config_path, "r", encoding="utf-8") as f:
                content = f.read()

            raw_config = yaml.safe_load(content)
            if raw_config is None:
                raw_config = {}

            processed_config = self._substitute_env_vars(raw_config)
            self._configs[config_name] = processed_config
            return processed_config

        except yaml.YAMLError as e:
            raise ConfigurationError(f"Failed to parse YAML: {e}") from e
        except Exception as e:
            raise ConfigurationError(f"Failed to load config: {e}") from e

    def load_agent_config(self) -> AgentConfigModel:
        """
        Load the agent configuration.

        Returns:
            Agent config model
        """
        config = self.load("agent")
        return AgentConfigModel(**config.get("agent", config))

    def load_tools_config(self) -> ToolsConfigModel:
        """
        Load the tools configuration.

        Returns:
            Tools config model
        """
        config = self.load("tools")
        return ToolsConfigModel(**config)

    def load_skills_config(self) -> SkillsConfigModel:
        """
        Load the skills configuration.

        Returns:
            Skills config model
        """
        config = self.load("skills")
        return SkillsConfigModel(**config)

    def load_mcp_config(self) -> MCPConfigModel:
        """
        Load the MCP configuration.

        Returns:
            MCP config model
        """
        config = self.load("mcp")
        return MCPConfigModel(**config)

    def load_all(self) -> FrameworkConfig:
        """
        Load all configuration files.

        Returns:
            Complete framework configuration
        """
        return FrameworkConfig(
            agent=self.load_agent_config(),
            tools=self.load_tools_config(),
            skills=self.load_skills_config(),
            mcp=self.load_mcp_config(),
        )

    def reload(self, config_name: Optional[str] = None) -> None:
        """
        Reload configuration from disk.

        Args:
            config_name: Specific config to reload, or all if None
        """
        if config_name:
            if config_name in self._configs:
                del self._configs[config_name]
        else:
            self._configs.clear()

    def set_config_dir(self, config_dir: Union[str, Path]) -> None:
        """
        Set the config directory and reload.

        Args:
            config_dir: New config directory
        """
        self._config_dir = Path(config_dir)
        self._configs.clear()

    @staticmethod
    def find_config_dir(module_path: str, config_dir_name: str = "configs") -> Path:
        """
        Find config directory relative to a module.

        Walks up from the module's directory to find a config directory.

        Args:
            module_path: Path to module file (e.g., __file__)
            config_dir_name: Name of config directory to find

        Returns:
            Path to config directory
        """
        module_file = Path(module_path)
        current = module_file.parent

        for _ in range(5):  # Max 5 levels up
            config_dir = current / config_dir_name
            if config_dir.exists() and config_dir.is_dir():
                return config_dir
            parent = current.parent
            if parent == current:
                break
            current = parent

        # Default to current directory / configs
        return Path(config_dir_name)
