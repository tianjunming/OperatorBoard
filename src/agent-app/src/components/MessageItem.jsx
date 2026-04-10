import React, { useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Copy, Check, RotateCcw, ThumbsUp, ThumbsDown,
  User, Bot, AlertCircle, CheckCircle, AlertTriangle, Info,
  ChevronDown, ChevronUp, ChevronRight, MessageSquare, Database,
  BarChart3, Table2, Code2, Sparkles, Eye, EyeOff,
  Clock, ArrowRight, Search, Cpu, Loader2, Download, Filter, ArrowUp, ArrowDown, X
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
  ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { useI18n } from '../i18n';
import { parseStructuredBlocks, formatThinkingChain } from '../utils/responseParser';
import { useTableSort } from '../hooks/useTableSort';
import ChartTypeSelector from './charts/ChartTypeSelector';
import CodeBlock from './CodeBlock';
import './MessageItem.css';

// Message feedback state
const MESSAGE_FEEDBACK = { NONE: 'none', LIKED: 'liked', DISLIKED: 'disliked' };

// Toggle Block Renderer (defined outside component to ensure availability)
function RenderToggle({ block, blockIdx, viewMode, onToggleView }) {
  const table = block?.table || { columns: [], data: [] };
  const chart = block?.chart || { data: [], keys: [], column: '数据月' };

  return (
    <div className="structured-toggle">
      <div className="toggle-header">
        <div className="toggle-title">
          <BarChart3 size={14} />
          <span>站点数据</span>
        </div>
        <div className="toggle-buttons">
          <button
            className={`toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
            onClick={() => onToggleView(blockIdx)}
          >
            <Table2 size={14} />
            <span>表格</span>
          </button>
          <button
            className={`toggle-btn ${viewMode === 'chart' ? 'active' : ''}`}
            onClick={() => onToggleView(blockIdx)}
          >
            <BarChart3 size={14} />
            <span>图表</span>
          </button>
        </div>
      </div>
      <div className="toggle-content">
        {viewMode === 'table' ? (
          <div className="structured-table">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    {(table.columns || []).map((col, idx) => (
                      <th key={idx}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(table.data || []).map((row, idx) => (
                    <tr key={idx}>
                      {(table.columns || []).map((col, cidx) => (
                        <td key={cidx}>{row[col]}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="structured-chart">
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chart.data || []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey={chart.column || '数据月'} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border-light)' }} />
                <Legend />
                {(chart.keys || []).map((key, idx) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'][idx % 6]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageItem({ message, onResend, isStreaming, onFeedback }) {
  const { role, content, isError, complete, chart, metadata } = message;
  const { locale, t } = useI18n();
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [feedback, setFeedback] = useState(MESSAGE_FEEDBACK.NONE);
  const [showThinking, setShowThinking] = useState(true);
  const [stepsExpanded, setStepsExpanded] = useState(true);
  const [toggleViewModes, setToggleViewModes] = useState({});

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
      console.error('Failed to copy:', err);
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
      <div className="thinking-chain">
        <div className="thinking-header" onClick={() => setShowThinking(!showThinking)}>
          <div className="thinking-title">
            <Sparkles size={14} />
            <span>AI 分析过程</span>
          </div>
          <div className="thinking-actions">
            <button className="thinking-toggle">
              {showThinking ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{showThinking ? '隐藏' : '显示'}</span>
            </button>
            {showThinking ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>
        {showThinking && (
          <div className="thinking-content">
            <div className="thinking-steps">
              {formatted.map((step, idx) => (
                <div key={idx} className={`thinking-step ${step.type}`}>
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

  // Table Renderer
  const renderTable = (block) => {
    if (!block.data || block.data.length === 0) return null;

    const {
      sortedData,
      sortConfig,
      globalFilter,
      handleSort,
      handleGlobalFilter,
      exportCSV,
      filteredCount,
      totalCount
    } = useTableSort(block.data, block.columns);

    return (
      <div className="structured-table">
        <div className="table-header">
          <Table2 size={14} />
          <span>数据表格</span>
          <span className="table-count">{filteredCount} / {totalCount} 条记录</span>
        </div>
        <div className="table-controls">
          <div className="table-search-wrapper">
            <Filter size={12} className="table-filter-icon" />
            <input
              type="text"
              className="table-filter-input"
              placeholder="筛选数据..."
              value={globalFilter}
              onChange={(e) => handleGlobalFilter(e.target.value)}
            />
            {globalFilter && (
              <button className="table-filter-clear" onClick={() => handleGlobalFilter('')}>
                <X size={12} />
              </button>
            )}
          </div>
          <button className="table-export-btn" onClick={() => exportCSV()}>
            <Download size={12} />
            <span>导出</span>
          </button>
        </div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                {block.columns.map((col, idx) => (
                  <th key={idx} onClick={() => handleSort(col)}>
                    {col}
                    <span className={`th-sort-indicator ${sortConfig.key === col ? 'active' : ''}`}>
                      {sortConfig.key === col ? (
                        sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                      ) : (
                        <ArrowUp size={12} className="th-sort-icon" />
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, idx) => (
                <tr key={idx}>
                  {block.columns.map((col, cidx) => (
                    <td key={cidx}>{row[col]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {block.citations && block.citations.length > 0 && (
          <div className="citation-list">
            {block.citations.map((cite) => (
              <div key={cite} className="citation-item">
                <span className="citation-num">{cite}</span>
                <span>数据来源 #{cite}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Chart Renderer
  const renderChart = (block) => {
    const [chartType, setChartType] = useState(block.chartType || 'bar');
    const { chartType: initialType, data, keys, column = 'name' } = block;
    const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    if (!data || data.length === 0) return null;

    // 安全获取数据键，确保 column 存在于数据中
    const dataKeys = data[0] ? Object.keys(data[0]) : [];
    const safeColumn = dataKeys.includes(column) ? column : (dataKeys[0] || 'name');
    const safeKeys = keys || dataKeys.filter(k => k !== safeColumn);

    const commonProps = { data, margin: { top: 20, right: 30, left: 20, bottom: 5 } };

    const renderBar = () => (
      <ComposedChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
        <XAxis dataKey={safeColumn} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border-light)' }} />
        <Legend />
        {safeKeys.map((key, idx) => (
          <Bar key={key} dataKey={key} fill={colors[idx % colors.length]} radius={[4, 4, 0, 0]} />
        ))}
      </ComposedChart>
    );

    const renderLine = () => (
      <LineChart {...commonProps}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
        <XAxis dataKey={safeColumn} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border-light)' }} />
        <Legend />
        {safeKeys.map((key, idx) => (
          <Line key={key} type="monotone" dataKey={key} stroke={colors[idx % colors.length]} strokeWidth={2} dot={{ r: 4 }} />
        ))}
      </LineChart>
    );

    const renderPie = () => {
      return (
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => {
              const percentValue = isNaN(percent) || !isFinite(percent) ? 0 : (percent * 100).toFixed(0);
              return `${name} (${percentValue}%)`;
            }}
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={colors[idx % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => [`${value}`, '数量']} />
          <Legend />
        </PieChart>
      );
    };

    const renderArea = () => (
      <AreaChart {...commonProps}>
        <defs>
          {colors.map((color, idx) => (
            <linearGradient key={idx} id={`gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
        <XAxis dataKey={safeColumn} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border-light)' }} />
        <Legend />
        {safeKeys.map((key, idx) => (
          <Area key={key} type="monotone" dataKey={key} stroke={colors[idx % colors.length]} fill={`url(#gradient-${idx})`} />
        ))}
      </AreaChart>
    );

    // Toggle view mode handler
    const toggleViewMode = (blockIdx) => {
      setToggleViewModes(prev => ({
        ...prev,
        [blockIdx]: prev[blockIdx] === 'table' ? 'chart' : 'table'
      }));
    };

    const chartTitles = {
      bar: '柱状图对比',
      line: '趋势分析',
      pie: '占比分布',
      area: '面积分析',
      radar: '雷达分析'
    };

    return (
      <div className="structured-chart">
        <div className="chart-header">
          <BarChart3 size={14} />
          <span>{chartTitles[chartType] || '数据图表'}</span>
          <ChartTypeSelector currentType={chartType} onChange={setChartType} />
          <div className="chart-legend">
            {safeKeys.map((key, idx) => (
              <span key={key} className="legend-item">
                <span className="legend-dot" style={{ background: colors[idx % colors.length] }} />
                {key}
              </span>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          {chartType === 'line' ? renderLine() :
           chartType === 'pie' ? renderPie() :
           chartType === 'area' ? renderArea() :
           renderBar()}
        </ResponsiveContainer>
      </div>
    );
  };

  // Metrics Renderer
  const renderMetrics = (block) => {
    if (!block.items || block.items.length === 0) return null;

    // 安全计算最大值，避免 NaN 和 Infinity
    const validValues = block.items
      .map(i => i.numeric || 0)
      .filter(v => isFinite(v));
    const maxValue = validValues.length > 0 ? Math.max(...validValues) : 0;

    return (
      <div className="structured-metrics">
        <div className="metrics-grid">
          {block.items.map((item, idx) => {
            const numericValue = item.numeric || 0;
            const barWidth = maxValue > 0 ? (numericValue / maxValue) * 100 : 0;
            return (
              <div key={idx} className="metric-card">
                <div className="metric-label">{item.label}</div>
                <div className="metric-value">{item.value}</div>
                <div className="metric-bar">
                  <div
                    className="metric-bar-fill"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
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

  // SQL Renderer
  const renderSql = (block) => (
    <div className="structured-sql">
      <div className="sql-header">
        <Code2 size={14} />
        <span>SQL 查询</span>
      </div>
      <pre className="sql-content">{block.sql}</pre>
    </div>
  );

  // Text/Markdown Renderer
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
    >
      <div className="message-avatar">
        {isUser ? <User size={18} /> : <Bot size={18} />}
      </div>

      <div className="message-body">
        <div className="message-bubble">
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
                {mainBlocks.map((block, idx) => {
                  switch (block.type) {
                    case 'table': return <div key={idx} className="block-table">{renderTable(block)}</div>;
                    case 'chart': return <div key={idx} className="block-chart">{renderChart(block)}</div>;
                    case 'metrics': return <div key={idx} className="block-metrics">{renderMetrics(block)}</div>;
                    case 'steps': return <div key={idx} className="block-steps">{renderSteps(block)}</div>;
                    case 'sql': return <div key={idx} className="block-sql">{renderSql(block)}</div>;
                    case 'toggle': return <div key={idx} className="block-toggle"><RenderToggle block={block} blockIdx={idx} viewMode={toggleViewModes[idx] || 'table'} onToggleView={toggleViewMode} /></div>;
                    case 'text': return <div key={idx} className="block-text">{renderText(block.content)}</div>;
                    default: return null;
                  }
                })}

                {/* Legacy chart support */}
                {chart && chart.type === 'bar' && chart.data && chart.data.length > 0 && (
                  <div className="block-chart">{renderChart({ chartType: 'bar', data: chart.data, keys: chart.keys, column: chart.column })}</div>
                )}

                {/* Streaming cursor */}
                {isStreaming && !complete && <span className="streaming-cursor" />}
              </div>
            </>
          )}

          {isUser && <div className="message-text">{content}</div>}
        </div>

        {/* Footer */}
        <div className={`message-footer ${showActions ? 'visible' : ''}`}>
          <div className="message-time">
            <Clock size={12} />
            <span>{new Date(message.created_at || Date.now()).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {isAssistant && !isStreaming && (
            <div className="message-actions">
              <button className={`action-btn ${feedback === MESSAGE_FEEDBACK.LIKED ? 'liked' : ''}`} onClick={() => handleFeedback(MESSAGE_FEEDBACK.LIKED)} title={t('helpful')}>
                <ThumbsUp size={14} />
              </button>
              <button className={`action-btn ${feedback === MESSAGE_FEEDBACK.DISLIKED ? 'disliked' : ''}`} onClick={() => handleFeedback(MESSAGE_FEEDBACK.DISLIKED)} title={t('notHelpful')}>
                <ThumbsDown size={14} />
              </button>
              <div className="action-divider" />
              <button className="action-btn" onClick={handleCopy} title={copied ? t('copied') : t('copy')}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
              <button className="action-btn" onClick={() => onResend?.(content)} title={t('regenerate')}>
                <RotateCcw size={14} />
              </button>
            </div>
          )}

          {isUser && onResend && (
            <div className="message-actions">
              <button className="action-btn" onClick={() => onResend?.(content)} title={t('resend')}>
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
