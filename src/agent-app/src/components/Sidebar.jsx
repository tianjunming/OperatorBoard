import React, { useEffect, useState, useRef } from 'react';
import { Plus, Search, Trash2, ChevronLeft, MessageSquare } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

function Sidebar({ collapsed }) {
  const {
    sessions,
    currentSession,
    loading,
    loadSessions,
    loadSession,
    deleteSession,
    createSession,
  } = useChat();
  const { isAuthenticated } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const listRef = useRef(null);

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
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const filteredSessions = sessions.filter((session) =>
    (session.title || '新对话').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (collapsed) {
    return null;
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={handleNewChat}>
          <Plus size={18} />
          <span>新对话</span>
        </button>
      </div>

      <div className="sidebar-search">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          className="search-input"
          placeholder="搜索对话..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="session-list" ref={listRef}>
        {loading && sessions.length === 0 ? (
          <div className="session-loading">
            <div className="skeleton" style={{ height: 60, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 60, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 60 }} />
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="session-empty">
            <MessageSquare size={32} className="empty-icon" />
            <p>{searchQuery ? '未找到匹配的对话' : '暂无历史对话'}</p>
            <p className="empty-hint">{searchQuery ? '尝试其他关键词' : '开始新对话吧'}</p>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <div
              key={session.id}
              className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
              onClick={() => handleSelectSession(session)}
            >
              <div className="session-icon">
                <MessageSquare size={16} />
              </div>
              <div className="session-content">
                <span className="session-title">{session.title || '新对话'}</span>
                <span className="session-time">{formatTime(session.updated_at)}</span>
              </div>
              <button
                className={`session-delete ${confirmDelete === session.id ? 'confirm' : ''}`}
                onClick={(e) => handleDeleteSession(e, session.id)}
                title={confirmDelete === session.id ? '点击确认删除' : '删除会话'}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <span className="footer-hint">快捷键: Ctrl+Alt+N 新对话</span>
      </div>
    </aside>
  );
}

export default Sidebar;
