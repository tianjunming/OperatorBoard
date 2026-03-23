import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Activity, TrendingUp, Wifi, Signal } from 'lucide-react';
import '../styles/Dashboard.css';

const OPERATORS = ['中国移动', '中国联通', '中国电信'];
const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function OperatorDashboard() {
  const [selectedOperator, setSelectedOperator] = useState('中国移动');
  const [latestIndicators, setLatestIndicators] = useState([]);
  const [compareData, setCompareData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Compare month state
  const [compareMonth, setCompareMonth] = useState('2026-02');
  const [currentMonth, setCurrentMonth] = useState('2026-03');

  useEffect(() => {
    fetchLatestData();
  }, [selectedOperator]);

  const fetchLatestData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/operator/indicators/latest?operatorName=${encodeURIComponent(selectedOperator)}&limit=20`
      );
      const data = await response.json();
      setLatestIndicators(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompareData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/operator/indicators/compare?operatorName=${encodeURIComponent(selectedOperator)}&currentMonth=${currentMonth}&compareMonth=${compareMonth}`
      );
      const data = await response.json();
      setCompareData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/operator/indicators/trend?operatorName=${encodeURIComponent(selectedOperator)}&startTime=2026-03-01T00:00:00&endTime=2026-03-23T23:59:59&limit=100`
      );
      const data = await response.json();
      setTrendData(data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data
  const preparePRBChartData = () => {
    return latestIndicators.slice(0, 10).map((item) => ({
      name: item.cell_id || item.cellName || 'Unknown',
      prb: parseFloat(item.prb_usage || item.prbUsage || 0),
      dl: parseFloat(item.dl_rate || item.dlRate || 0),
    }));
  };

  const prepareRateChartData = () => {
    return latestIndicators.slice(0, 8).map((item) => ({
      name: (item.cell_id || item.cellName || 'Unknown').substring(0, 10),
     下行速率: parseFloat(item.dl_rate || item.dlRate || 0),
     上行速率: parseFloat(item.ul_rate || item.ulRate || 0),
    }));
  };

  const prepareSplitRatioData = () => {
    const grouped = {};
    latestIndicators.forEach((item) => {
      const band = item.band || item.frequency_band || 'Unknown';
      if (!grouped[band]) {
        grouped[band] = { count: 0, splitRatio: 0 };
      }
      grouped[band].count++;
      grouped[band].splitRatio += parseFloat(item.split_ratio || item.splitRatio || 0);
    });
    return Object.entries(grouped).map(([band, data]) => ({
      name: band,
      value: parseFloat((data.splitRatio / data.count).toFixed(2)),
      count: data.count,
    }));
  };

  const prepareTrendChartData = () => {
    const grouped = {};
    trendData.forEach((item) => {
      const date = (item.data_time || item.dataTime || '').substring(0, 10);
      if (!grouped[date]) {
        grouped[date] = { date, dlRate: 0, ulRate: 0, prbUsage: 0, count: 0 };
      }
      grouped[date].dlRate += parseFloat(item.dl_rate || item.dlRate || 0);
      grouped[date].ulRate += parseFloat(item.ul_rate || item.ulRate || 0);
      grouped[date].prbUsage += parseFloat(item.prb_usage || item.prbUsage || 0);
      grouped[date].count++;
    });
    return Object.values(grouped)
      .map((g) => ({
        date: g.date,
       下行速率: parseFloat((g.dlRate / g.count).toFixed(2)),
       上行速率: parseFloat((g.ulRate / g.count).toFixed(2)),
        PRB利用率: parseFloat((g.prbUsage / g.count).toFixed(2)),
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const formatChange = (value) => {
    if (value === null || value === undefined) return '-';
    const num = parseFloat(value);
    const sign = num >= 0 ? '+' : '';
    return `${sign}${num.toFixed(1)}%`;
  };

  const getChangeClass = (value) => {
    if (value === null || value === undefined) return '';
    return parseFloat(value) >= 0 ? 'change-positive' : 'change-negative';
  };

  // Calculate summary metrics
  const calculateMetrics = () => {
    if (latestIndicators.length === 0) return null;
    const avgPRB = latestIndicators.reduce((sum, i) => sum + parseFloat(i.prb_usage || i.prbUsage || 0), 0) / latestIndicators.length;
    const avgDlRate = latestIndicators.reduce((sum, i) => sum + parseFloat(i.dl_rate || i.dlRate || 0), 0) / latestIndicators.length;
    const avgUlRate = latestIndicators.reduce((sum, i) => sum + parseFloat(i.ul_rate || i.ulRate || 0), 0) / latestIndicators.length;
    const avgSplitRatio = latestIndicators.reduce((sum, i) => sum + parseFloat(i.split_ratio || i.splitRatio || 0), 0) / latestIndicators.length;
    return { avgPRB, avgDlRate, avgUlRate, avgSplitRatio };
  };

  const metrics = calculateMetrics();

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>
          <Activity size={24} style={{ marginRight: 8, verticalAlign: 'middle' }} />
          运营商数据看板
        </h2>
        <select
          className="operator-select"
          value={selectedOperator}
          onChange={(e) => setSelectedOperator(e.target.value)}
        >
          {OPERATORS.map((op) => (
            <option key={op} value={op}>{op}</option>
          ))}
        </select>
      </div>

      {error && <div className="error">{error}</div>}

      {loading && latestIndicators.length === 0 ? (
        <div className="loading">加载中...</div>
      ) : (
        <>
          {/* Summary Metrics */}
          {metrics && (
            <div className="metrics-row">
              <div className="metric-card">
                <div className="label">平均PRB利用率</div>
                <div className="value">{metrics.avgPRB.toFixed(1)}%</div>
                <div className="sub">所有小区</div>
              </div>
              <div className="metric-card">
                <div className="label">平均下行速率</div>
                <div className="value">{metrics.avgDlRate.toFixed(1)}</div>
                <div className="sub">Mbps</div>
              </div>
              <div className="metric-card">
                <div className="label">平均上行速率</div>
                <div className="value">{metrics.avgUlRate.toFixed(1)}</div>
                <div className="sub">Mbps</div>
              </div>
              <div className="metric-card">
                <div className="label">平均分流比</div>
                <div className="value">{metrics.avgSplitRatio.toFixed(1)}%</div>
                <div className="sub">各频段</div>
              </div>
            </div>
          )}

          {/* Charts Row */}
          <div className="dashboard-grid">
            {/* PRB Utilization Chart */}
            <div className="chart-card">
              <h3>
                <Signal size={16} style={{ marginRight: 6 }} />
                小区PRB利用率 TOP10
              </h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={preparePRBChartData()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => [`${value}%`, 'PRB利用率']} />
                    <Bar dataKey="prb" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* DL/UL Rate Chart */}
            <div className="chart-card">
              <h3>
                <TrendingUp size={16} style={{ marginRight: 6 }} />
                上下行速率对比
              </h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepareRateChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [`${value} Mbps`, name === '下行速率' ? '下行' : '上行']} />
                    <Legend />
                    <Bar dataKey="下行速率" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="上行速率" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Split Ratio by Band */}
            <div className="chart-card">
              <h3>
                <Wifi size={16} style={{ marginRight: 6 }} />
                频段分流比分布
              </h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={prepareSplitRatioData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {prepareSplitRatioData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}%`, '分流比']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Compare Controls */}
          <div className="dashboard-controls">
            <div className="control-group">
              <label>当前月份</label>
              <input
                type="month"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
              />
            </div>
            <div className="control-group">
              <label>对比月份</label>
              <input
                type="month"
                value={compareMonth}
                onChange={(e) => setCompareMonth(e.target.value)}
              />
            </div>
            <div className="control-group" style={{ justifyContent: 'flex-end' }}>
              <label>&nbsp;</label>
              <button className="btn btn-primary" onClick={fetchCompareData} disabled={loading}>
                对比查询
              </button>
            </div>
            <div className="control-group" style={{ justifyContent: 'flex-end' }}>
              <label>&nbsp;</label>
              <button className="btn btn-primary" onClick={fetchTrendData} disabled={loading}>
                趋势查询
              </button>
            </div>
          </div>

          {/* Trend Chart */}
          {trendData.length > 0 && (
            <div className="chart-card" style={{ marginBottom: 24 }}>
              <h3>指标趋势</h3>
              <div className="chart-container" style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prepareTrendChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="下行速率" stroke="#10b981" strokeWidth={2} />
                    <Line yAxisId="left" type="monotone" dataKey="上行速率" stroke="#f59e0b" strokeWidth={2} />
                    <Line yAxisId="right" type="monotone" dataKey="PRB利用率" stroke="#4f46e5" strokeWidth={2} strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Compare Results */}
          {compareData && compareData.results && compareData.results.length > 0 && (
            <div className="data-table-card">
              <h3>月份对比结果 ({compareData.meta?.comparePeriod})</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>小区ID</th>
                    <th>频段</th>
                    <th>下行速率</th>
                    <th>变化</th>
                    <th>上行速率</th>
                    <th>变化</th>
                    <th>PRB利用率</th>
                    <th>变化</th>
                    <th>分流比</th>
                    <th>变化</th>
                  </tr>
                </thead>
                <tbody>
                  {compareData.results.map((item, index) => (
                    <tr key={index}>
                      <td>{item.cell_id || item.cellId}</td>
                      <td>{item.band || item.frequency_band}</td>
                      <td>{parseFloat(item.dl_rate || item.dlRate || 0).toFixed(2)} Mbps</td>
                      <td className={getChangeClass(item.dl_rate_change)}>
                        {formatChange(item.dl_rate_change)}
                      </td>
                      <td>{parseFloat(item.ul_rate || item.ulRate || 0).toFixed(2)} Mbps</td>
                      <td className={getChangeClass(item.ul_rate_change)}>
                        {formatChange(item.ul_rate_change)}
                      </td>
                      <td>{parseFloat(item.prb_usage || item.prbUsage || 0).toFixed(2)}%</td>
                      <td className={getChangeClass(item.prb_usage_change)}>
                        {formatChange(item.prb_usage_change)}
                      </td>
                      <td>{parseFloat(item.split_ratio || item.splitRatio || 0).toFixed(2)}%</td>
                      <td className={getChangeClass(item.split_ratio_change)}>
                        {formatChange(item.split_ratio_change)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Latest Data Table */}
          {latestIndicators.length > 0 && (
            <div className="data-table-card">
              <h3>最新指标数据</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>小区ID</th>
                    <th>小区名称</th>
                    <th>基站</th>
                    <th>频段</th>
                    <th>下行速率</th>
                    <th>上行速率</th>
                    <th>PRB利用率</th>
                    <th>分流比</th>
                    <th>主流比</th>
                    <th>数据时间</th>
                  </tr>
                </thead>
                <tbody>
                  {latestIndicators.map((item, index) => (
                    <tr key={index}>
                      <td>{item.cell_id || item.cellId}</td>
                      <td>{item.cell_name || item.cellName}</td>
                      <td>{item.site_name || item.siteName}</td>
                      <td>{item.band || item.frequency_band}</td>
                      <td>{parseFloat(item.dl_rate || item.dlRate || 0).toFixed(2)} Mbps</td>
                      <td>{parseFloat(item.ul_rate || item.ulRate || 0).toFixed(2)} Mbps</td>
                      <td>{parseFloat(item.prb_usage || item.prbUsage || 0).toFixed(2)}%</td>
                      <td>{parseFloat(item.split_ratio || item.splitRatio || 0).toFixed(2)}%</td>
                      <td>{parseFloat(item.main_ratio || item.mainRatio || 0).toFixed(2)}%</td>
                      <td>{item.data_time || item.dataTime}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
