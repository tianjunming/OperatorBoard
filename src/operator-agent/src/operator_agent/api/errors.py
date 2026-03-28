"""Error code definitions for operator-agent API.

This module re-exports the unified error system from agent_framework.
For new code, use:
    from agent_framework.api.errors import ErrorCode, AgentAPIError, get_error_response
"""

# Re-export from agent_framework for backward compatibility
from agent_framework.api.errors import (
    ErrorCode,
    ErrorCategory,
    AgentAPIError,
    APIError,
    get_error_response,
    UNKNOWN_ERROR,
    INVALID_REQUEST,
    INTERNAL_ERROR,
    INTENT_DETECTION_FAILED,
    INTENT_INVALID_QUERY,
    TOOL_NOT_FOUND,
    TOOL_EXECUTION_FAILED,
    SKILL_NOT_FOUND,
    SKILL_EXECUTION_FAILED,
    CONFIG_NOT_FOUND,
    CONFIG_LOAD_FAILED,
    INVALID_CONFIG,
    RAG_NOT_INITIALIZED,
    RAG_RETRIEVAL_FAILED,
    GET_SITE_CELLS_FAILED,
    GET_INDICATORS_FAILED,
    GET_OPERATORS_FAILED,
    GET_AVAILABLE_TIMES_FAILED,
    NL2SQL_QUERY_FAILED,
    SQL_EXECUTION_FAILED,
    SQL_INVALID_QUERY,
    EXTERNAL_SERVICE_ERROR,
    SERVICE_TIMEOUT,
    SERVICE_UNAVAILABLE,
    MISSING_API_KEY,
    INVALID_API_KEY,
    AUTH_FAILED,
)

# For backward compatibility - re-export legacy error codes
# These map to the new unified ErrorCode objects
from agent_framework.api.errors import (
    AGENT_NOT_INITIALIZED,
    AGENT_EXECUTION_FAILED,
)

__all__ = [
    # Core classes
    "ErrorCode",
    "ErrorCategory",
    "AgentAPIError",
    "APIError",
    "get_error_response",
    # General
    "UNKNOWN_ERROR",
    "INVALID_REQUEST",
    "INTERNAL_ERROR",
    # Agent
    "AGENT_NOT_INITIALIZED",
    "AGENT_EXECUTION_FAILED",
    # Intent
    "INTENT_DETECTION_FAILED",
    "INTENT_INVALID_QUERY",
    # Tool/Skill
    "TOOL_NOT_FOUND",
    "TOOL_EXECUTION_FAILED",
    "SKILL_NOT_FOUND",
    "SKILL_EXECUTION_FAILED",
    # Config
    "CONFIG_NOT_FOUND",
    "CONFIG_LOAD_FAILED",
    "INVALID_CONFIG",
    # RAG
    "RAG_NOT_INITIALIZED",
    "RAG_RETRIEVAL_FAILED",
    # Data
    "GET_SITE_CELLS_FAILED",
    "GET_INDICATORS_FAILED",
    "GET_OPERATORS_FAILED",
    "GET_AVAILABLE_TIMES_FAILED",
    # NL2SQL
    "NL2SQL_QUERY_FAILED",
    "SQL_EXECUTION_FAILED",
    "SQL_INVALID_QUERY",
    # External
    "EXTERNAL_SERVICE_ERROR",
    "SERVICE_TIMEOUT",
    "SERVICE_UNAVAILABLE",
    # Auth
    "MISSING_API_KEY",
    "INVALID_API_KEY",
    "AUTH_FAILED",
    # Locale helpers
    "get_locale_from_headers",
    "SUPPORTED_LOCALES",
]


# Locale configuration
SUPPORTED_LOCALES = ("en", "zh")


def get_locale_from_headers(headers: dict) -> str:
    """Extract locale from request headers.

    Args:
        headers: Request headers dictionary

    Returns:
        Locale string ('en' or 'zh'), defaults to 'zh'
    """
    locale = headers.get("x-locale", "zh")
    if locale not in SUPPORTED_LOCALES:
        locale = "zh"
    return locale
