"""Settings singleton for framework configuration."""

import os
import threading
from pathlib import Path
from typing import Optional, Union

from .loader import ConfigLoader
from .schema import FrameworkConfig


class Settings:
    """
    Singleton settings class for framework configuration.

    Provides global access to configuration across the framework.
    """

    _instance: Optional["Settings"] = None
    _lock = threading.Lock()

    def __new__(cls) -> "Settings":
        """Get or create the singleton instance."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        """Initialize settings (called after singleton creation)."""
        if self._initialized:
            return

        self._config_dir: Optional[Path] = None
        self._loader: Optional[ConfigLoader] = None
        self._config: Optional[FrameworkConfig] = None
        self._initialized = True

    @classmethod
    def get_instance(cls) -> "Settings":
        """Get the singleton instance."""
        return cls()

    @classmethod
    def reset(cls) -> None:
        """Reset the singleton (for testing)."""
        with cls._lock:
            cls._instance = None

    def initialize(
        self,
        config_dir: Optional[Union[str, Path]] = None,
        auto_load: bool = True,
    ) -> None:
        """
        Initialize settings with configuration.

        Args:
            config_dir: Directory containing config files
            auto_load: Whether to load config immediately
        """
        self._config_dir = Path(config_dir) if config_dir else self._find_config_dir()
        self._loader = ConfigLoader(self._config_dir)

        if auto_load:
            self.load_config()

    def _find_config_dir(self) -> Path:
        """Find the config directory automatically."""
        current = Path.cwd()

        for path in [current, current.parent, current.parent.parent]:
            config_path = path / "configs"
            if config_path.exists() and config_path.is_dir():
                return config_path

        return current / "configs"

    @property
    def config_dir(self) -> Optional[Path]:
        """Get the config directory."""
        return self._config_dir

    @property
    def loader(self) -> Optional[ConfigLoader]:
        """Get the config loader."""
        return self._loader

    @property
    def config(self) -> Optional[FrameworkConfig]:
        """Get the loaded configuration."""
        return self._config

    def load_config(self) -> FrameworkConfig:
        """
        Load configuration from files.

        Returns:
            Loaded framework configuration
        """
        if self._loader is None:
            raise RuntimeError("Settings not initialized")
        self._config = self._loader.load_all()
        return self._config

    def reload_config(self) -> FrameworkConfig:
        """
        Reload configuration from disk.

        Returns:
            Reloaded framework configuration
        """
        if self._loader is None:
            raise RuntimeError("Settings not initialized")
        self._loader.reload()
        return self.load_config()

    def get_agent_config(self):
        """Get agent configuration."""
        if self._config:
            return self._config.agent
        return None

    def get_tools_config(self):
        """Get tools configuration."""
        if self._config:
            return self._config.tools
        return None

    def get_skills_config(self):
        """Get skills configuration."""
        if self._config:
            return self._config.skills
        return None

    def get_mcp_config(self):
        """Get MCP configuration."""
        if self._config:
            return self._config.mcp
        return None


def get_settings() -> Settings:
    """
    Get the global settings instance.

    Returns:
        Settings singleton
    """
    return Settings.get_instance()


def initialize_settings(
    config_dir: Optional[Union[str, Path]] = None,
    auto_load: bool = True,
) -> Settings:
    """
    Initialize the global settings instance.

    Args:
        config_dir: Configuration directory
        auto_load: Whether to load config immediately
    Returns:
        Initialized settings
    """
    settings = get_settings()
    settings.initialize(config_dir, auto_load)
    return settings
