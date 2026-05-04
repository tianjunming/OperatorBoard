/**
 * Database Helper for E2E Tests
 * Provides MySQL connection and query utilities for V2 summary tables
 */
import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'test',
  database: process.env.DB_NAME || 'operator_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool = null;

export function getPool() {
  if (!pool) {
    pool = mysql.createPool(DB_CONFIG);
  }
  return pool;
}

export const dbHelper = {
  /**
   * Execute a query and return results
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>} Query results
   */
  async query(sql, params = []) {
    try {
      const [results] = await getPool().execute(sql, params);
      return results;
    } catch (error) {
      console.error('Database query error:', error.message);
      throw error;
    }
  },

  /**
   * Get a single row
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object|null>} Single row or null
   */
  async queryOne(sql, params = []) {
    const results = await this.query(sql, params);
    return results[0] || null;
  },

  /**
   * Get all operators from operator_info
   * @returns {Promise<Array>} List of operators
   */
  async getOperators() {
    return this.query('SELECT id, operator_name, country, region FROM operator_info ORDER BY id');
  },

  /**
   * Get random operators for testing (at least 3)
   * @param {number} count - Number of operators to return
   * @returns {Promise<Array>} Random operators
   */
  async getRandomOperators(count = 3) {
    // Use string interpolation for LIMIT value (safe since it's a number we control)
    const safeCount = parseInt(count, 10);
    if (isNaN(safeCount) || safeCount < 1) {
      return [];
    }
    const operators = await this.query(
      `SELECT id, operator_name, country, region FROM operator_info ORDER BY RAND() LIMIT ${safeCount}`
    );
    return operators;
  },

  /**
   * Get site summary for an operator (latest month) using site_info aggregation
   * @param {number} operatorId - Operator ID
   * @returns {Promise<Object|null>} Site summary data
   */
  async getSiteSummaryLatest(operatorId) {
    return this.queryOne(`
      SELECT s.operator_id, s.data_month, o.operator_name, o.country,
             SUM(s.site_num) as total_site, SUM(s.cell_num) as total_cell
      FROM site_info s
      JOIN operator_info o ON s.operator_id = o.id
      JOIN band_info b ON s.band_id = b.id
      WHERE s.operator_id = ?
        AND s.data_month = (
          SELECT MAX(data_month) FROM site_info WHERE operator_id = ?
        )
      GROUP BY s.operator_id, s.data_month, o.operator_name, o.country
    `, [operatorId, operatorId]);
  },

  /**
   * Get site summary history for an operator using site_info aggregation
   * @param {number} operatorId - Operator ID
   * @returns {Promise<Array>} Site summary history
   */
  async getSiteSummaryHistory(operatorId) {
    return this.query(`
      SELECT s.operator_id, s.data_month, o.operator_name,
             SUM(s.site_num) as total_site, SUM(s.cell_num) as total_cell
      FROM site_info s
      JOIN operator_info o ON s.operator_id = o.id
      WHERE s.operator_id = ?
      GROUP BY s.operator_id, s.data_month, o.operator_name
      ORDER BY s.data_month DESC
    `, [operatorId]);
  },

  /**
   * Get indicator summary for an operator (latest month) using indicator_info aggregation
   * @param {number} operatorId - Operator ID
   * @returns {Promise<Object|null>} Indicator summary data
   */
  async getIndicatorSummaryLatest(operatorId) {
    return this.queryOne(`
      SELECT i.operator_id, i.data_month, o.operator_name, o.country,
             MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN i.dl_rate END) as lte_700M_dl_rate,
             MAX(CASE WHEN b.band_code = 'LTE800M_FDD' THEN i.dl_rate END) as lte_800M_dl_rate,
             MAX(CASE WHEN b.band_code = 'LTE900M_FDD' THEN i.dl_rate END) as lte_900M_dl_rate,
             MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN i.dl_rate END) as nr_700M_dl_rate,
             MAX(CASE WHEN b.band_code = 'NR800M_FDD' THEN i.dl_rate END) as nr_800M_dl_rate,
             MAX(CASE WHEN b.band_code = 'NR900M_FDD' THEN i.dl_rate END) as nr_900M_dl_rate
      FROM indicator_info i
      JOIN operator_info o ON i.operator_id = o.id
      JOIN band_info b ON i.band_id = b.id
      WHERE i.operator_id = ?
        AND i.data_month = (
          SELECT MAX(data_month) FROM indicator_info WHERE operator_id = ?
        )
      GROUP BY i.operator_id, i.data_month, o.operator_name, o.country
    `, [operatorId, operatorId]);
  },

  /**
   * Get indicator summary history for an operator using indicator_info aggregation
   * @param {number} operatorId - Operator ID
   * @returns {Promise<Array>} Indicator summary history
   */
  async getIndicatorSummaryHistory(operatorId) {
    return this.query(`
      SELECT i.operator_id, i.data_month, o.operator_name
      FROM indicator_info i
      JOIN operator_info o ON i.operator_id = o.id
      WHERE i.operator_id = ?
      GROUP BY i.operator_id, i.data_month, o.operator_name
      ORDER BY i.data_month DESC
    `, [operatorId]);
  },

  /**
   * Get all operators latest site summary using site_info aggregation
   * @returns {Promise<Array>} All operators site summary
   */
  async getAllOperatorsSiteSummaryLatest() {
    return this.query(`
      SELECT s.operator_id, s.data_month, o.operator_name, o.country,
             SUM(s.site_num) as total_site, SUM(s.cell_num) as total_cell
      FROM site_info s
      JOIN operator_info o ON s.operator_id = o.id
      WHERE s.data_month = (
        SELECT MAX(s2.data_month) FROM site_info s2 WHERE s2.operator_id = s.operator_id
      )
      GROUP BY s.operator_id, s.data_month, o.operator_name, o.country
      ORDER BY o.operator_name
    `);
  },

  /**
   * Get all operators latest indicator summary using indicator_info aggregation
   * @returns {Promise<Array>} All operators indicator summary
   */
  async getAllOperatorsIndicatorSummaryLatest() {
    return this.query(`
      SELECT i.operator_id, i.data_month, o.operator_name, o.country,
             MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN i.dl_rate END) as lte_700M_dl_rate,
             MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN i.dl_rate END) as nr_700M_dl_rate
      FROM indicator_info i
      JOIN operator_info o ON i.operator_id = o.id
      JOIN band_info b ON i.band_id = b.id
      WHERE i.data_month = (
        SELECT MAX(i2.data_month) FROM indicator_info i2 WHERE i2.operator_id = i.operator_id
      )
      GROUP BY i.operator_id, i.data_month, o.operator_name, o.country
      ORDER BY o.operator_name
    `);
  },

  /**
   * Get latest data month for an operator using site_info
   * @param {number} operatorId - Operator ID
   * @returns {Promise<string|null>} Latest data month
   */
  async getLatestDataMonth(operatorId) {
    const result = await this.queryOne(
      'SELECT MAX(data_month) as latest_month FROM site_info WHERE operator_id = ?',
      [operatorId]
    );
    return result?.latest_month || null;
  },

  /**
   * Verify site count matches between UI and DB
   * @param {number} operatorId - Operator ID
   * @param {number} expectedTotalSite - Expected total site count
   * @returns {Promise<boolean>} Whether counts match
   */
  async verifySiteCount(operatorId, expectedTotalSite) {
    const summary = await this.getSiteSummaryLatest(operatorId);
    if (!summary) return false;
    return summary.total_site === expectedTotalSite;
  },

  /**
   * Verify cell count matches between UI and DB
   * @param {number} operatorId - Operator ID
   * @param {number} expectedTotalCell - Expected total cell count
   * @returns {Promise<boolean>} Whether counts match
   */
  async verifyCellCount(operatorId, expectedTotalCell) {
    const summary = await this.getSiteSummaryLatest(operatorId);
    if (!summary) return false;
    return summary.total_cell === expectedTotalCell;
  },

  /**
   * Get PRB metrics for all operators using indicator_info aggregation
   * @returns {Promise<Array>} PRB metrics
   */
  async getAllOperatorsPRB() {
    return this.query(`
      SELECT o.operator_name, i.operator_id, i.data_month,
             MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN i.dl_prb END) as lte_700M_dl_prb,
             MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN i.ul_prb END) as lte_700M_ul_prb,
             MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN i.dl_prb END) as nr_700M_dl_prb,
             MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN i.ul_prb END) as nr_700M_ul_prb
      FROM indicator_info i
      JOIN operator_info o ON i.operator_id = o.id
      JOIN band_info b ON i.band_id = b.id
      WHERE i.data_month = (
        SELECT MAX(i2.data_month) FROM indicator_info i2 WHERE i2.operator_id = i.operator_id
      )
      GROUP BY o.operator_name, i.operator_id, i.data_month
      ORDER BY o.operator_name
    `);
  },

  /**
   * Get traffic metrics for all operators using indicator_info aggregation
   * @returns {Promise<Array>} Traffic metrics
   */
  async getAllOperatorsTrafficMetrics() {
    return this.query(`
      SELECT o.operator_name, i.operator_id, i.data_month,
             MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN i.dl_rate END) as lte_700M_dl_rate,
             MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN i.ul_rate END) as lte_700M_ul_rate,
             MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN i.dl_rate END) as nr_700M_dl_rate,
             MAX(CASE WHEN b.band_code = 'NR700M_FDD' THEN i.ul_rate END) as nr_700M_ul_rate
      FROM indicator_info i
      JOIN operator_info o ON i.operator_id = o.id
      JOIN band_info b ON i.band_id = b.id
      WHERE i.data_month = (
        SELECT MAX(i2.data_month) FROM indicator_info i2 WHERE i2.operator_id = i.operator_id
      )
      GROUP BY o.operator_name, i.operator_id, i.data_month
      ORDER BY o.operator_name
    `);
  },

  /**
   * Get NR 2600M cell count for latest month
   * @returns {Promise<number>} NR 2600M cell count
   */
  async getNR2600MCellCount() {
    const result = await this.queryOne(`
      SELECT SUM(s.cell_num) as total_cell
      FROM site_info s
      JOIN band_info b ON s.band_id = b.id
      WHERE b.band_name LIKE '%NR 2600M%'
        AND s.data_month = (
          SELECT MAX(s2.data_month) FROM site_info s2 WHERE s2.operator_id = s.operator_id
        )
    `);
    return result?.total_cell || 0;
  },

  /**
   * Get LTE/NR cell count comparison for latest month
   * @returns {Promise<Array>} Array with {technology, total_cell}
   */
  async getLTENRCellComparison() {
    return this.query(`
      SELECT b.technology, SUM(s.cell_num) as total_cell
      FROM site_info s
      JOIN band_info b ON s.band_id = b.id
      WHERE s.data_month = (
        SELECT MAX(s2.data_month) FROM site_info s2 WHERE s2.operator_id = s.operator_id
      )
      GROUP BY b.technology
    `);
  },

  /**
   * Get latest month DL rate ranking for all operators
   * @returns {Promise<Array>} Array with {operator_name, avg_dl_rate}
   */
  async getLatestDLRateRanking() {
    return this.query(`
      SELECT o.operator_name, AVG(i.dl_rate) as avg_dl_rate
      FROM indicator_info i
      JOIN operator_info o ON i.operator_id = o.id
      WHERE i.data_month = (
        SELECT MAX(i2.data_month) FROM indicator_info i2 WHERE i2.operator_id = i.operator_id
      )
      GROUP BY o.operator_name
      ORDER BY avg_dl_rate DESC
    `);
  },

  /**
   * Get latest month PRB utilization for all operators
   * @returns {Promise<Array>} Array with {operator_name, avg_dl_prb, avg_ul_prb}
   */
  async getLatestPRBUtilization() {
    return this.query(`
      SELECT o.operator_name,
             AVG(i.dl_prb) as avg_dl_prb,
             AVG(i.ul_prb) as avg_ul_prb
      FROM indicator_info i
      JOIN operator_info o ON i.operator_id = o.id
      WHERE i.data_month = (
        SELECT MAX(i2.data_month) FROM indicator_info i2 WHERE i2.operator_id = i.operator_id
      )
      GROUP BY o.operator_name
    `);
  },

  /**
   * Get site count history for all operators (last N months)
   * @param {number} months - Number of months to retrieve
   * @returns {Promise<Array>} Array of {data_month, total_site}
   */
  async getSiteCountHistory(months = 6) {
    return this.query(`
      SELECT data_month, SUM(site_num) as total_site
      FROM site_info
      GROUP BY data_month
      ORDER BY data_month DESC
      LIMIT ${parseInt(months, 10)}
    `);
  },

  /**
   * Get DL rate history for all operators (last N months)
   * @param {number} months - Number of months to retrieve
   * @returns {Promise<Array>} Array of {data_month, avg_dl_rate}
   */
  async getDLRateHistory(months = 6) {
    return this.query(`
      SELECT data_month, AVG(dl_rate) as avg_dl_rate
      FROM indicator_info
      GROUP BY data_month
      ORDER BY data_month DESC
      LIMIT ${parseInt(months, 10)}
    `);
  },

  /**
   * Get band cell distribution (top N bands)
   * @param {number} limit - Number of bands to return
   * @returns {Promise<Array>} Array of {band_name, total_cell}
   */
  async getBandCellDistribution(limit = 5) {
    return this.query(`
      SELECT b.band_name, SUM(s.cell_num) as total_cell
      FROM site_info s
      JOIN band_info b ON s.band_id = b.id
      GROUP BY b.band_name
      ORDER BY total_cell DESC
      LIMIT ${parseInt(limit, 10)}
    `);
  },

  /**
   * Get Austrian operators (Magenta, A1, Hutchison Drei)
   * @returns {Promise<Array>} Austrian operators
   */
  async getAustrianOperators() {
    return this.query(`
      SELECT id, operator_name, country, region
      FROM operator_info
      WHERE operator_name LIKE '%Magenta%'
         OR operator_name LIKE '%A1%'
         OR operator_name LIKE '%Austria%'
         OR operator_name LIKE '%Drei%'
      ORDER BY operator_name
    `);
  },

  /**
   * Verify chart data structure in response
   * Checks for [toggle] block with [chart_column] and [chart_data]
   * @param {string} content - Response content to validate
   * @returns {Object} Validation result with details
   */
  validateChartStructure(content) {
    const result = {
      hasToggleBlock: /\[toggle\]/i.test(content),
      hasChartType: /\[chart_type::/i.test(content),
      hasChartColumn: /\[chart_column::/i.test(content),
      hasChartKeys: /\[chart_keys::/i.test(content),
      hasChartData: /\[chart_data::/i.test(content),
      isValid: false
    };

    result.isValid = result.hasToggleBlock &&
                      result.hasChartType &&
                      result.hasChartColumn &&
                      result.hasChartKeys &&
                      result.hasChartData;

    return result;
  },

  /**
   * Close the connection pool
   */
  async closePool() {
    if (pool) {
      await pool.end();
      pool = null;
    }
  }
};

export default dbHelper;
