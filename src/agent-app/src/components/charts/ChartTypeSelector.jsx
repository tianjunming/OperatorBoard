import React from 'react';
import { BarChart3, LineChart, PieChart, AreaChart } from 'lucide-react';
import './ChartTypeSelector.css';

const CHART_TYPES = [
  { id: 'bar', icon: BarChart3, label: '柱状图' },
  { id: 'line', icon: LineChart, label: '折线图' },
  { id: 'pie', icon: PieChart, label: '饼图' },
  { id: 'area', icon: AreaChart, label: '面积图' },
];

function ChartTypeSelector({ currentType, onChange }) {
  return (
    <div className="chart-type-selector">
      {CHART_TYPES.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          className={`chart-type-btn ${currentType === id ? 'active' : ''}`}
          onClick={() => onChange(id)}
          title={label}
        >
          <Icon size={14} />
        </button>
      ))}
    </div>
  );
}

export default React.memo(ChartTypeSelector);
