"""Auth Agent API Server."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from agent_framework.api import BaseAgentServer

from .auth import JWTManager, load_config
from .chat_routes import create_chat_router
from .dependencies import (
    get_current_user,
    get_database,
    get_jwt_manager,
    require_permission,
    require_role,
    require_superuser,
)
from .models import CurrentUser
from .schemas import Database
from .service import AuthService, PermissionService, RoleService, UserService


class AuthAgentServer(BaseAgentServer):
    """Auth Agent Server based on BaseAgentServer."""

    title = "OperatorBoard Auth Service"
    version = "1.0.0"
    description = "User authentication and authorization service"

    def __init__(self):
        """Initialize Auth Agent Server."""
        super().__init__(
            title=self.title,
            version=self.version,
            description=self.description,
        )
        self._config = load_config()
        self._jwt_manager = JWTManager(self._config)
        self._db: Database = None

    @property
    def db(self) -> Database:
        """Get database instance."""
        if self._db is None:
            self._db = Database(self._config)
        return self._db

    def setup_routes(self) -> None:
        """Setup API routes."""
        # Auth routes
        auth_router = APIRouter(prefix="/auth", tags=["Authentication"])

        @auth_router.post("/login")
        async def login(request: "LoginRequest") -> "LoginResponse":
            """User login."""
            db = self.db.get_session()
            try:
                service = AuthService(db, self._jwt_manager)
                result = service.login(request.username, request.password)
                if not result:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid username or password",
                    )
                return result
            finally:
                db.close()

        @auth_router.post("/logout")
        async def logout(current_user: CurrentUser = Depends(get_current_user)) -> dict:
            """User logout."""
            return {"message": "Logged out successfully"}

        @auth_router.get("/me")
        async def get_me(
            current_user: CurrentUser = Depends(get_current_user),
        ) -> CurrentUser:
            """Get current user info."""
            return current_user

        @auth_router.post("/refresh")
        async def refresh_token(
            request: "RefreshTokenRequest",
        ) -> "LoginResponse":
            """Refresh access token."""
            db = self.db.get_session()
            try:
                service = AuthService(db, self._jwt_manager)
                result = service.refresh_tokens(request.refresh_token)
                if not result:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid or expired refresh token",
                    )
                return result
            finally:
                db.close()

        @auth_router.post("/register")
        async def register(request: "UserRegisterRequest"):
            """User self-registration (creates pending user)."""
            db = self.db.get_session()
            try:
                service = UserService(db, self._jwt_manager)
                # Check if username exists
                if service.get_user_by_username(request.username):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Username already exists",
                    )
                user = service.create_pending_user(request)
                return {
                    "message": "Registration submitted. Please wait for admin approval.",
                    "user_id": user.id,
                    "status": "pending",
                }
            finally:
                db.close()

        # Approval management routes (superadmin only)
        @auth_router.get("/approvals/pending")
        async def list_pending_users(
            skip: int = 0,
            limit: int = 100,
            current_user: CurrentUser = Depends(require_superuser),
        ):
            """Get all pending users for approval."""
            db = self.db.get_session()
            try:
                service = UserService(db, self._jwt_manager)
                users, total = service.get_pending_users(skip, limit)
                return {
                    "items": [
                        {
                            "id": u.id,
                            "username": u.username,
                            "email": u.email,
                            "full_name": u.full_name,
                            "approval_status": u.approval_status,
                            "created_at": u.created_at.isoformat() if u.created_at else None,
                        }
                        for u in users
                    ],
                    "total": total,
                }
            finally:
                db.close()

        @auth_router.post("/approvals/approve/{user_id}")
        async def approve_user(
            user_id: int,
            current_user: CurrentUser = Depends(require_superuser),
        ) -> dict:
            """Approve a pending user."""
            db = self.db.get_session()
            try:
                service = UserService(db, self._jwt_manager)
                user = service.approve_user(user_id, current_user.id)
                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Pending user not found",
                    )
                return {"message": "User approved successfully", "user_id": user_id}
            finally:
                db.close()

        @auth_router.post("/approvals/reject/{user_id}")
        async def reject_user(
            user_id: int,
            request: "ApprovalRequest" = None,
            current_user: CurrentUser = Depends(require_superuser),
        ) -> dict:
            """Reject a pending user."""
            db = self.db.get_session()
            try:
                service = UserService(db, self._jwt_manager)
                reason = request.reason if request else None
                user = service.reject_user(user_id, current_user.id, reason)
                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Pending user not found",
                    )
                return {"message": "User rejected", "user_id": user_id}
            finally:
                db.close()

        self._app.include_router(auth_router)

        # User management routes
        user_router = APIRouter(prefix="/users", tags=["User Management"])

        @user_router.get("")
        async def list_users(
            skip: int = 0,
            limit: int = 100,
            current_user: CurrentUser = Depends(require_permission("system:user:list")),
        ) -> "UserListResponse":
            """List all users."""
            db = self.db.get_session()
            try:
                service = UserService(db, self._jwt_manager)
                users, total = service.get_users(skip, limit)
                return {
                    "items": [u.to_dict() for u in users],
                    "total": total,
                }
            finally:
                db.close()

        @user_router.post("")
        async def create_user(
            data: "UserCreate",
            current_user: CurrentUser = Depends(require_permission("system:user:create")),
        ) -> "UserResponse":
            """Create a new user."""
            db = self.db.get_session()
            try:
                service = UserService(db, self._jwt_manager)
                # Check if username exists
                if service.get_user_by_username(data.username):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Username already exists",
                    )
                user = service.create_user(data)
                return user.to_dict()
            finally:
                db.close()

        @user_router.get("/{user_id}")
        async def get_user(
            user_id: int,
            current_user: CurrentUser = Depends(require_permission("system:user:list")),
        ) -> "UserResponse":
            """Get user by ID."""
            db = self.db.get_session()
            try:
                service = UserService(db, self._jwt_manager)
                user = service.get_user_by_id(user_id)
                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="User not found",
                    )
                return user.to_dict()
            finally:
                db.close()

        @user_router.put("/{user_id}")
        async def update_user(
            user_id: int,
            data: "UserUpdate",
            current_user: CurrentUser = Depends(require_permission("system:user:update")),
        ) -> "UserResponse":
            """Update a user."""
            db = self.db.get_session()
            try:
                service = UserService(db, self._jwt_manager)
                user = service.update_user(user_id, data)
                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="User not found",
                    )
                return user.to_dict()
            finally:
                db.close()

        @user_router.delete("/{user_id}")
        async def delete_user(
            user_id: int,
            current_user: CurrentUser = Depends(require_permission("system:user:delete")),
        ) -> dict:
            """Delete a user."""
            db = self.db.get_session()
            try:
                service = UserService(db, self._jwt_manager)
                # Prevent deleting self
                if user_id == current_user.id:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Cannot delete yourself",
                    )
                if not service.delete_user(user_id):
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="User not found",
                    )
                return {"message": "User deleted successfully"}
            finally:
                db.close()

        @user_router.get("/{user_id}/roles")
        async def get_user_roles(
            user_id: int,
            current_user: CurrentUser = Depends(require_permission("system:user:list")),
        ) -> List[dict]:
            """Get user roles."""
            db = self.db.get_session()
            try:
                service = UserService(db, self._jwt_manager)
                roles = service.get_user_roles(user_id)
                return [r.to_dict() for r in roles]
            finally:
                db.close()

        @user_router.put("/{user_id}/roles")
        async def assign_user_roles(
            user_id: int,
            data: "UserRoleAssign",
            current_user: CurrentUser = Depends(require_permission("system:user:assign-roles")),
        ) -> "UserResponse":
            """Assign roles to user."""
            db = self.db.get_session()
            try:
                service = UserService(db, self._jwt_manager)
                user = service.assign_user_roles(user_id, data)
                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="User not found",
                    )
                return user.to_dict()
            finally:
                db.close()

        self._app.include_router(user_router)

        # Role management routes
        role_router = APIRouter(prefix="/roles", tags=["Role Management"])

        @role_router.get("")
        async def list_roles(
            skip: int = 0,
            limit: int = 100,
            current_user: CurrentUser = Depends(require_permission("system:role:list")),
        ) -> "RoleListResponse":
            """List all roles."""
            db = self.db.get_session()
            try:
                service = RoleService(db)
                roles, total = service.get_roles(skip, limit)
                return {
                    "items": [r.to_dict() for r in roles],
                    "total": total,
                }
            finally:
                db.close()

        @role_router.post("")
        async def create_role(
            data: "RoleCreate",
            current_user: CurrentUser = Depends(require_permission("system:role:create")),
        ) -> "RoleResponse":
            """Create a new role."""
            db = self.db.get_session()
            try:
                service = RoleService(db)
                # Check if role code exists
                if service.get_role_by_code(data.role_code):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Role code already exists",
                    )
                role = service.create_role(data)
                return role.to_dict()
            finally:
                db.close()

        @role_router.get("/{role_id}")
        async def get_role(
            role_id: int,
            current_user: CurrentUser = Depends(require_permission("system:role:list")),
        ) -> "RoleResponse":
            """Get role by ID."""
            db = self.db.get_session()
            try:
                service = RoleService(db)
                role = service.get_role_by_id(role_id)
                if not role:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Role not found",
                    )
                return role.to_dict()
            finally:
                db.close()

        @role_router.put("/{role_id}")
        async def update_role(
            role_id: int,
            data: "RoleUpdate",
            current_user: CurrentUser = Depends(require_permission("system:role:update")),
        ) -> "RoleResponse":
            """Update a role."""
            db = self.db.get_session()
            try:
                service = RoleService(db)
                role = service.update_role(role_id, data)
                if not role:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Role not found",
                    )
                return role.to_dict()
            finally:
                db.close()

        @role_router.delete("/{role_id}")
        async def delete_role(
            role_id: int,
            current_user: CurrentUser = Depends(require_permission("system:role:delete")),
        ) -> dict:
            """Delete a role."""
            db = self.db.get_session()
            try:
                service = RoleService(db)
                if not service.delete_role(role_id):
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Role not found",
                    )
                return {"message": "Role deleted successfully"}
            finally:
                db.close()

        @role_router.get("/{role_id}/permissions")
        async def get_role_permissions(
            role_id: int,
            current_user: CurrentUser = Depends(require_permission("system:role:list")),
        ) -> List[dict]:
            """Get role permissions."""
            db = self.db.get_session()
            try:
                service = RoleService(db)
                permissions = service.get_role_permissions(role_id)
                return [p.to_dict() for p in permissions]
            finally:
                db.close()

        @role_router.put("/{role_id}/permissions")
        async def assign_role_permissions(
            role_id: int,
            data: "RolePermissionAssign",
            current_user: CurrentUser = Depends(
                require_permission("system:role:assign-permissions")
            ),
        ) -> "RoleResponse":
            """Assign permissions to role."""
            db = self.db.get_session()
            try:
                service = RoleService(db)
                role = service.assign_role_permissions(role_id, data)
                if not role:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Role not found",
                    )
                return role.to_dict()
            finally:
                db.close()

        self._app.include_router(role_router)

        # Permission management routes
        permission_router = APIRouter(prefix="/permissions", tags=["Permission Management"])

        @permission_router.get("")
        async def list_permissions(
            skip: int = 0,
            limit: int = 100,
            current_user: CurrentUser = Depends(require_permission("system:permission:list")),
        ) -> "PermissionTreeResponse":
            """List all permissions."""
            db = self.db.get_session()
            try:
                service = PermissionService(db)
                permissions, total = service.get_permissions(skip, limit)
                return {
                    "items": [p.to_dict() for p in permissions],
                    "total": total,
                }
            finally:
                db.close()

        @permission_router.get("/tree")
        async def get_permission_tree(
            current_user: CurrentUser = Depends(require_permission("system:permission:list")),
        ) -> "PermissionTreeResponse":
            """Get permissions as tree."""
            db = self.db.get_session()
            try:
                service = PermissionService(db)
                permissions = service.get_permission_tree()
                return {
                    "items": [p.to_dict() for p in permissions],
                    "total": len(permissions),
                }
            finally:
                db.close()

        self._app.include_router(permission_router)

        # Chat routes
        chat_router = create_chat_router(self.db, self._jwt_manager)
        self._app.include_router(chat_router)


# Import models for type hints
from .models import (
    ApprovalRequest,
    ChatMessageCreate,
    ChatMessageListResponse,
    ChatMessageResponse,
    ChatSessionCreate,
    ChatSessionDetailResponse,
    ChatSessionListResponse,
    ChatSessionResponse,
    ChatSessionUpdate,
    LoginRequest,
    LoginResponse,
    PendingUserListResponse,
    PermissionTreeResponse,
    RefreshTokenRequest,
    RoleCreate,
    RoleListResponse,
    RolePermissionAssign,
    RoleResponse,
    RoleUpdate,
    UserCreate,
    UserListResponse,
    UserRegisterRequest,
    UserRegisterResponse,
    UserResponse,
    UserRoleAssign,
    UserUpdate,
)

# Rebuild models to ensure forward references are resolved
UserRegisterRequest.model_rebuild()
UserRegisterResponse.model_rebuild()
PendingUserListResponse.model_rebuild()


def main():
    """Run the server."""
    server = AuthAgentServer()
    server.run(host="0.0.0.0", port=8084)


if __name__ == "__main__":
    main()
