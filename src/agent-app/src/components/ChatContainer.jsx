import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ChatSidebar from './ChatSidebar';
import { useAgentStream } from '../hooks/useAgentStream';
import { useI18n } from '../i18n';
import { useChat } from '../context/ChatContext';
import './ChatContainer.css';
import '../styles/ChatLayout.css';

function ChatContainer() {
  const { messages, currentSession, saveMessage, clearCurrentSession, createSession, sidebarOpen } = useChat();
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const { locale, t } = useI18n();

  const { sendMessage, isLoading, error } = useAgentStream({
    onMessage: (message) => {
      // This callback is handled differently now
    },
    onStart: () => {
      // This callback is handled differently now
    },
    onComplete: () => {
      setIsConnected(true);
    },
    onError: (err) => {
      // This callback is handled differently now
    },
  });

  // Internal messages state for optimistic updates
  const [localMessages, setLocalMessages] = useState([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // Sync local messages with context messages
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  const handleSendMessage = useCallback(async (text, isResend = false) => {
    // Only save to history if not a resend
    if (!isResend) {
      const savedUserMsg = await saveMessage('user', text, { intent: 'chat' });
      // Optimistically add user message to local state
      setLocalMessages((prev) => [...prev, { ...savedUserMsg, id: savedUserMsg.id || Date.now() }]);
    }

    // Start streaming
    setIsStreaming(true);
    setStreamingContent('');

    try {
      // Send to agent via SSE
      const response = await fetch('/api/agent/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, stream: true }),
      });

      if (!response.ok) {
        throw new Error(`Agent error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') {
              break;
            }
            if (data.startsWith('{') && data.endsWith('}')) {
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setStreamingContent(fullContent);
                }
              } catch (e) {
                // Ignore JSON parse errors for partial data
              }
            }
          }
        }
      }

      // Save assistant message to history (only if not a resend)
      if (fullContent && !isResend) {
        await saveMessage('assistant', fullContent, { intent: 'chat' });
      }

      // Add assistant message to local state (only if not a resend)
      if (fullContent && !isResend) {
        setLocalMessages((prev) => [
          ...prev,
          { id: Date.now(), role: 'assistant', content: fullContent, complete: true, isError: false }
        ]);
      }

      // For resend, just log completion
      if (isResend) {
        console.log('Resend completed:', fullContent ? 'with response' : 'no response');
      }

    } catch (err) {
      console.error('Send message error:', err);
      // Add error message
      const errorMsg = `Error: ${err.message}`;
      if (!isResend) {
        await saveMessage('assistant', errorMsg, { intent: 'chat', isError: true });
        setLocalMessages((prev) => [
          ...prev,
          { id: Date.now(), role: 'assistant', content: errorMsg, complete: true, isError: true }
        ]);
      }
      setStreamingContent(errorMsg);
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
    }
  }, [saveMessage]);

  // Handle resend message (from ChatMessage click) - just resend to agent, don't save
  const handleResendMessage = useCallback(async (content) => {
    await handleSendMessage(content, true);
  }, [handleSendMessage]);

  const handleClear = async () => {
    clearCurrentSession();
    setLocalMessages([]);
    setIsConnected(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages, streamingContent]);

  const welcomeMessages = locale === 'zh' ? {
    title: '欢迎使用运营商智能助手',
    subtitle: '询问关于电信运营、网络配置或运营商数据的任何问题。',
    tryAsking: '可以尝试询问：',
    examples: [
      '北京联通的站点数量',
      '最新指标数据',
      '有哪些运营商',
    ],
  } : {
    title: 'Welcome to Operator Agent',
    subtitle: 'Ask me anything about telecom operations, network configurations, or operator data.',
    tryAsking: 'Try asking:',
    examples: [
      'Get site count for China Unicom',
      'Latest indicator data',
      'List all operators',
    ],
  };

  return (
    <div className="chat-layout">
      <ChatSidebar />

      <div className="chat-main">
        <div className="chat-container">
          <div className="chat-header">
            <div className="connection-status">
              <span className={`status-dot ${isConnected ? 'connected' : ''}`} />
              <span>{isConnected ? (locale === 'zh' ? '已连接' : 'Connected') : (locale === 'zh' ? '就绪' : 'Ready')}</span>
            </div>
            <button className="clear-btn" onClick={handleClear}>
              {locale === 'zh' ? '清空对话' : 'Clear Chat'}
            </button>
          </div>

          <div className="chat-messages">
            {localMessages.length === 0 && !isStreaming && (
              <div className="welcome-message">
                <h2>{welcomeMessages.title}</h2>
                <p>{welcomeMessages.subtitle}</p>
                <div className="example-prompts">
                  <p>{welcomeMessages.tryAsking}</p>
                  <ul>
                    {welcomeMessages.examples.map((ex, i) => (
                      <li key={i}>"{ex}"</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {localMessages.map((message) => (
              <ChatMessage key={message.id} message={message} onResend={handleResendMessage} />
            ))}

            {isStreaming && streamingContent !== '' && (
              <ChatMessage
                message={{ id: 'streaming', role: 'assistant', content: streamingContent, complete: false }}
                onResend={null}
              />
            )}

            {isLoading && localMessages[localMessages.length - 1]?.role === 'user' && !isStreaming && (
              <div className="typing-indicator">
                <span>{t('thinking')}</span>
                <div className="dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <ChatInput onSend={handleSendMessage} disabled={isLoading || isStreaming} />
        </div>
      </div>
    </div>
  );
}

export default ChatContainer;
