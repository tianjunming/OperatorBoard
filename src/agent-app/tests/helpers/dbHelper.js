/**
 * Database Helper for E2E Tests
 * Provides MySQL connection and query utilities for V2 summary tables
 */
import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'operator_board',
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
   * Get site summary for an operator (latest month)
   * @param {number} operatorId - Operator ID
   * @returns {Promise<Object|null>} Site summary data
   */
  async getSiteSummaryLatest(operatorId) {
    return this.queryOne(`
      SELECT s.*, o.operator_name, o.country
      FROM site_summary s
      JOIN operator_info o ON s.operator_id = o.id
      WHERE s.operator_id = ?
        AND s.data_month = (
          SELECT MAX(data_month) FROM site_summary WHERE operator_id = ?
        )
    `, [operatorId, operatorId]);
  },

  /**
   * Get site summary history for an operator
   * @param {number} operatorId - Operator ID
   * @returns {Promise<Array>} Site summary history
   */
  async getSiteSummaryHistory(operatorId) {
    return this.query(`
      SELECT s.*, o.operator_name
      FROM site_summary s
      JOIN operator_info o ON s.operator_id = o.id
      WHERE s.operator_id = ?
      ORDER BY s.data_month DESC
    `, [operatorId]);
  },

  /**
   * Get indicator summary for an operator (latest month)
   * @param {number} operatorId - Operator ID
   * @returns {Promise<Object|null>} Indicator summary data
   */
  async getIndicatorSummaryLatest(operatorId) {
    return this.queryOne(`
      SELECT i.*, o.operator_name, o.country
      FROM indicator_summary i
      JOIN operator_info o ON i.operator_id = o.id
      WHERE i.operator_id = ?
        AND i.data_month = (
          SELECT MAX(data_month) FROM indicator_summary WHERE operator_id = ?
        )
    `, [operatorId, operatorId]);
  },

  /**
   * Get indicator summary history for an operator
   * @param {number} operatorId - Operator ID
   * @returns {Promise<Array>} Indicator summary history
   */
  async getIndicatorSummaryHistory(operatorId) {
    return this.query(`
      SELECT i.*, o.operator_name
      FROM indicator_summary i
      JOIN operator_info o ON i.operator_id = o.id
      WHERE i.operator_id = ?
      ORDER BY i.data_month DESC
    `, [operatorId]);
  },

  /**
   * Get all operators latest site summary
   * @returns {Promise<Array>} All operators site summary
   */
  async getAllOperatorsSiteSummaryLatest() {
    return this.query(`
      SELECT s.*, o.operator_name, o.country
      FROM site_summary s
      JOIN operator_info o ON s.operator_id = o.id
      WHERE s.data_month = (
        SELECT MAX(s2.data_month) FROM site_summary s2 WHERE s2.operator_id = s.operator_id
      )
      ORDER BY o.operator_name
    `);
  },

  /**
   * Get all operators latest indicator summary
   * @returns {Promise<Array>} All operators indicator summary
   */
  async getAllOperatorsIndicatorSummaryLatest() {
    return this.query(`
      SELECT i.*, o.operator_name, o.country
      FROM indicator_summary i
      JOIN operator_info o ON i.operator_id = o.id
      WHERE i.data_month = (
        SELECT MAX(i2.data_month) FROM indicator_summary i2 WHERE i2.operator_id = i.operator_id
      )
      ORDER BY o.operator_name
    `);
  },

  /**
   * Get latest data month for an operator
   * @param {number} operatorId - Operator ID
   * @returns {Promise<string|null>} Latest data month
   */
  async getLatestDataMonth(operatorId) {
    const result = await this.queryOne(
      'SELECT MAX(data_month) as latest_month FROM site_summary WHERE operator_id = ?',
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
   * Get PRB metrics for all operators
   * @returns {Promise<Array>} PRB metrics
   */
  async getAllOperatorsPRB() {
    return this.query(`
      SELECT o.operator_name, i.*
      FROM indicator_summary i
      JOIN operator_info o ON i.operator_id = o.id
      WHERE i.data_month = (
        SELECT MAX(i2.data_month) FROM indicator_summary i2 WHERE i2.operator_id = i.operator_id
      )
      ORDER BY o.operator_name
    `);
  },

  /**
   * Get traffic metrics for all operators
   * @returns {Promise<Array>} Traffic metrics
   */
  async getAllOperatorsTrafficMetrics() {
    return this.query(`
      SELECT o.operator_name, i.traffic_ratio, i.duration_campratio,
             i.terminal_penetration, i.fallback_ratio, i.data_month
      FROM indicator_summary i
      JOIN operator_info o ON i.operator_id = o.id
      WHERE i.data_month = (
        SELECT MAX(i2.data_month) FROM indicator_summary i2 WHERE i2.operator_id = i.operator_id
      )
      AND (i.traffic_ratio IS NOT NULL OR i.duration_campratio IS NOT NULL)
      ORDER BY o.operator_name
    `);
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
