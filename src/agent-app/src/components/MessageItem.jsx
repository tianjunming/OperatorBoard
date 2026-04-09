import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Copy, Check, RotateCcw, User, Bot } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useI18n } from '../i18n';
import CodeBlock from './CodeBlock';
import './MessageItem.css';

function MessageItem({ message, onResend, isStreaming }) {
  const { role, content, isError, complete, chart } = message;
  const { locale, t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatTime = (date) => {
    return new Date(date || Date.now()).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isUser = role === 'user';
  const isAssistant = role === 'assistant';

  return (
    <div
      className={`message-item ${isUser ? 'user' : 'assistant'} ${isError ? 'error' : ''} ${isStreaming ? 'streaming' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="message-avatar">
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>

      <div className="message-body">
        <div className="message-bubble">
          {isAssistant ? (
            <div className="message-content">
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    if (!inline && match) {
                      return (
                        <CodeBlock
                          language={match[1]}
                          code={String(children).replace(/\n$/, '')}
                        />
                      );
                    }
                    return (
                      <code className="inline-code" {...props}>
                        {children}
                      </code>
                    );
                  },
                  table({ children }) {
                    return <div className="table-wrapper">{children}</div>;
                  },
                  a({ href, children }) {
                    return (
                      <a href={href} className="link" target="_blank" rel="noopener noreferrer">
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {content}
              </ReactMarkdown>
              {isStreaming && !complete && (
                <span className="streaming-cursor" />
              )}
              {chart && chart.type === 'bar' && chart.data && chart.data.length > 0 && (
                <div className="message-chart">
                  <h4>频段分布图表</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={chart.data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey={chart.column || '频段'} />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {chart.keys && chart.keys.map((key, idx) => (
                        <Bar
                          key={key}
                          dataKey={key}
                          fill={chart.colors && chart.colors[idx] ? chart.colors[idx] : '#10b981'}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          ) : (
            <div className="message-text">{content}</div>
          )}
        </div>

        <div className={`message-meta ${showActions ? 'visible' : ''}`}>
          <span className="message-time">{formatTime(message.created_at)}</span>

          {isAssistant && !isStreaming && (
            <div className="message-actions">
              <button
                className="action-btn"
                onClick={handleCopy}
                title={copied ? t('copied') || '已复制' : t('copy') || '复制'}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                className="action-btn"
                onClick={onResend}
                title={t('regenerate') || '重新生成'}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          )}

          {isUser && onResend && (
            <div className="message-actions">
              <button
                className="action-btn"
                onClick={onResend}
                title={t('resend') || '重新发送'}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default React.memo(MessageItem);
