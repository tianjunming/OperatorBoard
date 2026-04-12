import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  Activity, TrendingUp, Wifi, Signal, Building2,
  Users, Globe, Network, RefreshCw, Download, Filter,
  ChevronDown, ChevronUp, ArrowUp, ArrowDown
} from 'lucide-react';
import { useI18n } from '../i18n';
import {
  BANDS, CHART_COLORS,
  transformBandCellData,
  transformIndicatorData,
  transformPRBData,
  aggregateCellDistribution,
  calculateTotals
} from '../utils/dataTransformers';
import '../styles/Dashboard.css';

const API_BASE = '/api';

export default function OperatorDashboard() {
  const { t } = useI18n();
  const dashboardRef = useRef(null);

  // Loading states
  const [loadingOperators, setLoadingOperators] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [selectedOperatorId, setSelectedOperatorId] = useState(null);
  const [currentMonth, setCurrentMonth] = useState('2026-03');
  const [showComparison, setShowComparison] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    overview: true,
    charts: true,
    tables: true
  });

  // Data states
  const [operators, setOperators] = useState([]);
  const [allOperatorsData, setAllOperatorsData] = useState({});
  const [selectedOperatorData, setSelectedOperatorData] = useState(null);
  const [error, setError] = useState(null);

  const isLoading = loadingOperators || loadingData;

  // Fetch all operators on mount
  useEffect(() => {
    fetchOperators();
  }, []);

  // Fetch data when selection or month changes
  useEffect(() => {
    if (selectedOperatorId) {
      fetchAllOperatorsData();
    }
  }, [selectedOperatorId, currentMonth]);

  const fetchOperators = async () => {
    setLoadingOperators(true);
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
      setLoadingOperators(false);
    }
  };

  const fetchAllOperatorsData = async () => {
    setLoadingData(true);
    const dataMap = {};
    try {
      // Fetch data for all operators in parallel
      const promises = operators.map(async (op) => {
        try {
          const [siteCellsRes, indicatorsRes] = await Promise.all([
            fetch(`${API_BASE}/query/site-cells?operatorId=${op.id}`),
            fetch(`${API_BASE}/query/indicators/latest?operatorId=${op.id}`)
          ]);
          const siteCells = await siteCellsRes.json();
          const indicators = await indicatorsRes.json();
          return { id: op.id, siteCells: siteCells || [], indicators: indicators || [] };
        } catch {
          return { id: op.id, siteCells: [], indicators: [] };
        }
      });

      const results = await Promise.all(promises);
      results.forEach(r => { dataMap[r.id] = r; });
      setAllOperatorsData(dataMap);

      // Set selected operator data
      if (dataMap[selectedOperatorId]) {
        setSelectedOperatorData(dataMap[selectedOperatorId]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingData(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Get current operator info
  const selectedOperator = useMemo(() =>
    operators.find(op => op.id === selectedOperatorId),
    [operators, selectedOperatorId]
  );

  // Transform data for current operator
  const siteCells = selectedOperatorData?.siteCells || [];
  const latestIndicators = selectedOperatorData?.indicators || [];
  const bandCellData = useMemo(() => transformBandCellData(siteCells), [siteCells]);
  const indicatorByBandData = useMemo(() => transformIndicatorData(latestIndicators), [latestIndicators]);
  const prbByBandData = useMemo(() => transformPRBData(latestIndicators), [latestIndicators]);
  const cellDistributionData = useMemo(() => aggregateCellDistribution(bandCellData), [bandCellData]);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!latestIndicators.length) return null;
    const item = latestIndicators[0];
    const avgDlPrb = parseFloat(item.lteAvgDlPrb || item.nrAvgDlPrb || 0);
    const avgUlPrb = parseFloat(item.lteAvgUlPrb || item.nrAvgUlPrb || avgDlPrb * 1.1);
    const avgDlRate = parseFloat(item.lteAvgDlRate || item.nrAvgDlRate || 0);
    const avgUlRate = parseFloat(item.lteAvgUlRate || item.nrAvgUlRate || avgDlRate * 0.2);
    return { avgDlPrb, avgUlPrb, avgDlRate, avgUlRate };
  }, [latestIndicators]);

  // Calculate site/cell totals
  const totals = useMemo(() => calculateTotals(siteCells), [siteCells]);

  // Operator summary for comparison
  const operatorSummaries = useMemo(() => {
    return operators.map(op => {
      const data = allOperatorsData[op.id];
      if (!data) return { ...op, totalSites: 0, totalCells: 0, avgDlRate: 0 };
      const cells = data.siteCells || [];
      const indicators = data.indicators || [];
      const opTotals = calculateTotals(cells);
      const avgDlRate = indicators[0]?.lteAvgDlRate || indicators[0]?.nrAvgDlRate || 0;
      return { ...op, totalSites: opTotals.totalSite, totalCells: opTotals.totalCell, avgDlRate: parseFloat(avgDlRate) || 0 };
    });
  }, [operators, allOperatorsData]);

  // Indicator table data
  const indicatorTableData = useMemo(() => {
    if (!latestIndicators.length) return [];
    const result = [];
    const item = latestIndicators[0];
    for (const band of BANDS) {
      const dlRate = item[`lte${band}DlRate`] || item[`nr${band}DlRate`] || 0;
      const ulRate = item[`lte${band}UlRate`] || item[`nr${band}UlRate`] || 0;
      const dlPrb = item[`lte${band}DlPrb`] || item[`nr${band}DlPrb`] || 0;
      const ulPrb = item[`lte${band}UlPrb`] || item[`nr${band}UlPrb`] || 0;
      if (dlRate > 0 || ulRate > 0) {
        result.push({ band, dlRate, ulRate, dlPrb, ulPrb, createdTime: item.createdTime });
      }
    }
    return result;
  }, [latestIndicators]);

  // All operators comparison data
  const comparisonData = useMemo(() => {
    return operatorSummaries.map(op => ({
      name: op.operatorName,
      站点数: op.totalSites,
      小区数: op.totalCells,
      平均速率: op.avgDlRate
    }));
  }, [operatorSummaries]);

  const SectionHeader = ({ title, icon: Icon, section }) => (
    <div className="section-header" onClick={() => toggleSection(section)}>
      <div className="section-title">
        <Icon size={18} />
        <span>{title}</span>
      </div>
      <button className="section-toggle">
        {expandedSections[section] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
    </div>
  );

  return (
    <div className="dashboard" ref={dashboardRef}>
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h2>
            <Activity size={24} className="header-icon" />
            {t('dashboard') || '运营商数据看板'}
          </h2>
          <p className="dashboard-subtitle">实时监控运营商网络性能与覆盖情况</p>
        </div>
        <div className="dashboard-actions">
          <button
            className={`btn btn-outline ${showComparison ? 'active' : ''}`}
            onClick={() => setShowComparison(!showComparison)}
          >
            <Globe size={16} />
            {showComparison ? '单运营商' : '多运营商对比'}
          </button>
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
          <div className="control-group">
            <input
              type="month"
              value={currentMonth}
              min="2020-01"
              max="2030-12"
              onChange={(e) => setCurrentMonth(e.target.value)}
              className="month-input"
              aria-label="选择月份"
            />
          </div>
          <button className="btn btn-icon" onClick={fetchAllOperatorsData} title="刷新数据">
            <RefreshCw size={16} className={loadingData ? 'spin' : ''} />
          </button>
        </div>
      </div>

      {error && <div className="error-banner">
        <span>⚠️ {error}</span>
        <button onClick={() => setError(null)}>×</button>
      </div>}

      {loadingOperators ? (
        <div className="loading-container">
          <div className="spinner" />
          <p>{t('loading') || '加载中...'}</p>
        </div>
      ) : (
        <>
          {/* Multi-operator Comparison View */}
          {showComparison && (
            <div className="comparison-section">
              <SectionHeader title="多运营商对比" icon={Globe} section="comparison" />
              {expandedSections.comparison && (
                <div className="comparison-grid">
                  <div className="comparison-card">
                    <h4>运营商概览</h4>
                    <div className="comparison-bars">
                      {operatorSummaries.map((op, idx) => (
                        <div key={op.id} className="comparison-bar-item">
                          <div className="bar-label">
                            <span className="operator-name">{op.operatorName}</span>
                            <span className="bar-value">{op.totalCells} 小区</span>
                          </div>
                          <div className="bar-track">
                            <div
                              className="bar-fill"
                              style={{
                                width: `${Math.min(100, (op.totalCells / Math.max(...operatorSummaries.map(o => o.totalCells || 1))) * 100)}%`,
                                background: CHART_COLORS[idx % CHART_COLORS.length]
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="comparison-card">
                    <h4>小区数量分布</h4>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                          <Tooltip formatter={(value, name) => [value, name]} />
                          <Bar dataKey="小区数" fill={CHART_COLORS[0]} radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="comparison-card">
                    <h4>平均下行速率</h4>
                    <div className="chart-container">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={comparisonData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                          <YAxis />
                          <Tooltip formatter={(value, name) => [`${value} Mbps`, '平均速率']} />
                          <Bar dataKey="平均速率" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Overview Section */}
          <div className="dashboard-section">
            <SectionHeader title="数据概览" icon={Activity} section="overview" />
            {expandedSections.overview && (
              <div className="metrics-grid">
                {/* Operator Info */}
                <div className="metric-card highlight">
                  <div className="metric-icon">
                    <Building2 size={24} />
                  </div>
                  <div className="metric-content">
                    <div className="metric-label">{t('operator') || '运营商'}</div>
                    <div className="metric-value">{selectedOperator?.operatorName || '-'}</div>
                    <div className="metric-sub">{selectedOperator?.country} | {selectedOperator?.region}</div>
                  </div>
                </div>

                {/* Network Type */}
                <div className="metric-card">
                  <div className="metric-icon">
                    <Network size={24} />
                  </div>
                  <div className="metric-content">
                    <div className="metric-label">网络类型</div>
                    <div className="metric-value">{selectedOperator?.networkType || '-'}</div>
                    <div className="metric-sub">当前网络制式</div>
                  </div>
                </div>

                {/* Sites Count */}
                <div className="metric-card">
                  <div className="metric-icon">
                    <Signal size={24} />
                  </div>
                  <div className="metric-content">
                    <div className="metric-label">站点总数</div>
                    <div className="metric-value">{totals.totalSite || '--'}</div>
                    <div className="metric-sub">
                      <span className="badge lte">4G: {totals.lteTotalSite || '--'}</span>
                      <span className="badge nr">5G: {totals.nrTotalSite || '--'}</span>
                    </div>
                  </div>
                </div>

                {/* Cells Count */}
                <div className="metric-card">
                  <div className="metric-icon">
                    <Wifi size={24} />
                  </div>
                  <div className="metric-content">
                    <div className="metric-label">小区总数</div>
                    <div className="metric-value">{totals.totalCell || '--'}</div>
                    <div className="metric-sub">
                      <span className="badge lte">4G: {totals.lteTotalCell || '--'}</span>
                      <span className="badge nr">5G: {totals.nrTotalCell || '--'}</span>
                    </div>
                  </div>
                </div>

                {/* PRB Metrics */}
                {metrics && (
                  <>
                    <div className="metric-card">
                      <div className="metric-icon warning">
                        <ArrowDown size={24} />
                      </div>
                      <div className="metric-content">
                        <div className="metric-label">下行 PRB 利用率</div>
                        <div className="metric-value">{metrics.avgDlPrb.toFixed(1)}%</div>
                        <div className="metric-sub">
                          <span className={`trend ${metrics.avgDlPrb > 70 ? 'danger' : metrics.avgDlPrb > 50 ? 'warning' : 'success'}`}>
                            {metrics.avgDlPrb > 70 ? '⚠️ 高' : metrics.avgDlPrb > 50 ? '适中' : '正常'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-icon">
                        <ArrowUp size={24} />
                      </div>
                      <div className="metric-content">
                        <div className="metric-label">上行 PRB 利用率</div>
                        <div className="metric-value">{metrics.avgUlPrb.toFixed(1)}%</div>
                        <div className="metric-sub">各频段平均</div>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-icon success">
                        <TrendingUp size={24} />
                      </div>
                      <div className="metric-content">
                        <div className="metric-label">平均下行速率</div>
                        <div className="metric-value">{metrics.avgDlRate.toFixed(1)} <span className="unit">Mbps</span></div>
                        <div className="metric-sub">各频段平均</div>
                      </div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-icon">
                        <TrendingUp size={24} />
                      </div>
                      <div className="metric-content">
                        <div className="metric-label">平均上行速率</div>
                        <div className="metric-value">{metrics.avgUlRate.toFixed(1)} <span className="unit">Mbps</span></div>
                        <div className="metric-sub">各频段平均</div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Charts Section */}
          <div className="dashboard-section">
            <SectionHeader title="数据分析" icon={TrendingUp} section="charts" />
            {expandedSections.charts && (
              <div className="dashboard-grid">
                {/* Cell Distribution Pie */}
                <div className="chart-card">
                  <h3><Building2 size={16} /> 小区总数分布</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={cellDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {cellDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value, '小区数']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Cell Count by Band */}
                <div className="chart-card span-2">
                  <h3><Signal size={16} /> 频段小区数量分布</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={bandCellData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip formatter={(value, name) => [value, name]} />
                        <Legend />
                        <Bar dataKey="4G小区" fill={CHART_COLORS[0]} stackId="a" />
                        <Bar dataKey="5G小区" fill={CHART_COLORS[1]} stackId="a" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* DL/UL Rate */}
                <div className="chart-card span-2">
                  <h3><TrendingUp size={16} /> 各频段速率对比</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={indicatorByBandData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip formatter={(value, name) => [`${value} Mbps`, name]} />
                        <Legend />
                        <Bar dataKey="下行速率" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="上行速率" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* PRB Usage */}
                <div className="chart-card span-2">
                  <h3><Wifi size={16} /> PRB利用率对比</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={prbByBandData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                        <Legend />
                        <Bar dataKey="下行PRB" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                        <Bar dataKey="上行PRB" fill={CHART_COLORS[3]} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tables Section */}
          <div className="dashboard-section">
            <SectionHeader title="详细数据" icon={Network} section="tables" />
            {expandedSections.tables && (
              <div className="tables-container">
                {/* Band Cell Summary */}
                {bandCellData.length > 0 && (
                  <div className="data-table-card">
                    <h3>📡 频段小区汇总</h3>
                    <div className="table-scroll">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>频段</th>
                            <th>4G站点</th>
                            <th>5G站点</th>
                            <th>4G小区</th>
                            <th>5G小区</th>
                            <th>小区总数</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bandCellData.map((item, idx) => (
                            <tr key={idx}>
                              <td><span className="band-tag">{item.name}</span></td>
                              <td>{item['4G站点'] || 0}</td>
                              <td>{item['5G站点'] || 0}</td>
                              <td>{item['4G小区'] || 0}</td>
                              <td>{item['5G小区'] || 0}</td>
                              <td className="highlight">{item['小区总数'] || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Indicators Table */}
                {indicatorTableData.length > 0 && (
                  <div className="data-table-card">
                    <h3>📊 最新频段指标 <span className="time-badge">数据时间: {latestIndicators[0]?.createdTime || '-'}</span></h3>
                    <div className="table-scroll">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>频段</th>
                            <th>下行速率 (Mbps)</th>
                            <th>上行速率 (Mbps)</th>
                            <th>下行PRB利用率</th>
                            <th>上行PRB利用率</th>
                          </tr>
                        </thead>
                        <tbody>
                          {indicatorTableData.map((row, idx) => (
                            <tr key={idx}>
                              <td><span className="band-tag">{row.band}</span></td>
                              <td>{row.dlRate.toFixed(2)}</td>
                              <td>{row.ulRate.toFixed(2)}</td>
                              <td>
                                <div className="prb-bar-container">
                                  <div className="prb-bar" style={{ width: `${Math.min(100, row.dlPrb)}%` }} />
                                  <span>{row.dlPrb.toFixed(2)}%</span>
                                </div>
                              </td>
                              <td>
                                <div className="prb-bar-container">
                                  <div className="prb-bar ul" style={{ width: `${Math.min(100, row.ulPrb)}%` }} />
                                  <span>{row.ulPrb.toFixed(2)}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
