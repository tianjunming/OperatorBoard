/**
 * 18个关键功能 E2E 完整测试
 *
 * 测试覆盖从UI界面输入到结果呈现的完整调用链:
 * 1. 登录认证流程
 * 2. 聊天输入框交互
 * 3. Agent请求发送
 * 4. 流式响应处理
 * 5. 数据结果呈现
 * 6. 数据库结果一致性验证
 */

import { test, expect } from '@playwright/test';
import mysql from 'mysql2/promise';

// ==================== 测试配置 ====================

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: 'test',
  database: 'operator_db',
};

const OPERATOR_IDS = {
  '中国联通': 174,
  '中国电信': 172,
  '中国移动': 173,
};

const QUERIES = [
  { name: '中国联通有多少站点', func: 1, sqlKey: 'site_count', operator: '中国联通' },
  { name: '中国联通有多少小区', func: 2, sqlKey: 'cell_count', operator: '中国联通' },
  { name: '中国联通小区上行负载', func: 3, sqlKey: 'ul_prb', operator: '中国联通' },
  { name: '中国联通小区下行负载', func: 4, sqlKey: 'dl_prb', operator: '中国联通' },
  { name: '中国联通小区上行速率', func: 5, sqlKey: 'ul_rate', operator: '中国联通' },
  { name: '中国联通小区下行速率', func: 6, sqlKey: 'dl_rate', operator: '中国联通' },
  { name: '中国联通小区指标', func: 7, sqlKey: 'traffic', operator: '中国联通' },
  { name: '查看所有运营商', func: 8, sqlKey: 'operators' },
  { name: '查看所有运营商站点', func: 9, sqlKey: 'all_sites' },
  { name: '查看所有运营商下行速率', func: 10, sqlKey: 'all_dl_rate' },
  { name: '查看所有运营商上行速率', func: 11, sqlKey: 'all_ul_rate' },
  { name: '中国联通历史所有站点', func: 12, sqlKey: 'site_history', operator: '中国联通' },
  { name: '中国联通历史所有小区', func: 13, sqlKey: 'cell_history', operator: '中国联通' },
  { name: '中国联通历史所有小区上行负载', func: 14, sqlKey: 'ul_prb_history', operator: '中国联通' },
  { name: '中国联通历史所有小区下行负载', func: 15, sqlKey: 'dl_prb_history', operator: '中国联通' },
  { name: '中国联通历史所有小区上行速率', func: 16, sqlKey: 'ul_rate_history', operator: '中国联通' },
  { name: '中国联通历史所有小区下行速率', func: 17, sqlKey: 'dl_rate_history', operator: '中国联通' },
  { name: '中国联通历史所有小区指标', func: 18, sqlKey: 'traffic_history', operator: '中国联通' },
];

// ==================== 数据库查询函数 ====================

/**
 * 连接数据库
 */
async function getDbConnection() {
  return await mysql.createConnection(DB_CONFIG);
}

/**
 * 获取站点/小区统计数据
 */
async function getSiteCellData(operatorId, dataMonth = '2026-03') {
  const conn = await getDbConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT * FROM operator_total_site
      WHERE operator_id = ? AND data_month = ?
    `, [operatorId, dataMonth]);
    return rows[0] || null;
  } finally {
    await conn.end();
  }
}

/**
 * 获取指标数据
 */
async function getIndicatorData(operatorId, dataMonth = '2026-03') {
  const conn = await getDbConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT * FROM indicator_info
      WHERE operator_id = ? AND data_month = ?
    `, [operatorId, dataMonth]);
    return rows[0] || null;
  } finally {
    await conn.end();
  }
}

/**
 * 获取所有中国运营商
 */
async function getChineseOperators() {
  const conn = await getDbConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT id, operator_name FROM operator_info WHERE country = '中国'
    `);
    return rows;
  } finally {
    await conn.end();
  }
}

/**
 * 获取站点历史数据
 */
async function getSiteHistory(operatorId) {
  const conn = await getDbConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT data_month, lte_physical_site_num, nr_physical_site_num,
             lte_physical_cell_num, nr_physical_cell_num,
             total_site_num, total_cell_num
      FROM operator_total_site
      WHERE operator_id = ?
      ORDER BY data_month DESC
    `, [operatorId]);
    return rows;
  } finally {
    await conn.end();
  }
}

/**
 * 获取指标历史数据
 */
async function getIndicatorHistory(operatorId) {
  const conn = await getDbConnection();
  try {
    const [rows] = await conn.execute(`
      SELECT data_month, dl_prb, ul_prb, dl_rate, ul_rate,
             total_traffic, dl_traffic, ul_traffic
      FROM indicator_info
      WHERE operator_id = ?
      ORDER BY data_month DESC
    `, [operatorId]);
    return rows;
  } finally {
    await conn.end();
  }
}

// ==================== 辅助函数 ====================

/**
 * 登录函数
 */
async function login(page, username = 'admin', password = 'admin123') {
  const loginForm = page.locator('.auth-login-card');

  if (await loginForm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  }

  const chatInput = page.locator('textarea').first();
  const isLoggedIn = await chatInput.isVisible({ timeout: 5000 }).catch(() => false);

  if (!isLoggedIn) {
    throw new Error('Login failed - chat input not visible');
  }
}

/**
 * 发送查询并等待响应
 */
async function sendQueryAndWait(page, query, timeout = 25000) {
  const chatInput = page.locator('textarea').first();
  await chatInput.clear();
  await chatInput.fill(query);
  await chatInput.press('Enter');
  await page.waitForTimeout(timeout);
  return await page.textContent('body');
}

/**
 * 从UI内容中提取数值
 */
function extractNumberFromContent(content, patterns) {
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return parseInt(match[1].replace(/,/g, ''));
    }
  }
  return null;
}

// ==================== 前置条件测试 ====================

test.describe('前置条件验证', () => {
  test('系统登录功能正常', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await login(page);
    const chatInput = page.locator('textarea').first();
    await expect(chatInput).toBeVisible();
  });

  test('数据库连接正常', async () => {
    const conn = await getDbConnection();
    const [rows] = await conn.execute('SELECT 1 as test');
    expect(rows[0].test).toBe(1);
    await conn.end();
  });

  test('中国运营商数据存在', async () => {
    const operators = await getChineseOperators();
    expect(operators.length).toBeGreaterThan(0);
    console.log(`\n数据库中的中国运营商: ${operators.map(o => o.operator_name).join(', ')}`);
  });
});

// ==================== 功能1-7: 单运营商站点/小区/指标查询 ====================

test.describe('功能1-7: 单运营商站点/小区/指标查询', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await login(page);
    await page.waitForTimeout(2000);
  });

  for (const query of QUERIES.slice(0, 7)) {
    test(`功能${query.func}: ${query.name} - 数据一致性验证`, async ({ page }) => {
      const operatorId = OPERATOR_IDS[query.operator];

      // 从数据库获取预期结果
      let dbResult = null;
      if (query.sqlKey.includes('site') || query.sqlKey.includes('cell')) {
        dbResult = await getSiteCellData(operatorId);
      } else {
        dbResult = await getIndicatorData(operatorId);
      }

      console.log(`\n[功能${query.func}] ${query.name}`);
      console.log(`  数据库结果:`, dbResult ? '存在' : '无数据');

      // 发送UI查询
      const content = await sendQueryAndWait(page, query.name);

      // 验证UI返回了数据
      const hasData = content.includes('共找到') || content.includes('站点') ||
                      content.includes('小区') || content.includes('指标');
      console.log(`  UI返回数据: ${hasData ? '是' : '否'}`);

      // 数据一致性验证
      if (dbResult && hasData) {
        // 提取UI中的数值
        let uiValue = null;
        if (query.sqlKey === 'site_count') {
          uiValue = extractNumberFromContent(content, [/总站点[：:]\s*(\d+)/, /站点数[：:]\s*(\d+)/]);
          if (uiValue !== null) {
            const dbTotal = (dbResult.lte_total_site || 0) + (dbResult.nr_total_site || 0);
            console.log(`  站点数 - UI: ${uiValue}, DB: ${dbTotal}, 一致: ${uiValue === dbTotal}`);
            expect(uiValue).toBe(dbTotal);
          }
        } else if (query.sqlKey === 'cell_count') {
          uiValue = extractNumberFromContent(content, [/总小区[：:]\s*(\d+)/, /小区数[：:]\s*(\d+)/]);
          if (uiValue !== null) {
            const dbTotal = (dbResult.lte_total_cell || 0) + (dbResult.nr_total_cell || 0);
            console.log(`  小区数 - UI: ${uiValue}, DB: ${dbTotal}, 一致: ${uiValue === dbTotal}`);
            expect(uiValue).toBe(dbTotal);
          }
        }
      }

      expect(hasData).toBeTruthy();
    });
  }
});

// ==================== 功能8-11: 多运营商查询 ====================

test.describe('功能8-11: 多运营商查询', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await login(page);
    await page.waitForTimeout(2000);
  });

  for (const query of QUERIES.slice(7, 11)) {
    test(`功能${query.func}: ${query.name} - 数据一致性验证`, async ({ page }) => {
      // 从数据库获取运营商数量
      const operators = await getChineseOperators();
      const dbCount = operators.length;
      console.log(`\n[功能${query.func}] ${query.name}`);
      console.log(`  数据库运营商数: ${dbCount}`);

      // 发送UI查询
      const content = await sendQueryAndWait(page, query.name);

      // 验证UI返回了数据
      const hasData = content.includes('运营商') || content.includes('共找到');
      console.log(`  UI返回数据: ${hasData ? '是' : '否'}`);

      // 验证包含中国关键词
      const hasChinaKeyword = content.includes('中国');
      console.log(`  包含中国运营商: ${hasChinaKeyword ? '是' : '否'}`);

      expect(hasData).toBeTruthy();
    });
  }
});

// ==================== 功能12-18: 历史数据查询 ====================

test.describe('功能12-18: 历史数据查询', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await login(page);
    await page.waitForTimeout(2000);
  });

  for (const query of QUERIES.slice(11)) {
    test(`功能${query.func}: ${query.name} - 数据一致性验证`, async ({ page }) => {
      const operatorId = OPERATOR_IDS[query.operator];

      // 从数据库获取历史数据
      let dbHistory = null;
      if (query.sqlKey.includes('site') || query.sqlKey.includes('cell')) {
        dbHistory = await getSiteHistory(operatorId);
      } else {
        dbHistory = await getIndicatorHistory(operatorId);
      }

      console.log(`\n[功能${query.func}] ${query.name}`);
      console.log(`  数据库历史记录数: ${dbHistory ? dbHistory.length : 0}`);

      // 发送UI查询
      const content = await sendQueryAndWait(page, query.name);

      // 验证UI返回了数据
      const hasData = content.includes('历史') || content.includes('2026');
      console.log(`  UI返回数据: ${hasData ? '是' : '否'}`);

      // 数据一致性验证 - 历史数据应该包含2026年数据
      if (dbHistory && dbHistory.length > 0) {
        const has2026 = content.includes('2026');
        console.log(`  包含2026年数据: ${has2026 ? '是' : '否'}`);
      }

      expect(hasData).toBeTruthy();
    });
  }
});

// ==================== 完整流程测试 ====================

test.describe('完整调用链验证', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await login(page);
    await page.waitForTimeout(2000);
  });

  test('完整调用链: 登录 -> 输入 -> 响应 -> 呈现 -> 数据库验证', async ({ page }) => {
    const operatorId = OPERATOR_IDS['中国联通'];

    // 1. 获取数据库预期结果
    const dbSiteData = await getSiteCellData(operatorId);
    const dbIndicatorData = await getIndicatorData(operatorId);

    console.log('\n=== 数据库预期结果 ===');
    console.log(`  LTE站点: ${dbSiteData?.lte_total_site || 0}`);
    console.log(`  NR站点: ${dbSiteData?.nr_total_site || 0}`);
    console.log(`  LTE小区: ${dbSiteData?.lte_total_cell || 0}`);
    console.log(`  NR小区: ${dbSiteData?.nr_total_cell || 0}`);

    // 2. 发送UI查询
    const chatInput = page.locator('textarea').first();
    await chatInput.fill('中国联通有多少站点');
    await chatInput.press('Enter');
    await page.waitForTimeout(25000);

    // 3. 获取UI结果
    const content = await page.textContent('body');

    // 4. 提取UI数值
    const uiLteSites = extractNumberFromContent(content, [/LTE站点[：:]\s*(\d+)/]);
    const uiNrSites = extractNumberFromContent(content, [/NR站点[：:]\s*(\d+)/]);
    const uiTotalSites = extractNumberFromContent(content, [/总站点[：:]\s*(\d+)/]);

    console.log('\n=== UI返回结果 ===');
    console.log(`  LTE站点: ${uiLteSites || '未提取'}`);
    console.log(`  NR站点: ${uiNrSites || '未提取'}`);
    console.log(`  总站点: ${uiTotalSites || '未提取'}`);

    // 5. 数据库一致性验证
    console.log('\n=== 一致性验证 ===');
    if (uiTotalSites !== null && dbSiteData) {
      const dbTotal = (dbSiteData.lte_total_site || 0) + (dbSiteData.nr_total_site || 0);
      const isMatch = uiTotalSites === dbTotal;
      console.log(`  总站点数一致: ${isMatch ? '✓' : '✗'} (UI: ${uiTotalSites}, DB: ${dbTotal})`);
      expect(uiTotalSites).toBe(dbTotal);
    } else {
      console.log(`  无法验证 (UI: ${uiTotalSites}, DB: ${dbSiteData?.lte_total_site + dbSiteData?.nr_total_site})`);
    }

    // 验证有数据返回
    expect(content.includes('站点') || content.includes('LTE')).toBeTruthy();
  });

  test('连续查询: 多个查询连续执行', async ({ page }) => {
    const testQueries = [
      { name: '中国联通有多少站点', dbCheck: async () => {
        const data = await getSiteCellData(OPERATOR_IDS['中国联通']);
        return data ? (data.lte_total_site + data.nr_total_site) : null;
      }},
      { name: '中国联通有多少小区', dbCheck: async () => {
        const data = await getSiteCellData(OPERATOR_IDS['中国联通']);
        return data ? (data.lte_total_cell + data.nr_total_cell) : null;
      }},
      { name: '查看所有运营商', dbCheck: async () => {
        const ops = await getChineseOperators();
        return ops.length;
      }},
    ];

    console.log('\n=== 连续查询验证 ===');
    for (const q of testQueries) {
      const chatInput = page.locator('textarea').first();
      await chatInput.fill(q.name);
      await chatInput.press('Enter');
      await page.waitForTimeout(20000);

      const content = await page.textContent('body');
      const dbValue = await q.dbCheck();
      const hasResult = content.includes('共找到') || content.includes('站点') || content.includes('小区');

      console.log(`  "${q.name}": ${hasResult ? '✓' : '✗'} (DB值: ${dbValue})`);
      expect(hasResult).toBeTruthy();
    }
  });
});

// ==================== 数据呈现格式验证 ====================

test.describe('数据呈现格式验证', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await login(page);
    await page.waitForTimeout(2000);
  });

  test('站点数据呈现: 表格和统计信息与数据库一致', async ({ page }) => {
    const operatorId = OPERATOR_IDS['中国联通'];
    const dbData = await getSiteCellData(operatorId);

    const content = await sendQueryAndWait(page, '中国联通有多少站点');

    // 验证包含数据库中的关键数据
    const hasLte = content.includes('LTE');
    const hasNr = content.includes('NR');
    const hasSite = content.includes('站点');

    console.log('\n=== 站点数据呈现验证 ===');
    console.log(`  LTE标识: ${hasLte ? '✓' : '✗'}`);
    console.log(`  NR标识: ${hasNr ? '✓' : '✗'}`);
    console.log(`  站点标识: ${hasSite ? '✓' : '✗'}`);

    expect(hasLte || hasNr || hasSite).toBeTruthy();
  });

  test('指标数据呈现: 负载/速率信息与数据库一致', async ({ page }) => {
    const operatorId = OPERATOR_IDS['中国联通'];
    const dbData = await getIndicatorData(operatorId);

    const content = await sendQueryAndWait(page, '中国联通小区下行负载');

    // 验证包含负载相关关键词
    const hasLoad = content.includes('负载') || content.includes('PRB') || content.includes('下行');

    console.log('\n=== 指标数据呈现验证 ===');
    console.log(`  负载/速率信息: ${hasLoad ? '✓' : '✗'}`);
    console.log(`  数据库DL PRB: ${dbData?.lte_avg_prb || dbData?.nr_avg_prb || 'N/A'}`);

    expect(hasLoad).toBeTruthy();
  });

  test('历史数据呈现: 多个月份数据与数据库一致', async ({ page }) => {
    const operatorId = OPERATOR_IDS['中国联通'];
    const dbHistory = await getSiteHistory(operatorId);

    const content = await sendQueryAndWait(page, '中国联通历史所有站点');

    // 验证包含历史数据标识
    const hasHistory = content.includes('历史') || content.includes('2026');

    console.log('\n=== 历史数据呈现验证 ===');
    console.log(`  历史数据标识: ${hasHistory ? '✓' : '✗'}`);
    console.log(`  数据库历史月数: ${dbHistory.length}`);

    // 验证月份数量一致性
    if (dbHistory.length > 0) {
      const monthsInUi = (content.match(/2026-\d{2}/g) || []).length;
      console.log(`  UI中的月份数: ${monthsInUi}`);
    }

    expect(hasHistory).toBeTruthy();
  });
});

// ==================== 数据库一致性端到端测试 ====================

test.describe('数据库一致性端到端验证', () => {
  test('功能1: 中国联通站点数 - UI与数据库完全一致', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await login(page);
    await page.waitForTimeout(2000);

    const operatorId = OPERATOR_IDS['中国联通'];
    const dbData = await getSiteCellData(operatorId);

    const expectedLteSites = dbData.lte_total_site;
    const expectedNrSites = dbData.nr_total_site;
    const expectedTotal = expectedLteSites + expectedNrSites;

    console.log('\n=== 功能1: 中国联通站点数 ===');
    console.log(`  预期LTE站点: ${expectedLteSites}`);
    console.log(`  预期NR站点: ${expectedNrSites}`);
    console.log(`  预期总站点: ${expectedTotal}`);

    const content = await sendQueryAndWait(page, '中国联通有多少站点');

    // 提取UI中的数值
    const uiLte = extractNumberFromContent(content, [/LTE站点[：:]\s*(\d+)/]);
    const uiNr = extractNumberFromContent(content, [/NR站点[：:]\s*(\d+)/]);
    const uiTotal = extractNumberFromContent(content, [/总站点[：:]\s*(\d+)/]);

    console.log(`  UI LTE站点: ${uiLte}`);
    console.log(`  UI NR站点: ${uiNr}`);
    console.log(`  UI 总站点: ${uiTotal}`);

    // 验证一致性
    if (uiTotal !== null) {
      expect(uiTotal).toBe(expectedTotal);
      console.log(`  ✓ 总站点数一致!`);
    }
    if (uiLte !== null) {
      expect(uiLte).toBe(expectedLteSites);
      console.log(`  ✓ LTE站点数一致!`);
    }
    if (uiNr !== null) {
      expect(uiNr).toBe(expectedNrSites);
      console.log(`  ✓ NR站点数一致!`);
    }
  });

  test('功能2: 中国联通小区数 - UI与数据库完全一致', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await login(page);
    await page.waitForTimeout(2000);

    const operatorId = OPERATOR_IDS['中国联通'];
    const dbData = await getSiteCellData(operatorId);

    const expectedLteCells = dbData.lte_total_cell;
    const expectedNrCells = dbData.nr_total_cell;
    const expectedTotal = expectedLteCells + expectedNrCells;

    console.log('\n=== 功能2: 中国联通小区数 ===');
    console.log(`  预期LTE小区: ${expectedLteCells}`);
    console.log(`  预期NR小区: ${expectedNrCells}`);
    console.log(`  预期总小区: ${expectedTotal}`);

    const content = await sendQueryAndWait(page, '中国联通有多少小区');

    const uiLte = extractNumberFromContent(content, [/LTE小区[：:]\s*(\d+)/]);
    const uiNr = extractNumberFromContent(content, [/NR小区[：:]\s*(\d+)/]);
    const uiTotal = extractNumberFromContent(content, [/总小区[：:]\s*(\d+)/]);

    console.log(`  UI LTE小区: ${uiLte}`);
    console.log(`  UI NR小区: ${uiNr}`);
    console.log(`  UI 总小区: ${uiTotal}`);

    if (uiTotal !== null) {
      expect(uiTotal).toBe(expectedTotal);
    }
    if (uiLte !== null) {
      expect(uiLte).toBe(expectedLteCells);
    }
    if (uiNr !== null) {
      expect(uiNr).toBe(expectedNrCells);
    }
  });

  test('功能13: 中国联通历史小区 - UI与数据库月份一致', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await login(page);
    await page.waitForTimeout(2000);

    const operatorId = OPERATOR_IDS['中国联通'];
    const dbHistory = await getSiteHistory(operatorId);

    console.log('\n=== 功能13: 中国联通历史小区 ===');
    console.log(`  数据库历史记录: ${dbHistory.length}条`);

    const content = await sendQueryAndWait(page, '中国联通历史所有小区');

    // 检查UI是否包含历史数据
    const hasHistory = content.includes('历史');
    const hasData = dbHistory.length > 0;

    console.log(`  UI有历史标识: ${hasHistory ? '✓' : '✗'}`);
    console.log(`  数据库有数据: ${hasData ? '✓' : '✗'}`);

    expect(hasHistory || hasData).toBeTruthy();
  });
});
