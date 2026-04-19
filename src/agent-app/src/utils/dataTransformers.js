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
