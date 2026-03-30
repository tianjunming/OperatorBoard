import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

const ChatContext = createContext(null);

const API_BASE = '/api';

export function ChatProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Get token from localStorage
  const getToken = () => localStorage.getItem('auth_token');

  // Create headers with auth
  const getHeaders = () => {
    const token = getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  // Create a new session
  const createSession = useCallback(async (title = '新对话') => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/chat/sessions`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const session = await response.json();
      setSessions((prev) => [session, ...prev]);
      setCurrentSession(session);
      setMessages([]);
      return session;
    } catch (error) {
      console.error('Create session error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all sessions for current user
  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/chat/sessions`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load sessions');
      }

      const data = await response.json();
      setSessions(data.items || []);
      return data.items;
    } catch (error) {
      console.error('Load sessions error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Load a specific session with messages
  const loadSession = useCallback(async (sessionId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to load session');
      }

      const session = await response.json();
      setCurrentSession(session);
      setMessages(session.messages || []);
      return session;
    } catch (error) {
      console.error('Load session error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update session title
  const updateSessionTitle = useCallback(async (sessionId, title) => {
    try {
      const response = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error('Failed to update session');
      }

      const updated = await response.json();
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? updated : s))
      );
      if (currentSession?.id === sessionId) {
        setCurrentSession(updated);
      }
      return updated;
    } catch (error) {
      console.error('Update session error:', error);
      throw error;
    }
  }, [currentSession]);

  // Delete a session
  const deleteSession = useCallback(async (sessionId) => {
    try {
      const response = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to delete session');
      }

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Delete session error:', error);
      throw error;
    }
  }, [currentSession]);

  // Save a message to the current session
  const saveMessage = useCallback(async (role, content, metadata = {}) => {
    let session = currentSession;

    if (!session) {
      // Auto-create session if none exists
      session = await createSession();
    }

    try {
      const response = await fetch(`${API_BASE}/chat/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          session_id: session.id,
          role,
          content,
          complete: true,
          is_error: false,
          metadata,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save message');
      }

      const message = await response.json();

      // Update session title if this is the first user message
      if (role === 'user' && messages.length === 0 && session.title === '新对话') {
        const newTitle = content.substring(0, 50) + (content.length > 50 ? '...' : '');
        await updateSessionTitle(session.id, newTitle);
      }

      return message;
    } catch (error) {
      console.error('Save message error:', error);
      throw error;
    }
  }, [currentSession, messages, createSession, updateSessionTitle]);

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
