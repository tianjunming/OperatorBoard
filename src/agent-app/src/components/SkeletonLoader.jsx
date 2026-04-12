/**
 * SkeletonLoader - 骨架屏组件
 * 用于流式数据加载时的渐进式展示
 */
import React from 'react';
import './SkeletonLoader.css';

/**
 * 骨架屏类型
 * @type {'chart' | 'table' | 'metrics' | 'text'}
 */
const SKELETON_TYPES = {
  CHART: 'chart',
  TABLE: 'table',
  METRICS: 'metrics',
  TEXT: 'text'
};

/**
 * SkeletonLoader 组件
 * @param {Object} props
 * @param {'chart' | 'table' | 'metrics' | 'text'} props.type - 骨架屏类型
 * @param {number} props.progress - 加载进度 (0-100)
 * @param {string} props.message - 加载消息
 */
function SkeletonLoader({ type = SKELETON_TYPES.TEXT, progress = 0, message = '' }) {
  const renderSkeleton = () => {
    switch (type) {
      case SKELETON_TYPES.CHART:
        return <ChartSkeleton progress={progress} message={message} />;
      case SKELETON_TYPES.TABLE:
        return <TableSkeleton progress={progress} message={message} />;
      case SKELETON_TYPES.METRICS:
        return <MetricsSkeleton progress={progress} message={message} />;
      case SKELETON_TYPES.TEXT:
      default:
        return <TextSkeleton progress={progress} message={message} />;
    }
  };

  return (
    <div className="skeleton-loader" data-testid="skeleton-loader">
      {renderSkeleton()}
    </div>
  );
}

/**
 * 文本骨架屏
 */
function TextSkeleton({ progress, message }) {
  return (
    <div className="skeleton-text">
      <div className="skeleton-line" style={{ width: '80%' }} />
      <div className="skeleton-line" style={{ width: '60%' }} />
      <div className="skeleton-line" style={{ width: '70%' }} />
      {progress > 0 && (
        <div className="skeleton-progress">
          <div className="skeleton-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
      {message && <div className="skeleton-message">{message}</div>}
    </div>
  );
}

/**
 * 图表骨架屏
 */
function ChartSkeleton({ progress, message }) {
  return (
    <div className="skeleton-chart">
      <div className="skeleton-chart-header">
        <div className="skeleton-line short" />
        <div className="skeleton-chart-types">
          <div className="skeleton-pill" />
          <div className="skeleton-pill" />
          <div className="skeleton-pill" />
        </div>
      </div>
      <div className="skeleton-chart-area">
        <div className="skeleton-bars">
          {[65, 80, 55, 90, 70, 85, 60, 75, 88, 72].map((h, i) => (
            <div key={i} className="skeleton-bar" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      {progress > 0 && (
        <div className="skeleton-progress">
          <div className="skeleton-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
      {message && <div className="skeleton-message">{message}</div>}
    </div>
  );
}

/**
 * 表格骨架屏
 */
function TableSkeleton({ progress, message }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        <div className="skeleton-cell header" />
        <div className="skeleton-cell header" />
        <div className="skeleton-cell header" />
        <div className="skeleton-cell header" />
      </div>
      {[1, 2, 3, 4, 5].map(row => (
        <div key={row} className="skeleton-table-row">
          <div className="skeleton-cell" style={{ width: `${60 + Math.random() * 30}%` }} />
          <div className="skeleton-cell" style={{ width: `${50 + Math.random() * 40}%` }} />
          <div className="skeleton-cell" style={{ width: `${40 + Math.random() * 50}%` }} />
          <div className="skeleton-cell" style={{ width: `${70 + Math.random() * 20}%` }} />
        </div>
      ))}
      {progress > 0 && (
        <div className="skeleton-progress">
          <div className="skeleton-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
      {message && <div className="skeleton-message">{message}</div>}
    </div>
  );
}

/**
 * 指标卡片骨架屏
 */
function MetricsSkeleton({ progress, message }) {
  return (
    <div className="skeleton-metrics">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="skeleton-metric-card">
          <div className="skeleton-metric-label" />
          <div className="skeleton-metric-value" />
          <div className="skeleton-metric-sparkline">
            <svg viewBox="0 0 100 30" preserveAspectRatio="none">
              <polyline
                points="0,25 15,20 30,22 45,15 60,18 75,10 90,12 100,5"
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2"
                opacity="0.3"
              />
            </svg>
          </div>
        </div>
      ))}
      {progress > 0 && (
        <div className="skeleton-progress">
          <div className="skeleton-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      )}
      {message && <div className="skeleton-message">{message}</div>}
    </div>
  );
}

export { SKELETON_TYPES };
export default SkeletonLoader;
