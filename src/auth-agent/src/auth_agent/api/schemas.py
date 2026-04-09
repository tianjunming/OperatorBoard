"""SQLAlchemy ORM models for auth module."""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Session, relationship, sessionmaker


class Base(DeclarativeBase):
    """Base class for ORM models."""
    pass


class AuthUser(Base):
    """User ORM model."""
    __tablename__ = "auth_user"

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    email = Column(String(100))
    full_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    last_login = Column(DateTime)

    # Relationships
    roles = relationship("AuthRole", secondary="auth_user_role", back_populates="users")

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "is_active": self.is_active,
            "is_superuser": self.is_superuser,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_login": self.last_login.isoformat() if self.last_login else None,
            "roles": [r.to_dict() for r in self.roles],
        }


class AuthRole(Base):
    """Role ORM model."""
    __tablename__ = "auth_role"

    id = Column(Integer, primary_key=True, autoincrement=True)
    role_code = Column(String(50), unique=True, nullable=False)
    role_name = Column(String(100), nullable=False)
    description = Column(String(255))
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    users = relationship("AuthUser", secondary="auth_user_role", back_populates="roles")
    permissions = relationship("AuthPermission", secondary="auth_role_permission", back_populates="roles")

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "role_code": self.role_code,
            "role_name": self.role_name,
            "description": self.description,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "permissions": [p.to_dict() for p in self.permissions],
        }


class AuthPermission(Base):
    """Permission ORM model."""
    __tablename__ = "auth_permission"

    id = Column(Integer, primary_key=True, autoincrement=True)
    permission_code = Column(String(100), unique=True, nullable=False)
    permission_name = Column(String(100), nullable=False)
    permission_type = Column(String(20), default="menu")
    resource_path = Column(String(255))
    parent_id = Column(Integer, default=0)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    roles = relationship("AuthRole", secondary="auth_role_permission", back_populates="permissions")

    def to_dict(self, include_children: bool = False) -> dict:
        """Convert to dictionary."""
        result = {
            "id": self.id,
            "permission_code": self.permission_code,
            "permission_name": self.permission_name,
            "permission_type": self.permission_type,
            "resource_path": self.resource_path,
            "parent_id": self.parent_id,
            "sort_order": self.sort_order,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
        return result


class AuthUserRole(Base):
    """User-Role association table."""
    __tablename__ = "auth_user_role"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("auth_user.id", ondelete="CASCADE"), nullable=False)
    role_id = Column(Integer, ForeignKey("auth_role.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.now)


class AuthRolePermission(Base):
    """Role-Permission association table."""
    __tablename__ = "auth_role_permission"

    id = Column(Integer, primary_key=True, autoincrement=True)
    role_id = Column(Integer, ForeignKey("auth_role.id", ondelete="CASCADE"), nullable=False)
    permission_id = Column(Integer, ForeignKey("auth_permission.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.now)


class ChatSession(Base):
    """Chat session ORM model."""
    __tablename__ = "chat_session"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    title = Column(String(255), default="新对话")
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)

    # Relationships
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "title": self.title,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class ChatMessage(Base):
    """Chat message ORM model."""
    __tablename__ = "chat_message"

    id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("chat_session.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # user/assistant
    content = Column(Text)
    complete = Column(Boolean, default=True)
    is_error = Column(Boolean, default=False)
    msg_metadata = Column("metadata", JSON)
    created_at = Column(DateTime, default=datetime.now)

    # Relationships
    session = relationship("ChatSession", back_populates="messages")

    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "session_id": self.session_id,
            "role": self.role,
            "content": self.content,
            "complete": self.complete,
            "is_error": self.is_error,
            "metadata": self.msg_metadata,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Database:
    """Database connection manager."""

    def __init__(self, config: dict):
        """Initialize database connection."""
        db_config = config.get("database", {})
        host = db_config.get("host", "localhost")
        port = db_config.get("port", 3306)
        username = db_config.get("username", "root")
        password = db_config.get("password", "")
        database = db_config.get("database", "operatorboard")

        self.engine = create_engine(
            f"mysql+pymysql://{username}:{password}@{host}:{port}/{database}?charset=utf8mb4",
            pool_pre_ping=True,
            pool_recycle=3600,
        )
        self.SessionLocal = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)

    def get_session(self) -> Session:
        """Get a new database session."""
        return self.SessionLocal()

    def close(self):
        """Close the engine."""
        self.engine.dispose()
