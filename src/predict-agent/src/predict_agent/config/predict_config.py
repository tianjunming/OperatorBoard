"""Configuration loader for predict-agent."""

import os
from typing import Any, Dict, Optional
import yaml

from pathlib import Path


class PredictAgentConfig:
    """Configuration manager for predict-agent."""

    def __init__(self, config_dir: Optional[str] = None):
        """
        Initialize the configuration.

        Args:
            config_dir: Directory containing config files. Defaults to ./configs
        """
        if config_dir is None:
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
        return defaults_dict.get("llm_model", "coverage-llm")

    def load_coverage_config(self) -> Dict[str, Any]:
        """Load coverage prediction configuration."""
        coverage_file = self.config_dir / "coverage_prediction.yaml"
        if not coverage_file.exists():
            return self._default_coverage_config()

        with open(coverage_file, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}

        coverage_config = config.get("coverage_prediction", {})
        return {
            "llm_endpoint": self._expand_env_vars(coverage_config.get("llm_endpoint", "")),
            "llm_model": self._expand_env_vars(coverage_config.get("llm_model", "coverage-llm")),
            "api_key": self._expand_env_vars(coverage_config.get("api_key", "")),
            "vectorstore_path": coverage_config.get("vectorstore_path", ""),
        }

    def load_simulation_config(self) -> Dict[str, Any]:
        """Load simulation configuration."""
        sim_file = self.config_dir / "simulation.yaml"
        if not sim_file.exists():
            return self._default_simulation_config()

        with open(sim_file, "r", encoding="utf-8") as f:
            config = yaml.safe_load(f) or {}

        sim_config = config.get("simulation", {})
        return {
            "simulation_api_url": self._expand_env_vars(sim_config.get("simulation_api_url", "")),
        }

    def _default_coverage_config(self) -> Dict[str, Any]:
        """Return default coverage config."""
        return {
            "llm_endpoint": "http://localhost:8081/v1/completions",
            "llm_model": "coverage-llm",
            "api_key": "",
            "vectorstore_path": "",
        }

    def _default_simulation_config(self) -> Dict[str, Any]:
        """Return default simulation config."""
        return {
            "simulation_api_url": "http://localhost:8082/api/simulation",
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


def load_predict_config(config_dir: Optional[str] = None) -> PredictAgentConfig:
    """Load predict agent configuration."""
    return PredictAgentConfig(config_dir)
