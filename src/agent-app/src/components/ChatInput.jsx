import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Send, Square, Loader2 } from 'lucide-react';
import './ChatInput.css';

function ChatInput({ onSend, disabled, placeholder }) {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [input, disabled, onSend]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleChange = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  const canSend = input.trim().length > 0 && !disabled;

  return (
    <form className="chat-input-wrapper" onSubmit={handleSubmit}>
      <div className={`chat-input-main ${disabled ? 'disabled' : ''}`}>
        <textarea
          ref={textareaRef}
          className="chat-input-field"
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || '输入您的查询...'}
          disabled={disabled}
          rows={1}
          autoFocus
        />

        <div className="chat-input-actions">
          <span className="char-count">
            {input.length > 0 && `${input.length}`}
          </span>

          <button
            type="submit"
            className={`send-btn ${canSend ? 'active' : ''}`}
            disabled={!canSend}
          >
            {disabled ? (
              <Loader2 size={18} className="spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
      </div>

      <div className="chat-input-footer">
        <span className="input-hint">
          <kbd>Enter</kbd> 发送
        </span>
        <span className="input-hint">
          <kbd>Shift + Enter</kbd> 换行
        </span>
      </div>
    </form>
  );
}

export default React.memo(ChatInput);
