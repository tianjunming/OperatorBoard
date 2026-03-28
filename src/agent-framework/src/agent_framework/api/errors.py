"""Standard API error handling for agent framework."""

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, Optional


class ErrorCategory(Enum):
    """Error categories for classification."""
    GENERAL = "GENERAL"
    AGENT = "AGENT"
    CONFIG = "CONFIG"
    RAG = "RAG"
    EXTERNAL = "EXTERNAL"
    INTENT = "INTENT"
    DATA = "DATA"
    NL2SQL = "NL2SQL"
    AUTH = "AUTH"


@dataclass(frozen=True)
class ErrorCode:
    """
    Immutable error code object with localization support.

    Attributes:
        code: Error code string (e.g., "E1001")
        message_en: English error message
        message_zh: Chinese error message
        category: Error category for classification
        status_code: HTTP status code (default 500)
    """

    code: str
    message_en: str
    message_zh: str
    category: ErrorCategory = ErrorCategory.GENERAL
    status_code: int = 500

    def get_message(self, locale: str = "zh") -> str:
        """Get localized error message."""
        if locale == "en":
            return self.message_en
        return self.message_zh

    def to_dict(self, locale: str = "zh", detail: Optional[str] = None) -> Dict[str, Any]:
        """Convert to dictionary representation."""
        result = {
            "code": self.code,
            "message": self.get_message(locale),
            "category": self.category.value,
        }
        if detail:
            result["detail"] = detail
        return result

    def __str__(self) -> str:
        return f"[{self.code}] {self.message_en}"


# ============ Predefined Error Codes ============

# General errors (E0001-E0099)
UNKNOWN_ERROR = ErrorCode(
    code="E0001",
    message_en="Unknown error occurred",
    message_zh="发生未知错误",
    category=ErrorCategory.GENERAL,
    status_code=500,
)

INVALID_REQUEST = ErrorCode(
    code="E0002",
    message_en="Invalid request parameters",
    message_zh="无效的请求参数",
    category=ErrorCategory.GENERAL,
    status_code=400,
)

INTERNAL_ERROR = ErrorCode(
    code="E0003",
    message_en="Internal server error",
    message_zh="内部服务器错误",
    category=ErrorCategory.GENERAL,
    status_code=500,
)


# Agent errors (E1001-E1099)
AGENT_NOT_INITIALIZED = ErrorCode(
    code="E1001",
    message_en="Agent not initialized",
    message_zh="智能体未初始化",
    category=ErrorCategory.AGENT,
    status_code=500,
)

AGENT_EXECUTION_FAILED = ErrorCode(
    code="E1002",
    message_en="Agent execution failed",
    message_zh="智能体执行失败",
    category=ErrorCategory.AGENT,
    status_code=500,
)


# Intent detection errors (E1101-E1199)
INTENT_DETECTION_FAILED = ErrorCode(
    code="E1101",
    message_en="Intent detection failed",
    message_zh="意图检测失败",
    category=ErrorCategory.INTENT,
    status_code=500,
)

INTENT_INVALID_QUERY = ErrorCode(
    code="E1102",
    message_en="Invalid query for intent detection",
    message_zh="无效的查询语句",
    category=ErrorCategory.INTENT,
    status_code=400,
)


# Tool/Skill errors (E1201-E1299)
TOOL_NOT_FOUND = ErrorCode(
    code="E1201",
    message_en="Tool not found",
    message_zh="工具未找到",
    category=ErrorCategory.AGENT,
    status_code=404,
)

TOOL_EXECUTION_FAILED = ErrorCode(
    code="E1202",
    message_en="Tool execution failed",
    message_zh="工具执行失败",
    category=ErrorCategory.AGENT,
    status_code=500,
)

SKILL_NOT_FOUND = ErrorCode(
    code="E1203",
    message_en="Skill not found",
    message_zh="技能未找到",
    category=ErrorCategory.AGENT,
    status_code=404,
)

SKILL_EXECUTION_FAILED = ErrorCode(
    code="E1204",
    message_en="Skill execution failed",
    message_zh="技能执行失败",
    category=ErrorCategory.AGENT,
    status_code=500,
)


# Configuration errors (E2001-E2099)
CONFIG_NOT_FOUND = ErrorCode(
    code="E2001",
    message_en="Configuration not found",
    message_zh="配置未找到",
    category=ErrorCategory.CONFIG,
    status_code=404,
)

CONFIG_LOAD_FAILED = ErrorCode(
    code="E2002",
    message_en="Configuration load failed",
    message_zh="配置加载失败",
    category=ErrorCategory.CONFIG,
    status_code=500,
)

INVALID_CONFIG = ErrorCode(
    code="E2003",
    message_en="Invalid configuration",
    message_zh="无效的配置",
    category=ErrorCategory.CONFIG,
    status_code=400,
)


# RAG errors (E2101-E2199)
RAG_NOT_INITIALIZED = ErrorCode(
    code="E2101",
    message_en="RAG not initialized",
    message_zh="RAG未初始化",
    category=ErrorCategory.RAG,
    status_code=500,
)

RAG_RETRIEVAL_FAILED = ErrorCode(
    code="E2102",
    message_en="RAG retrieval failed",
    message_zh="RAG检索失败",
    category=ErrorCategory.RAG,
    status_code=500,
)


# Data fetching errors (E3001-E3099)
GET_SITE_CELLS_FAILED = ErrorCode(
    code="E3001",
    message_en="Failed to get site data",
    message_zh="获取站点数据失败",
    category=ErrorCategory.DATA,
    status_code=500,
)

GET_INDICATORS_FAILED = ErrorCode(
    code="E3002",
    message_en="Failed to get indicator data",
    message_zh="获取指标数据失败",
    category=ErrorCategory.DATA,
    status_code=500,
)

GET_OPERATORS_FAILED = ErrorCode(
    code="E3003",
    message_en="Failed to get operator list",
    message_zh="获取运营商列表失败",
    category=ErrorCategory.DATA,
    status_code=500,
)

GET_AVAILABLE_TIMES_FAILED = ErrorCode(
    code="E3004",
    message_en="Failed to get available times",
    message_zh="获取可用时间失败",
    category=ErrorCategory.DATA,
    status_code=500,
)


# NL2SQL errors (E3101-E3199)
NL2SQL_QUERY_FAILED = ErrorCode(
    code="E3101",
    message_en="NL2SQL query failed",
    message_zh="NL2SQL查询失败",
    category=ErrorCategory.NL2SQL,
    status_code=500,
)

SQL_EXECUTION_FAILED = ErrorCode(
    code="E3102",
    message_en="SQL execution failed",
    message_zh="SQL执行失败",
    category=ErrorCategory.NL2SQL,
    status_code=500,
)

SQL_INVALID_QUERY = ErrorCode(
    code="E3103",
    message_en="Invalid SQL query",
    message_zh="无效的SQL查询",
    category=ErrorCategory.NL2SQL,
    status_code=400,
)


# External service errors (E4001-E4099)
EXTERNAL_SERVICE_ERROR = ErrorCode(
    code="E4001",
    message_en="External service error",
    message_zh="外部服务错误",
    category=ErrorCategory.EXTERNAL,
    status_code=502,
)

SERVICE_TIMEOUT = ErrorCode(
    code="E4002",
    message_en="Service timeout",
    message_zh="服务超时",
    category=ErrorCategory.EXTERNAL,
    status_code=504,
)

SERVICE_UNAVAILABLE = ErrorCode(
    code="E4003",
    message_en="Service unavailable",
    message_zh="服务不可用",
    category=ErrorCategory.EXTERNAL,
    status_code=503,
)


# Auth errors (E5001-E5099)
MISSING_API_KEY = ErrorCode(
    code="E5001",
    message_en="API key missing",
    message_zh="缺少API密钥",
    category=ErrorCategory.AUTH,
    status_code=401,
)

INVALID_API_KEY = ErrorCode(
    code="E5002",
    message_en="Invalid API key",
    message_zh="无效的API密钥",
    category=ErrorCategory.AUTH,
    status_code=401,
)

AUTH_FAILED = ErrorCode(
    code="E5003",
    message_en="Authentication failed",
    message_zh="认证失败",
    category=ErrorCategory.AUTH,
    status_code=401,
)


class AgentAPIError(Exception):
    """
    Base exception for API errors with error code and localization support.

    Attributes:
        error_code: ErrorCode object
        detail: Additional error details
        locale: Language locale for message
    """

    def __init__(
        self,
        error_code: ErrorCode,
        detail: Optional[str] = None,
        locale: str = "zh",
    ):
        """
        Initialize API error.

        Args:
            error_code: ErrorCode object
            detail: Additional error details
            locale: Language locale ('en' or 'zh')
        """
        super().__init__(error_code.get_message(locale))
        self.error_code = error_code
        self.detail = detail
        self.locale = locale

    @property
    def code(self) -> str:
        """Get error code string."""
        return self.error_code.code

    @property
    def message(self) -> str:
        """Get localized error message."""
        return self.error_code.get_message(self.locale)

    @property
    def status_code(self) -> int:
        """Get HTTP status code."""
        return self.error_code.status_code

    def to_dict(self) -> Dict[str, Any]:
        """Convert error to dictionary."""
        return self.error_code.to_dict(locale=self.locale, detail=self.detail)

    def __str__(self) -> str:
        base = f"[{self.code}] {self.message}"
        if self.detail:
            base += f" - {self.detail}"
        return base


def get_error_response(
    error_code: ErrorCode,
    locale: str = "zh",
    detail: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Create a standardized error response.

    Args:
        error_code: ErrorCode object
        locale: Language locale ('en' or 'zh')
        detail: Optional additional detail

    Returns:
        Error response dict
    """
    return error_code.to_dict(locale=locale, detail=detail)


# For backward compatibility
class APIError(AgentAPIError):
    """Backward compatible alias for AgentAPIError."""

    def __init__(
        self,
        error_code: ErrorCode,
        detail: Optional[str] = None,
        locale: str = "zh",
    ):
        super().__init__(error_code, detail, locale)
