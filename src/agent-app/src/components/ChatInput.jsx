import React, { useState, useRef, useCallback } from 'react';
import { Send, Square, Loader2, Command } from 'lucide-react';
import { useCommandInput, COMMANDS } from '../hooks/useCommandInput';
import MentionPicker from './MentionPicker';
import './ChatInput.css';

function ChatInput({ onSend, disabled, placeholder, messages, onClear }) {
  const {
    input,
    setInput,
    inputRef,
    showCommandPanel,
    showMentionPanel,
    filteredCommands,
    selectedIndex,
    handleKeyDown: handleCommandKeyDown,
    selectCommand,
    insertMention,
    closePanels,
  } = useCommandInput(onSend, onClear);

  const textareaRef = inputRef;
  const canSend = input.trim().length > 0 && !disabled;

  const handleSubmit = useCallback((e) => {
    e?.preventDefault();
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  }, [input, disabled, onSend, setInput]);

  const handleKeyDown = useCallback((e) => {
    // Handle command panel navigation
    if (showCommandPanel || showMentionPanel) {
      const handled = handleCommandKeyDown(e, messages);
      if (handled) return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [showCommandPanel, showMentionPanel, handleCommandKeyDown, messages, handleSubmit]);

  const handleChange = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  };

  return (
    <form className="chat-input-wrapper" onSubmit={handleSubmit}>
      {/* Command Panel */}
      {showCommandPanel && filteredCommands.length > 0 && (
        <div className="command-panel">
          <div className="command-header">
            <Command size={12} />
            <span>命令</span>
          </div>
          <div className="command-list">
            {filteredCommands.map((cmd, idx) => (
              <div
                key={cmd.id}
                className={`command-item ${selectedIndex === idx ? 'selected' : ''}`}
                onClick={() => selectCommand(cmd)}
              >
                <span className="command-label">{cmd.label}</span>
                <span className="command-hint">{cmd.hint}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mention Picker */}
      {showMentionPanel && (
        <MentionPicker
          messages={messages}
          selectedIndex={selectedIndex}
          onSelect={insertMention}
        />
      )}

      <div className={`chat-input-main ${disabled ? 'disabled' : ''}`}>
        <textarea
          ref={textareaRef}
          className="chat-input-field"
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || '输入您的查询... 或输入 / 查看命令'}
          disabled={disabled}
          rows={1}
          autoFocus
          data-testid="chat-input"
        />

        <div className="chat-input-actions">
          <span className="char-count">
            {input.length > 0 && `${input.length}`}
          </span>

          <button
            type="submit"
            className={`send-btn ${canSend ? 'active' : ''}`}
            disabled={!canSend}
            data-testid="send-button"
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
          <kbd>/</kbd> 命令
        </span>
        <span className="input-hint">
          <kbd>@</kbd> 引用
        </span>
        <span className="input-hint">
          <kbd>Enter</kbd> 发送
        </span>
      </div>
    </form>
  );
}

export default React.memo(ChatInput);
