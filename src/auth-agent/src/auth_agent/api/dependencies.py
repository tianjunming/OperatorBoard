"""FastAPI dependencies for auth module."""

from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .auth import JWTManager, load_config
from .models import CurrentUser
from .schemas import AuthUser, Database
from .service import AuthService
from .permission_cache import get_permission_cache

# Security scheme
security = HTTPBearer(auto_error=False)

# Global instances
_config = load_config()
_jwt_manager = JWTManager(_config)
_db: Optional[Database] = None


def get_database() -> Database:
    """Get or create database instance."""
    global _db
    if _db is None:
        _db = Database(_config)
    return _db


def get_jwt_manager() -> JWTManager:
    """Get JWT manager."""
    return _jwt_manager


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> CurrentUser:
    """Get current authenticated user from JWT token.

    Uses permission cache to reduce database queries. Cache entries expire after 5 minutes.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = _jwt_manager.verify_access_token(token)

    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = int(payload["sub"])

    # Try to get from cache first
    cache = get_permission_cache()
    cached = cache.get(user_id)
    if cached is not None:
        # Return cached user data (username/email not cached, use default)
        return CurrentUser(
            id=cached.user_id,
            username=cached.username or "",
            email=cached.email or "",
            full_name=None,
            is_superuser=cached.is_superuser,
            roles=cached.roles,
            permissions=cached.permissions,
        )

    # Cache miss - query database
    db = get_database().get_session()

    try:
        auth_service = AuthService(db, _jwt_manager)
        user = auth_service.get_current_user(user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
                headers={"WWW-Authenticate": "Bearer"},
            )

        # Cache the user data for future requests
        cache.set(
            user_id=user.id,
            permissions=user.permissions,
            roles=user.roles,
            is_superuser=user.is_superuser,
            username=user.username,
            email=user.email,
        )

        return user
    finally:
        db.close()


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[CurrentUser]:
    """Get current user if authenticated, otherwise None."""
    if not credentials:
        return None

    token = credentials.credentials
    payload = _jwt_manager.verify_access_token(token)

    if not payload:
        return None

    user_id = int(payload["sub"])
    db = get_database().get_session()

    try:
        auth_service = AuthService(db, _jwt_manager)
        return auth_service.get_current_user(user_id)
    except Exception:
        return None
    finally:
        db.close()


def require_superuser(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Require superuser privileges."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser privileges required",
        )
    return current_user


def require_permission(permission_code: str):
    """Dependency factory for permission check."""

    async def check_permission(
        current_user: CurrentUser = Depends(get_current_user),
    ) -> CurrentUser:
        if current_user.is_superuser:
            return current_user
        if permission_code not in current_user.permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {permission_code}",
            )
        return current_user

    return check_permission


def require_role(role_code: str):
    """Dependency factory for role check."""

    async def check_role(
        current_user: CurrentUser = Depends(get_current_user),
    ) -> CurrentUser:
        if current_user.is_superuser:
            return current_user
        if role_code not in current_user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role required: {role_code}",
            )
        return current_user

    return check_role
