"""Pydantic models for auth API."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


# ============== Auth Models ==============

class LoginRequest(BaseModel):
    """Login request model."""
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1)


class LoginResponse(BaseModel):
    """Login response model."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshTokenRequest(BaseModel):
    """Refresh token request."""
    refresh_token: str


class TokenPayload(BaseModel):
    """JWT token payload."""
    sub: str  # user_id
    username: str
    roles: List[str]
    is_superuser: bool
    exp: Optional[int] = None


class CurrentUser(BaseModel):
    """Current user info."""
    id: int
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_superuser: bool
    roles: List[str] = []
    permissions: List[str] = []


# ============== User Models ==============

class UserBase(BaseModel):
    """Base user model."""
    username: str = Field(..., min_length=1, max_length=50)
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_active: bool = True


class UserCreate(UserBase):
    """Create user model."""
    password: str = Field(..., min_length=6)
    role_ids: List[int] = []


class UserUpdate(BaseModel):
    """Update user model."""
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None


class UserPasswordUpdate(BaseModel):
    """Update user password model."""
    password: str = Field(..., min_length=6)


class UserResponse(BaseModel):
    """User response model."""
    id: int
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    is_active: bool
    is_superuser: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    last_login: Optional[datetime] = None
    roles: List["RoleSimple"] = []

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """User list response."""
    items: List[UserResponse]
    total: int


class UserRoleAssign(BaseModel):
    """Assign roles to user."""
    role_ids: List[int]


# ============== Role Models ==============

class RoleBase(BaseModel):
    """Base role model."""
    role_code: str = Field(..., min_length=1, max_length=50)
    role_name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class RoleCreate(RoleBase):
    """Create role model."""
    permission_ids: List[int] = []


class RoleUpdate(BaseModel):
    """Update role model."""
    role_name: Optional[str] = None
    description: Optional[str] = None


class RoleSimple(BaseModel):
    """Simple role model for embedding."""
    id: int
    role_code: str
    role_name: str

    class Config:
        from_attributes = True


class RoleResponse(BaseModel):
    """Role response model."""
    id: int
    role_code: str
    role_name: str
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    permissions: List["PermissionSimple"] = []

    class Config:
        from_attributes = True


class RoleListResponse(BaseModel):
    """Role list response."""
    items: List[RoleResponse]
    total: int


class RolePermissionAssign(BaseModel):
    """Assign permissions to role."""
    permission_ids: List[int]


# ============== Permission Models ==============

class PermissionSimple(BaseModel):
    """Simple permission model for embedding."""
    id: int
    permission_code: str
    permission_name: str

    class Config:
        from_attributes = True


class PermissionResponse(BaseModel):
    """Permission response model."""
    id: int
    permission_code: str
    permission_name: str
    permission_type: str
    resource_path: Optional[str] = None
    parent_id: int
    sort_order: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PermissionTreeResponse(BaseModel):
    """Permission tree response."""
    items: List[PermissionResponse]
    total: int


# Update forward references
UserResponse.model_rebuild()
RoleResponse.model_rebuild()


# ============== Chat Models ==============

class ChatSessionCreate(BaseModel):
    """Create chat session model."""
    title: Optional[str] = "新对话"


class ChatSessionUpdate(BaseModel):
    """Update chat session model."""
    title: Optional[str] = None


class ChatMessageCreate(BaseModel):
    """Create chat message model."""
    session_id: int
    role: str = Field(..., pattern="^(user|assistant)$")
    content: Optional[str] = None
    complete: bool = True
    is_error: bool = False
    metadata: Optional[dict] = None


class ChatMessageResponse(BaseModel):
    """Chat message response model."""
    id: int
    session_id: int
    role: str
    content: Optional[str] = None
    complete: bool
    is_error: bool
    metadata: Optional[dict] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatSessionResponse(BaseModel):
    """Chat session response model."""
    id: int
    user_id: int
    title: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatSessionDetailResponse(BaseModel):
    """Chat session with messages response model."""
    id: int
    user_id: int
    title: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    messages: List[ChatMessageResponse] = []

    class Config:
        from_attributes = True


class ChatSessionListResponse(BaseModel):
    """Chat session list response."""
    items: List[ChatSessionResponse]
    total: int


class ChatMessageListResponse(BaseModel):
    """Chat message list response."""
    items: List[ChatMessageResponse]
    total: int
