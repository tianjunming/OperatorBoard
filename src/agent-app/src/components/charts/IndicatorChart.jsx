import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import ChartContainer from './ChartContainer';
import { CHART_COLORS } from '../../utils/dataTransformers';

function IndicatorChart({
  data,
  loading,
  error,
  title = '各频段速率对比',
  dataKeys = ['下行速率', '上行速率'],
  colors = [CHART_COLORS[0], CHART_COLORS[2]]
}) {
  return (
    <ChartContainer title={title} loading={loading} error={error}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis />
          <Tooltip formatter={(value, name) => [`${value} Mbps`, name === '下行速率' ? '下行' : '上行']} />
          <Legend />
          {dataKeys.map((key, idx) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[idx] || CHART_COLORS[0]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export default React.memo(IndicatorChart);
