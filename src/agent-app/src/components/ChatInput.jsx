import React, { useState, useRef } from 'react';
import { useI18n } from '../i18n';
import './ChatInput.css';

function ChatInput({ onSend, disabled }) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);
  const { locale, t } = useI18n();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
    }
  };

  return (
    <form className="chat-input-container" onSubmit={handleSubmit}>
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          className="chat-input"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={locale === 'zh' ? '输入您的查询... (Enter发送, Shift+Enter换行)' : 'Enter your query... (Enter to send, Shift+Enter for new line)'}
          disabled={disabled}
          rows={1}
        />
        <button
          type="submit"
          className="send-button"
          disabled={disabled || !input.trim()}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
          </svg>
        </button>
      </div>
      <div className="input-hints">
        <span>{locale === 'zh' ? 'Enter 发送' : 'Enter to send'}</span>
        <span>{locale === 'zh' ? 'Shift + Enter 换行' : 'Shift + Enter for new line'}</span>
      </div>
    </form>
  );
}

export default ChatInput;
