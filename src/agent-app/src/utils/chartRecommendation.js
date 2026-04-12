/**
 * 智能图表推荐引擎
 * 基于数据特征自动推荐最佳图表类型
 */

/**
 * 时间维度关键词
 */
const TIME_KEYWORDS = [
  '月份', '月份', '日期', '年', '月', '周', '季度',
  'month', 'date', 'year', 'week', 'quarter',
  '2025', '2026', '2024', '1月', '2月', '3月', '4月', '5月', '6月',
  '7月', '8月', '9月', '10月', '11月', '12月',
  'Q1', 'Q2', 'Q3', 'Q4'
];

/**
 * 比率指标关键词（通常是0-100的范围或百分比）
 */
const RATIO_KEYWORDS = [
  '率', '占比', '比例', '百分比', '百分率',
  '覆盖率', '接通率', '掉话率', '切换成功率',
  'rate', 'ratio', 'percent', 'percentage', 'coverage'
];

/**
 * 占比关系关键词
 */
const PART_TO_WHOLE_KEYWORDS = [
  '占比', '比例', '分布', '份额', '组成', '构成',
  '占比', 'ratio', 'distribution', 'share', 'composition'
];

/**
 * 检测数据是否包含时间维度
 * @param {Array} data - 图表数据
 * @param {string} column - 列名
 * @returns {boolean}
 */
export function hasTimeDimension(data, column) {
  if (!data || data.length === 0) return false;

  const columnLower = column?.toLowerCase() || '';
  const firstRow = data[0];

  // 检查列名是否包含时间关键词
  if (TIME_KEYWORDS.some(kw => columnLower.includes(kw.toLowerCase()))) {
    return true;
  }

  // 检查列值是否像时间序列
  const columnValue = firstRow[column];
  if (typeof columnValue === 'string') {
    // 检查是否是日期格式
    if (/\d{4}[-/年]\d{1,2}/.test(columnValue) ||
        /\d{1,2}月/.test(columnValue) ||
        /Q[1-4]/.test(columnValue)) {
      return true;
    }
  }

  // 检查数据是否按时间排序
  const values = data.map(row => row[column]).filter(Boolean);
  if (values.length >= 3) {
    const isAscending = values.slice(1).every((v, i) => String(v) >= String(values[i]));
    if (isAscending && (values[0]?.toString().match(/\d{4}/) || values[0]?.toString().match(/\d{1,2}月/))) {
      return true;
    }
  }

  return false;
}

/**
 * 检测数据是否包含比率指标（0-100范围或百分比）
 * @param {Array} data - 图表数据
 * @param {Array} keys - 数据键数组
 * @returns {boolean}
 */
export function hasRatioMetrics(data, keys) {
  if (!data || data.length === 0 || !keys || keys.length === 0) return false;

  const firstRow = data[0];

  // 检查键名是否包含比率关键词
  const keyLower = keys.join(' ').toLowerCase();
  if (RATIO_KEYWORDS.some(kw => keyLower.includes(kw.toLowerCase()))) {
    return true;
  }

  // 检查数值范围是否在0-100之间
  for (const key of keys) {
    const value = firstRow[key];
    if (typeof value === 'number') {
      if (value >= 0 && value <= 100) {
        return true;
      }
      // 检查是否是百分比字符串
      const valueStr = String(value);
      if (valueStr.includes('%')) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 检测是否是占比/分布数据
 * @param {Array} data - 图表数据
 * @param {Array} keys - 数据键数组
 * @returns {boolean}
 */
export function isPartToWhole(data, keys) {
  if (!data || data.length === 0 || !keys || keys.length === 0) return false;

  // 数据量较少（2-8类）通常是占比数据
  if (data.length >= 2 && data.length <= 8) {
    return true;
  }

  // 检查键名是否包含占比关键词
  const keyLower = keys.join(' ').toLowerCase();
  if (PART_TO_WHOLE_KEYWORDS.some(kw => keyLower.includes(kw.toLowerCase()))) {
    return true;
  }

  return false;
}

/**
 * 获取类别数量
 * @param {Array} data - 图表数据
 * @param {string} column - 列名
 * @returns {number}
 */
function getCategoryCount(data, column) {
  if (!data || !column) return 0;
  const uniqueValues = new Set(data.map(row => row[column]).filter(Boolean));
  return uniqueValues.size;
}

/**
 * 推荐最佳图表类型
 * @param {Object} options - 分析选项
 * @param {Array} options.data - 图表数据
 * @param {Array} options.keys - 数据键数组
 * @param {string} options.column - 列名（通常是x轴）
 * @returns {Object} 推荐结果 { type: string, reason: string, confidence: string }
 */
export function recommendChartType({ data, keys, column }) {
  if (!data || data.length === 0 || !keys || keys.length === 0) {
    return { type: 'bar', reason: '默认柱状图', confidence: 'low' };
  }

  const hasTime = hasTimeDimension(data, column);
  const hasRatio = hasRatioMetrics(data, keys);
  const isPartWhole = isPartToWhole(data, keys);
  const categoryCount = getCategoryCount(data, column);
  const keyCount = keys.length;

  // 占比数据 (2-8类)
  if (isPartWhole && categoryCount >= 2 && categoryCount <= 8 && keyCount === 1) {
    return {
      type: 'pie',
      reason: '占比分布展示',
      confidence: 'high'
    };
  }

  // 时间序列 + 多指标
  if (hasTime && keyCount >= 2) {
    return {
      type: 'area',
      reason: '多指标趋势对比',
      confidence: 'high'
    };
  }

  // 时间序列 + 单指标
  if (hasTime && keyCount === 1) {
    return {
      type: 'line',
      reason: '趋势变化分析',
      confidence: 'high'
    };
  }

  // 类别 > 5 + 单指标 - 避免柱状图拥挤
  if (categoryCount > 5 && keyCount === 1) {
    return {
      type: 'line',
      reason: '避免柱状图拥挤',
      confidence: 'medium'
    };
  }

  // 3+类别 + 单指标
  if (categoryCount >= 3 && keyCount === 1) {
    return {
      type: 'bar',
      reason: '分类对比分析',
      confidence: 'high'
    };
  }

  // 2类别 + 多指标
  if (categoryCount === 2 && keyCount >= 2) {
    return {
      type: 'bar',
      reason: '多指标对比分析',
      confidence: 'high'
    };
  }

  // 类别 3-5 + 多指标
  if (categoryCount >= 3 && categoryCount <= 5 && keyCount >= 2) {
    return {
      type: 'bar',
      reason: '多维度对比分析',
      confidence: 'high'
    };
  }

  // 饼图数据但类别太多
  if (isPartWhole && categoryCount > 8) {
    return {
      type: 'bar',
      reason: '类别过多，改用柱状图',
      confidence: 'medium'
    };
  }

  // 默认使用柱状图
  return {
    type: 'bar',
    reason: '分类对比分析',
    confidence: 'medium'
  };
}

/**
 * 获取图表类型的中文名称
 * @param {string} type - 图表类型
 * @returns {string}
 */
export function getChartTypeName(type) {
  const names = {
    bar: '柱状图',
    line: '折线图',
    pie: '饼图',
    area: '面积图',
    radar: '雷达图'
  };
  return names[type] || '柱状图';
}

/**
 * 智能图表推荐函数
 * @param {Object} options - 推荐选项
 * @returns {Object} 包含推荐类型和原因的对象
 */
export function getChartRecommendation(options) {
  const recommendation = recommendChartType(options);
  return {
    ...recommendation,
    chartName: getChartTypeName(recommendation.type)
  };
}
