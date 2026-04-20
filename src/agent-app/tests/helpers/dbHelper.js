/**
 * Database Helper for E2E Tests
 * Provides MySQL connection and query utilities
 */
import mysql from 'mysql2/promise';

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || 'root',
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
   * Get site data with optional filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Site data
   */
  async getSites(filters = {}) {
    let sql = 'SELECT * FROM site_info WHERE 1=1';
    const params = [];

    if (filters.operator) {
      sql += ' AND operator = ?';
      params.push(filters.operator);
    }
    if (filters.region) {
      sql += ' AND region LIKE ?';
      params.push(`%${filters.region}%`);
    }

    return this.query(sql, params);
  },

  /**
   * Get indicator data
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Indicator data
   */
  async getIndicators(filters = {}) {
    let sql = 'SELECT * FROM indicator_data WHERE 1=1';
    const params = [];

    if (filters.siteId) {
      sql += ' AND site_id = ?';
      params.push(filters.siteId);
    }
    if (filters.indicatorName) {
      sql += ' AND indicator_name LIKE ?';
      params.push(`%${filters.indicatorName}%`);
    }

    return this.query(sql, params);
  },

  /**
   * Get operators list
   * @returns {Promise<Array>} Distinct operators
   */
  async getOperators() {
    return this.query('SELECT DISTINCT operator FROM site_info ORDER BY operator');
  },

  /**
   * Get regions list
   * @returns {Promise<Array>} Distinct regions
   */
  async getRegions() {
    return this.query('SELECT DISTINCT region FROM site_info ORDER BY region');
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
