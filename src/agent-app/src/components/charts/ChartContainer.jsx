import React from 'react';
import { useI18n } from '../../i18n';

function ChartContainer({ title, loading, error, children, height = 280 }) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="chart-card">
        {title && <h3>{title}</h3>}
        <div className="chart-container" style={{ height }}>
          <div className="chart-skeleton" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-card">
        {title && <h3>{title}</h3>}
        <div className="chart-container" style={{ height }}>
          <div className="empty-state">
            <p>{t('error') || '加载失败'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      {title && <h3>{title}</h3>}
      <div className="chart-container" style={{ height }}>
        {children}
      </div>
    </div>
  );
}

export default React.memo(ChartContainer);
