/**
 * Data Factory for E2E Tests
 * Generates test data and helper methods
 */
export class DataFactory {
  constructor() {
    this.counter = Date.now();
  }

  /**
   * Generate a unique ID
   */
  generateId() {
    return `test_${this.counter++}`;
  }

  /**
   * Generate test user credentials
   */
  generateUser(overrides = {}) {
    return {
      username: `testuser_${this.generateId()}`,
      password: 'Test123456',
      email: `test_${this.generateId()}@example.com`,
      ...overrides
    };
  }

  /**
   * Generate test site data
   */
  generateSite(overrides = {}) {
    return {
      site_name: `测试站点_${this.generateId()}`,
      operator: '北京联通',
      region: '北京',
      city: '北京市',
      address: `测试地址 ${this.generateId()}`,
      latitude: 39.9042 + Math.random() * 0.1,
      longitude: 116.4074 + Math.random() * 0.1,
      status: 'active',
      ...overrides
    };
  }

  /**
   * Generate test indicator data
   */
  generateIndicator(overrides = {}) {
    return {
      indicator_name: `指标_${this.generateId()}`,
      indicator_type: 'performance',
      unit: 'dBm',
      value: Math.floor(Math.random() * 100),
      ...overrides
    };
  }

  /**
   * Sample queries for testing
   */
  static sampleQueries = {
    site: [
      '北京联通有哪些站点？',
      '上海移动的站点列表',
      '查询北京联通站点数据',
    ],
    indicator: [
      '北京联通的总站点数是多少',
      '各运营商站点数量对比',
      '最近一天的关键指标',
    ],
    comparison: [
      '对比北京和上海的站点数量',
      '北京联通和上海联通对比',
      '各运营商指标对比',
    ],
    nl2sql: [
      'show me the sql for站点查询',
      '查询2024年数据',
      '生成分地区统计数据',
    ]
  };

  /**
   * Get random query by category
   */
  getRandomQuery(category = 'site') {
    const queries = DataFactory.sampleQueries[category] || DataFactory.sampleQueries.site;
    return queries[Math.floor(Math.random() * queries.length)];
  }
}

export default DataFactory;
