"""
Audit Middleware

FastAPI middleware for automatic audit logging of requests.
"""

import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from .audit import get_audit_service


class AuditMiddleware(BaseHTTPMiddleware):
    """Middleware for automatic audit logging of API requests."""

    # Paths to exclude from audit logging
    EXCLUDED_PATHS = {
        "/health",
        "/metrics",
        "/docs",
        "/openapi.json",
        "/redoc",
    }

    # Actions that should be logged
    AUDIT_ACTIONS = {
        "POST": "create",
        "PUT": "update",
        "PATCH": "update",
        "DELETE": "delete",
    }

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and log audit trail."""
        # Skip excluded paths
        if self._should_skip(request.url.path):
            return await call_next(request)

        # Get database session from app state
        db = request.app.state.db if hasattr(request.app, "db") else None

        start_time = time.time()
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")[:500]

        # Extract user info from request state (set by auth dependencies)
        user_id = getattr(request.state, "user_id", None)
        username = getattr(request.state, "username", None)

        # Process the request
        response = await call_next(request)

        # Calculate duration
        duration = time.time() - start_time

        # Log the request if it matches audit criteria
        if self._should_audit(request.method, request.url.path, response.status_code):
            action = self._build_action_name(request.method, request.url.path)

            # Get audit service if db available
            if db and user_id:
                try:
                    audit_service = get_audit_service(db)
                    audit_service.log(
                        action=action,
                        user_id=user_id,
                        username=username,
                        ip_address=client_ip,
                        user_agent=user_agent,
                        request_method=request.method,
                        request_path=str(request.url.path),
                        response_status=response.status_code,
                        detail=f"Duration: {duration:.3f}s",
                    )
                except Exception:
                    # Don't let audit logging failures affect the main flow
                    pass

        return response

    def _should_skip(self, path: str) -> bool:
        """Check if path should be skipped from auditing."""
        for excluded in self.EXCLUDED_PATHS:
            if path.startswith(excluded):
                return True
        return False

    def _should_audit(self, method: str, path: str, status_code: int) -> bool:
        """Check if request should be audited."""
        # Only audit write operations
        if method not in self.AUDIT_ACTIONS:
            return False

        # Don't audit failed authentication attempts (those are handled by login endpoint)
        if status_code == 401:
            return False

        return True

    def _build_action_name(self, method: str, path: str) -> str:
        """Build audit action name from request."""
        # Extract resource from path (e.g., /api/users -> user)
        parts = path.strip("/").split("/")

        if len(parts) >= 2:
            resource = parts[-1] if parts[-1] != "" else parts[-2]
        else:
            resource = "unknown"

        action = self.AUDIT_ACTIONS.get(method, "unknown")
        return f"{resource}:{action}"

    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP from request, considering proxies."""
        # Check X-Forwarded-For header first
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()

        # Check X-Real-IP header
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        # Fall back to direct client host
        if request.client:
            return request.client.host

        return "unknown"