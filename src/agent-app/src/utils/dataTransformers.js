// Frequency bands used in telecom operator data
// 注意: 2300M 只有 NR, 4900M 只有 NR
export const BANDS = ['700M', '800M', '900M', '1400M', '1800M', '2100M', '2600M', '3500M', '4900M', '2300M'];

// Chart colors for consistent styling
export const CHART_COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

/**
 * Transform site cells data into band-based chart data
 * @param {Array} siteCells - Raw site cells data from API
 * @returns {Array} Transformed data for charts
 */
export function transformBandCellData(siteCells) {
  if (!siteCells?.length) return [];

  // Find the latest month data
  const latestData = siteCells.reduce((latest, item) => {
    if (!latest || item.dataMonth > latest.dataMonth) {
      return item;
    }
    return latest;
  }, null);

  if (!latestData) return [];

  const result = [];

  for (const band of BANDS) {
    // API fields are like lte700MSite, nr800MCell - keep the M in the key
    const lteSites = latestData[`lte${band}Site`] || 0;
    const lteCells = latestData[`lte${band}Cell`] || 0;
    const nrSites = latestData[`nr${band}Site`] || 0;
    const nrCells = latestData[`nr${band}Cell`] || 0;

    if (lteSites > 0 || nrSites > 0 || lteCells > 0 || nrCells > 0) {
      result.push({
        name: band,
        '4G站点': lteSites,
        '5G站点': nrSites,
        '4G小区': lteCells,
        '5G小区': nrCells,
        '站点总数': lteSites + nrSites,
        '小区总数': lteCells + nrCells,
      });
    }
  }
  return result;
}

/**
 * Calculate total sites and cells from raw site cells data
 * @param {Array} siteCells - Raw site cells data from API
 * @returns {Object} { lteTotalSite, nrTotalSite, totalSite, lteTotalCell, nrTotalCell, totalCell }
 */
export function calculateTotals(siteCells) {
  if (!siteCells?.length) return { lteTotalSite: 0, nrTotalSite: 0, totalSite: 0, lteTotalCell: 0, nrTotalCell: 0, totalCell: 0 };

  // Find the latest month data
  const latestData = siteCells.reduce((latest, item) => {
    if (!latest || item.dataMonth > latest.dataMonth) {
      return item;
    }
    return latest;
  }, null);

  if (!latestData) return { lteTotalSite: 0, nrTotalSite: 0, totalSite: 0, lteTotalCell: 0, nrTotalCell: 0, totalCell: 0 };

  let lteTotalSite = 0;
  let nrTotalSite = 0;
  let lteTotalCell = 0;
  let nrTotalCell = 0;

  for (const band of BANDS) {
    lteTotalSite += latestData[`lte${band}Site`] || 0;
    lteTotalCell += latestData[`lte${band}Cell`] || 0;
    nrTotalSite += latestData[`nr${band}Site`] || 0;
    nrTotalCell += latestData[`nr${band}Cell`] || 0;
  }

  return {
    lteTotalSite,
    nrTotalSite,
    totalSite: lteTotalSite + nrTotalSite,
    lteTotalCell,
    nrTotalCell,
    totalCell: lteTotalCell + nrTotalCell,
  };
}

/**
 * Transform indicator data into rate comparison chart data
 * @param {Array} indicators - Raw indicator data from API
 * @returns {Array} Transformed data for rate charts
 */
export function transformIndicatorData(indicators) {
  if (!indicators?.length) return [];

  // Find the latest month data
  const latestData = indicators.reduce((latest, item) => {
    if (!latest || item.dataMonth > latest.dataMonth) {
      return item;
    }
    return latest;
  }, null);

  if (!latestData) return [];

  const result = [];

  for (const band of BANDS) {
    // API fields are like lte700MDlRate, nr800MUlRate
    const dlRate = latestData[`lte${band}DlRate`] || latestData[`nr${band}DlRate`] || 0;
    const ulRate = latestData[`lte${band}UlRate`] || latestData[`nr${band}UlRate`] || 0;

    if (dlRate > 0 || ulRate > 0) {
      result.push({
        name: band,
        '下行速率': parseFloat(dlRate) || 0,
        '上行速率': parseFloat(ulRate) || 0,
      });
    }
  }
  return result;
}

/**
 * Transform indicator data into PRB usage chart data
 * @param {Array} indicators - Raw indicator data from API
 * @returns {Array} Transformed data for PRB charts
 */
export function transformPRBData(indicators) {
  if (!indicators?.length) return [];

  // Find the latest month data
  const latestData = indicators.reduce((latest, item) => {
    if (!latest || item.dataMonth > latest.dataMonth) {
      return item;
    }
    return latest;
  }, null);

  if (!latestData) return [];

  const result = [];

  for (const band of BANDS) {
    // API fields are like lte700MDlPrb, nr800MUlPrb
    const dlPrb = latestData[`lte${band}DlPrb`] || latestData[`nr${band}DlPrb`] || 0;
    const ulPrb = latestData[`lte${band}UlPrb`] || latestData[`nr${band}UlPrb`] || 0;

    if (dlPrb > 0 || ulPrb > 0) {
      result.push({
        name: band,
        '下行PRB': parseFloat(dlPrb) || 0,
        '上行PRB': parseFloat(ulPrb) || 0,
      });
    }
  }
  return result;
}

/**
 * Aggregate cell distribution data for pie chart
 * @param {Array} bandCellData - Data from transformBandCellData
 * @returns {Array} Aggregated data for pie chart
 */
export function aggregateCellDistribution(bandCellData) {
  if (!bandCellData?.length) return [];

  const aggregated = {};
  for (const item of bandCellData) {
    if (aggregated[item.name]) {
      aggregated[item.name] += item['小区总数'];
    } else {
      aggregated[item.name] = item['小区总数'];
    }
  }
  return Object.entries(aggregated).map(([name, value]) => ({ name, value }));
}

// ==================== V2 Summary Table Transformers ====================
// These transformers handle the new site_summary and indicator_summary tables
// which use camelCase field names (e.g., lte700MSite, nr800MDlPrb)

/**
 * Transform site summary data (from V2 site_summary table)
 * @param {Array} siteSummaries - Raw site summary data from API
 * @param {string} operatorName - Optional operator name to filter
 * @returns {Object} { latest: {...}, history: [...], operators: [...] }
 */
export function transformSiteSummaryData(siteSummaries, operatorName = null) {
  if (!siteSummaries?.length) return { latest: null, history: [], operators: [] };

  // Filter by operator name if provided
  let filtered = siteSummaries;
  if (operatorName) {
    filtered = siteSummaries.filter(s => s.operatorName === operatorName || s.operator_id === operatorName);
  }

  // Get latest month data for each operator
  const latestByOperator = {};
  const historyByOperator = {};

  for (const item of filtered) {
    const opId = item.operatorId || item.operator_id;
    if (!latestByOperator[opId] || item.dataMonth > latestByOperator[opId].dataMonth) {
      latestByOperator[opId] = item;
    }
    if (!historyByOperator[opId]) {
      historyByOperator[opId] = [];
    }
    historyByOperator[opId].push(item);
  }

  // Sort history by month descending
  Object.values(historyByOperator).forEach(history => {
    history.sort((a, b) => b.dataMonth.localeCompare(a.dataMonth));
  });

  return {
    latest: Object.values(latestByOperator),
    history: historyByOperator,
    operators: Object.keys(latestByOperator).map(opId => ({
      operatorId: parseInt(opId, 10),
      operatorName: latestByOperator[opId].operatorName || latestByOperator[opId].operator_name,
      dataMonth: latestByOperator[opId].dataMonth,
      // Summary totals
      lteTotalSite: latestByOperator[opId].lteTotalSite || latestByOperator[opId].lte_total_site || 0,
      nrTotalSite: latestByOperator[opId].nrTotalSite || latestByOperator[opId].nr_total_site || 0,
      totalSite: latestByOperator[opId].totalSite || latestByOperator[opId].total_site || 0,
      lteTotalCell: latestByOperator[opId].lteTotalCell || latestByOperator[opId].lte_total_cell || 0,
      nrTotalCell: latestByOperator[opId].nrTotalCell || latestByOperator[opId].nr_total_cell || 0,
      totalCell: latestByOperator[opId].totalCell || latestByOperator[opId].total_cell || 0,
      // Store original data
      _raw: latestByOperator[opId],
    })),
  };
}

/**
 * Transform indicator summary data (from V2 indicator_summary table)
 * @param {Array} indicatorSummaries - Raw indicator summary data from API
 * @param {string} operatorName - Optional operator name to filter
 * @returns {Object} { latest: {...}, trafficMetrics: {...}, operators: [...] }
 */
export function transformIndicatorSummaryData(indicatorSummaries, operatorName = null) {
  if (!indicatorSummaries?.length) return { latest: [], trafficMetrics: {}, operators: [] };

  // Filter by operator name if provided
  let filtered = indicatorSummaries;
  if (operatorName) {
    filtered = indicatorSummaries.filter(i =>
      i.operatorName === operatorName || i.operator_name === operatorName || i.operatorId === operatorName
    );
  }

  // Get latest month data for each operator
  const latestByOperator = {};

  for (const item of filtered) {
    const opId = item.operatorId || item.operator_id;
    if (!latestByOperator[opId] || item.dataMonth > latestByOperator[opId].dataMonth) {
      latestByOperator[opId] = item;
    }
  }

  return {
    latest: Object.values(latestByOperator),
    trafficMetrics: Object.fromEntries(
      Object.entries(latestByOperator).map(([opId, item]) => [
        opId,
        {
          operatorId: parseInt(opId, 10),
          operatorName: item.operatorName || item.operator_name,
          dataMonth: item.dataMonth,
          // Traffic metrics (分流/驻留指标)
          trafficRatio: parseFloat(item.trafficRatio || item.traffic_ratio) || 0,
          durationCampratio: parseFloat(item.durationCampratio || item.duration_campratio) || 0,
          terminalPenetration: parseFloat(item.terminalPenetration || item.terminal_penetration) || 0,
          fallbackRatio: parseFloat(item.fallbackRatio || item.fallback_ratio) || 0,
          // LTE average metrics
          lteAvgDlPrb: parseFloat(item.lteAvgDlPrb || item.lte_avg_dl_prb) || 0,
          lteAvgUlPrb: parseFloat(item.lteAvgUlPrb || item.lte_avg_ul_prb) || 0,
          lteAvgDlRate: parseFloat(item.lteAvgDlRate || item.lte_avg_dl_rate) || 0,
          lteAvgUlRate: parseFloat(item.lteAvgUlRate || item.lte_avg_ul_rate) || 0,
          // NR average metrics
          nrAvgDlPrb: parseFloat(item.nrAvgDlPrb || item.nr_avg_dl_prb) || 0,
          nrAvgUlPrb: parseFloat(item.nrAvgUlPrb || item.nr_avg_ul_prb) || 0,
          nrAvgDlRate: parseFloat(item.nrAvgDlRate || item.nr_avg_dl_rate) || 0,
          nrAvgUlRate: parseFloat(item.nrAvgUlRate || item.nr_avg_ul_rate) || 0,
        },
      ])
    ),
    operators: Object.keys(latestByOperator).map(opId => ({
      operatorId: parseInt(opId, 10),
      operatorName: latestByOperator[opId].operatorName || latestByOperator[opId].operator_name,
      dataMonth: latestByOperator[opId].dataMonth,
      // PRB metrics
      lteAvgDlPrb: parseFloat(latestByOperator[opId].lteAvgDlPrb || latestByOperator[opId].lte_avg_dl_prb) || 0,
      lteAvgUlPrb: parseFloat(latestByOperator[opId].lteAvgUlPrb || latestByOperator[opId].lte_avg_ul_prb) || 0,
      nrAvgDlPrb: parseFloat(latestByOperator[opId].nrAvgDlPrb || latestByOperator[opId].nr_avg_dl_prb) || 0,
      nrAvgUlPrb: parseFloat(latestByOperator[opId].nrAvgUlPrb || latestByOperator[opId].nr_avg_ul_prb) || 0,
      // Rate metrics
      lteAvgDlRate: parseFloat(latestByOperator[opId].lteAvgDlRate || latestByOperator[opId].lte_avg_dl_rate) || 0,
      lteAvgUlRate: parseFloat(latestByOperator[opId].lteAvgUlRate || latestByOperator[opId].lte_avg_ul_rate) || 0,
      nrAvgDlRate: parseFloat(latestByOperator[opId].nrAvgDlRate || latestByOperator[opId].nr_avg_dl_rate) || 0,
      nrAvgUlRate: parseFloat(latestByOperator[opId].nrAvgUlRate || latestByOperator[opId].nr_avg_ul_rate) || 0,
      // Traffic metrics
      trafficRatio: parseFloat(latestByOperator[opId].trafficRatio || latestByOperator[opId].traffic_ratio) || 0,
      durationCampratio: parseFloat(latestByOperator[opId].durationCampratio || latestByOperator[opId].duration_campratio) || 0,
      // Store original data
      _raw: latestByOperator[opId],
    })),
  };
}

/**
 * Calculate site summary totals from site summary data
 * @param {Object} siteSummary - Site summary object
 * @returns {Object} { lteTotalSite, nrTotalSite, totalSite, lteTotalCell, nrTotalCell, totalCell }
 */
export function calculateSiteSummaryTotals(siteSummary) {
  if (!siteSummary) return { lteTotalSite: 0, nrTotalSite: 0, totalSite: 0, lteTotalCell: 0, nrTotalCell: 0, totalCell: 0 };

  return {
    lteTotalSite: siteSummary.lteTotalSite || siteSummary.lte_total_site || 0,
    nrTotalSite: siteSummary.nrTotalSite || siteSummary.nr_total_site || 0,
    totalSite: siteSummary.totalSite || siteSummary.total_site || 0,
    lteTotalCell: siteSummary.lteTotalCell || siteSummary.lte_total_cell || 0,
    nrTotalCell: siteSummary.nrTotalCell || siteSummary.nr_total_cell || 0,
    totalCell: siteSummary.totalCell || siteSummary.total_cell || 0,
  };
}

/**
 * Transform site summary to band-based chart data
 * @param {Object} siteSummary - Site summary object
 * @returns {Array} Chart data by band
 */
export function transformSiteSummaryToBandData(siteSummary) {
  if (!siteSummary) return [];

  const result = [];
  for (const band of BANDS) {
    // Handle both camelCase and snake_case field names
    const lteSite = siteSummary[`lte${band}Site`] || siteSummary[`lte_${band.replace('M', 'M_')}_site`] || 0;
    const lteCell = siteSummary[`lte${band}Cell`] || siteSummary[`lte_${band.replace('M', 'M_')}_cell`] || 0;
    const nrSite = siteSummary[`nr${band}Site`] || siteSummary[`nr_${band.replace('M', 'M_')}_site`] || 0;
    const nrCell = siteSummary[`nr${band}Cell`] || siteSummary[`nr_${band.replace('M', 'M_')}_cell`] || 0;

    if (lteSite > 0 || nrSite > 0 || lteCell > 0 || nrCell > 0) {
      result.push({
        name: band,
        '4G站点': lteSite,
        '5G站点': nrSite,
        '4G小区': lteCell,
        '5G小区': nrCell,
        '站点总数': lteSite + nrSite,
        '小区总数': lteCell + nrCell,
      });
    }
  }
  return result;
}

/**
 * Transform indicator summary to rate chart data
 * @param {Object} indicatorSummary - Indicator summary object
 * @returns {Array} Chart data by band
 */
export function transformIndicatorSummaryToRateData(indicatorSummary) {
  if (!indicatorSummary) return [];

  const result = [];
  for (const band of BANDS) {
    // Handle both camelCase and snake_case field names
    const dlRate = indicatorSummary[`lte${band}DlRate`] || indicatorSummary[`nr${band}DlRate`] || 0;
    const ulRate = indicatorSummary[`lte${band}UlRate`] || indicatorSummary[`nr${band}UlRate`] || 0;

    if (parseFloat(dlRate) > 0 || parseFloat(ulRate) > 0) {
      result.push({
        name: band,
        '下行速率': parseFloat(dlRate) || 0,
        '上行速率': parseFloat(ulRate) || 0,
      });
    }
  }
  return result;
}

/**
 * Transform indicator summary to PRB chart data
 * @param {Object} indicatorSummary - Indicator summary object
 * @returns {Array} Chart data by band
 */
export function transformIndicatorSummaryToPRBData(indicatorSummary) {
  if (!indicatorSummary) return [];

  const result = [];
  for (const band of BANDS) {
    // Handle both camelCase and snake_case field names
    const dlPrb = indicatorSummary[`lte${band}DlPrb`] || indicatorSummary[`nr${band}DlPrb`] || 0;
    const ulPrb = indicatorSummary[`lte${band}UlPrb`] || indicatorSummary[`nr${band}UlPrb`] || 0;

    if (parseFloat(dlPrb) > 0 || parseFloat(ulPrb) > 0) {
      result.push({
        name: band,
        '下行PRB': parseFloat(dlPrb) || 0,
        '上行PRB': parseFloat(ulPrb) || 0,
      });
    }
  }
  return result;
}

/**
 * Generate operator comparison data from site summary list
 * @param {Array} siteSummaries - List of site summary objects
 * @returns {Array} Comparison data for all operators
 */
export function generateOperatorComparisonData(siteSummaries) {
  if (!siteSummaries?.length) return [];

  const transformed = transformSiteSummaryData(siteSummaries);
  return transformed.operators.map(op => ({
    name: op.operatorName,
    '站点数': op.totalSite,
    '小区数': op.totalCell,
    lteSite: op.lteTotalSite,
    nrSite: op.nrTotalSite,
    lteCell: op.lteTotalCell,
    nrCell: op.nrTotalCell,
  }));
}

/**
 * Generate operator PRB comparison data from indicator summary list
 * @param {Array} indicatorSummaries - List of indicator summary objects
 * @returns {Object} { ulPrbData, dlPrbData } for charting
 */
export function generatePRBComparisonData(indicatorSummaries) {
  if (!indicatorSummaries?.length) return { ulPrbData: [], dlPrbData: [] };

  const transformed = transformIndicatorSummaryData(indicatorSummaries);

  return {
    ulPrbData: transformed.operators.map(op => ({
      name: op.operatorName,
      '上行PRB': op.lteAvgUlPrb,
      '上行PRB-NR': op.nrAvgUlPrb,
    })),
    dlPrbData: transformed.operators.map(op => ({
      name: op.operatorName,
      '下行PRB': op.lteAvgDlPrb,
      '下行PRB-NR': op.nrAvgDlPrb,
    })),
  };
}

/**
 * Generate operator rate comparison data
 * @param {Array} indicatorSummaries - List of indicator summary objects
 * @returns {Object} { ulRateData, dlRateData } for charting
 */
export function generateRateComparisonData(indicatorSummaries) {
  if (!indicatorSummaries?.length) return { ulRateData: [], dlRateData: [] };

  const transformed = transformIndicatorSummaryData(indicatorSummaries);

  return {
    ulRateData: transformed.operators.map(op => ({
      name: op.operatorName,
      '上行速率': op.lteAvgUlRate,
      '上行速率-NR': op.nrAvgUlRate,
    })),
    dlRateData: transformed.operators.map(op => ({
      name: op.operatorName,
      '下行速率': op.lteAvgDlRate,
      '下行速率-NR': op.nrAvgDlRate,
    })),
  };
}

/**
 * Generate traffic metrics comparison data
 * @param {Array} indicatorSummaries - List of indicator summary objects
 * @returns {Array} Traffic metrics data for all operators
 */
export function generateTrafficMetricsData(indicatorSummaries) {
  if (!indicatorSummaries?.length) return [];

  const transformed = transformIndicatorSummaryData(indicatorSummaries);
  return Object.values(transformed.trafficMetrics).map(metric => ({
    name: metric.operatorName,
    '分流比': metric.trafficRatio * 100, // Convert to percentage
    '驻留比': metric.durationCampratio * 100,
    '终端渗透率': metric.terminalPenetration * 100,
    '回流比': metric.fallbackRatio * 100,
  }));
}

/**
 * Extract PRB data from indicator summary for all operators
 * @param {Array} indicatorSummaries - Raw indicator summary data
 * @returns {Object} { ulPrb: [...], dlPrb: [...] }
 */
export function extractPRBFromSummary(indicatorSummaries) {
  const data = transformIndicatorSummaryData(indicatorSummaries);
  return {
    ulPrb: data.operators.map(item => ({
      operatorId: item.operatorId,
      operatorName: item.operatorName,
      dataMonth: item.dataMonth,
      lteAvgUlPrb: item.lteAvgUlPrb,
      nrAvgUlPrb: item.nrAvgUlPrb,
    })),
    dlPrb: data.operators.map(item => ({
      operatorId: item.operatorId,
      operatorName: item.operatorName,
      dataMonth: item.dataMonth,
      lteAvgDlPrb: item.lteAvgDlPrb,
      nrAvgDlPrb: item.nrAvgDlPrb,
    })),
  };
}

/**
 * Extract rate data from indicator summary for all operators
 * @param {Array} indicatorSummaries - Raw indicator summary data
 * @returns {Object} { ulRate: [...], dlRate: [...] }
 */
export function extractRateFromSummary(indicatorSummaries) {
  const data = transformIndicatorSummaryData(indicatorSummaries);
  return {
    ulRate: data.operators.map(item => ({
      operatorId: item.operatorId,
      operatorName: item.operatorName,
      dataMonth: item.dataMonth,
      lteAvgUlRate: item.lteAvgUlRate,
      nrAvgUlRate: item.nrAvgUlRate,
    })),
    dlRate: data.operators.map(item => ({
      operatorId: item.operatorId,
      operatorName: item.operatorName,
      dataMonth: item.dataMonth,
      lteAvgDlRate: item.lteAvgDlRate,
      nrAvgDlRate: item.nrAvgDlRate,
    })),
  };
}

/**
 * Extract traffic metrics from indicator summary
 * @param {Array} indicatorSummaries - Raw indicator summary data
 * @returns {Array} Traffic metrics (分流比、驻留比等)
 */
export function extractTrafficMetrics(indicatorSummaries) {
  if (!indicatorSummaries?.length) return [];

  const transformed = transformIndicatorSummaryData(indicatorSummaries);
  return Object.values(transformed.trafficMetrics).map(item => ({
    operatorId: item.operatorId,
    operatorName: item.operatorName,
    dataMonth: item.dataMonth,
    trafficRatio: item.trafficRatio,
    durationCampratio: item.durationCampratio,
    terminalPenetration: item.terminalPenetration,
    fallbackRatio: item.fallbackRatio,
  }));
}
