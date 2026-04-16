"""Business logic service for auth module."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session, joinedload

from .auth import JWTManager
from .models import (
    ApprovalRequest,
    ChatMessageCreate,
    ChatMessageListResponse,
    ChatMessageResponse,
    ChatSessionCreate,
    ChatSessionDetailResponse,
    ChatSessionListResponse,
    ChatSessionUpdate,
    CurrentUser,
    LoginResponse,
    PendingUserListResponse,
    PendingUserResponse,
    RoleCreate,
    RolePermissionAssign,
    RoleUpdate,
    UserCreate,
    UserPasswordUpdate,
    UserRegisterRequest,
    UserRegisterResponse,
    UserRoleAssign,
    UserUpdate,
)
from .schemas import AuthPermission, AuthRole, AuthUser, ChatMessage, ChatSession


class AuthService:
    """Authentication and authorization service."""

    def __init__(self, db: Session, jwt_manager: JWTManager):
        """Initialize auth service."""
        self.db = db
        self.jwt = jwt_manager

    def authenticate(self, username: str, password: str) -> Optional[AuthUser]:
        """Authenticate a user by username and password."""
        user = self.db.query(AuthUser).filter(AuthUser.username == username).first()
        if not user:
            return None
        if not user.is_active:
            return None
        if not user.is_approved:
            return None
        if not self.jwt.verify_password(password, user.password_hash):
            return None
        return user

    def login(self, username: str, password: str) -> Optional[LoginResponse]:
        """Login and return tokens."""
        user = self.authenticate(username, password)
        if not user:
            return None

        # Update last login
        user.last_login = datetime.now()
        self.db.commit()

        # Get user roles
        roles = [r.role_code for r in user.roles]

        # Create tokens
        access_token = self.jwt.create_access_token(
            user_id=user.id,
            username=user.username,
            roles=roles,
            is_superuser=user.is_superuser,
        )
        refresh_token = self.jwt.create_refresh_token(
            user_id=user.id,
            username=user.username,
            roles=roles,
            is_superuser=user.is_superuser,
        )

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=self.jwt.access_token_expire_minutes * 60,
        )

    def refresh_tokens(self, refresh_token: str) -> Optional[LoginResponse]:
        """Refresh access token using refresh token."""
        payload = self.jwt.verify_refresh_token(refresh_token)
        if not payload:
            return None

        user_id = int(payload["sub"])
        user = self.db.query(AuthUser).filter(AuthUser.id == user_id).first()
        if not user or not user.is_active:
            return None

        # Update last login
        user.last_login = datetime.now()
        self.db.commit()

        roles = [r.role_code for r in user.roles]
        access_token = self.jwt.create_access_token(
            user_id=user.id,
            username=user.username,
            roles=roles,
            is_superuser=user.is_superuser,
        )
        new_refresh_token = self.jwt.create_refresh_token(
            user_id=user.id,
            username=user.username,
            roles=roles,
            is_superuser=user.is_superuser,
        )

        return LoginResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            expires_in=self.jwt.access_token_expire_minutes * 60,
        )

    def get_current_user(self, user_id: int) -> Optional[CurrentUser]:
        """Get current user info."""
        user = (
            self.db.query(AuthUser)
            .options(joinedload(AuthUser.roles).joinedload(AuthRole.permissions))
            .filter(AuthUser.id == user_id)
            .first()
        )
        if not user:
            return None

        roles = [r.role_code for r in user.roles]
        permissions = []
        for role in user.roles:
            for perm in role.permissions:
                if perm.permission_code not in permissions:
                    permissions.append(perm.permission_code)

        return CurrentUser(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            is_superuser=user.is_superuser,
            roles=roles,
            permissions=permissions,
        )


class UserService:
    """User management service."""

    def __init__(self, db: Session, jwt_manager: JWTManager):
        """Initialize user service."""
        self.db = db
        self.jwt = jwt_manager

    def get_users(self, skip: int = 0, limit: int = 100) -> tuple:
        """Get all users."""
        query = self.db.query(AuthUser).options(joinedload(AuthUser.roles))
        total = query.count()
        users = query.offset(skip).limit(limit).all()
        return users, total

    def get_user_by_id(self, user_id: int) -> Optional[AuthUser]:
        """Get user by ID."""
        return (
            self.db.query(AuthUser)
            .options(joinedload(AuthUser.roles))
            .filter(AuthUser.id == user_id)
            .first()
        )

    def get_user_by_username(self, username: str) -> Optional[AuthUser]:
        """Get user by username."""
        return self.db.query(AuthUser).filter(AuthUser.username == username).first()

    def create_user(self, data: UserCreate) -> AuthUser:
        """Create a new user."""
        user = AuthUser(
            username=data.username,
            password_hash=self.jwt.hash_password(data.password),
            email=data.email,
            full_name=data.full_name,
            is_active=data.is_active,
            is_approved=True,
            approval_status='approved',
        )
        self.db.add(user)
        self.db.flush()

        # Assign roles
        if data.role_ids:
            roles = self.db.query(AuthRole).filter(AuthRole.id.in_(data.role_ids)).all()
            user.roles = roles

        self.db.commit()
        self.db.refresh(user)
        return user

    def create_pending_user(self, data: UserRegisterRequest) -> AuthUser:
        """Create a new pending user (for self-registration)."""
        user = AuthUser(
            username=data.username,
            password_hash=self.jwt.hash_password(data.password),
            email=data.email,
            full_name=data.full_name,
            is_active=True,
            is_approved=False,
            approval_status='pending',
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_pending_users(self, skip: int = 0, limit: int = 100) -> tuple:
        """Get all pending users."""
        query = (
            self.db.query(AuthUser)
            .filter(AuthUser.approval_status == 'pending')
            .filter(AuthUser.is_approved == False)
        )
        total = query.count()
        users = query.offset(skip).limit(limit).all()
        return users, total

    def approve_user(self, user_id: int, approver_id: int) -> Optional[AuthUser]:
        """Approve a pending user."""
        user = self.get_user_by_id(user_id)
        if not user or user.approval_status != 'pending':
            return None

        user.is_approved = True
        user.approval_status = 'approved'
        user.approved_by = approver_id
        user.approved_at = datetime.now()

        self.db.commit()
        self.db.refresh(user)
        return user

    def reject_user(self, user_id: int, approver_id: int, reason: Optional[str] = None) -> Optional[AuthUser]:
        """Reject a pending user."""
        user = self.get_user_by_id(user_id)
        if not user or user.approval_status != 'pending':
            return None

        user.is_approved = False
        user.approval_status = 'rejected'
        user.approved_by = approver_id
        user.approved_at = datetime.now()
        user.rejection_reason = reason

        self.db.commit()
        self.db.refresh(user)
        return user

    def update_user(self, user_id: int, data: UserUpdate) -> Optional[AuthUser]:
        """Update a user."""
        user = self.get_user_by_id(user_id)
        if not user:
            return None

        if data.email is not None:
            user.email = data.email
        if data.full_name is not None:
            user.full_name = data.full_name
        if data.is_active is not None:
            user.is_active = data.is_active

        self.db.commit()
        self.db.refresh(user)
        return user

    def update_user_password(self, user_id: int, data: UserPasswordUpdate) -> bool:
        """Update user password."""
        user = self.get_user_by_id(user_id)
        if not user:
            return False

        user.password_hash = self.jwt.hash_password(data.password)
        self.db.commit()
        return True

    def delete_user(self, user_id: int) -> bool:
        """Delete a user."""
        user = self.get_user_by_id(user_id)
        if not user:
            return False

        self.db.delete(user)
        self.db.commit()
        return True

    def assign_user_roles(self, user_id: int, data: UserRoleAssign) -> Optional[AuthUser]:
        """Assign roles to a user."""
        user = self.get_user_by_id(user_id)
        if not user:
            return None

        roles = self.db.query(AuthRole).filter(AuthRole.id.in_(data.role_ids)).all()
        user.roles = roles
        self.db.commit()
        self.db.refresh(user)
        return user

    def get_user_roles(self, user_id: int) -> List[AuthRole]:
        """Get user roles."""
        user = self.get_user_by_id(user_id)
        if not user:
            return []
        return user.roles


class RoleService:
    """Role management service."""

    def __init__(self, db: Session):
        """Initialize role service."""
        self.db = db

    def get_roles(self, skip: int = 0, limit: int = 100) -> tuple:
        """Get all roles."""
        query = self.db.query(AuthRole).options(joinedload(AuthRole.permissions))
        total = query.count()
        roles = query.offset(skip).limit(limit).all()
        return roles, total

    def get_role_by_id(self, role_id: int) -> Optional[AuthRole]:
        """Get role by ID."""
        return (
            self.db.query(AuthRole)
            .options(joinedload(AuthRole.permissions))
            .filter(AuthRole.id == role_id)
            .first()
        )

    def get_role_by_code(self, role_code: str) -> Optional[AuthRole]:
        """Get role by code."""
        return self.db.query(AuthRole).filter(AuthRole.role_code == role_code).first()

    def create_role(self, data: RoleCreate) -> AuthRole:
        """Create a new role."""
        role = AuthRole(
            role_code=data.role_code,
            role_name=data.role_name,
            description=data.description,
        )
        self.db.add(role)
        self.db.flush()

        # Assign permissions
        if data.permission_ids:
            perms = (
                self.db.query(AuthPermission)
                .filter(AuthPermission.id.in_(data.permission_ids))
                .all()
            )
            role.permissions = perms

        self.db.commit()
        self.db.refresh(role)
        return role

    def update_role(self, role_id: int, data: RoleUpdate) -> Optional[AuthRole]:
        """Update a role."""
        role = self.get_role_by_id(role_id)
        if not role:
            return None

        if data.role_name is not None:
            role.role_name = data.role_name
        if data.description is not None:
            role.description = data.description

        self.db.commit()
        self.db.refresh(role)
        return role

    def delete_role(self, role_id: int) -> bool:
        """Delete a role."""
        role = self.get_role_by_id(role_id)
        if not role:
            return False

        self.db.delete(role)
        self.db.commit()
        return True

    def get_role_permissions(self, role_id: int) -> List[AuthPermission]:
        """Get role permissions."""
        role = self.get_role_by_id(role_id)
        if not role:
            return []
        return role.permissions

    def assign_role_permissions(
        self, role_id: int, data: RolePermissionAssign
    ) -> Optional[AuthRole]:
        """Assign permissions to a role."""
        role = self.get_role_by_id(role_id)
        if not role:
            return None

        perms = (
            self.db.query(AuthPermission)
            .filter(AuthPermission.id.in_(data.permission_ids))
            .all()
        )
        role.permissions = perms
        self.db.commit()
        self.db.refresh(role)
        return role


class PermissionService:
    """Permission management service."""

    def __init__(self, db: Session):
        """Initialize permission service."""
        self.db = db

    def get_permissions(
        self, skip: int = 0, limit: int = 100
    ) -> tuple:
        """Get all permissions."""
        query = self.db.query(AuthPermission)
        total = query.count()
        permissions = query.offset(skip).limit(limit).all()
        return permissions, total

    def get_permission_tree(self) -> List[AuthPermission]:
        """Get permissions as a tree structure."""
        permissions = (
            self.db.query(AuthPermission)
            .order_by(AuthPermission.parent_id, AuthPermission.sort_order)
            .all()
        )
        return permissions


class ChatService:
    """Chat session and message management service."""

    def __init__(self, db: Session):
        """Initialize chat service."""
        self.db = db

    def create_session(self, user_id: int, data: ChatSessionCreate) -> ChatSession:
        """Create a new chat session."""
        session = ChatSession(
            user_id=user_id,
            title=data.title or "新对话",
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session

    def get_sessions(self, user_id: int, skip: int = 0, limit: int = 100) -> tuple:
        """Get all sessions for a user."""
        query = (
            self.db.query(ChatSession)
            .filter(ChatSession.user_id == user_id)
            .order_by(ChatSession.updated_at.desc())
        )
        total = query.count()
        sessions = query.offset(skip).limit(limit).all()
        return sessions, total

    def get_session_by_id(self, session_id: int, user_id: int) -> Optional[ChatSession]:
        """Get session by ID for a specific user."""
        return (
            self.db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
            .first()
        )

    def update_session(
        self, session_id: int, user_id: int, data: ChatSessionUpdate
    ) -> Optional[ChatSession]:
        """Update a chat session."""
        session = self.get_session_by_id(session_id, user_id)
        if not session:
            return None

        if data.title is not None:
            session.title = data.title

        self.db.commit()
        self.db.refresh(session)
        return session

    def delete_session(self, session_id: int, user_id: int) -> bool:
        """Delete a chat session."""
        session = self.get_session_by_id(session_id, user_id)
        if not session:
            return False

        self.db.delete(session)
        self.db.commit()
        return True

    def get_session_with_messages(
        self, session_id: int, user_id: int
    ) -> Optional[ChatSession]:
        """Get session with all messages."""
        return (
            self.db.query(ChatSession)
            .filter(ChatSession.id == session_id, ChatSession.user_id == user_id)
            .first()
        )

    def get_messages(
        self, session_id: int, user_id: int, skip: int = 0, limit: int = 100
    ) -> tuple:
        """Get messages for a session."""
        # First verify the session belongs to the user
        session = self.get_session_by_id(session_id, user_id)
        if not session:
            return [], 0

        query = (
            self.db.query(ChatMessage)
            .filter(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc())
        )
        total = query.count()
        messages = query.offset(skip).limit(limit).all()
        return messages, total

    def create_message(self, data: ChatMessageCreate) -> ChatMessage:
        """Create a new chat message."""
        message = ChatMessage(
            session_id=data.session_id,
            role=data.role,
            content=data.content,
            complete=data.complete,
            is_error=data.is_error,
            metadata=data.metadata,
        )
        self.db.add(message)

        # Update session's updated_at timestamp
        session = self.db.query(ChatSession).filter(ChatSession.id == data.session_id).first()
        if session:
            session.updated_at = datetime.now()

        self.db.commit()
        self.db.refresh(message)
        return message
