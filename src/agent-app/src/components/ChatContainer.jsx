import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import { useAgentStream } from '../hooks/useAgentStream';
import './ChatContainer.css';

function ChatContainer() {
  const [messages, setMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef(null);

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
    await sendMessage(text);
  };

  const handleClear = () => {
    setMessages([]);
    setIsConnected(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="connection-status">
          <span className={`status-dot ${isConnected ? 'connected' : ''}`} />
          <span>{isConnected ? 'Connected' : 'Ready'}</span>
        </div>
        <button className="clear-btn" onClick={handleClear}>
          Clear Chat
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="welcome-message">
            <h2>Welcome to Operator Agent</h2>
            <p>Ask me anything about telecom operations, network configurations, or operator data.</p>
            <div className="example-prompts">
              <p>Try asking:</p>
              <ul>
                <li>"Get network performance data for operator A"</li>
                <li>"Show me 5G protocol configuration examples"</li>
                <li>"Generate a summary report for all operators"</li>
              </ul>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}

        {isLoading && messages[messages.length - 1]?.role === 'user' && (
          <div className="typing-indicator">
            <span>Agent is thinking...</span>
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
