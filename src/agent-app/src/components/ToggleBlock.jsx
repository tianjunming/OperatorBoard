import React, { useMemo } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import './MessageItem.css';

const CHART_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function ToggleBlock({ block, blockIdx, viewMode, onToggleView }) {
  const { title = '站点数据', subtitle = '', summary = {}, table = {}, chart = {} } = block || {};
  const columns = table.columns || [];
  const tableData = table.data || [];
  const chartData = chart.data || [];
  const chartKeys = chart.keys || [];
  const chartColumn = chart.column || '月份';

  // Format numbers with thousand separators
  const formatNum = (n) => n?.toLocaleString() ?? '0';

  const handleTableClick = () => onToggleView(blockIdx);
  const handleChartClick = () => onToggleView(blockIdx);

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
            onClick={handleTableClick}
          >
            <Table2 size={14} />
            <span>表格</span>
          </button>
          <button
            className={`toggle-btn ${viewMode === 'chart' ? 'active' : ''}`}
            onClick={handleChartClick}
          >
            <BarChart3 size={14} />
            <span>图表</span>
          </button>
        </div>
      </div>

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
                    fill={CHART_COLORS[idx % 6]}
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

export default ToggleBlock;
