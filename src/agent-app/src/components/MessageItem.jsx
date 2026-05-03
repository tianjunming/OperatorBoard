import React, { useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Copy, Check, RotateCcw, ThumbsUp, ThumbsDown,
  User, Bot, AlertCircle, CheckCircle, MessageSquare, Database,
  ChevronDown, ChevronUp, Sparkles, Eye, EyeOff,
  Clock, Cpu
} from 'lucide-react';
import { useI18n } from '../i18n';
import { parseStructuredBlocks, formatThinkingChain } from '../utils/responseParser';
import CodeBlock from './CodeBlock';
import KpiCard from './KpiCard';
import SkeletonLoader, { SKELETON_TYPES } from './SkeletonLoader';
import SqlBlock from './SqlBlock';
import TableBlock from './TableBlock';
import ChartBlock from './ChartBlock';
import ToggleBlock from './ToggleBlock';
import './MessageItem.css';
import './KpiCard.css';
import './SkeletonLoader.css';

// Message feedback state
const MESSAGE_FEEDBACK = { NONE: 'none', LIKED: 'liked', DISLIKED: 'disliked' };

function MessageItem({ message, onResend, isStreaming, streamingContent, onFeedback }) {
  const { role, content, isError, complete, chart, metadata } = message;
  const { locale, t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [feedback, setFeedback] = useState(MESSAGE_FEEDBACK.NONE);
  const [showThinking, setShowThinking] = useState(false);
  const [stepsExpanded, setStepsExpanded] = useState(true);
  const [toggleViewModes, setToggleViewModes] = useState({});

  // Toggle view mode handler
  const toggleViewMode = useCallback((blockIdx) => {
    setToggleViewModes(prev => ({
      ...prev,
      [blockIdx]: prev[blockIdx] === 'table' ? 'chart' : 'table'
    }));
  }, []);

  const isUser = role === 'user';
  const isAssistant = role === 'assistant';

  // Parse structured content
  const contentBlocks = useMemo(() => parseStructuredBlocks(content), [content]);

  // Extract thinking chain
  const thinkingBlock = useMemo(() =>
    contentBlocks.find(b => b.type === 'thinking'),
    [contentBlocks]
  );

  // Other blocks (text, table, chart, etc.)
  const mainBlocks = useMemo(() =>
    contentBlocks.filter(b => b.type !== 'thinking'),
    [contentBlocks]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Silently fail - clipboard may not be available
    }
  }, [content]);

  const handleFeedback = useCallback((type) => {
    const newFeedback = feedback === type ? MESSAGE_FEEDBACK.NONE : type;
    setFeedback(newFeedback);
    onFeedback?.(message.id, newFeedback);
  }, [feedback, message.id, onFeedback]);

  // ========== Block Renderers ==========

  // Thinking Chain Renderer
  const renderThinkingChain = (thinking) => {
    const formatted = formatThinkingChain(thinking);
    return (
      <div className="thinking-chain" data-testid="thinking-chain">
        <div className="thinking-header" onClick={() => setShowThinking(!showThinking)}>
          <div className="thinking-title">
            <Sparkles size={14} />
            <span>AI 分析过程</span>
          </div>
          <div className="thinking-actions">
            <button className="thinking-toggle" data-testid="thinking-toggle">
              {showThinking ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{showThinking ? '隐藏' : '显示'}</span>
            </button>
            {showThinking ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>
        {showThinking && (
          <div className="thinking-content" data-testid="thinking-content">
            <div className="thinking-steps">
              {formatted.map((step, idx) => (
                <div key={idx} className={`thinking-step ${step.type}`} data-testid={`thinking-step-${idx}`}>
                  <div className="step-indicator">
                    <div className="step-dot" />
                    {idx < formatted.length - 1 && <div className="step-line" />}
                  </div>
                  <div className="step-content">
                    {step.type === 'action' && <span className="step-icon"><Cpu size={12} /></span>}
                    {step.type === 'step' && <span className="step-number">{step.index}</span>}
                    {step.type === 'result' && <span className="step-icon"><CheckCircle size={12} /></span>}
                    {step.type === 'error' && <span className="step-icon"><AlertCircle size={12} /></span>}
                    <span className="step-text">{step.content}</span>
                    {step.source && <span className="step-source"><Database size={10} />{step.source}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Metrics Renderer (增强版 - 使用KpiCard)
  const renderMetrics = (block) => {
    if (!block.items || block.items.length === 0) return null;

    // 安全计算最大值，避免 NaN 和 Infinity
    const validValues = block.items
      .map(i => i.numeric || 0)
      .filter(v => isFinite(v));
    const maxValue = validValues.length > 0 ? Math.max(...validValues) : 0;

    return (
      <div className="structured-metrics">
        <div className="metrics-grid kpi-grid">
          {block.items.map((item, idx) => {
            const numericValue = item.numeric || 0;
            // 生成模拟sparkline数据（基于当前值生成简单趋势）
            const baseValue = numericValue * 0.85;
            const sparklineData = [
              baseValue * 0.95,
              baseValue * 1.02,
              baseValue * 0.98,
              baseValue * 1.05,
              baseValue * 1.08,
              numericValue
            ];
            // 根据数值相对最大值的位置判断趋势
            const ratio = maxValue > 0 ? numericValue / maxValue : 0.5;
            const trend = ratio > 0.7 ? 'up' : ratio < 0.3 ? 'down' : 'stable';
            const trendPercent = ((numericValue / (baseValue || 1)) * 100 - 100).toFixed(1);

            return (
              <KpiCard
                key={idx}
                title={item.label}
                value={numericValue}
                unit={item.unit || ''}
                trend={trend}
                trendValue={`${trend === 'up' ? '+' : trend === 'down' ? '' : ''}${trendPercent}%`}
                sparklineData={sparklineData}
                sparklineColor={trend === 'up' ? '#10b981' : trend === 'down' ? '#ef4444' : '#4f46e5'}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // Steps Renderer
  const renderSteps = (block) => (
    <div className="structured-steps">
      <div className="steps-header" onClick={() => setStepsExpanded(!stepsExpanded)}>
        <MessageSquare size={14} />
        <span>分析步骤</span>
        <span className="steps-count">{block.steps.length} 步</span>
        {stepsExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </div>
      {stepsExpanded && (
        <div className="steps-content">
          {block.steps.map((step, idx) => (
            <div key={idx} className="step-item">
              <div className="step-number">{idx + 1}</div>
              <div className="step-text">{step}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

    const renderText = (text) => (
    <ReactMarkdown
      components={{
        code({ node, inline, className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          if (!inline && match) {
            return <CodeBlock language={match[1]} code={String(children).replace(/\n$/, '')} />;
          }
          return <code className="inline-code" {...props}>{children}</code>;
        },
        table({ children }) {
          return <div className="table-wrapper">{children}</div>;
        },
        a({ href, children }) {
          return <a href={href} className="link" target="_blank" rel="noopener noreferrer">{children}</a>;
        },
      }}
    >
      {text}
    </ReactMarkdown>
  );

  // ========== Main Render ==========
  return (
    <div
      className={`message-item ${isUser ? 'user' : 'assistant'} ${isError ? 'error' : ''} ${isStreaming ? 'streaming' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      data-testid={`message-item-${role}`}
    >
      <div className="message-avatar" data-testid="message-avatar">
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>

      <div className="message-body" data-testid="message-body">
        <div className="message-bubble" data-testid="message-bubble">
          {isAssistant && (
            <>
              {/* Message Header with Metadata */}
              {message.metadata && (message.metadata.source || message.metadata.query_time || message.metadata.confidence) && (
                <div className="message-header">
                  <div className="header-meta">
                    {message.metadata.source && (
                      <div className="header-source">
                        <Database size={12} />
                        <span>{message.metadata.source}</span>
                      </div>
                    )}
                    {message.metadata.query_time && (
                      <div className="header-time">
                        <Clock size={12} />
                        <span>{message.metadata.query_time}ms</span>
                      </div>
                    )}
                  </div>
                  {message.metadata.confidence && (
                    <div className={`header-badge ${message.metadata.confidence < 70 ? 'warning' : ''}`}>
                      置信度: {message.metadata.confidence}%
                    </div>
                  )}
                </div>
              )}

              {/* Thinking Chain */}
              {thinkingBlock && renderThinkingChain(thinkingBlock.content)}

              {/* Main Content Blocks */}
              <div className="message-content">
                {/* Streaming skeleton */}
                {isStreaming && !complete && streamingContent && (
                  <div className="streaming-skeleton">
                    <SkeletonLoader type={SKELETON_TYPES.TEXT} progress={50} message="正在分析您的查询..." />
                  </div>
                )}

                {mainBlocks.map((block, idx) => {
                  switch (block.type) {
                    case 'table': return <div key={idx} className="block-table"><TableBlock block={block} /></div>;
                    case 'chart': return <div key={idx} className="block-chart"><ChartBlock block={block} /></div>;
                    case 'metrics': return <div key={idx} className="block-metrics">{renderMetrics(block)}</div>;
                    case 'steps': return <div key={idx} className="block-steps">{renderSteps(block)}</div>;
                    case 'sql': return <div key={idx} className="block-sql"><SqlBlock sql={block.sql} /></div>;
                    case 'toggle': return <div key={idx} className="block-toggle"><ToggleBlock block={block} blockIdx={idx} viewMode={toggleViewModes[idx] || 'table'} onToggleView={toggleViewMode} /></div>;
                    case 'text': return <div key={idx} className="block-text">{renderText(block.content)}</div>;
                    default: return null;
                  }
                })}

                {/* Legacy chart support */}
                {chart && chart.type === 'bar' && chart.data && chart.data.length > 0 && (
                  <div className="block-chart"><ChartBlock block={{ chartType: 'bar', data: chart.data, keys: chart.keys, column: chart.column }} /></div>
                )}

                {/* Streaming cursor */}
                {isStreaming && !complete && <span className="streaming-cursor" />}
              </div>
            </>
          )}

          {isUser && <div className="message-text">{content || '(empty message)'}</div>}
        </div>

        {/* Footer */}
        <div className={`message-footer ${showActions ? 'visible' : ''}`}>
          <div className="message-time">
            <Clock size={12} />
            <span>{new Date(message.created_at || Date.now()).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {isAssistant && !isStreaming && (
            <div className="message-actions">
              <button
                className={`action-btn ${feedback === MESSAGE_FEEDBACK.LIKED ? 'liked' : ''}`}
                onClick={() => handleFeedback(MESSAGE_FEEDBACK.LIKED)}
                aria-label={t('helpful')}
                title={t('helpful')}
              >
                <ThumbsUp size={14} />
              </button>
              <button
                className={`action-btn ${feedback === MESSAGE_FEEDBACK.DISLIKED ? 'disliked' : ''}`}
                onClick={() => handleFeedback(MESSAGE_FEEDBACK.DISLIKED)}
                aria-label={t('notHelpful')}
                title={t('notHelpful')}
              >
                <ThumbsDown size={14} />
              </button>
              <div className="action-divider" />
              <button
                className="action-btn"
                onClick={handleCopy}
                aria-label={copied ? t('copied') : t('copy')}
                title={copied ? t('copied') : t('copy')}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button
                className="action-btn"
                onClick={() => onResend?.(content)}
                aria-label={t('regenerate')}
                title={t('regenerate')}
              >
                <RotateCcw size={14} />
              </button>
            </div>
          )}

          {isUser && onResend && (
            <div className="message-actions">
              <button
                className="action-btn"
                onClick={() => onResend?.(content)}
                aria-label={t('resend')}
                title={t('resend')}
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
