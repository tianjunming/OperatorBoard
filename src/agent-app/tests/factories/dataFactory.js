/**
 * Data Factory for E2E Tests
 * Generates test data and helper methods for V2 summary tables
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
   * Sample queries for V2 summary table testing
   * Covers 20 key query functions for site/cell/load/rate/traffic metrics
   */
  static sampleQueries = {
    // Site queries (1-4)
    siteSummary: [
      '查询{siteName}的站点汇总',
      '{siteName}有多少站点',
      '{siteName}最新站点数据',
      '站点数据 {siteName}',
    ],
    // Cell queries (2)
    cellSummary: [
      '{siteName}有多少小区',
      '{siteName}小区数统计',
      '查询{siteName}小区数量',
      '{siteName}的小区汇总',
    ],
    // PRB queries (3-6)
    ulPrb: [
      '{siteName}上行负载是多少',
      '{siteName}上行PRB利用率',
      '查询{siteName}上行负载',
      '{siteName} UL PRB数据',
    ],
    dlPrb: [
      '{siteName}下行负载是多少',
      '{siteName}下行PRB利用率',
      '查询{siteName}下行负载',
      '{siteName} DL PRB数据',
    ],
    // Rate queries (5-8)
    ulRate: [
      '{siteName}上行速率是多少',
      '{siteName}上行用户速率',
      '查询{siteName}上行速率',
      '{siteName} UL Rate数据',
    ],
    dlRate: [
      '{siteName}下行速率是多少',
      '{siteName}下行用户速率',
      '查询{siteName}下行速率',
      '{siteName} DL Rate数据',
    ],
    // Traffic metrics (7)
    trafficMetrics: [
      '{siteName}分流比是多少',
      '{siteName}驻留比数据',
      '查询{siteName}分流驻留指标',
      '{siteName}流量分流比',
    ],
    // All operators queries (8-14)
    allOperatorsSiteSummary: [
      '所有运营商站点汇总',
      '查询所有运营商站点数',
      '各运营商站点对比',
      '运营商站点数据对比',
    ],
    allOperatorsCellSummary: [
      '所有运营商小区汇总',
      '查询所有运营商小区数',
      '各运营商小区对比',
    ],
    allOperatorsUlPrb: [
      '所有运营商上行负载',
      '各运营商上行PRB对比',
      '查询所有运营商上行负载',
    ],
    allOperatorsDlPrb: [
      '所有运营商下行负载',
      '各运营商下行PRB对比',
      '查询所有运营商下行负载',
    ],
    allOperatorsUlRate: [
      '所有运营商上行速率',
      '各运营商上行速率对比',
    ],
    allOperatorsDlRate: [
      '所有运营商下行速率',
      '各运营商下行速率对比',
    ],
    allOperatorsTrafficMetrics: [
      '所有运营商分流指标',
      '各运营商分流比对比',
      '查询所有运营商分流驻留比',
    ],
    // History queries (15-20)
    siteSummaryHistory: [
      '{siteName}站点历史数据',
      '{siteName}历史站点变化',
      '查询{siteName}历史站点',
    ],
    indicatorHistory: [
      '{siteName}指标历史数据',
      '{siteName}历史指标变化',
      '查询{siteName}历史指标',
    ],
    cellHistory: [
      '{siteName}小区历史数据',
      '{siteName}小区历史变化',
    ],
    // All operators history
    allOperatorsSiteHistory: [
      '所有运营商站点历史',
      '各运营商站点历史变化',
    ],
    allOperatorsIndicatorHistory: [
      '所有运营商指标历史',
      '各运营商指标历史变化',
    ],
  };

  /**
   * Generate query by replacing {siteName} placeholder
   * @param {string} category - Query category
   * @param {string} operatorName - Operator name to insert
   * @returns {string} Generated query
   */
  generateQuery(category, operatorName) {
    const queries = DataFactory.sampleQueries[category] || DataFactory.sampleQueries.siteSummary;
    const template = queries[Math.floor(Math.random() * queries.length)];
    return template.replace('{siteName}', operatorName);
  }

  /**
   * Get random query by category
   * @param {string} category - Query category
   * @param {string} operatorName - Optional operator name
   * @returns {string} Generated query
   */
  getRandomQuery(category = 'siteSummary', operatorName = null) {
    const query = this.generateQuery(category, operatorName || '北京联通');
    return query;
  }

  /**
   * Get all query categories for coverage testing
   * @returns {Array<string>} All query categories
   */
  getAllCategories() {
    return Object.keys(DataFactory.sampleQueries);
  }
}

export default DataFactory;
