import React, { useRef, useEffect } from 'react';
import MessageItem from './MessageItem';
import './MessageList.css';

function MessageList({ messages, isStreaming, streamingContent, streamingChart, onResend, onExampleClick }) {
  const listRef = useRef(null);
  const shouldAutoScroll = useRef(true);

  useEffect(() => {
    if (shouldAutoScroll.current) {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, streamingContent]);

  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 100;
  };

  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="message-list-empty">
        <p>开始对话吧</p>
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
          />
        ))}

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

        {isStreaming && !streamingContent && (
          <div className="typing-indicator">
            <span className="typing-dot" />
            <span className="typing-dot" />
            <span className="typing-dot" />
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(MessageList);
