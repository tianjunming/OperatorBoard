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
import { Signal } from 'lucide-react';
import ChartContainer from './ChartContainer';
import { CHART_COLORS } from '../../utils/dataTransformers';

function BandDistributionChart({ data, loading, error, title = '频段小区数量分布' }) {
  return (
    <ChartContainer title={title} loading={loading} error={error}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
          <YAxis />
          <Tooltip formatter={(value, name) => [value, name]} />
          <Legend />
          <Bar dataKey="4G小区" fill={CHART_COLORS[0]} stackId="a" />
          <Bar dataKey="5G小区" fill={CHART_COLORS[1]} stackId="a" />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

export default React.memo(BandDistributionChart);
