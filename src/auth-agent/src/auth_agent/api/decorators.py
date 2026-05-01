"""
Permission decorators for API endpoints.

Provides declarative permission/role checking via decorators.

@example
@router.get("/users", dependencies=[Depends(require_permissions("system:user:list"))])
async def list_users(current_user: CurrentUser = Depends(get_current_user)):
    ...

@router.get("/admin", dependencies=[Depends(require_any_role("admin", "manager"))])
async def admin_panel(current_user: CurrentUser = Depends(get_current_user)):
    ...
"""

from typing import Callable, List, Union

from fastapi import Depends, HTTPException, status

from .dependencies import get_current_user
from .models import CurrentUser


def require_permissions(*permission_codes: str) -> Callable:
    """
    Dependency that requires ALL specified permissions.

    Args:
        *permission_codes: Permission codes that are all required

    Returns:
        FastAPI dependency function

    @example
    @router.get("/users", dependencies=[Depends(require_permissions("system:user:list", "system:user:create"))])
    """
    async def check_permissions(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.is_superuser:
            return current_user

        missing = [p for p in permission_codes if p not in current_user.permissions]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permissions required: {', '.join(missing)}",
            )
        return current_user

    return check_permissions


def require_any_permission(*permission_codes: str) -> Callable:
    """
    Dependency that requires ANY of the specified permissions.

    Args:
        *permission_codes: Permission codes, any one is sufficient

    Returns:
        FastAPI dependency function

    @example
    @router.get("/reports", dependencies=[Depends(require_any_permission("report:read", "report:admin"))])
    """
    async def check_any_permission(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.is_superuser:
            return current_user

        if not any(p in current_user.permissions for p in permission_codes):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Any of these permissions required: {', '.join(permission_codes)}",
            )
        return current_user

    return check_any_permission


def require_roles(*role_codes: str) -> Callable:
    """
    Dependency that requires ALL specified roles.

    Args:
        *role_codes: Role codes that are all required

    Returns:
        FastAPI dependency function

    @example
    @router.get("/settings", dependencies=[Depends(require_roles("admin", "settings-manager"))])
    """
    async def check_roles(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.is_superuser:
            return current_user

        missing = [r for r in role_codes if r not in current_user.roles]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Roles required: {', '.join(missing)}",
            )
        return current_user

    return check_roles


def require_any_role(*role_codes: str) -> Callable:
    """
    Dependency that requires ANY of the specified roles.

    Args:
        *role_codes: Role codes, any one is sufficient

    Returns:
        FastAPI dependency function

    @example
    @router.get("/dashboard", dependencies=[Depends(require_any_role("admin", "manager", "analyst"))])
    """
    async def check_any_role(current_user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if current_user.is_superuser:
            return current_user

        if not any(r in current_user.roles for r in role_codes):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Any of these roles required: {', '.join(role_codes)}",
            )
        return current_user

    return check_any_role