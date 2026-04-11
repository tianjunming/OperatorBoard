/**
 * Test Data Factory - 测试数据工厂
 *
 * 提供可预测的测试数据生成，用于 E2E 测试
 *
 * @module tests/factories/dataFactory
 */

/**
 * 站点数据工厂
 */
export class SiteDataFactory {
  /**
   * 创建有效的站点数据
   * @param {Object} overrides - 覆盖默认值的字段
   * @returns {Object}
   */
  static createValidSiteData(overrides = {}) {
    return {
      operatorId: 1,
      operatorName: '中国移动',
      dataMonth: '2026-03',
      // LTE 频段
      lte700MSite: 45,
      lte700MCell: 120,
      lte800MSite: 30,
      lte800MCell: 80,
      lte900MSite: 65,
      lte900MCell: 195,
      lte1400MSite: 20,
      lte1400MCell: 60,
      lte1800MSite: 85,
      lte1800MCell: 255,
      lte2100MSite: 55,
      lte2100MCell: 165,
      lte2600MSite: 70,
      lte2600MCell: 210,
      // NR 频段
      nr700MSite: 10,
      nr700MCell: 30,
      nr800MSite: 8,
      nr800MCell: 24,
      nr900MSite: 5,
      nr900MCell: 15,
      nr1400MSite: 3,
      nr1400MCell: 9,
      nr1800MSite: 2,
      nr1800MCell: 6,
      nr2100MSite: 15,
      nr2100MCell: 45,
      nr2600MSite: 25,
      nr2600MCell: 75,
      nr3500MSite: 35,
      nr3500MCell: 85,
      nr4900MSite: 12,
      nr4900MCell: 36,
      nr2300MSite: 12,
      nr2300MCell: 30,
      ...overrides,
    };
  }

  /**
   * 创建零值数据（边界测试）
   * @returns {Object}
   */
  static createZeroSiteData() {
    return this.createValidSiteData({
      lte700MSite: 0,
      lte700MCell: 0,
      lte800MSite: 0,
      lte800MCell: 0,
      lte900MSite: 0,
      lte900MCell: 0,
      nr3500MSite: 0,
      nr3500MCell: 0,
      nr2300MSite: 0,
      nr2300MCell: 0,
    });
  }

  /**
   * 创建大数据量（性能测试）
   * @returns {Object}
   */
  static createLargeSiteData() {
    return this.createValidSiteData({
      lte700MSite: 9999,
      lte700MCell: 99999,
      lte800MSite: 8888,
      lte800MCell: 88888,
      nr3500MSite: 7777,
      nr3500MCell: 77777,
      nr2300MSite: 6666,
      nr2300MCell: 66666,
    });
  }

  /**
   * 创建单频段数据（隔离测试）
   * @param {string} band - 频段名称
   * @param {number} siteValue - 站点数
   * @param {number} cellValue - 小区数
   * @returns {Object}
   */
  static createSingleBandData(band, siteValue, cellValue) {
    const data = this.createZeroSiteData();

    const bandConfig = {
      'LTE 700M': { site: 'lte700MSite', cell: 'lte700MCell' },
      'LTE 800M': { site: 'lte800MSite', cell: 'lte800MCell' },
      'NR 3500M': { site: 'nr3500MSite', cell: 'nr3500MCell' },
      'NR 2300M': { site: 'nr2300MSite', cell: 'nr2300MCell' },
    };

    const config = bandConfig[band];
    if (config) {
      data[config.site] = siteValue;
      data[config.cell] = cellValue;
    }

    return data;
  }
}

/**
 * 指标数据工厂
 */
export class IndicatorDataFactory {
  /**
   * 创建有效的指标数据（与 IndicatorInfo 实体字段对应）
   * @param {Object} overrides - 覆盖默认值的字段
   * @returns {Object}
   */
  static createValidIndicatorData(overrides = {}) {
    return {
      operatorId: 1,
      operatorName: '中国移动',
      dataMonth: '2026-03',
      // LTE 700M
      lte700MDlRate: 45.50,
      lte700MUlRate: 8.30,
      lte700MDlPrb: 35.20,
      lte700MUlPrb: 12.80,
      // LTE 800M
      lte800MDlRate: 52.30,
      lte800MUlRate: 9.20,
      lte800MDlPrb: 42.10,
      lte800MUlPrb: 15.60,
      // LTE 900M
      lte900MDlRate: 48.70,
      lte900MUlRate: 8.90,
      lte900MDlPrb: 38.50,
      lte900MUlPrb: 14.20,
      // LTE 1400M
      lte1400MDlRate: 55.30,
      lte1400MUlRate: 10.10,
      lte1400MDlPrb: 44.80,
      lte1400MUlPrb: 16.90,
      // LTE 1800M
      lte1800MDlRate: 58.90,
      lte1800MUlRate: 11.20,
      lte1800MDlPrb: 48.30,
      lte1800MUlPrb: 18.50,
      // LTE 2100M
      lte2100MDlRate: 62.40,
      lte2100MUlRate: 12.30,
      lte2100MDlPrb: 51.20,
      lte2100MUlPrb: 19.80,
      // LTE 2600M
      lte2600MDlRate: 68.70,
      lte2600MUlRate: 13.90,
      lte2600MDlPrb: 55.60,
      lte2600MUlPrb: 21.40,
      // NR 700M
      nr700MDlRate: 180.30,
      nr700MUlRate: 35.60,
      nr700MDlPrb: 32.40,
      nr700MUlPrb: 22.10,
      // NR 800M
      nr800MDlRate: 195.80,
      nr800MUlRate: 38.90,
      nr800MDlPrb: 35.20,
      nr800MUlPrb: 24.30,
      // NR 900M
      nr900MDlRate: 210.50,
      nr900MUlRate: 42.10,
      nr900MDlPrb: 38.60,
      nr900MUlPrb: 26.50,
      // NR 1400M
      nr1400MDlRate: 280.90,
      nr1400MUlRate: 55.30,
      nr1400MDlPrb: 42.80,
      nr1400MUlPrb: 28.90,
      // NR 1800M
      nr1800MDlRate: 350.60,
      nr1800MUlRate: 68.40,
      nr1800MDlPrb: 48.50,
      nr1800MUlPrb: 32.10,
      // NR 2100M
      nr2100MDlRate: 420.30,
      nr2100MUlRate: 82.70,
      nr2100MDlPrb: 52.90,
      nr2100MUlPrb: 35.60,
      // NR 2600M
      nr2600MDlRate: 520.80,
      nr2600MUlRate: 98.50,
      nr2600MDlPrb: 58.40,
      nr2600MUlPrb: 38.90,
      // NR 3500M
      nr3500MDlRate: 680.90,
      nr3500MUlRate: 125.60,
      nr3500MDlPrb: 62.30,
      nr3500MUlPrb: 42.80,
      // NR 4900M
      nr4900MDlRate: 780.50,
      nr4900MUlRate: 145.30,
      nr4900MDlPrb: 68.90,
      nr4900MUlPrb: 48.20,
      // NR 2300M
      nr2300MDlRate: 320.50,
      nr2300MUlRate: 58.40,
      nr2300MDlPrb: 45.60,
      nr2300MUlPrb: 32.70,
      // 汇总指标 (注意: 这些在 indicator_info 表中可能不存在)
      lteAvgDlRate: 55.30,
      lteAvgPrb: 45.20,
      nrAvgDlRate: 420.80,
      nrAvgPrb: 52.30,
      trafficRatio: 0,
      trafficCampratio: 0,
      terminalPenetration: 0,
      durationCampratio: 0,
      fallbackRatio: 0,
      ...overrides,
    };
  }

  /**
   * 创建零值数据
   * @returns {Object}
   */
  static createZeroIndicatorData() {
    return this.createValidIndicatorData({
      lte700MDlRate: 0,
      lte700MUlRate: 0,
      lte700MDlPrb: 0,
      lte700MUlPrb: 0,
      nr3500MDlRate: 0,
      nr3500MUlRate: 0,
      nr3500MDlPrb: 0,
      nr3500MUlPrb: 0,
      nr2300MDlRate: 0,
      nr2300MUlRate: 0,
      nr2300MDlPrb: 0,
      nr2300MUlPrb: 0,
    });
  }
}

/**
 * 运营商数据工厂
 */
export class OperatorFactory {
  /**
   * 中国运营商测试数据
   */
  static CHINA_OPERATORS = [
    { id: 1, name: '中国移动', country: '中国', region: '亚太' },
    { id: 2, name: '中国电信', country: '中国', region: '亚太' },
    { id: 3, name: '中国联通', country: '中国', region: '亚太' },
    { id: 4, name: '中国铁塔', country: '中国', region: '亚太' },
  ];

  /**
   * 获取中国运营商
   * @returns {Array}
   */
  static getChinaOperators() {
    return this.CHINA_OPERATORS;
  }

  /**
   * 根据名称获取运营商
   * @param {string} name
   * @returns {Object|null}
   */
  static getOperatorByName(name) {
    return this.CHINA_OPERATORS.find(op => op.name === name) || null;
  }
}

/**
 * 聊天消息数据工厂
 */
export class ChatMessageFactory {
  /**
   * 创建测试消息
   * @param {string} role - 'user' | 'assistant'
   * @param {string} content - 消息内容
   * @param {Object} overrides - 覆盖字段
   * @returns {Object}
   */
  static createMessage(role, content, overrides = {}) {
    return {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      complete: true,
      isError: false,
      created_at: new Date().toISOString(),
      metadata: {},
      ...overrides,
    };
  }

  /**
   * 创建带思维链的助手消息
   * @param {string} thinkingContent - 思维链内容
   * @param {string} mainContent - 主要内容
   * @returns {Object}
   */
  static createAssistantWithThinking(thinkingContent, mainContent) {
    return this.createMessage('assistant', `<!-- thinking_start -->\n${thinkingContent}\n<!-- thinking_end -->\n\n${mainContent}`);
  }

  /**
   * 创建带图表的用户查询
   * @param {string} operatorName - 运营商名称
   * @param {string} dataType - '站点' | '指标'
   * @returns {string}
   */
  static createQuery(operatorName, dataType) {
    const queries = {
      '站点': `查询${operatorName}的站点数据`,
      '指标': `查询${operatorName}的指标数据`,
      '速率': `${operatorName}的下行速率是多少`,
      '分布': `${operatorName}的频段分布情况`,
    };

    return queries[dataType] || `查询${operatorName}的${dataType}`;
  }
}
