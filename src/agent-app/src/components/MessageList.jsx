import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import MessageItem from './MessageItem';
import './MessageList.css';

function MessageList({
  messages,
  isStreaming,
  streamingContent,
  streamingChart,
  onResend,
  onExampleClick,
  onFeedback
}) {
  const listRef = useRef(null);
  const shouldAutoScroll = useRef(true);
  const [validationStatus, setValidationStatus] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessageCount, setNewMessageCount] = useState(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (shouldAutoScroll.current && listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: 'smooth',
      });
    } else if (!shouldAutoScroll.current && messages.length > 0) {
      // User has scrolled up, count new messages
      setNewMessageCount(prev => prev + 1);
    }
  }, [messages, streamingContent]);

  // Handle scroll - disable auto-scroll if user scrolls up
  const handleScroll = useCallback(() => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    shouldAutoScroll.current = isNearBottom;

    // Show scroll-to-bottom button if user scrolls up
    if (!isNearBottom && messages.length > 0) {
      setShowScrollButton(true);
    } else {
      setShowScrollButton(false);
      setNewMessageCount(0);
    }
  }, [messages.length]);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: 'smooth',
      });
      setShowScrollButton(false);
      setNewMessageCount(0);
    }
  }, []);

  // Validate message content
  const validateMessage = useCallback((content) => {
    if (!content || content.trim().length === 0) {
      return { valid: false, message: 'Empty response' };
    }

    // Check for common error patterns
    const errorPatterns = [
      /error:.*cannot/i,
      /failed to.*connect/i,
      /exception/i,
      /traceback/i,
    ];

    for (const pattern of errorPatterns) {
      if (pattern.test(content)) {
        return { valid: false, message: 'Contains error indicators', isError: true };
      }
    }

    // Check minimum content length
    if (content.trim().length < 10) {
      return { valid: false, message: 'Response too short' };
    }

    return { valid: true, message: 'Response complete' };
  }, []);

  // Validate messages on mount or when streaming ends
  useEffect(() => {
    if (!isStreaming && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role === 'assistant') {
        const validation = validateMessage(lastMessage.content);
        setValidationStatus(validation);
      }
    }
  }, [messages, isStreaming, validateMessage]);

  // Handle feedback
  const handleFeedback = useCallback((messageId, feedbackType) => {
    onFeedback?.(messageId, feedbackType);
  }, [onFeedback]);

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="message-list-empty">
        <div className="empty-illustration">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <circle cx="60" cy="60" r="50" fill="var(--color-primary-light)" opacity="0.3" />
            <path
              d="M40 50C40 44.477 44.477 40 50 40H70C75.523 40 80 44.477 80 50V70C80 75.523 75.523 80 70 80H50C44.477 80 40 75.523 40 70V50Z"
              fill="var(--color-primary)"
              opacity="0.5"
            />
            <circle cx="50" cy="60" r="4" fill="var(--color-primary)" />
            <circle cx="60" cy="60" r="4" fill="var(--color-primary)" />
            <circle cx="70" cy="60" r="4" fill="var(--color-primary)" />
          </svg>
        </div>
        <h3>开始对话</h3>
        <p>输入您的问题，AI 助手将为您提供专业的解答</p>
      </div>
    );
  }

  return (
    <div className="message-list" ref={listRef} onScroll={handleScroll}>
      <div className="message-list-inner">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            onResend={message.role === 'user' ? () => onResend?.(message.content) : undefined}
            onFeedback={handleFeedback}
          />
        ))}

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <MessageItem
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingContent,
              chart: streamingChart,
              complete: false,
            }}
            onResend={undefined}
            isStreaming
          />
        )}

        {/* Thinking indicator when waiting for first token */}
        {isStreaming && !streamingContent && (
          <div className="message-item assistant">
            <div className="message-avatar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v6l4 2" />
              </svg>
            </div>
            <div className="message-body">
              <div className="message-bubble">
                <div className="thinking-indicator">
                  <div className="thinking-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span>正在思考...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Validation Status Indicator */}
        {validationStatus && !isStreaming && (
          <div className={`validation-status ${validationStatus.valid ? 'valid' : 'invalid'}`}>
            <span className="validation-icon">
              {validationStatus.valid ? '✓' : '⚠'}
            </span>
            <span className="validation-message">{validationStatus.message}</span>
          </div>
        )}
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          className="scroll-to-bottom-btn"
          onClick={scrollToBottom}
          aria-label="滚动到最新消息"
          title="滚动到最新消息"
        >
          <ChevronDown size={18} />
          {newMessageCount > 0 && (
            <span className="new-message-badge">{newMessageCount > 99 ? '99+' : newMessageCount}</span>
          )}
        </button>
      )}
    </div>
  );
}

export default React.memo(MessageList);
