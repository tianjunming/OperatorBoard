"""Error code definitions and localization for operator-agent API."""

from enum import Enum
from dataclasses import dataclass
from typing import Optional

SUPPORTED_LOCALES = ("en", "zh")


class ErrorCode(Enum):
    """Error codes for operator-agent API.

    Format: E####
    - E1xxx: Intent detection errors
    - E2xxx: Data fetching errors (site cells, indicators, operators)
    - E3xxx: NL2SQL query errors
    - E4xxx: Authentication/Authorization errors
    - E5xxx: Internal server errors
    """

    # Intent detection errors
    INTENT_DETECTION_FAILED = ("E1001", "Intent detection failed", "意图检测失败")

    # Data fetching errors
    GET_SITE_CELLS_FAILED = ("E2001", "Failed to get site data", "获取站点数据失败")
    GET_INDICATORS_FAILED = ("E2002", "Failed to get indicator data", "获取指标数据失败")
    GET_OPERATORS_FAILED = ("E2003", "Failed to get operator list", "获取运营商列表失败")
    GET_AVAILABLE_TIMES_FAILED = ("E2004", "Failed to get available times", "获取可用时间失败")

    # NL2SQL errors
    NL2SQL_QUERY_FAILED = ("E3001", "NL2SQL query failed", "NL2SQL查询失败")
    SQL_EXECUTION_FAILED = ("E3002", "SQL execution failed", "SQL执行失败")

    # Auth errors
    MISSING_API_KEY = ("E4001", "API key missing", "缺少API密钥")
    INVALID_API_KEY = ("E4002", "Invalid API key", "无效的API密钥")

    # Internal errors
    INTERNAL_SERVER_ERROR = ("E5001", "Internal server error", "内部服务器错误")

    @property
    def code(self) -> str:
        """Get the error code string."""
        return self.value[0]

    @property
    def message_en(self) -> str:
        """Get the English error message."""
        return self.value[1]

    @property
    def message_zh(self) -> str:
        """Get the Chinese error message."""
        return self.value[2]

    def get_message(self, locale: str = "zh") -> str:
        """Get the localized error message.

        Args:
            locale: Language code ('en' for English, 'zh' for Chinese)

        Returns:
            Localized error message
        """
        if locale == "en":
            return self.message_en
        return self.message_zh


@dataclass
class ErrorResponse:
    """Structured error response."""

    code: str
    message: str
    detail: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        result = {"code": self.code, "message": self.message}
        if self.detail:
            result["detail"] = self.detail
        return result


def get_error_response(
    code: ErrorCode, locale: str = "zh", detail: Optional[str] = None
) -> dict:
    """Get error response dict with localized message.

    Args:
        code: The error code enum value
        locale: Language code ('en' for English, 'zh' for Chinese), defaults to 'zh'
        detail: Optional additional detail message

    Returns:
        Dictionary with code, message, and optional detail fields
    """
    message = code.get_message(locale)
    resp = {"code": code.code, "message": message}
    if detail:
        resp["detail"] = detail
    return resp


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
