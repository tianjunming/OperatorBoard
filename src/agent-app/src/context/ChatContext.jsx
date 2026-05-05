import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { apiFetch } from '../api/client';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // Guard ref to prevent race condition between createSession and saveMessage
  const isCreatingSessionRef = useRef(false);

  // Create a new session
  const createSession = useCallback(async (title = '新对话') => {
    // Prevent concurrent session creation using ref
    if (isCreatingSessionRef.current) {
      console.log('[ChatContext] Session creation already in progress, waiting...');
      // Wait for existing creation to complete
      while (isCreatingSessionRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log('[ChatContext] Wait complete, returning currentSession:', currentSession?.id);
      return currentSession;
    }

    isCreatingSessionRef.current = true;
    setLoading(true);
    console.log('[ChatContext] Creating new session...');
    let session;
    try {
      session = await apiFetch('/chat/sessions', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
      console.log('[ChatContext] Session created successfully:', session.id);
      // Update state after session is created, not before
      setSessions(prev => [session, ...prev]);
      setCurrentSession(session);
      return session;
    } catch (error) {
      console.error('[ChatContext] Failed to create session:', error);
      throw error;
    } finally {
      setLoading(false);
      isCreatingSessionRef.current = false;
    }
  }, [currentSession]);

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
  // 使用乐观更新确保消息立即显示，同时在后台保存到服务器
  const saveMessage = useCallback(async (role, content, metadata = {}) => {
    // 防御性检查：确保 content 是有效字符串
    const validContent = typeof content === 'string' ? content : String(content || '');
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log(`[ChatContext] saveMessage called: role=${role}, tempId=${tempId}, content=${validContent.substring(0, 50)}...`);

    // 乐观更新：立即创建临时消息对象并显示
    const optimisticMessage = {
      id: tempId,
      role,
      content: validContent,
      created_at: new Date().toISOString(),
      complete: true,
      metadata: { ...metadata, temp: true },
    };

    // 立即更新 UI
    setMessages(prev => {
      console.log(`[ChatContext] setMessages (add optimistic): prev.length=${prev.length}, adding role=${role}`);
      return [...prev, optimisticMessage];
    });

    let session = currentSession;

    if (!session) {
      console.log(`[ChatContext] No currentSession, creating new session...`);
      try {
        session = await createSession();
        console.log(`[ChatContext] Session created: ${session?.id}`);
      } catch (createErr) {
        // Try to load existing sessions as fallback
        const existingSessions = await loadSessions();
        if (existingSessions && existingSessions.length > 0) {
          session = existingSessions[0];
          setCurrentSession(session);
          console.log(`[ChatContext] Using existing session: ${session.id}`);
        } else {
          // 会话创建失败，标记临时消息为错误
          console.log(`[ChatContext] Failed to create/load session, marking message as error`);
          setMessages(prev => prev.map(m =>
            m.id === tempId
              ? { ...m, content: `⚠️ ${validContent}\n\n[保存失败: 无法创建会话]`, metadata: { ...m.metadata, is_error: true, temp: false } }
              : m
          ));
          throw new Error('无法创建或加载会话，请刷新页面后重试。');
        }
      }
    }

    try {
      const apiMessage = await apiFetch('/chat/messages', {
        method: 'POST',
        body: JSON.stringify({
          session_id: session.id,
          role,
          content: validContent,
          complete: true,
          is_error: false,
          metadata,
        }),
      });

      console.log(`[ChatContext] API returned: role=${role}, apiMessage.id=${apiMessage?.id}, tempId=${tempId}`);

      // 验证 API 返回
      if (!apiMessage || typeof apiMessage !== 'object') {
        throw new Error('Invalid message response from server');
      }
      if (!apiMessage.id) {
        throw new Error('Message missing ID from server');
      }

      // 用服务器返回的真实消息替换临时消息
      setMessages(prev => {
        console.log(`[ChatContext] setMessages (replace temp): prev.length=${prev.length}, looking for tempId=${tempId}`);
        const tempExists = prev.some(m => m.id === tempId);
        if (tempExists) {
          const newMessages = prev.map(m =>
            m.id === tempId ? { ...apiMessage, metadata: { ...apiMessage.metadata, temp: false } } : m
          );
          console.log(`[ChatContext] Replaced temp message, new.length=${newMessages.length}`);
          return newMessages;
        }
        // 如果临时消息不在了，直接追加
        console.log(`[ChatContext] Temp message not found (may have been replaced), appending new message, prev.length=${prev.length}`);
        return [...prev, { ...apiMessage, metadata: { ...apiMessage.metadata, temp: false } }];
      });

      // Update session title if this is the first user message
      if (role === 'user' && messages.length === 0 && session.title === '新对话') {
        const newTitle = validContent.substring(0, 50) + (validContent.length > 50 ? '...' : '');
        console.log(`[ChatContext] Updating session title to: ${newTitle}`);
        try {
          await updateSessionTitle(session.id, newTitle);
        } catch (titleErr) {
          console.warn('Failed to update session title:', titleErr);
        }
      }

      return apiMessage;
    } catch (err) {
      // API 调用失败，标记临时消息为错误但不删除
      console.log(`[ChatContext] API error for role=${role}: ${err.message}`);
      setMessages(prev => prev.map(m =>
        m.id === tempId
          ? { ...m, content: `⚠️ ${validContent}\n\n[保存失败: ${err.message}]`, metadata: { ...m.metadata, is_error: true, temp: false } }
          : m
      ));
      throw err;
    }
  }, [currentSession, createSession, updateSessionTitle, loadSessions]);

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
