import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Plus, Search, Trash2, ChevronLeft, MessageSquare, Star, Tag, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

// Available session tags
const SESSION_TAGS = [
  { id: 'site_data', label: '站点数据', color: '#4f46e5' },
  { id: 'indicator_data', label: '指标查询', color: '#10b981' },
  { id: 'comparison', label: '数据对比', color: '#f59e0b' },
  { id: 'general', label: '综合', color: '#6b7280' },
];

function Sidebar({ collapsed }) {
  const {
    sessions,
    currentSession,
    loading,
    loadSessions,
    loadSession,
    deleteSession,
    createSession,
    toggleSessionBookmark,
    addSessionTag,
    removeSessionTag,
  } = useChat();
  const { isAuthenticated } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({ today: true, yesterday: true, older: true });
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

  const handleToggleBookmark = async (e, sessionId) => {
    e.stopPropagation();
    try {
      await toggleSessionBookmark(sessionId);
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
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

  const isToday = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isYesterday = (dateString) => {
    const date = new Date(dateString);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  };

  // Group sessions by date
  const groupedSessions = useMemo(() => {
    const bookmarked = [];
    const today = [];
    const yesterday = [];
    const older = [];

    const filtered = sessions.filter((session) =>
      (session.title || '新对话').toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.forEach((session) => {
      if (session.bookmarked) {
        bookmarked.push(session);
      } else if (isToday(session.updated_at)) {
        today.push(session);
      } else if (isYesterday(session.updated_at)) {
        yesterday.push(session);
      } else {
        older.push(session);
      }
    });

    return { bookmarked, today, yesterday, older };
  }, [sessions, searchQuery]);

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const renderSessionGroup = (group, sessions, title) => {
    if (sessions.length === 0) return null;

    return (
      <div className="session-group">
        <div className="session-group-header" onClick={() => toggleGroup(group)}>
          <span className="group-toggle">
            {expandedGroups[group] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <span className="group-title">{title}</span>
          <span className="group-count">{sessions.length}</span>
        </div>
        {expandedGroups[group] && (
          <div className="session-group-items">
            {sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isActive={currentSession?.id === session.id}
                onSelect={() => handleSelectSession(session)}
                onDelete={(e) => handleDeleteSession(e, session.id)}
                onToggleBookmark={(e) => handleToggleBookmark(e, session.id)}
                confirmDelete={confirmDelete === session.id}
                onAddTag={(tag) => addSessionTag(session.id, tag)}
                onRemoveTag={(tag) => removeSessionTag(session.id, tag)}
                formatTime={formatTime}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (collapsed) {
    return null;
  }

  return (
    <aside className="sidebar" data-testid="sidebar">
      <div className="sidebar-header">
        <button className="new-chat-btn" onClick={handleNewChat} data-testid="new-chat-button">
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
          data-testid="session-search-input"
        />
      </div>

      <div className="session-list" ref={listRef} data-testid="session-list">
        {loading && sessions.length === 0 ? (
          <div className="session-loading">
            <div className="skeleton" style={{ height: 60, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 60, marginBottom: 8 }} />
            <div className="skeleton" style={{ height: 60 }} />
          </div>
        ) : (
          <>
            {renderSessionGroup('bookmarked', groupedSessions.bookmarked, '已收藏')}
            {renderSessionGroup('today', groupedSessions.today, '今天')}
            {renderSessionGroup('yesterday', groupedSessions.yesterday, '昨天')}
            {renderSessionGroup('older', groupedSessions.older, '更早')}
            {sessions.length === 0 && (
              <div className="session-empty">
                <MessageSquare size={32} className="empty-icon" />
                <p>{searchQuery ? '未找到匹配的对话' : '暂无历史对话'}</p>
                <p className="empty-hint">{searchQuery ? '尝试其他关键词' : '开始新对话吧'}</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="sidebar-footer">
        <span className="footer-hint">快捷键: Ctrl+Alt+N 新对话</span>
      </div>
    </aside>
  );
}

// Session Item Component
function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onToggleBookmark,
  confirmDelete,
  onAddTag,
  onRemoveTag,
  formatTime,
}) {
  const [showTagMenu, setShowTagMenu] = useState(false);
  const sessionTags = session.tags || [];

  const getTagColor = (tagId) => {
    const tag = SESSION_TAGS.find(t => t.id === tagId);
    return tag ? tag.color : '#6b7280';
  };

  return (
    <div
      className={`session-item ${isActive ? 'active' : ''}`}
      onClick={onSelect}
    >
      <div className="session-icon">
        <MessageSquare size={16} />
      </div>
      <div className="session-content">
        <span className="session-title">{session.title || '新对话'}</span>
        <div className="session-meta">
          <span className="session-time">{formatTime(session.updated_at)}</span>
          {sessionTags.length > 0 && (
            <div className="session-tags">
              {sessionTags.slice(0, 2).map(tagId => (
                <span
                  key={tagId}
                  className="session-tag"
                  style={{ backgroundColor: getTagColor(tagId) + '20', color: getTagColor(tagId) }}
                >
                  {SESSION_TAGS.find(t => t.id === tagId)?.label || tagId}
                </span>
              ))}
              {sessionTags.length > 2 && (
                <span className="session-tag-more">+{sessionTags.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="session-actions">
        <button
          className={`session-bookmark ${session.bookmarked ? 'active' : ''}`}
          onClick={onToggleBookmark}
          title={session.bookmarked ? '取消收藏' : '收藏'}
        >
          <Star size={14} fill={session.bookmarked ? 'currentColor' : 'none'} />
        </button>
        <button
          className="session-tag-btn"
          onClick={(e) => {
            e.stopPropagation();
            setShowTagMenu(!showTagMenu);
          }}
          title="管理标签"
        >
          <Tag size={14} />
        </button>
        <button
          className={`session-delete ${confirmDelete ? 'confirm' : ''}`}
          onClick={onDelete}
          title={confirmDelete ? '点击确认删除' : '删除会话'}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Tag Menu */}
      {showTagMenu && (
        <div className="tag-menu" onClick={(e) => e.stopPropagation()}>
          <div className="tag-menu-header">
            <span>选择标签</span>
            <button className="tag-menu-close" onClick={() => setShowTagMenu(false)}>
              <X size={12} />
            </button>
          </div>
          <div className="tag-menu-list">
            {SESSION_TAGS.map(tag => {
              const isSelected = sessionTags.includes(tag.id);
              return (
                <div
                  key={tag.id}
                  className={`tag-menu-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    if (isSelected) {
                      onRemoveTag(tag.id);
                    } else {
                      onAddTag(tag.id);
                    }
                  }}
                >
                  <span
                    className="tag-menu-dot"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="tag-menu-label">{tag.label}</span>
                  {isSelected && <span className="tag-menu-check">✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default Sidebar;
