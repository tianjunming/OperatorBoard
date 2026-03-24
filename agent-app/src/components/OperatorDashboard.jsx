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
import { Activity, TrendingUp, Wifi, Signal, Building2 } from 'lucide-react';
import '../styles/Dashboard.css';

const API_BASE = '/api';
const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function OperatorDashboard() {
  const [operators, setOperators] = useState([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState(null);
  const [siteCells, setSiteCells] = useState([]);
  const [latestIndicators, setLatestIndicators] = useState([]);
  const [historyIndicators, setHistoryIndicators] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentMonth, setCurrentMonth] = useState('2026-03');

  useEffect(() => {
    fetchOperators();
  }, []);

  useEffect(() => {
    if (selectedOperatorId) {
      fetchSiteCells(selectedOperatorId);
      fetchLatestIndicators(selectedOperatorId);
      fetchHistoryIndicators(selectedOperatorId, currentMonth);
    }
  }, [selectedOperatorId, currentMonth]);

  const fetchOperators = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/query/operators`);
      const data = await response.json();
      setOperators(data || []);
      if (data && data.length > 0) {
        setSelectedOperatorId(data[0].id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSiteCells = async (operatorId) => {
    try {
      const response = await fetch(`${API_BASE}/query/site-cells?operatorId=${operatorId}`);
      const data = await response.json();
      setSiteCells(data || []);
    } catch (err) {
      setSiteCells([]);
    }
  };

  const fetchLatestIndicators = async (operatorId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/query/indicators/latest?operatorId=${operatorId}`);
      const data = await response.json();
      setLatestIndicators(data || []);
    } catch (err) {
      setError(err.message);
      setLatestIndicators([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistoryIndicators = async (operatorId, dataMonth) => {
    try {
      const response = await fetch(`${API_BASE}/query/indicators/history?operatorId=${operatorId}&dataMonth=${dataMonth}`);
      const data = await response.json();
      setHistoryIndicators(data || []);
    } catch (err) {
      setHistoryIndicators([]);
    }
  };

  const getSelectedOperator = () => {
    return operators.find(op => op.id === selectedOperatorId);
  };

  // Prepare chart data for site cells by band
  const prepareBandCellData = () => {
    if (!siteCells.length) return [];
    return siteCells.map(item => ({
      name: item.frequencyBand || 'Unknown',
      '4G小区': item.cell4gCount || 0,
      '5G小区': item.cell5gCount || 0,
      '小区总数': item.cellTotal || 0,
    }));
  };

  // Prepare chart data for indicators by band
  const prepareIndicatorByBandData = () => {
    if (!latestIndicators.length) return [];
    return latestIndicators.map(item => ({
      name: item.frequencyBand || 'Unknown',
      '下行速率': parseFloat(item.dlRate || 0),
      '上行速率': parseFloat(item.ulRate || 0),
    }));
  };

  // Prepare PRB usage by band
  const preparePRBByBandData = () => {
    if (!latestIndicators.length) return [];
    return latestIndicators.map(item => ({
      name: item.frequencyBand || 'Unknown',
      '下行PRB': parseFloat(item.dlPrbUsage || 0),
      '上行PRB': parseFloat(item.ulPrbUsage || 0),
    }));
  };

  // Prepare pie chart for cell distribution
  const prepareCellDistributionData = () => {
    if (!siteCells.length) return [];
    return siteCells.map(item => ({
      name: item.frequencyBand || 'Unknown',
      value: item.cellTotal || 0,
    }));
  };

  // Calculate summary metrics
  const calculateMetrics = () => {
    if (!latestIndicators.length) return null;
    const avgDlPrb = latestIndicators.reduce((sum, i) => sum + parseFloat(i.dlPrbUsage || 0), 0) / latestIndicators.length;
    const avgUlPrb = latestIndicators.reduce((sum, i) => sum + parseFloat(i.ulPrbUsage || 0), 0) / latestIndicators.length;
    const avgDlRate = latestIndicators.reduce((sum, i) => sum + parseFloat(i.dlRate || 0), 0) / latestIndicators.length;
    const avgUlRate = latestIndicators.reduce((sum, i) => sum + parseFloat(i.ulRate || 0), 0) / latestIndicators.length;
    return { avgDlPrb, avgUlPrb, avgDlRate, avgUlRate };
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
          value={selectedOperatorId || ''}
          onChange={(e) => setSelectedOperatorId(Number(e.target.value))}
        >
          {operators.map((op) => (
            <option key={op.id} value={op.id}>
              {op.operatorName} ({op.country})
            </option>
          ))}
        </select>
      </div>

      {error && <div className="error">{error}</div>}

      {loading && operators.length === 0 ? (
        <div className="loading">加载中...</div>
      ) : (
        <>
          {/* Operator Info Card */}
          {getSelectedOperator() && (
            <div className="metrics-row">
              <div className="metric-card">
                <div className="label">运营商</div>
                <div className="value" style={{ fontSize: '1.2em' }}>{getSelectedOperator().operatorName}</div>
                <div className="sub">{getSelectedOperator().country} | {getSelectedOperator().region}</div>
              </div>
              <div className="metric-card">
                <div className="label">网络类型</div>
                <div className="value">{getSelectedOperator().networkType}</div>
                <div className="sub">数据月份: {getSelectedOperator().dataMonth}</div>
              </div>
              <div className="metric-card">
                <div className="label">频段数量</div>
                <div className="value">{siteCells.length}</div>
                <div className="sub">覆盖频段</div>
              </div>
              <div className="metric-card">
                <div className="label">小区总数</div>
                <div className="value">
                  {siteCells.reduce((sum, sc) => sum + (sc.cellTotal || 0), 0)}
                </div>
                <div className="sub">
                  4G: {siteCells.reduce((sum, sc) => sum + (sc.cell4gCount || 0), 0)} /
                  5G: {siteCells.reduce((sum, sc) => sum + (sc.cell5gCount || 0), 0)}
                </div>
              </div>
            </div>
          )}

          {/* Summary Metrics */}
          {metrics && (
            <div className="metrics-row">
              <div className="metric-card">
                <div className="label">平均下行PRB利用率</div>
                <div className="value">{metrics.avgDlPrb.toFixed(1)}%</div>
                <div className="sub">各频段平均</div>
              </div>
              <div className="metric-card">
                <div className="label">平均上行PRB利用率</div>
                <div className="value">{metrics.avgUlPrb.toFixed(1)}%</div>
                <div className="sub">各频段平均</div>
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
            </div>
          )}

          {/* Charts Row */}
          <div className="dashboard-grid">
            {/* Cell Count by Band */}
            <div className="chart-card">
              <h3>
                <Signal size={16} style={{ marginRight: 6 }} />
                频段小区数量分布
              </h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepareBandCellData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [value, name]} />
                    <Legend />
                    <Bar dataKey="4G小区" fill="#10b981" stackId="a" />
                    <Bar dataKey="5G小区" fill="#4f46e5" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* DL/UL Rate by Band */}
            <div className="chart-card">
              <h3>
                <TrendingUp size={16} style={{ marginRight: 6 }} />
                各频段速率对比
              </h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={prepareIndicatorByBandData()}>
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

            {/* Cell Distribution Pie */}
            <div className="chart-card">
              <h3>
                <Building2 size={16} style={{ marginRight: 6 }} />
                小区总数分布
              </h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={prepareCellDistributionData()}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {prepareCellDistributionData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, '小区数']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* PRB Usage by Band */}
            <div className="chart-card">
              <h3>
                <Wifi size={16} style={{ marginRight: 6 }} />
                PRB利用率对比
              </h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={preparePRBByBandData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value, name) => [`${value}%`, name === '下行PRB' ? '下行PRB' : '上行PRB']} />
                    <Legend />
                    <Bar dataKey="下行PRB" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="上行PRB" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Month Selector */}
          <div className="dashboard-controls">
            <div className="control-group">
              <label>数据月份</label>
              <input
                type="month"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
              />
            </div>
          </div>

          {/* Site Cell Summary Table */}
          {siteCells.length > 0 && (
            <div className="data-table-card">
              <h3>频段小区汇总</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>频段</th>
                    <th>EARFCN范围</th>
                    <th>4G小区</th>
                    <th>5G小区</th>
                    <th>小区总数</th>
                  </tr>
                </thead>
                <tbody>
                  {siteCells.map((item, index) => (
                    <tr key={index}>
                      <td>{item.frequencyBand}</td>
                      <td>{item.earfcnStart || '-'} - {item.earfcnEnd || '-'}</td>
                      <td>{item.cell4gCount || 0}</td>
                      <td>{item.cell5gCount || 0}</td>
                      <td>{item.cellTotal || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Latest Indicators Table */}
          {latestIndicators.length > 0 && (
            <div className="data-table-card">
              <h3>最新频段指标 (最新数据时间: {latestIndicators[0]?.createdTime || '-'})</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>频段</th>
                    <th>下行速率 (Mbps)</th>
                    <th>上行速率 (Mbps)</th>
                    <th>下行PRB利用率</th>
                    <th>上行PRB利用率</th>
                    <th>数据时间</th>
                  </tr>
                </thead>
                <tbody>
                  {latestIndicators.map((item, index) => (
                    <tr key={index}>
                      <td>{item.frequencyBand}</td>
                      <td>{parseFloat(item.dlRate || 0).toFixed(2)}</td>
                      <td>{parseFloat(item.ulRate || 0).toFixed(2)}</td>
                      <td>{parseFloat(item.dlPrbUsage || 0).toFixed(2)}%</td>
                      <td>{parseFloat(item.ulPrbUsage || 0).toFixed(2)}%</td>
                      <td>{item.createdTime || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Historical Indicators Table */}
          {historyIndicators.length > 0 && (
            <div className="data-table-card">
              <h3>{currentMonth} 历史频段指标</h3>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>频段</th>
                    <th>下行速率 (Mbps)</th>
                    <th>上行速率 (Mbps)</th>
                    <th>下行PRB利用率</th>
                    <th>上行PRB利用率</th>
                    <th>数据时间</th>
                  </tr>
                </thead>
                <tbody>
                  {historyIndicators.map((item, index) => (
                    <tr key={index}>
                      <td>{item.frequencyBand}</td>
                      <td>{parseFloat(item.dlRate || 0).toFixed(2)}</td>
                      <td>{parseFloat(item.ulRate || 0).toFixed(2)}</td>
                      <td>{parseFloat(item.dlPrbUsage || 0).toFixed(2)}%</td>
                      <td>{parseFloat(item.ulPrbUsage || 0).toFixed(2)}%</td>
                      <td>{item.createdTime || '-'}</td>
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
