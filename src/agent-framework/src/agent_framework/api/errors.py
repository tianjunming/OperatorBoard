"""Standard API error handling for agent framework."""

from enum import Enum
from typing import Any, Dict, Optional


class ErrorCode(Enum):
    """Standard error codes for agent API."""

    # General errors
    UNKNOWN_ERROR = "UNKNOWN_ERROR"
    INVALID_REQUEST = "INVALID_REQUEST"
    INTERNAL_ERROR = "INTERNAL_ERROR"

    # Agent errors
    AGENT_NOT_INITIALIZED = "AGENT_NOT_INITIALIZED"
    AGENT_EXECUTION_FAILED = "AGENT_EXECUTION_FAILED"
    TOOL_NOT_FOUND = "TOOL_NOT_FOUND"
    TOOL_EXECUTION_FAILED = "TOOL_EXECUTION_FAILED"
    SKILL_NOT_FOUND = "SKILL_NOT_FOUND"
    SKILL_EXECUTION_FAILED = "SKILL_EXECUTION_FAILED"

    # Configuration errors
    CONFIG_NOT_FOUND = "CONFIG_NOT_FOUND"
    CONFIG_LOAD_FAILED = "CONFIG_LOAD_FAILED"
    INVALID_CONFIG = "INVALID_CONFIG"

    # RAG errors
    RAG_NOT_INITIALIZED = "RAG_NOT_INITIALIZED"
    RAG_RETRIEVAL_FAILED = "RAG_RETRIEVAL_FAILED"

    # External service errors
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    SERVICE_TIMEOUT = "SERVICE_TIMEOUT"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"


class APIError(Exception):
    """Base exception for API errors."""

    def __init__(
        self,
        code: ErrorCode,
        message: str,
        details: Optional[Dict[str, Any]] = None,
        status_code: int = 500,
    ):
        """
        Initialize API error.

        Args:
            code: Error code enum
            message: Human-readable error message
            details: Additional error details
            status_code: HTTP status code
        """
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}
        self.status_code = status_code

    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary."""
        return {
            "error": {
                "code": self.code.value,
                "message": self.message,
                "details": self.details,
            }
        }


def get_error_response(
    code: ErrorCode,
    message: str,
    details: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Create a standardized error response.

    Args:
        code: Error code enum
        message: Human-readable error message
        details: Additional error details

    Returns:
        Error response dict
    """
    return {
        "error": {
            "code": code.value,
            "message": message,
            "details": details or {},
        }
    }
