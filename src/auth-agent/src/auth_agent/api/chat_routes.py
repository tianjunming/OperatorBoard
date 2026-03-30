"""Chat API routes."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status

from .dependencies import get_current_user, get_database, get_jwt_manager
from .models import (
    ChatMessageCreate,
    ChatMessageListResponse,
    ChatMessageResponse,
    ChatSessionCreate,
    ChatSessionDetailResponse,
    ChatSessionListResponse,
    ChatSessionResponse,
    ChatSessionUpdate,
    CurrentUser,
)
from .schemas import Database
from .service import ChatService
from .auth import JWTManager


def create_chat_router(db: Database, jwt_manager: JWTManager) -> APIRouter:
    """Create chat router with database and JWT dependencies."""
    router = APIRouter(prefix="/chat", tags=["Chat"])

    @router.post("/sessions", response_model=ChatSessionResponse)
    async def create_session(
        data: ChatSessionCreate,
        current_user: CurrentUser = Depends(get_current_user),
    ) -> ChatSessionResponse:
        """Create a new chat session."""
        session_db = db.get_session()
        try:
            service = ChatService(session_db)
            session = service.create_session(current_user.id, data)
            return session.to_dict()
        finally:
            session_db.close()

    @router.get("/sessions", response_model=ChatSessionListResponse)
    async def list_sessions(
        skip: int = 0,
        limit: int = 100,
        current_user: CurrentUser = Depends(get_current_user),
    ) -> ChatSessionListResponse:
        """Get all chat sessions for current user."""
        session_db = db.get_session()
        try:
            service = ChatService(session_db)
            sessions, total = service.get_sessions(current_user.id, skip, limit)
            return {
                "items": [s.to_dict() for s in sessions],
                "total": total,
            }
        finally:
            session_db.close()

    @router.get("/sessions/{session_id}", response_model=ChatSessionDetailResponse)
    async def get_session(
        session_id: int,
        current_user: CurrentUser = Depends(get_current_user),
    ) -> ChatSessionDetailResponse:
        """Get a chat session with all messages."""
        session_db = db.get_session()
        try:
            service = ChatService(session_db)
            session = service.get_session_with_messages(session_id, current_user.id)
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found",
                )
            result = session.to_dict()
            result["messages"] = [m.to_dict() for m in session.messages]
            return result
        finally:
            session_db.close()

    @router.patch("/sessions/{session_id}", response_model=ChatSessionResponse)
    async def update_session(
        session_id: int,
        data: ChatSessionUpdate,
        current_user: CurrentUser = Depends(get_current_user),
    ) -> ChatSessionResponse:
        """Update a chat session title."""
        session_db = db.get_session()
        try:
            service = ChatService(session_db)
            session = service.update_session(session_id, current_user.id, data)
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found",
                )
            return session.to_dict()
        finally:
            session_db.close()

    @router.delete("/sessions/{session_id}")
    async def delete_session(
        session_id: int,
        current_user: CurrentUser = Depends(get_current_user),
    ) -> dict:
        """Delete a chat session."""
        session_db = db.get_session()
        try:
            service = ChatService(session_db)
            if not service.delete_session(session_id, current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found",
                )
            return {"message": "Session deleted successfully"}
        finally:
            session_db.close()

    @router.get("/sessions/{session_id}/messages", response_model=ChatMessageListResponse)
    async def list_messages(
        session_id: int,
        skip: int = 0,
        limit: int = 100,
        current_user: CurrentUser = Depends(get_current_user),
    ) -> ChatMessageListResponse:
        """Get all messages for a chat session."""
        session_db = db.get_session()
        try:
            service = ChatService(session_db)
            messages, total = service.get_messages(session_id, current_user.id, skip, limit)
            return {
                "items": [m.to_dict() for m in messages],
                "total": total,
            }
        finally:
            session_db.close()

    @router.post("/messages", response_model=ChatMessageResponse)
    async def create_message(
        data: ChatMessageCreate,
        current_user: CurrentUser = Depends(get_current_user),
    ) -> ChatMessageResponse:
        """Create a new chat message."""
        session_db = db.get_session()
        try:
            service = ChatService(session_db)
            # Verify session belongs to user
            session = service.get_session_by_id(data.session_id, current_user.id)
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Session not found",
                )
            message = service.create_message(data)
            return message.to_dict()
        finally:
            session_db.close()

    return router
