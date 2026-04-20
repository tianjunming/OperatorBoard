import React, { createContext, useContext, useState, useCallback } from 'react';
import { apiFetch } from '../api/client';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Create a new session
  const createSession = useCallback(async (title = '新对话') => {
    setLoading(true);
    try {
      const session = await apiFetch('/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
      setSessions((prev) => [session, ...prev]);
      setCurrentSession(session);
      setMessages([]);
      return session;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all sessions for current user
  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch('/chat/sessions');
      setSessions(data.items || []);
      return data.items;
    } catch (error) {
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Load a specific session with messages
  const loadSession = useCallback(async (sessionId) => {
    setLoading(true);
    try {
      const session = await apiFetch(`/chat/sessions/${sessionId}`);
      setCurrentSession(session);
      setMessages(session.messages || []);
      return session;
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update session title
  const updateSessionTitle = useCallback(async (sessionId, title) => {
    const updated = await apiFetch(`/chat/sessions/${sessionId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    });
    setSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? updated : s))
    );
    if (currentSession?.id === sessionId) {
      setCurrentSession(updated);
    }
    return updated;
  }, [currentSession]);

  // Delete a session
  const deleteSession = useCallback(async (sessionId) => {
    await apiFetch(`/chat/sessions/${sessionId}`, { method: 'DELETE' });
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (currentSession?.id === sessionId) {
      setCurrentSession(null);
      setMessages([]);
    }
  }, [currentSession]);

  // Toggle session bookmark
  const toggleSessionBookmark = useCallback(async (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const newBookmarked = !session.bookmarked;

    // Optimistic update
    setSessions(prev =>
      prev.map(s =>
        s.id === sessionId ? { ...s, bookmarked: newBookmarked } : s
      ).sort((a, b) => {
        if (a.bookmarked !== b.bookmarked) return b.bookmarked ? 1 : -1;
        return new Date(b.updated_at) - new Date(a.updated_at);
      })
    );

    try {
      await apiFetch(`/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ bookmarked: newBookmarked }),
      });
    } catch (error) {
      // Revert on error
      setSessions(prev =>
        prev.map(s =>
          s.id === sessionId ? { ...s, bookmarked: !newBookmarked } : s
        )
      );
    }
  }, [sessions]);

  // Update session tags
  const updateSessionTags = useCallback(async (sessionId, tags) => {
    // Optimistic update
    setSessions(prev =>
      prev.map(s =>
        s.id === sessionId ? { ...s, tags } : s
      )
    );

    try {
      await apiFetch(`/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ tags }),
      });
    } catch (error) {
      // Silently fail
    }
  }, []);

  // Add tag to session
  const addSessionTag = useCallback(async (sessionId, tag) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const currentTags = session.tags || [];
    if (currentTags.includes(tag)) return;

    await updateSessionTags(sessionId, [...currentTags, tag]);
  }, [sessions, updateSessionTags]);

  // Remove tag from session
  const removeSessionTag = useCallback(async (sessionId, tag) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const currentTags = session.tags || [];
    await updateSessionTags(sessionId, currentTags.filter(t => t !== tag));
  }, [sessions, updateSessionTags]);

  // Save a message to the current session
  const saveMessage = useCallback(async (role, content, metadata = {}) => {
    let session = currentSession;

    if (!session) {
      try {
        session = await createSession();
      } catch (createErr) {
        // Try to load existing sessions as fallback
        const existingSessions = await loadSessions();
        if (existingSessions && existingSessions.length > 0) {
          session = existingSessions[0];
          setCurrentSession(session);
        } else {
          throw new Error('无法创建或加载会话，请刷新页面后重试。');
        }
      }
    }

    const message = await apiFetch('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({
        session_id: session.id,
        role,
        content,
        complete: true,
        is_error: false,
        metadata,
      }),
    });

    // Update context messages state
    setMessages((prev) => [...prev, message]);

    // Update session title if this is the first user message
    if (role === 'user' && messages.length === 0 && session.title === '新对话') {
      const newTitle = content.substring(0, 50) + (content.length > 50 ? '...' : '');
      await updateSessionTitle(session.id, newTitle);
    }

    return message;
  }, [currentSession, messages, createSession, updateSessionTitle, loadSessions]);

  // Clear current session (start new conversation)
  const clearCurrentSession = useCallback(() => {
    setCurrentSession(null);
    setMessages([]);
  }, []);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  const value = {
    sessions,
    currentSession,
    messages,
    loading,
    sidebarOpen,
    createSession,
    loadSessions,
    loadSession,
    updateSessionTitle,
    deleteSession,
    saveMessage,
    clearCurrentSession,
    toggleSidebar,
    setSidebarOpen,
    toggleSessionBookmark,
    updateSessionTags,
    addSessionTag,
    removeSessionTag,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}

export default ChatContext;
