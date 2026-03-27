import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { useAgentStream } from '../hooks/useAgentStream';
import { useI18n } from '../i18n';
import './ChatContainer.css';

function ChatContainer() {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  const { locale, t } = useI18n();

  const { sendMessage, isLoading, error } = useAgentStream({
    onMessage: (message) => {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.complete) {
          return prev.map((msg, idx) =>
            idx === prev.length - 1
              ? { ...msg, content: msg.content + message, complete: true }
              : msg
          );
        }
        return [
          ...prev,
          { id: Date.now(), role: 'assistant', content: message, complete: true },
        ];
      });
    },
    onStart: () => {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), role: 'assistant', content: '', complete: false },
      ]);
    },
    onComplete: () => {
      setIsConnected(true);
    },
    onError: (err) => {
      setMessages((prev) => {
        const lastMsg = prev[prev.length - 1];
        if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.complete) {
          return prev.map((msg, idx) =>
            idx === prev.length - 1
              ? { ...msg, content: `Error: ${err}`, complete: true, isError: true }
              : msg
          );
        }
        return [
          ...prev,
          { id: Date.now(), role: 'assistant', content: `Error: ${err}`, complete: true, isError: true },
        ];
      });
    },
  });

  const handleSendMessage = async (text) => {
    const userMessage = { id: Date.now(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    await sendMessage(text, { locale });
  };

  const handleClear = () => {
    setMessages([]);
    setIsConnected(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
        {messages.length === 0 && (
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

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
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

      <ChatInput onSend={handleSendMessage} disabled={isLoading} />
    </div>
  );
}

export default ChatContainer;
