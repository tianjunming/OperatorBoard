import React, { useState, useCallback, useMemo, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Copy, Check, RotateCcw, ThumbsUp, ThumbsDown,
  User, Bot, AlertCircle, CheckCircle, AlertTriangle, Info,
  ChevronDown, ChevronUp, ChevronRight, MessageSquare, Database,
  BarChart3, Table2, Code2, Sparkles, Eye, EyeOff,
  Clock, ArrowRight, Search, Cpu, Loader2, Download, Filter, ArrowUp, ArrowDown, X,
  ChevronLeft, ChevronFirst, ChevronLast, Layers, MapPin
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

// Table Block Renderer (增强版 - 支持区域分组和分页)
function TableBlock({ block }) {
  const {
    sortedData,
    sortConfig,
    globalFilter,
    handleSort,
    handleGlobalFilter,
    exportCSV,
    filteredCount,
    totalCount
  } = useTableSort(block.data || [], block.columns || []);

  const [currentPage, setCurrentPage] = useState(1);
  const [activeRegion, setActiveRegion] = useState('全部');
  const [pageSize] = useState(10);

  // 检测是否有region列
  const regionColumn = useMemo(() => {
    const cols = block.columns || [];
    const regionPatterns = ['region', '区域', '地区', '省份', '城市'];
    return cols.find(col => regionPatterns.some(p => col.toLowerCase().includes(p.toLowerCase())));
  }, [block.columns]);

  // 获取所有区域
  const regions = useMemo(() => {
    if (!regionColumn) return ['全部'];
    const uniqueRegions = [...new Set((block.data || []).map(row => row[regionColumn]).filter(Boolean))];
    return ['全部', ...uniqueRegions];
  }, [block.data, regionColumn]);

  // 根据区域过滤数据
  const regionFilteredData = useMemo(() => {
    if (activeRegion === '全部' || !regionColumn) return filteredCount > 0 ? sortedData : [];
    return sortedData.filter(row => row[regionColumn] === activeRegion);
  }, [sortedData, activeRegion, regionColumn, filteredCount]);

  // 分页数据
  const totalPages = Math.ceil(regionFilteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return regionFilteredData.slice(start, start + pageSize);
  }, [regionFilteredData, currentPage, pageSize]);

  // 区域变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [activeRegion]);

  if (!block.data || block.data.length === 0) return null;

  // 计算区域统计
  const regionStats = useMemo(() => {
    if (!regionColumn) return null;
    const stats = {};
    (block.data || []).forEach(row => {
      const region = row[regionColumn] || '未知';
      if (!stats[region]) stats[region] = 0;
      stats[region]++;
    });
    return stats;
  }, [block.data, regionColumn]);

  return (
    <div className="structured-table" data-testid="structured-table">
      <div className="table-header">
        <Table2 size={14} />
        <span>数据表格</span>
        {regionColumn && (
          <div className="table-region-tabs">
            {regions.slice(0, 5).map(region => (
              <button
                key={region}
                className={`region-tab ${activeRegion === region ? 'active' : ''}`}
                onClick={() => setActiveRegion(region)}
              >
                {region}
                {regionStats && regionStats[region] && (
                  <span className="region-count">{regionStats[region]}</span>
                )}
              </button>
            ))}
            {regions.length > 5 && (
              <span className="region-more">+{regions.length - 5}</span>
            )}
          </div>
        )}
        <span className="table-count">{regionFilteredData.length} / {totalCount} 条</span>
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
            data-testid="table-filter-input"
          />
          {globalFilter && (
            <button className="table-filter-clear" onClick={() => handleGlobalFilter('')}>
              <X size={12} />
            </button>
          )}
        </div>
        <button className="table-export-btn" onClick={() => exportCSV()} data-testid="table-export-button">
          <Download size={12} />
          <span>导出</span>
        </button>
      </div>

      <div className="table-scroll">
        <table className="data-table" data-testid="data-table">
          <thead>
            <tr>
              {block.columns.map((col, idx) => (
                <th key={idx} onClick={() => handleSort(col)} data-testid={`table-header-${idx}`}>
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
          <tbody data-testid="table-body">
            {paginatedData.map((row, idx) => (
              <tr key={idx} data-testid={`table-row-${idx}`}>
                {block.columns.map((col, cidx) => (
                  <td key={cidx} data-testid={`table-cell-${idx}-${cidx}`}>{row[col]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页器 */}
      {totalPages > 1 && (
        <div className="table-pagination">
          <div className="pagination-info">
            <Layers size={12} />
            <span>第 {currentPage} / {totalPages} 页</span>
          </div>
          <div className="pagination-buttons">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
            >
              <ChevronFirst size={14} />
            </button>
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="pagination-current">
              {currentPage} / {totalPages}
            </span>
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={14} />
            </button>
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronLast size={14} />
            </button>
          </div>
        </div>
      )}

      {block.citations && block.citations.length > 0 && (
        <div className="citation-list" data-testid="citation-list">
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
}

// Toggle Block Renderer (defined outside component to ensure availability)
function RenderToggle({ block, blockIdx, viewMode, onToggleView }) {
  const { title = '站点数据', subtitle = '', summary = {}, table = {}, chart = {} } = block || {};
  const columns = table.columns || [];
  const tableData = table.data || [];
  const chartData = chart.data || [];
  const chartKeys = chart.keys || [];
  const chartColumn = chart.column || '月份';

  // Format numbers with thousand separators
  const formatNum = (n) => n?.toLocaleString() ?? '0';

  return (
    <div className="structured-toggle">
      <div className="toggle-header">
        <div className="toggle-title">
          <BarChart3 size={14} />
          <span>{title}</span>
          {subtitle && <span className="toggle-subtitle">({subtitle})</span>}
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

      {/* Summary Stats */}
      {summary.totalSite !== undefined && (
        <div className="toggle-summary">
          <div className="summary-item">
            <span className="summary-label">总站点</span>
            <span className="summary-value">{formatNum(summary.totalSite)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">总小区</span>
            <span className="summary-value">{formatNum(summary.totalCell)}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">频段数</span>
            <span className="summary-value">{formatNum(summary.bandCount)}</span>
          </div>
        </div>
      )}

      <div className="toggle-content">
        {viewMode === 'table' ? (
          <div className="structured-table">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    {columns.map((col, idx) => (
                      <th key={idx}>{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, idx) => (
                    <tr key={idx}>
                      {columns.map((col, cidx) => (
                        <td key={cidx}>
                          {typeof row[col] === 'number' ? row[col].toLocaleString() : row[col]}
                        </td>
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
              <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
                <XAxis dataKey={chartColumn} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border-light)' }} />
                <Legend />
                {chartKeys.map((key, idx) => (
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

// Chart Block Renderer (独立组件，封装图表状态)
function ChartBlock({ block }) {
  const [chartType, setChartType] = useState(block.chartType || 'bar');
  const { data, keys, column = 'name' } = block;
  const colors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

  if (!data || data.length === 0) return null;

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

  const renderPie = () => (
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

  const chartTitles = {
    bar: '柱状图对比',
    line: '趋势分析',
    pie: '占比分布',
    area: '面积分析',
    radar: '雷达分析'
  };

  return (
    <div className="structured-chart" data-testid="structured-chart">
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
      <ResponsiveContainer width="100%" height={300} data-testid="chart-container">
        {chartType === 'line' ? renderLine() :
         chartType === 'pie' ? renderPie() :
         chartType === 'area' ? renderArea() :
         renderBar()}
      </ResponsiveContainer>
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
                {mainBlocks.map((block, idx) => {
                  switch (block.type) {
                    case 'table': return <div key={idx} className="block-table"><TableBlock block={block} /></div>;
                    case 'chart': return <div key={idx} className="block-chart"><ChartBlock block={block} /></div>;
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
                  <div className="block-chart"><ChartBlock block={{ chartType: 'bar', data: chart.data, keys: chart.keys, column: chart.column }} /></div>
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
