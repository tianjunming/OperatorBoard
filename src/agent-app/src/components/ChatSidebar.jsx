import React, { useEffect, useState } from 'react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import './ChatSidebar.css';

function ChatSidebar() {
  const {
    sessions,
    currentSession,
    loading,
    loadSessions,
    loadSession,
    deleteSession,
    createSession,
    clearCurrentSession,
  } = useChat();
  const { isAuthenticated } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Load sessions on mount if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
    }
  }, [isAuthenticated, loadSessions]);

  const handleNewChat = async () => {
    try {
      await createSession();
    } catch (error) {
      console.error('Failed to create new chat:', error);
    }
  };

  const handleSelectSession = async (session) => {
    try {
      await loadSession(session.id);
    } catch (error) {
      console.error('Failed to load session:', error);
    }
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (confirmDelete === sessionId) {
      try {
        await deleteSession(sessionId);
        setConfirmDelete(null);
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    } else {
      setConfirmDelete(sessionId);
      // Auto-reset after 3 seconds
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    // Less than 1 minute
    if (diff < 60000) {
      return '刚刚';
    }
    // Less than 1 hour
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    }
    // Less than 24 hours
    if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    }
    // More than 24 hours, show date
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="chat-sidebar">
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={handleNewChat}>
          <span className="new-chat-icon">+</span>
          新对话
        </button>
      </div>

      <div className="session-list">
        {loading && sessions.length === 0 ? (
          <div className="session-loading">加载中...</div>
        ) : sessions.length === 0 ? (
          <div className="session-empty">
            <p>暂无历史对话</p>
            <p>开始新对话吧</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
              onClick={() => handleSelectSession(session)}
            >
              <div className="session-content">
                <span className="session-title">{session.title || '新对话'}</span>
                <span className="session-time">{formatTime(session.updated_at)}</span>
              </div>
              <button
                className={`session-delete ${confirmDelete === session.id ? 'confirm' : ''}`}
                onClick={(e) => handleDeleteSession(e, session.id)}
                title={confirmDelete === session.id ? '点击确认删除' : '删除会话'}
              >
                {confirmDelete === session.id ? '✓' : '×'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ChatSidebar;
