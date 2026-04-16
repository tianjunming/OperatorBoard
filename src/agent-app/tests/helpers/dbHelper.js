/**
 * Database Helper - 数据库一致性验证助手
 *
 * 提供数据库直连查询和数据一致性验证功能
 *
 * @module tests/helpers/dbHelper
 */

import mysql from 'mysql2/promise';

// 数据库配置
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'test',
  database: process.env.DB_NAME || 'operator_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// 字段映射表：UI 显示名称 -> 数据库字段 (SiteCellSummary 实体字段)
export const SITE_FIELD_MAP = {
  // LTE 频段站点
  'LTE 700M 站点': 'lte700MSite',
  'LTE 700M 小区': 'lte700MCell',
  'LTE 800M 站点': 'lte800MSite',
  'LTE 800M 小区': 'lte800MCell',
  'LTE 900M 站点': 'lte900MSite',
  'LTE 900M 小区': 'lte900MCell',
  'LTE 1400M 站点': 'lte1400MSite',
  'LTE 1400M 小区': 'lte1400MCell',
  'LTE 1800M 站点': 'lte1800MSite',
  'LTE 1800M 小区': 'lte1800MCell',
  'LTE 2100M 站点': 'lte2100MSite',
  'LTE 2100M 小区': 'lte2100MCell',
  'LTE 2600M 站点': 'lte2600MSite',
  'LTE 2600M 小区': 'lte2600MCell',
  // NR 频段站点
  'NR 700M 站点': 'nr700MSite',
  'NR 700M 小区': 'nr700MCell',
  'NR 800M 站点': 'nr800MSite',
  'NR 800M 小区': 'nr800MCell',
  'NR 900M 站点': 'nr900MSite',
  'NR 900M 小区': 'nr900MCell',
  'NR 1400M 站点': 'nr1400MSite',
  'NR 1400M 小区': 'nr1400MCell',
  'NR 1800M 站点': 'nr1800MSite',
  'NR 1800M 小区': 'nr1800MCell',
  'NR 2100M 站点': 'nr2100MSite',
  'NR 2100M 小区': 'nr2100MCell',
  'NR 2600M 站点': 'nr2600MSite',
  'NR 2600M 小区': 'nr2600MCell',
  'NR 3500M 站点': 'nr3500MSite',
  'NR 3500M 小区': 'nr3500MCell',
  'NR 4900M 站点': 'nr4900MSite',
  'NR 4900M 小区': 'nr4900MCell',
  'NR 2300M 站点': 'nr2300MSite',
  'NR 2300M 小区': 'nr2300MCell',
  // 汇总字段
  'LTE 总站点': 'lteTotalSite',
  'LTE 总小区': 'lteTotalCell',
  'NR 总站点': 'nrTotalSite',
  'NR 总小区': 'nrTotalCell',
};

export const INDICATOR_FIELD_MAP = {
  // LTE 下行负载 (DL PRB)
  'LTE 700M 下行负载': 'lte700MDlPrb',
  'LTE 800M 下行负载': 'lte800MDlPrb',
  'LTE 900M 下行负载': 'lte900MDlPrb',
  'LTE 1400M 下行负载': 'lte1400MDlPrb',
  'LTE 1800M 下行负载': 'lte1800MDlPrb',
  'LTE 2100M 下行负载': 'lte2100MDlPrb',
  'LTE 2600M 下行负载': 'lte2600MDlPrb',
  // LTE 上行负载 (UL PRB)
  'LTE 700M 上行负载': 'lte700MUlPrb',
  'LTE 800M 上行负载': 'lte800MUlPrb',
  'LTE 900M 上行负载': 'lte900MUlPrb',
  'LTE 1400M 上行负载': 'lte1400MUlPrb',
  'LTE 1800M 上行负载': 'lte1800MUlPrb',
  'LTE 2100M 上行负载': 'lte2100MUlPrb',
  'LTE 2600M 上行负载': 'lte2600MUlPrb',
  // LTE 下行速率
  'LTE 700M 下行速率': 'lte700MDlRate',
  'LTE 800M 下行速率': 'lte800MDlRate',
  'LTE 900M 下行速率': 'lte900MDlRate',
  'LTE 1400M 下行速率': 'lte1400MDlRate',
  'LTE 1800M 下行速率': 'lte1800MDlRate',
  'LTE 2100M 下行速率': 'lte2100MDlRate',
  'LTE 2600M 下行速率': 'lte2600MDlRate',
  // LTE 上行速率
  'LTE 700M 上行速率': 'lte700MUlRate',
  'LTE 800M 上行速率': 'lte800MUlRate',
  'LTE 900M 上行速率': 'lte900MUlRate',
  'LTE 1400M 上行速率': 'lte1400MUlRate',
  'LTE 1800M 上行速率': 'lte1800MUlRate',
  'LTE 2100M 上行速率': 'lte2100MUlRate',
  'LTE 2600M 上行速率': 'lte2600MUlRate',
  // NR 下行负载
  'NR 700M 下行负载': 'nr700MDlPrb',
  'NR 800M 下行负载': 'nr800MDlPrb',
  'NR 900M 下行负载': 'nr900MDlPrb',
  'NR 1400M 下行负载': 'nr1400MDlPrb',
  'NR 1800M 下行负载': 'nr1800MDlPrb',
  'NR 2100M 下行负载': 'nr2100MDlPrb',
  'NR 2600M 下行负载': 'nr2600MDlPrb',
  'NR 3500M 下行负载': 'nr3500MDlPrb',
  'NR 4900M 下行负载': 'nr4900MDlPrb',
  'NR 2300M 下行负载': 'nr2300MDlPrb',
  // NR 上行负载
  'NR 700M 上行负载': 'nr700MUlPrb',
  'NR 800M 上行负载': 'nr800MUlPrb',
  'NR 900M 上行负载': 'nr900MUlPrb',
  'NR 1400M 上行负载': 'nr1400MUlPrb',
  'NR 1800M 上行负载': 'nr1800MUlPrb',
  'NR 2100M 上行负载': 'nr2100MUlPrb',
  'NR 2600M 上行负载': 'nr2600MUlPrb',
  'NR 3500M 上行负载': 'nr3500MUlPrb',
  'NR 4900M 上行负载': 'nr4900MUlPrb',
  'NR 2300M 上行负载': 'nr2300MUlPrb',
  // NR 下行速率
  'NR 700M 下行速率': 'nr700MDlRate',
  'NR 800M 下行速率': 'nr800MDlRate',
  'NR 900M 下行速率': 'nr900MDlRate',
  'NR 1400M 下行速率': 'nr1400MDlRate',
  'NR 1800M 下行速率': 'nr1800MDlRate',
  'NR 2100M 下行速率': 'nr2100MDlRate',
  'NR 2600M 下行速率': 'nr2600MDlRate',
  'NR 3500M 下行速率': 'nr3500MDlRate',
  'NR 4900M 下行速率': 'nr4900MDlRate',
  'NR 2300M 下行速率': 'nr2300MDlRate',
  // NR 上行速率
  'NR 700M 上行速率': 'nr700MUlRate',
  'NR 800M 上行速率': 'nr800MUlRate',
  'NR 900M 上行速率': 'nr900MUlRate',
  'NR 1400M 上行速率': 'nr1400MUlRate',
  'NR 1800M 上行速率': 'nr1800MUlRate',
  'NR 2100M 上行速率': 'nr2100MUlRate',
  'NR 2600M 上行速率': 'nr2600MUlRate',
  'NR 3500M 上行速率': 'nr3500MUlRate',
  'NR 4900M 上行速率': 'nr4900MUlRate',
  'NR 2300M 上行速率': 'nr2300MUlRate',
  // 汇总指标 (注意: 这些字段在 indicator_info 表中不存在或为0)
  '流量比': 'trafficRatio',
  '时长驻留比': 'durationCampratio',
  '流量驻留比': 'trafficCampratio',
  '终端渗透率': 'terminalPenetration',
  '切换驻留比': 'fallbackRatio',
};

// 汇总指标字段映射 (用于 /metrics API 验证)
export const METRICS_FIELD_MAP = {
  '分流比': 'trafficRatio',
  '时长驻留比': 'durationCampRatio',
  '终端渗透率': 'terminalPenetration',
  '回流比': 'fallbackRatio',
  'LTE平均下行速率': 'lteAvgDlRate',
  'LTE平均上行速率': 'lteAvgUlRate',
  'LTE平均下行PRB': 'lteAvgDlPrb',
  'LTE平均上行PRB': 'lteAvgUlPrb',
  'NR平均下行速率': 'nrAvgDlRate',
  'NR平均上行速率': 'nrAvgUlRate',
  'NR平均下行PRB': 'nrAvgDlPrb',
  'NR平均上行PRB': 'nrAvgUlPrb',
};

/**
 * 创建数据库连接
 * @returns {Promise<mysql.PoolConnection>}
 */
export async function createConnection() {
  const pool = mysql.createPool(DB_CONFIG);
  return pool.getConnection();
}

/**
 * 关闭连接池
 */
export async function closePool() {
  // Pool 会在所有连接关闭后自动清理
}

/**
 * 从数据库获取站点数据
 * @param {number} operatorId - 运营商 ID
 * @param {string} dataMonth - 数据月份 (YYYY-MM)
 * @returns {Promise<Object|null>}
 */
export async function getSiteDataFromDB(operatorId, dataMonth) {
  const conn = await createConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT * FROM site_info WHERE operator_id = ? AND data_month = ?`,
      [operatorId, dataMonth]
    );
    return rows[0] || null;
  } finally {
    conn.release();
  }
}

/**
 * 从数据库获取指标数据
 * @param {number} operatorId - 运营商 ID
 * @param {string} dataMonth - 数据月份 (YYYY-MM)
 * @returns {Promise<Object|null>}
 */
export async function getIndicatorDataFromDB(operatorId, dataMonth) {
  const conn = await createConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT * FROM indicator_info WHERE operator_id = ? AND data_month = ?`,
      [operatorId, dataMonth]
    );
    return rows[0] || null;
  } finally {
    conn.release();
  }
}

/**
 * 从数据库获取运营商信息
 * @param {number} operatorId - 运营商 ID
 * @returns {Promise<Object|null>}
 */
export async function getOperatorInfo(operatorId) {
  const conn = await createConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT * FROM operator_info WHERE id = ?`,
      [operatorId]
    );
    return rows[0] || null;
  } finally {
    conn.release();
  }
}

/**
 * 根据运营商名称获取 ID
 * @param {string} operatorName - 运营商名称
 * @returns {Promise<number|null>}
 */
export async function getOperatorIdByName(operatorName) {
  const conn = await createConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT id FROM operator_info WHERE operator_name = ? LIMIT 1`,
      [operatorName]
    );
    return rows[0]?.id || null;
  } finally {
    conn.release();
  }
}

/**
 * 验证 UI 表格数据与数据库一致性
 * @param {Object} uiTableData - UI 提取的表格数据 { columnName: value }
 * @param {Object} dbData - 数据库数据对象
 * @param {Object} fieldMap - 字段映射表
 * @returns {{ isConsistent: boolean, mismatches: Array }}
 */
export function verifyDataConsistency(uiTableData, dbData, fieldMap) {
  const mismatches = [];

  for (const [uiField, dbField] of Object.entries(fieldMap)) {
    if (uiTableData[uiField] !== undefined) {
      const uiValue = parseFloat(uiTableData[uiField]);
      const dbValue = parseFloat(dbData[dbField]);

      if (!isNaN(uiValue) && !isNaN(dbValue) && uiValue !== dbValue) {
        mismatches.push({
          field: uiField,
          dbField,
          uiValue,
          dbValue,
          difference: uiValue - dbValue,
        });
      }
    }
  }

  return {
    isConsistent: mismatches.length === 0,
    mismatches,
  };
}

/**
 * 从 Recharts 图表提取数据
 * @param {Page} page - Playwright page 对象
 * @returns {Promise<Array>}
 */
export async function extractChartDataFromPage(page) {
  return page.evaluate(() => {
    const data = [];

    // 尝试从 Recharts 获取数据
    const barRects = document.querySelectorAll('.recharts-bar-rectangle');
    const lineDots = document.querySelectorAll('.recharts-line-dot');
    const pieSlices = document.querySelectorAll('.recharts-pie-sector');

    if (barRects.length > 0) {
      barRects.forEach(bar => {
        const name = bar.getAttribute('name') || bar.getAttribute('data-name');
        const value = bar.getAttribute('height');
        if (name && value) {
          data.push({ name, value: parseFloat(value), type: 'bar' });
        }
      });
    }

    if (lineDots.length > 0) {
      lineDots.forEach(dot => {
        const name = dot.getAttribute('name') || dot.getAttribute('data-name');
        const value = dot.getAttribute('r') || dot.getAttribute('data-value');
        if (name && value) {
          data.push({ name, value: parseFloat(value), type: 'line' });
        }
      });
    }

    if (pieSlices.length > 0) {
      pieSlices.forEach(slice => {
        const name = slice.getAttribute('name') || slice.getAttribute('data-name');
        const value = slice.getAttribute('data-value');
        if (name && value) {
          data.push({ name, value: parseFloat(value), type: 'pie' });
        }
      });
    }

    // 如果上述方法失败，尝试从 data 测试属性中提取
    if (data.length === 0) {
      const chartData = window.__CHART_DATA__;
      if (chartData) {
        return chartData;
      }
    }

    return data;
  });
}

/**
 * 从 HTML 表格提取数据
 * @param {Page} page - Playwright page 对象
 * @param {string} selector - 表格选择器
 * @returns {Promise<Object>}
 */
export async function extractTableDataFromPage(page, selector = '.structured-table') {
  return page.evaluate((sel) => {
    const table = document.querySelector(sel);
    if (!table) return { headers: [], rows: [], data: {} };

    const headers = Array.from(table.querySelectorAll('thead th')).map(h => h.textContent.trim());
    const rows = [];
    const data = {};

    table.querySelectorAll('tbody tr').forEach(row => {
      const rowData = {};
      const cells = row.querySelectorAll('td');
      cells.forEach((cell, idx) => {
        const header = headers[idx];
        rowData[header] = cell.textContent.trim();
        if (!data[header]) data[header] = [];
        data[header].push(cell.textContent.trim());
      });
      rows.push(rowData);
    });

    return { headers, rows, data };
  }, selector);
}

/**
 * 获取所有可用的数据月份
 * @returns {Promise<Array<string>>}
 */
export async function getAvailableMonths() {
  const conn = await createConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT DISTINCT data_month FROM site_info ORDER BY data_month DESC`
    );
    return rows.map(r => r.data_month);
  } finally {
    conn.release();
  }
}

/**
 * 获取所有运营商
 * @returns {Promise<Array>}
 */
export async function getAllOperators() {
  const conn = await createConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT id, operator_name, country, region FROM operator_info ORDER BY operator_name`
    );
    return rows;
  } finally {
    conn.release();
  }
}

/**
 * 获取指定运营商的最新日期
 * @param {number} operatorId - 运营商 ID
 * @returns {Promise<string|null>}
 */
export async function getLatestMonthForOperator(operatorId) {
  const conn = await createConnection();
  try {
    const [rows] = await conn.execute(
      `SELECT MAX(data_month) as latest_month FROM site_info WHERE operator_id = ?`,
      [operatorId]
    );
    return rows[0]?.latest_month || null;
  } finally {
    conn.release();
  }
}

/**
 * 获取站点小区汇总数据（pivot格式，按频段展开）
 * 对应 SiteCellSummary 实体
 * @param {number} operatorId - 运营商 ID
 * @param {string} dataMonth - 数据月份 (YYYY-MM)
 * @returns {Promise<Object|null>}
 */
export async function getSiteCellSummaryFromDB(operatorId, dataMonth) {
  const conn = await createConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT
        o.id AS operator_id,
        ss.data_month,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN ss.site_num END), 0) AS lte700MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN ss.cell_num END), 0) AS lte700MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE800M_FDD' THEN ss.site_num END), 0) AS lte800MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE800M_FDD' THEN ss.cell_num END), 0) AS lte800MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE900M_FDD' THEN ss.site_num END), 0) AS lte900MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE900M_FDD' THEN ss.cell_num END), 0) AS lte900MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE1400M_FDD' THEN ss.site_num END), 0) AS lte1400MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE1400M_FDD' THEN ss.cell_num END), 0) AS lte1400MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE1800M_FDD' THEN ss.site_num END), 0) AS lte1800MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE1800M_FDD' THEN ss.cell_num END), 0) AS lte1800MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE2100M_FDD' THEN ss.site_num END), 0) AS lte2100MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE2100M_FDD' THEN ss.cell_num END), 0) AS lte2100MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE2600M_FDD' THEN ss.site_num END), 0) AS lte2600MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE2600M_FDD' THEN ss.cell_num END), 0) AS lte2600MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE2600M_TDD' THEN ss.site_num END), 0) AS lte2600TddSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE2600M_TDD' THEN ss.cell_num END), 0) AS lte2600TddCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN ss.site_num END), 0) AS nr700MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN ss.cell_num END), 0) AS nr700MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR800M_FDD' THEN ss.site_num END), 0) AS nr800MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR800M_FDD' THEN ss.cell_num END), 0) AS nr800MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR900M_FDD' THEN ss.site_num END), 0) AS nr900MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR900M_FDD' THEN ss.cell_num END), 0) AS nr900MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR1400M_FDD' THEN ss.site_num END), 0) AS nr1400MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR1400M_FDD' THEN ss.cell_num END), 0) AS nr1400MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR1800M_FDD' THEN ss.site_num END), 0) AS nr1800MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR1800M_FDD' THEN ss.cell_num END), 0) AS nr1800MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2100M_FDD' THEN ss.site_num END), 0) AS nr2100MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2100M_FDD' THEN ss.cell_num END), 0) AS nr2100MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2600M_FDD' THEN ss.site_num END), 0) AS nr2600MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2600M_FDD' THEN ss.cell_num END), 0) AS nr2600MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR3500M_TDD' THEN ss.site_num END), 0) AS nr3500MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR3500M_TDD' THEN ss.cell_num END), 0) AS nr3500MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR4900M_TDD' THEN ss.site_num END), 0) AS nr4900MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR4900M_TDD' THEN ss.cell_num END), 0) AS nr4900MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2300M_FDD' THEN ss.site_num END), 0) AS nr2300MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2300M_FDD' THEN ss.cell_num END), 0) AS nr2300MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2300M_TDD' THEN ss.site_num END), 0) AS nr2300TddSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2300M_TDD' THEN ss.cell_num END), 0) AS nr2300TddCell,
        COALESCE(SUM(CASE WHEN b.technology = 'LTE' THEN ss.site_num ELSE 0 END), 0) AS lteTotalSite,
        COALESCE(SUM(CASE WHEN b.technology = 'LTE' THEN ss.cell_num ELSE 0 END), 0) AS lteTotalCell,
        COALESCE(SUM(CASE WHEN b.technology = 'NR' THEN ss.site_num ELSE 0 END), 0) AS nrTotalSite,
        COALESCE(SUM(CASE WHEN b.technology = 'NR' THEN ss.cell_num ELSE 0 END), 0) AS nrTotalCell
      FROM operator_info o
      LEFT JOIN site_info ss ON o.id = ss.operator_id
      LEFT JOIN band_info b ON ss.band_id = b.id
      WHERE o.id = ? AND ss.data_month = ?
      GROUP BY o.id, ss.data_month
    `, [operatorId, dataMonth]);
    return rows[0] || null;
  } finally {
    conn.release();
  }
}

/**
 * 获取指标汇总数据（pivot格式，按频段展开）
 * 对应 IndicatorInfo 实体
 * 注意: trafficRatio, durationCampratio, fallbackRatio 等字段在表中不存在或为0
 * @param {number} operatorId - 运营商 ID
 * @param {string} dataMonth - 数据月份 (YYYY-MM)
 * @returns {Promise<Object|null>}
 */
export async function getIndicatorPivotFromDB(operatorId, dataMonth) {
  const conn = await createConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT
        o.id AS operator_id,
        ni.data_month,
        MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN ni.dl_rate END) AS lte700MDlRate,
        MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN ni.ul_rate END) AS lte700MUlRate,
        MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN ni.dl_prb END) AS lte700MDlPrb,
        MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN ni.ul_prb END) AS lte700MUlPrb,
        MAX(CASE WHEN b.band_code = 'LTE800M_FDD' THEN ni.dl_rate END) AS lte800MDlRate,
        MAX(CASE WHEN b.band_code = 'LTE800M_FDD' THEN ni.ul_rate END) AS lte800MUlRate,
        MAX(CASE WHEN b.band_code = 'LTE800M_FDD' THEN ni.dl_prb END) AS lte800MDlPrb,
        MAX(CASE WHEN b.band_code = 'LTE800M_FDD' THEN ni.ul_prb END) AS lte800MUlPrb,
        MAX(CASE WHEN b.band_code = 'LTE900M_FDD' THEN ni.dl_rate END) AS lte900MDlRate,
        MAX(CASE WHEN b.band_code = 'LTE900M_FDD' THEN ni.ul_rate END) AS lte900MUlRate,
        MAX(CASE WHEN b.band_code = 'LTE900M_FDD' THEN ni.dl_prb END) AS lte900MDlPrb,
        MAX(CASE WHEN b.band_code = 'LTE900M_FDD' THEN ni.ul_prb END) AS lte900MUlPrb,
        MAX(CASE WHEN b.band_code = 'LTE1400M_FDD' THEN ni.dl_rate END) AS lte1400MDlRate,
        MAX(CASE WHEN b.band_code = 'LTE1400M_FDD' THEN ni.ul_rate END) AS lte1400MUlRate,
        MAX(CASE WHEN b.band_code = 'LTE1400M_FDD' THEN ni.dl_prb END) AS lte1400MDlPrb,
        MAX(CASE WHEN b.band_code = 'LTE1400M_FDD' THEN ni.ul_prb END) AS lte1400MUlPrb,
        MAX(CASE WHEN b.band_code = 'LTE1800M_FDD' THEN ni.dl_rate END) AS lte1800MDlRate,
        MAX(CASE WHEN b.band_code = 'LTE1800M_FDD' THEN ni.ul_rate END) AS lte1800MUlRate,
        MAX(CASE WHEN b.band_code = 'LTE1800M_FDD' THEN ni.dl_prb END) AS lte1800MDlPrb,
        MAX(CASE WHEN b.band_code = 'LTE1800M_FDD' THEN ni.ul_prb END) AS lte1800MUlPrb,
        MAX(CASE WHEN b.band_code = 'LTE2100M_FDD' THEN ni.dl_rate END) AS lte2100MDlRate,
        MAX(CASE WHEN b.band_code = 'LTE2100M_FDD' THEN ni.ul_rate END) AS lte2100MUlRate,
        MAX(CASE WHEN b.band_code = 'LTE2100M_FDD' THEN ni.dl_prb END) AS lte2100MDlPrb,
        MAX(CASE WHEN b.band_code = 'LTE2100M_FDD' THEN ni.ul_prb END) AS lte2100MUlPrb,
        MAX(CASE WHEN b.band_code = 'LTE2600M_FDD' THEN ni.dl_rate END) AS lte2600MDlRate,
        MAX(CASE WHEN b.band_code = 'LTE2600M_FDD' THEN ni.ul_rate END) AS lte2600MUlRate,
        MAX(CASE WHEN b.band_code = 'LTE2600M_FDD' THEN ni.dl_prb END) AS lte2600MDlPrb,
        MAX(CASE WHEN b.band_code = 'LTE2600M_FDD' THEN ni.ul_prb END) AS lte2600MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN ni.dl_rate END) AS nr700MDlRate,
        MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN ni.ul_rate END) AS nr700MUlRate,
        MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN ni.dl_prb END) AS nr700MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN ni.ul_prb END) AS nr700MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR800M_FDD' THEN ni.dl_rate END) AS nr800MDlRate,
        MAX(CASE WHEN b.band_code = 'NR800M_FDD' THEN ni.ul_rate END) AS nr800MUlRate,
        MAX(CASE WHEN b.band_code = 'NR800M_FDD' THEN ni.dl_prb END) AS nr800MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR800M_FDD' THEN ni.ul_prb END) AS nr800MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR900M_FDD' THEN ni.dl_rate END) AS nr900MDlRate,
        MAX(CASE WHEN b.band_code = 'NR900M_FDD' THEN ni.ul_rate END) AS nr900MUlRate,
        MAX(CASE WHEN b.band_code = 'NR900M_FDD' THEN ni.dl_prb END) AS nr900MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR900M_FDD' THEN ni.ul_prb END) AS nr900MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR1400M_FDD' THEN ni.dl_rate END) AS nr1400MDlRate,
        MAX(CASE WHEN b.band_code = 'NR1400M_FDD' THEN ni.ul_rate END) AS nr1400MUlRate,
        MAX(CASE WHEN b.band_code = 'NR1400M_FDD' THEN ni.dl_prb END) AS nr1400MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR1400M_FDD' THEN ni.ul_prb END) AS nr1400MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR1800M_FDD' THEN ni.dl_rate END) AS nr1800MDlRate,
        MAX(CASE WHEN b.band_code = 'NR1800M_FDD' THEN ni.ul_rate END) AS nr1800MUlRate,
        MAX(CASE WHEN b.band_code = 'NR1800M_FDD' THEN ni.dl_prb END) AS nr1800MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR1800M_FDD' THEN ni.ul_prb END) AS nr1800MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR2100M_FDD' THEN ni.dl_rate END) AS nr2100MDlRate,
        MAX(CASE WHEN b.band_code = 'NR2100M_FDD' THEN ni.ul_rate END) AS nr2100MUlRate,
        MAX(CASE WHEN b.band_code = 'NR2100M_FDD' THEN ni.dl_prb END) AS nr2100MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR2100M_FDD' THEN ni.ul_prb END) AS nr2100MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR2600M_FDD' THEN ni.dl_rate END) AS nr2600MDlRate,
        MAX(CASE WHEN b.band_code = 'NR2600M_FDD' THEN ni.ul_rate END) AS nr2600MUlRate,
        MAX(CASE WHEN b.band_code = 'NR2600M_FDD' THEN ni.dl_prb END) AS nr2600MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR2600M_FDD' THEN ni.ul_prb END) AS nr2600MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR3500M_TDD' THEN ni.dl_rate END) AS nr3500MDlRate,
        MAX(CASE WHEN b.band_code = 'NR3500M_TDD' THEN ni.ul_rate END) AS nr3500MUlRate,
        MAX(CASE WHEN b.band_code = 'NR3500M_TDD' THEN ni.dl_prb END) AS nr3500MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR3500M_TDD' THEN ni.ul_prb END) AS nr3500MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR4900M_TDD' THEN ni.dl_rate END) AS nr4900MDlRate,
        MAX(CASE WHEN b.band_code = 'NR4900M_TDD' THEN ni.ul_rate END) AS nr4900MUlRate,
        MAX(CASE WHEN b.band_code = 'NR4900M_TDD' THEN ni.dl_prb END) AS nr4900MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR4900M_TDD' THEN ni.ul_prb END) AS nr4900MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR2300M_FDD' THEN ni.dl_rate END) AS nr2300MDlRate,
        MAX(CASE WHEN b.band_code = 'NR2300M_FDD' THEN ni.ul_rate END) AS nr2300MUlRate,
        MAX(CASE WHEN b.band_code = 'NR2300M_FDD' THEN ni.dl_prb END) AS nr2300MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR2300M_FDD' THEN ni.ul_prb END) AS nr2300MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR2300M_TDD' THEN ni.dl_rate END) AS nr2300TDlRate,
        MAX(CASE WHEN b.band_code = 'NR2300M_TDD' THEN ni.ul_rate END) AS nr2300TUlRate,
        MAX(CASE WHEN b.band_code = 'NR2300M_TDD' THEN ni.dl_prb END) AS nr2300TDlPrb,
        MAX(CASE WHEN b.band_code = 'NR2300M_TDD' THEN ni.ul_prb END) AS nr2300TUlPrb,
        0 AS lteAvgDlRate, 0 AS lteAvgPrb, 0 AS nrAvgDlRate, 0 AS nrAvgPrb,
        0 AS trafficRatio, 0 AS trafficCampratio, 0 AS terminalPenetration,
        0 AS durationCampratio, 0 AS fallbackRatio
      FROM operator_info o
      LEFT JOIN indicator_info ni ON o.id = ni.operator_id
      LEFT JOIN band_info b ON ni.band_id = b.id
      WHERE o.id = ? AND ni.data_month = ?
      GROUP BY o.id, ni.data_month
    `, [operatorId, dataMonth]);
    return rows[0] || null;
  } finally {
    conn.release();
  }
}

/**
 * 获取所有运营商最新日期的站点汇总
 * @returns {Promise<Array>}
 */
export async function getAllOperatorsSitesLatestFromDB() {
  const conn = await createConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT
        o.id,
        o.operator_name,
        ss.data_month,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN ss.site_num END), 0) AS lte700MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN ss.cell_num END), 0) AS lte700MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE800M_FDD' THEN ss.site_num END), 0) AS lte800MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE800M_FDD' THEN ss.cell_num END), 0) AS lte800MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE900M_FDD' THEN ss.site_num END), 0) AS lte900MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE900M_FDD' THEN ss.cell_num END), 0) AS lte900MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE1400M_FDD' THEN ss.site_num END), 0) AS lte1400MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE1400M_FDD' THEN ss.cell_num END), 0) AS lte1400MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE1800M_FDD' THEN ss.site_num END), 0) AS lte1800MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE1800M_FDD' THEN ss.cell_num END), 0) AS lte1800MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE2100M_FDD' THEN ss.site_num END), 0) AS lte2100MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE2100M_FDD' THEN ss.cell_num END), 0) AS lte2100MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE2600M_FDD' THEN ss.site_num END), 0) AS lte2600MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE2600M_FDD' THEN ss.cell_num END), 0) AS lte2600MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN ss.site_num END), 0) AS nr700MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN ss.cell_num END), 0) AS nr700MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR800M_FDD' THEN ss.site_num END), 0) AS nr800MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR800M_FDD' THEN ss.cell_num END), 0) AS nr800MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR900M_FDD' THEN ss.site_num END), 0) AS nr900MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR900M_FDD' THEN ss.cell_num END), 0) AS nr900MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR1400M_FDD' THEN ss.site_num END), 0) AS nr1400MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR1400M_FDD' THEN ss.cell_num END), 0) AS nr1400MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR1800M_FDD' THEN ss.site_num END), 0) AS nr1800MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR1800M_FDD' THEN ss.cell_num END), 0) AS nr1800MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2100M_FDD' THEN ss.site_num END), 0) AS nr2100MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2100M_FDD' THEN ss.cell_num END), 0) AS nr2100MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2600M_FDD' THEN ss.site_num END), 0) AS nr2600MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2600M_FDD' THEN ss.cell_num END), 0) AS nr2600MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR3500M_TDD' THEN ss.site_num END), 0) AS nr3500MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR3500M_TDD' THEN ss.cell_num END), 0) AS nr3500MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR4900M_TDD' THEN ss.site_num END), 0) AS nr4900MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR4900M_TDD' THEN ss.cell_num END), 0) AS nr4900MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2300M_FDD' THEN ss.site_num END), 0) AS nr2300MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2300M_FDD' THEN ss.cell_num END), 0) AS nr2300MCell,
        COALESCE(SUM(CASE WHEN b.technology = 'LTE' THEN ss.site_num ELSE 0 END), 0) AS lteTotalSite,
        COALESCE(SUM(CASE WHEN b.technology = 'LTE' THEN ss.cell_num ELSE 0 END), 0) AS lteTotalCell,
        COALESCE(SUM(CASE WHEN b.technology = 'NR' THEN ss.site_num ELSE 0 END), 0) AS nrTotalSite,
        COALESCE(SUM(CASE WHEN b.technology = 'NR' THEN ss.cell_num ELSE 0 END), 0) AS nrTotalCell
      FROM operator_info o
      LEFT JOIN site_info ss ON o.id = ss.operator_id
      LEFT JOIN band_info b ON ss.band_id = b.id
      WHERE ss.data_month = (SELECT MAX(ss2.data_month) FROM site_info ss2 WHERE ss2.operator_id = o.id)
      GROUP BY o.id, ss.data_month
      ORDER BY o.id
    `);
    return rows;
  } finally {
    conn.release();
  }
}

/**
 * 获取指标历史数据
 * @param {number} operatorId - 运营商 ID
 * @returns {Promise<Array>}
 */
export async function getIndicatorTrendFromDB(operatorId) {
  const conn = await createConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT
        o.id AS operator_id,
        ni.data_month,
        MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN ni.dl_rate END) AS lte700MDlRate,
        MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN ni.ul_rate END) AS lte700MUlRate,
        MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN ni.dl_prb END) AS lte700MDlPrb,
        MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN ni.ul_prb END) AS lte700MUlPrb,
        MAX(CASE WHEN b.band_code = 'LTE800M_FDD' THEN ni.dl_rate END) AS lte800MDlRate,
        MAX(CASE WHEN b.band_code = 'LTE800M_FDD' THEN ni.ul_rate END) AS lte800MUlRate,
        MAX(CASE WHEN b.band_code = 'LTE800M_FDD' THEN ni.dl_prb END) AS lte800MDlPrb,
        MAX(CASE WHEN b.band_code = 'LTE800M_FDD' THEN ni.ul_prb END) AS lte800MUlPrb,
        MAX(CASE WHEN b.band_code = 'LTE900M_FDD' THEN ni.dl_rate END) AS lte900MDlRate,
        MAX(CASE WHEN b.band_code = 'LTE900M_FDD' THEN ni.ul_rate END) AS lte900MUlRate,
        MAX(CASE WHEN b.band_code = 'LTE900M_FDD' THEN ni.dl_prb END) AS lte900MDlPrb,
        MAX(CASE WHEN b.band_code = 'LTE900M_FDD' THEN ni.ul_prb END) AS lte900MUlPrb,
        MAX(CASE WHEN b.band_code = 'LTE1400M_FDD' THEN ni.dl_rate END) AS lte1400MDlRate,
        MAX(CASE WHEN b.band_code = 'LTE1400M_FDD' THEN ni.ul_rate END) AS lte1400MUlRate,
        MAX(CASE WHEN b.band_code = 'LTE1400M_FDD' THEN ni.dl_prb END) AS lte1400MDlPrb,
        MAX(CASE WHEN b.band_code = 'LTE1400M_FDD' THEN ni.ul_prb END) AS lte1400MUlPrb,
        MAX(CASE WHEN b.band_code = 'LTE1800M_FDD' THEN ni.dl_rate END) AS lte1800MDlRate,
        MAX(CASE WHEN b.band_code = 'LTE1800M_FDD' THEN ni.ul_rate END) AS lte1800MUlRate,
        MAX(CASE WHEN b.band_code = 'LTE1800M_FDD' THEN ni.dl_prb END) AS lte1800MDlPrb,
        MAX(CASE WHEN b.band_code = 'LTE1800M_FDD' THEN ni.ul_prb END) AS lte1800MUlPrb,
        MAX(CASE WHEN b.band_code = 'LTE2100M_FDD' THEN ni.dl_rate END) AS lte2100MDlRate,
        MAX(CASE WHEN b.band_code = 'LTE2100M_FDD' THEN ni.ul_rate END) AS lte2100MUlRate,
        MAX(CASE WHEN b.band_code = 'LTE2100M_FDD' THEN ni.dl_prb END) AS lte2100MDlPrb,
        MAX(CASE WHEN b.band_code = 'LTE2100M_FDD' THEN ni.ul_prb END) AS lte2100MUlPrb,
        MAX(CASE WHEN b.band_code = 'LTE2600M_FDD' THEN ni.dl_rate END) AS lte2600MDlRate,
        MAX(CASE WHEN b.band_code = 'LTE2600M_FDD' THEN ni.ul_rate END) AS lte2600MUlRate,
        MAX(CASE WHEN b.band_code = 'LTE2600M_FDD' THEN ni.dl_prb END) AS lte2600MDlPrb,
        MAX(CASE WHEN b.band_code = 'LTE2600M_FDD' THEN ni.ul_prb END) AS lte2600MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN ni.dl_rate END) AS nr700MDlRate,
        MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN ni.ul_rate END) AS nr700MUlRate,
        MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN ni.dl_prb END) AS nr700MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN ni.ul_prb END) AS nr700MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR800M_FDD' THEN ni.dl_rate END) AS nr800MDlRate,
        MAX(CASE WHEN b.band_code = 'NR800M_FDD' THEN ni.ul_rate END) AS nr800MUlRate,
        MAX(CASE WHEN b.band_code = 'NR800M_FDD' THEN ni.dl_prb END) AS nr800MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR800M_FDD' THEN ni.ul_prb END) AS nr800MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR900M_FDD' THEN ni.dl_rate END) AS nr900MDlRate,
        MAX(CASE WHEN b.band_code = 'NR900M_FDD' THEN ni.ul_rate END) AS nr900MUlRate,
        MAX(CASE WHEN b.band_code = 'NR900M_FDD' THEN ni.dl_prb END) AS nr900MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR900M_FDD' THEN ni.ul_prb END) AS nr900MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR1400M_FDD' THEN ni.dl_rate END) AS nr1400MDlRate,
        MAX(CASE WHEN b.band_code = 'NR1400M_FDD' THEN ni.ul_rate END) AS nr1400MUlRate,
        MAX(CASE WHEN b.band_code = 'NR1400M_FDD' THEN ni.dl_prb END) AS nr1400MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR1400M_FDD' THEN ni.ul_prb END) AS nr1400MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR1800M_FDD' THEN ni.dl_rate END) AS nr1800MDlRate,
        MAX(CASE WHEN b.band_code = 'NR1800M_FDD' THEN ni.ul_rate END) AS nr1800MUlRate,
        MAX(CASE WHEN b.band_code = 'NR1800M_FDD' THEN ni.dl_prb END) AS nr1800MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR1800M_FDD' THEN ni.ul_prb END) AS nr1800MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR2100M_FDD' THEN ni.dl_rate END) AS nr2100MDlRate,
        MAX(CASE WHEN b.band_code = 'NR2100M_FDD' THEN ni.ul_rate END) AS nr2100MUlRate,
        MAX(CASE WHEN b.band_code = 'NR2100M_FDD' THEN ni.dl_prb END) AS nr2100MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR2100M_FDD' THEN ni.ul_prb END) AS nr2100MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR2600M_FDD' THEN ni.dl_rate END) AS nr2600MDlRate,
        MAX(CASE WHEN b.band_code = 'NR2600M_FDD' THEN ni.ul_rate END) AS nr2600MUlRate,
        MAX(CASE WHEN b.band_code = 'NR2600M_FDD' THEN ni.dl_prb END) AS nr2600MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR2600M_FDD' THEN ni.ul_prb END) AS nr2600MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR3500M_TDD' THEN ni.dl_rate END) AS nr3500MDlRate,
        MAX(CASE WHEN b.band_code = 'NR3500M_TDD' THEN ni.ul_rate END) AS nr3500MUlRate,
        MAX(CASE WHEN b.band_code = 'NR3500M_TDD' THEN ni.dl_prb END) AS nr3500MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR3500M_TDD' THEN ni.ul_prb END) AS nr3500MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR4900M_TDD' THEN ni.dl_rate END) AS nr4900MDlRate,
        MAX(CASE WHEN b.band_code = 'NR4900M_TDD' THEN ni.ul_rate END) AS nr4900MUlRate,
        MAX(CASE WHEN b.band_code = 'NR4900M_TDD' THEN ni.dl_prb END) AS nr4900MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR4900M_TDD' THEN ni.ul_prb END) AS nr4900MUlPrb,
        MAX(CASE WHEN b.band_code = 'NR2300M_FDD' THEN ni.dl_rate END) AS nr2300MDlRate,
        MAX(CASE WHEN b.band_code = 'NR2300M_FDD' THEN ni.ul_rate END) AS nr2300MUlRate,
        MAX(CASE WHEN b.band_code = 'NR2300M_FDD' THEN ni.dl_prb END) AS nr2300MDlPrb,
        MAX(CASE WHEN b.band_code = 'NR2300M_FDD' THEN ni.ul_prb END) AS nr2300MUlPrb
      FROM operator_info o
      LEFT JOIN indicator_info ni ON o.id = ni.operator_id
      LEFT JOIN band_info b ON ni.band_id = b.id
      WHERE o.id = ?
      GROUP BY o.id, ni.data_month
      ORDER BY ni.data_month
    `, [operatorId]);
    return rows;
  } finally {
    conn.release();
  }
}

/**
 * 获取站点历史数据
 * @param {number} operatorId - 运营商 ID
 * @returns {Promise<Array>}
 */
export async function getSiteTrendFromDB(operatorId) {
  const conn = await createConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT
        o.id AS operator_id,
        ss.data_month,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN ss.site_num END), 0) AS lte700MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN ss.cell_num END), 0) AS lte700MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE800M_FDD' THEN ss.site_num END), 0) AS lte800MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE800M_FDD' THEN ss.cell_num END), 0) AS lte800MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE900M_FDD' THEN ss.site_num END), 0) AS lte900MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE900M_FDD' THEN ss.cell_num END), 0) AS lte900MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE1400M_FDD' THEN ss.site_num END), 0) AS lte1400MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE1400M_FDD' THEN ss.cell_num END), 0) AS lte1400MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE1800M_FDD' THEN ss.site_num END), 0) AS lte1800MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE1800M_FDD' THEN ss.cell_num END), 0) AS lte1800MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE2100M_FDD' THEN ss.site_num END), 0) AS lte2100MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE2100M_FDD' THEN ss.cell_num END), 0) AS lte2100MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE2600M_FDD' THEN ss.site_num END), 0) AS lte2600MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'LTE2600M_FDD' THEN ss.cell_num END), 0) AS lte2600MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN ss.site_num END), 0) AS nr700MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN ss.cell_num END), 0) AS nr700MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR800M_FDD' THEN ss.site_num END), 0) AS nr800MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR800M_FDD' THEN ss.cell_num END), 0) AS nr800MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR900M_FDD' THEN ss.site_num END), 0) AS nr900MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR900M_FDD' THEN ss.cell_num END), 0) AS nr900MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR1400M_FDD' THEN ss.site_num END), 0) AS nr1400MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR1400M_FDD' THEN ss.cell_num END), 0) AS nr1400MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR1800M_FDD' THEN ss.site_num END), 0) AS nr1800MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR1800M_FDD' THEN ss.cell_num END), 0) AS nr1800MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2100M_FDD' THEN ss.site_num END), 0) AS nr2100MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2100M_FDD' THEN ss.cell_num END), 0) AS nr2100MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2600M_FDD' THEN ss.site_num END), 0) AS nr2600MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2600M_FDD' THEN ss.cell_num END), 0) AS nr2600MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR3500M_TDD' THEN ss.site_num END), 0) AS nr3500MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR3500M_TDD' THEN ss.cell_num END), 0) AS nr3500MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR4900M_TDD' THEN ss.site_num END), 0) AS nr4900MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR4900M_TDD' THEN ss.cell_num END), 0) AS nr4900MCell,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2300M_FDD' THEN ss.site_num END), 0) AS nr2300MSite,
        COALESCE(MAX(CASE WHEN b.band_code = 'NR2300M_FDD' THEN ss.cell_num END), 0) AS nr2300MCell,
        COALESCE(SUM(CASE WHEN b.technology = 'LTE' THEN ss.site_num ELSE 0 END), 0) AS lteTotalSite,
        COALESCE(SUM(CASE WHEN b.technology = 'LTE' THEN ss.cell_num ELSE 0 END), 0) AS lteTotalCell,
        COALESCE(SUM(CASE WHEN b.technology = 'NR' THEN ss.site_num ELSE 0 END), 0) AS nrTotalSite,
        COALESCE(SUM(CASE WHEN b.technology = 'NR' THEN ss.cell_num ELSE 0 END), 0) AS nrTotalCell
      FROM operator_info o
      LEFT JOIN site_info ss ON o.id = ss.operator_id
      LEFT JOIN band_info b ON ss.band_id = b.id
      WHERE o.id = ?
      GROUP BY o.id, ss.data_month
      ORDER BY ss.data_month
    `, [operatorId]);
    return rows;
  } finally {
    conn.release();
  }
}

/**
 * 获取所有运营商最新日期的指标汇总
 * @returns {Promise<Array>}
 */
export async function getAllOperatorsIndicatorsLatestFromDB() {
  const conn = await createConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT
        o.id,
        o.operator_name,
        ni.data_month,
        MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN ni.dl_rate END) AS lte700MDlRate,
        MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN ni.ul_rate END) AS lte700MUlRate,
        MAX(CASE WHEN b.band_code = 'LTE800M_FDD' THEN ni.dl_rate END) AS lte800MDlRate,
        MAX(CASE WHEN b.band_code = 'LTE800M_FDD' THEN ni.ul_rate END) AS lte800MUlRate,
        MAX(CASE WHEN b.band_code = 'NR3500M_TDD' THEN ni.dl_rate END) AS nr3500MDlRate,
        MAX(CASE WHEN b.band_code = 'NR3500M_TDD' THEN ni.ul_rate END) AS nr3500MUlRate,
        MAX(CASE WHEN b.band_code = 'NR2300M_FDD' THEN ni.dl_rate END) AS nr2300MDlRate,
        MAX(CASE WHEN b.band_code = 'NR2300M_FDD' THEN ni.ul_rate END) AS nr2300MUlRate,
        0 AS lteAvgDlRate, 0 AS nrAvgDlRate
      FROM operator_info o
      LEFT JOIN indicator_info ni ON o.id = ni.operator_id
      LEFT JOIN band_info b ON ni.band_id = b.id
      WHERE ni.data_month = (SELECT MAX(ni2.data_month) FROM indicator_info ni2 WHERE ni2.operator_id = o.id)
      GROUP BY o.id, ni.data_month
      ORDER BY o.id
    `);
    return rows;
  } finally {
    conn.release();
  }
}

/**
 * 获取运营商级别汇总指标（分流比、驻留比、终端渗透率等）
 * 对应 /metrics API 返回的 OperatorMetricsResponse
 * @param {number} operatorId - 运营商 ID
 * @param {string} dataMonth - 数据月份 (YYYY-MM)，如果为null则查询最新月份
 * @returns {Promise<Object|null>}
 */
export async function getOperatorMetricsFromDB(operatorId, dataMonth) {
  const conn = await createConnection();
  try {
    let query;
    let params;

    if (dataMonth && dataMonth.trim() !== '') {
      query = `
        SELECT
          o.id AS operator_id,
          o.operator_name,
          ni.data_month,
          MAX(ni.traffic_ratio) AS trafficRatio,
          MAX(ni.duration_campratio) AS durationCampRatio,
          MAX(ni.terminal_penetration_ratio) AS terminalPenetration,
          MAX(ni.fallback_ratio) AS fallbackRatio,
          MAX(ni.lte_avg_dl_rate) AS lteAvgDlRate,
          MAX(ni.lte_avg_ul_rate) AS lteAvgUlRate,
          MAX(ni.lte_avg_dl_prb) AS lteAvgDlPrb,
          MAX(ni.lte_avg_ul_prb) AS lteAvgUlPrb,
          MAX(ni.nr_avg_dl_rate) AS nrAvgDlRate,
          MAX(ni.nr_avg_ul_rate) AS nrAvgUlRate,
          MAX(ni.nr_avg_dl_prb) AS nrAvgDlPrb,
          MAX(ni.nr_avg_ul_prb) AS nrAvgUlPrb
        FROM operator_info o
        LEFT JOIN indicator_info ni ON o.id = ni.operator_id
        WHERE o.id = ? AND ni.data_month = ?
        GROUP BY o.id, ni.data_month
      `;
      params = [operatorId, dataMonth];
    } else {
      query = `
        SELECT
          o.id AS operator_id,
          o.operator_name,
          ni.data_month,
          MAX(ni.traffic_ratio) AS trafficRatio,
          MAX(ni.duration_campratio) AS durationCampRatio,
          MAX(ni.terminal_penetration_ratio) AS terminalPenetration,
          MAX(ni.fallback_ratio) AS fallbackRatio,
          MAX(ni.lte_avg_dl_rate) AS lteAvgDlRate,
          MAX(ni.lte_avg_ul_rate) AS lteAvgUlRate,
          MAX(ni.lte_avg_dl_prb) AS lteAvgDlPrb,
          MAX(ni.lte_avg_ul_prb) AS lteAvgUlPrb,
          MAX(ni.nr_avg_dl_rate) AS nrAvgDlRate,
          MAX(ni.nr_avg_ul_rate) AS nrAvgUlRate,
          MAX(ni.nr_avg_dl_prb) AS nrAvgDlPrb,
          MAX(ni.nr_avg_ul_prb) AS nrAvgUlPrb
        FROM operator_info o
        LEFT JOIN indicator_info ni ON o.id = ni.operator_id
        WHERE o.id = ? AND ni.data_month = (SELECT MAX(ni2.data_month) FROM indicator_info ni2 WHERE ni2.operator_id = o.id)
        GROUP BY o.id, ni.data_month
      `;
      params = [operatorId];
    }

    const [rows] = await conn.execute(query, params);
    return rows[0] || null;
  } finally {
    conn.release();
  }
}

/**
 * 获取所有运营商的汇总指标
 * @param {string} dataMonth - 数据月份 (YYYY-MM)，如果为null则查询最新月份
 * @returns {Promise<Array>}
 */
export async function getAllOperatorsMetricsFromDB(dataMonth) {
  const conn = await createConnection();
  try {
    let query;

    if (dataMonth && dataMonth.trim() !== '') {
      query = `
        SELECT
          o.id AS operator_id,
          o.operator_name,
          ni.data_month,
          MAX(ni.traffic_ratio) AS trafficRatio,
          MAX(ni.duration_campratio) AS durationCampRatio,
          MAX(ni.terminal_penetration_ratio) AS terminalPenetration,
          MAX(ni.fallback_ratio) AS fallbackRatio,
          MAX(ni.lte_avg_dl_rate) AS lteAvgDlRate,
          MAX(ni.lte_avg_ul_rate) AS lteAvgUlRate,
          MAX(ni.lte_avg_dl_prb) AS lteAvgDlPrb,
          MAX(ni.lte_avg_ul_prb) AS lteAvgUlPrb,
          MAX(ni.nr_avg_dl_rate) AS nrAvgDlRate,
          MAX(ni.nr_avg_ul_rate) AS nrAvgUlRate,
          MAX(ni.nr_avg_dl_prb) AS nrAvgDlPrb,
          MAX(ni.nr_avg_ul_prb) AS nrAvgUlPrb
        FROM operator_info o
        LEFT JOIN indicator_info ni ON o.id = ni.operator_id
        WHERE ni.data_month = ?
        GROUP BY o.id, ni.data_month
        ORDER BY o.id
      `;
    } else {
      query = `
        SELECT
          o.id AS operator_id,
          o.operator_name,
          ni.data_month,
          MAX(ni.traffic_ratio) AS trafficRatio,
          MAX(ni.duration_campratio) AS durationCampRatio,
          MAX(ni.terminal_penetration_ratio) AS terminalPenetration,
          MAX(ni.fallback_ratio) AS fallbackRatio,
          MAX(ni.lte_avg_dl_rate) AS lteAvgDlRate,
          MAX(ni.lte_avg_ul_rate) AS lteAvgUlRate,
          MAX(ni.lte_avg_dl_prb) AS lteAvgDlPrb,
          MAX(ni.lte_avg_ul_prb) AS lteAvgUlPrb,
          MAX(ni.nr_avg_dl_rate) AS nrAvgDlRate,
          MAX(ni.nr_avg_ul_rate) AS nrAvgUlRate,
          MAX(ni.nr_avg_dl_prb) AS nrAvgDlPrb,
          MAX(ni.nr_avg_ul_prb) AS nrAvgUlPrb
        FROM operator_info o
        LEFT JOIN indicator_info ni ON o.id = ni.operator_id
        WHERE ni.data_month = (SELECT MAX(ni2.data_month) FROM indicator_info ni2 WHERE ni2.operator_id = o.id)
        GROUP BY o.id, ni.data_month
        ORDER BY o.id
      `;
    }

    const [rows] = await conn.execute(query, dataMonth ? [dataMonth] : []);
    return rows;
  } finally {
    conn.release();
  }
}
