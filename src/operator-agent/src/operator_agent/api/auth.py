"""API authentication module for operator-agent."""

import os
from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

from .errors import ErrorCode, get_error_response

# API Key header name
API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)


class ApiKeyAuth:
    """API Key authentication handler."""

    def __init__(self):
        """Initialize auth with API keys from environment variable."""
        self._api_keys = self._load_api_keys()

    def _load_api_keys(self) -> set:
        """Load allowed API keys from environment variable.

        Keys should be comma-separated in OPERATOR_AGENT_API_KEYS env var.
        """
        keys_str = os.getenv("OPERATOR_AGENT_API_KEYS", "")
        if not keys_str:
            return set()
        return {k.strip() for k in keys_str.split(",") if k.strip()}

    def is_enabled(self) -> bool:
        """Check if API key authentication is enabled."""
        return len(self._api_keys) > 0

    def validate_key(self, api_key: str) -> bool:
        """Validate an API key.

        Args:
            api_key: The API key to validate

        Returns:
            True if valid, False otherwise
        """
        if not self.is_enabled():
            # Auth disabled - allow all
            return True
        return api_key in self._api_keys


# Global auth instance
_api_key_auth = ApiKeyAuth()


async def verify_api_key(api_key: str = Security(API_KEY_HEADER)) -> bool:
    """FastAPI dependency to verify API key.

    Args:
        api_key: API key from X-API-Key header

    Returns:
        True if valid

    Raises:
        HTTPException: 401 if key is missing, 403 if invalid
    """
    # If auth is disabled (no keys configured), allow all requests
    if not _api_key_auth.is_enabled():
        return True

    if not api_key:
        error_resp = get_error_response(ErrorCode.MISSING_API_KEY)
        raise HTTPException(
            status_code=401,
            detail=error_resp
        )

    if not _api_key_auth.validate_key(api_key):
        error_resp = get_error_response(ErrorCode.INVALID_API_KEY)
        raise HTTPException(
            status_code=403,
            detail=error_resp
        )

    return True


def get_allowed_origins() -> list[str]:
    """Get allowed CORS origins from environment variable.

    Returns:
        List of allowed origins, or default localhost origins if not set
    """
    origins_str = os.getenv("ALLOWED_ORIGINS", "")
    if not origins_str:
        # Default to common dev origins
        return ["http://localhost:3000", "http://localhost:5173"]
    return [o.strip() for o in origins_str.split(",") if o.strip()]
