import React, { useState, useMemo } from 'react';
import { BarChart3, Check, Sparkles } from 'lucide-react';
import {
  ComposedChart, Bar, LineChart, Line, PieChart, Pie, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';
import ChartTypeSelector from './charts/ChartTypeSelector';
import { getChartRecommendation } from '../utils/chartRecommendation';
import './MessageItem.css';

const CHART_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function ChartBlock({ block }) {
  const [chartType, setChartType] = useState(block.chartType || 'bar');
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [acceptedRecommendation, setAcceptedRecommendation] = useState(false);

  const { data, keys, column = 'name' } = block;

  if (!data || data.length === 0) return null;

  const dataKeys = data[0] ? Object.keys(data[0]) : [];
  const safeColumn = dataKeys.includes(column) ? column : (dataKeys[0] || 'name');
  const safeKeys = keys || dataKeys.filter(k => k !== safeColumn);
  const commonProps = { data, margin: { top: 20, right: 30, left: 20, bottom: 5 } };

  // Smart recommendation
  const recommendation = useMemo(() => {
    return getChartRecommendation({ data, keys: safeKeys, column: safeColumn });
  }, [data, safeKeys, safeColumn]);

  const handleChartTypeChange = (type) => setChartType(type);
  const handleToggleRecommendation = () => setShowRecommendation(!showRecommendation);

  const chartTitles = {
    bar: '柱状图对比',
    line: '趋势分析',
    pie: '占比分布',
    area: '面积分析',
    radar: '雷达分析'
  };

  const renderBar = () => (
    <ComposedChart {...commonProps}>
      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
      <XAxis dataKey={safeColumn} tick={{ fontSize: 11 }} />
      <YAxis tick={{ fontSize: 11 }} />
      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid var(--border-light)' }} />
      <Legend />
      {safeKeys.map((key, idx) => (
        <Bar key={key} dataKey={key} fill={CHART_COLORS[idx % 6]} radius={[4, 4, 0, 0]} />
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
        <Line key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[idx % 6]} strokeWidth={2} dot={{ r: 4 }} />
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
          <Cell key={idx} fill={CHART_COLORS[idx % 6]} />
        ))}
      </Pie>
      <Tooltip formatter={(value) => [`${value}`, '数量']} />
      <Legend />
    </PieChart>
  );

  const renderArea = () => (
    <AreaChart {...commonProps}>
      <defs>
        {CHART_COLORS.map((color, idx) => (
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
        <Area key={key} type="monotone" dataKey={key} stroke={CHART_COLORS[idx % 6]} fill={`url(#gradient-${idx})`} />
      ))}
    </AreaChart>
  );

  return (
    <div className="structured-chart" data-testid="structured-chart">
      <div className="chart-header">
        <BarChart3 size={14} />
        <span>{chartTitles[chartType] || '数据图表'}</span>
        <ChartTypeSelector currentType={chartType} onChange={handleChartTypeChange} />
        {recommendation && !acceptedRecommendation && chartType === recommendation.type && (
          <div
            className="chart-recommendation-badge"
            onClick={handleToggleRecommendation}
            title="点击查看推荐原因"
          >
            <Sparkles size={12} className="recommendation-icon" />
            <span className="recommendation-text">推荐: {recommendation.chartName}</span>
          </div>
        )}
        {acceptedRecommendation && (
          <div className="chart-applied-indicator">
            <Check size={12} className="applied-icon" />
            <span>已应用智能推荐</span>
          </div>
        )}
        {showRecommendation && recommendation && (
          <div className="chart-recommendation-tooltip">
            <div className="tooltip-title">推荐: {recommendation.chartName}</div>
            <div className="tooltip-reason">{recommendation.reason}</div>
            <div className="tooltip-confidence">推荐可信度: {recommendation.confidence === 'high' ? '高' : recommendation.confidence === 'medium' ? '中' : '低'}</div>
          </div>
        )}
        <div className="chart-legend">
          {safeKeys.map((key, idx) => (
            <span key={key} className="legend-item">
              <span className="legend-dot" style={{ background: CHART_COLORS[idx % 6] }} />
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

export default ChartBlock;
