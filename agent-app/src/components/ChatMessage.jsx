import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import './ChatMessage.css';

function ChatMessage({ message }) {
  const { role, content, isError } = message;

  const isStreaming = !message.complete && role === 'assistant' && content === '';

  const processedContent = useMemo(() => {
    if (!content) return '';
    return content;
  }, [content]);

  if (role === 'user') {
    return (
      <div className="chat-message user-message">
        <div className="message-avatar user-avatar">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <div className="message-content">
          <div className="message-text">{content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`chat-message assistant-message ${isError ? 'error' : ''}`}>
      <div className="message-avatar assistant-avatar">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      </div>
      <div className="message-content">
        {isStreaming ? (
          <div className="streaming-cursor">...</div>
        ) : (
          <div className="message-text">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                p({ children }) {
                  return <p className="markdown-p">{children}</p>;
                },
                ul({ children }) {
                  return <ul className="markdown-ul">{children}</ul>;
                },
                ol({ children }) {
                  return <ol className="markdown-ol">{children}</ol>;
                },
                li({ children }) {
                  return <li className="markdown-li">{children}</li>;
                },
                h1({ children }) {
                  return <h1 className="markdown-h1">{children}</h1>;
                },
                h2({ children }) {
                  return <h2 className="markdown-h2">{children}</h2>;
                },
                h3({ children }) {
                  return <h3 className="markdown-h3">{children}</h3>;
                },
              }}
            >
              {processedContent}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
