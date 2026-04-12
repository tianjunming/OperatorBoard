/**
 * KpiCard - 增强版KPI卡片组件（带Sparkline迷你趋势图）
 */
import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Minus, ChevronUp, ChevronDown } from 'lucide-react';
import './KpiCard.css';

/**
 * KpiCard 组件
 * @param {Object} props
 * @param {string} props.title - KPI标题
 * @param {number|string} props.value - KPI值
 * @param {string} props.unit - 单位（如 Mbps, %）
 * @param {'up'|'down'|'stable'} props.trend - 趋势方向
 * @param {string} props.trendValue - 趋势变化值（如 +5.2%）
 * @param {Array<number>} props.sparklineData - Sparkline数据点
 * @param {string} props.sparklineColor - Sparkline颜色
 * @param {Function} props.onClick - 点击事件
 */
function KpiCard({
  title,
  value,
  unit = '',
  trend = 'stable',
  trendValue = '',
  sparklineData = [],
  sparklineColor = '#10b981',
  onClick
}) {
  // 转换sparkline数据为图表格式
  const chartData = useMemo(() => {
    if (!sparklineData || sparklineData.length === 0) return [];
    return sparklineData.map((v, i) => ({ index: i, value: v }));
  }, [sparklineData]);

  // 获取趋势图标和颜色
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp size={14} />;
      case 'down':
        return <TrendingDown size={14} />;
      default:
        return <Minus size={14} />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'var(--color-success)';
      case 'down':
        return 'var(--color-error)';
      default:
        return 'var(--text-tertiary)';
    }
  };

  // 格式化数值
  const formatValue = (val) => {
    if (typeof val === 'number') {
      return val.toLocaleString('zh-CN', { maximumFractionDigits: 2 });
    }
    return val;
  };

  return (
    <div className="kpi-card" onClick={onClick} role="button" tabIndex={0}>
      <div className="kpi-header">
        <span className="kpi-title">{title}</span>
        {trendValue && (
          <span className="kpi-trend" style={{ color: getTrendColor() }}>
            {getTrendIcon()}
            <span>{trendValue}</span>
          </span>
        )}
      </div>

      <div className="kpi-body">
        <div className="kpi-value-row">
          <span className="kpi-value">{formatValue(value)}</span>
          {unit && <span className="kpi-unit">{unit}</span>}
        </div>

        {/* Sparkline迷你趋势图 */}
        {chartData.length > 1 && (
          <div className="kpi-sparkline">
            <ResponsiveContainer width="100%" height={40}>
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`sparklineGradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={sparklineColor} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={sparklineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={sparklineColor}
                  strokeWidth={2}
                  fill={`url(#sparklineGradient-${title})`}
                  dot={false}
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {onClick && (
        <div className="kpi-footer">
          <span className="kpi-expand-hint">
            <ChevronDown size={12} />
            <span>点击查看详情</span>
          </span>
        </div>
      )}
    </div>
  );
}

export default React.memo(KpiCard);
