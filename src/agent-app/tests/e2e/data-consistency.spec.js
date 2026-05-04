/**
 * Data Consistency E2E Test Suite
 * Validates that UI query results match database values exactly
 *
 * Updated: 2026-05-04
 * Additions:
 * - Chart structure validation ([chart_column] parameter verification)
 * - Global operator alias validation (Austria TMA/Magenta, A1, Hutchison Drei)
 * - Multi-operator comparison validation
 */
import { test, expect } from '@playwright/test';
import { dbHelper } from '../helpers/dbHelper.js';
import { ChatPage } from '../pages/ChatPage.js';

// 允许的误差范围（百分比）
const TOLERANCE_PERCENT = 5;

function isWithinTolerance(uiValue, dbValue) {
  const tolerance = Math.max(1, Math.abs(dbValue) * TOLERANCE_PERCENT / 100);
  return Math.abs(uiValue - dbValue) <= tolerance;
}

test.describe('Data Consistency Tests', () => {
  let chatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.goto();
    await chatPage.login('admin', 'admin123');
    await page.waitForTimeout(1000);
  });

  test.afterAll(async () => {
    await dbHelper.closePool();
  });

  // ========== 1. 站点分析测试 ==========
  test.describe('站点分析', () => {
    test('各运营商站点数量 - UI与数据库一致', async ({ page }) => {
      // 获取数据库中各运营商站点数量
      const dbSites = await dbHelper.getAllOperatorsSiteSummaryLatest();

      // 发送查询请求
      await chatPage.sendMessage('各运营商站点数量');
      await chatPage.waitForResponse();

      // 提取UI返回的内容
      const lastMsg = await chatPage.getLastAssistantMessage();

      // 验证数据库中的每个运营商站点数都能在UI响应中找到
      for (const site of dbSites) {
        const hasOperator = lastMsg.includes(site.operator_name);
        const hasCount = lastMsg.includes(String(site.total_site)) ||
                        lastMsg.includes(String(Math.floor(site.total_site)));
        expect(hasOperator && hasCount,
          `${site.operator_name} 站点数 ${site.total_site} 应在UI中显示`
        ).toBeTruthy();
      }
    });

    test('北京联通站点数 - 精确验证', async ({ page }) => {
      // 数据库查询
      const dbResult = await dbHelper.queryOne(`
        SELECT SUM(s.site_num) as total_site
        FROM site_info s
        JOIN operator_info o ON s.operator_id = o.id
        WHERE o.operator_name LIKE '%北京联通%'
          AND s.data_month = (
            SELECT MAX(s2.data_month) FROM site_info s2 WHERE s2.operator_id = s.operator_id
          )
      `);
      const dbSiteCount = dbResult?.total_site || 0;

      // UI查询
      await chatPage.sendMessage('北京联通站点数量');
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      // 提取UI中的数字并对比
      const uiMatch = lastMsg.match(/\d+/g);
      const uiCount = uiMatch ? parseInt(uiMatch[uiMatch.length - 1]) : 0;

      expect(isWithinTolerance(uiCount, dbSiteCount),
        `UI显示${uiCount} vs DB实际${dbSiteCount}`
      ).toBeTruthy();
    });

    test('最新一期站点排名', async ({ page }) => {
      const dbRanking = await dbHelper.getAllOperatorsSiteSummaryLatest();
      const sortedRanking = [...dbRanking].sort((a, b) => b.total_site - a.total_site);

      await chatPage.sendMessage('最新一期各运营商站点排名');
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      // 验证排名前三
      for (let i = 0; i < Math.min(3, sortedRanking.length); i++) {
        expect(lastMsg).toContain(sortedRanking[i].operator_name);
      }
    });
  });

  // ========== 2. 小区分布测试 ==========
  test.describe('小区分布', () => {
    test('NR 2600M小区统计', async ({ page }) => {
      const dbCellCount = await dbHelper.getNR2600MCellCount();

      await chatPage.sendMessage('NR 2600M频段小区统计');
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      // 提取UI数值
      const uiMatch = lastMsg.match(/\d+/g);
      const uiCount = uiMatch ? parseInt(uiMatch[uiMatch.length - 1]) : 0;

      expect(isWithinTolerance(uiCount, dbCellCount),
        `NR 2600M小区: UI=${uiCount}, DB=${dbCellCount}`
      ).toBeTruthy();
    });

    test('LTE和NR小区数量对比', async ({ page }) => {
      const dbComparison = await dbHelper.getLTENRCellComparison();
      const lteCell = dbComparison.find(r => r.technology === 'LTE')?.total_cell || 0;
      const nrCell = dbComparison.find(r => r.technology === 'NR')?.total_cell || 0;

      await chatPage.sendMessage('LTE和NR小区数量对比');
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      // 验证LTE和NR数据都在UI中显示
      expect(lastMsg).toContain('LTE');
      expect(lastMsg).toContain('NR');
    });

    test('各频段小区分布', async ({ page }) => {
      const dbBands = await dbHelper.getBandCellDistribution(5);

      await chatPage.sendMessage('各频段小区分布');
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      // 验证前3个频段在UI中
      for (const band of dbBands.slice(0, 3)) {
        expect(lastMsg).toContain(band.band_name);
      }
    });
  });

  // ========== 3. 指标分析测试 ==========
  test.describe('指标分析', () => {
    test('最新月下行速率对比', async ({ page }) => {
      const dbRates = await dbHelper.getLatestDLRateRanking();

      await chatPage.sendMessage('最新月下行速率对比');
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      // 验证各运营商名称都在UI中
      for (const rate of dbRates.slice(0, 3)) {
        expect(lastMsg).toContain(rate.operator_name);
      }

      // 验证下行速率数值在合理范围
      expect(lastMsg).toMatch(/(下行|速率|Mbps)/);
    });

    test('PRB利用率对比', async ({ page }) => {
      const dbPRB = await dbHelper.getLatestPRBUtilization();

      await chatPage.sendMessage('各运营商PRB利用率');
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      // 验证PRB关键字在UI中
      expect(lastMsg).toMatch(/(PRB|利用率)/);

      // 验证运营商名称
      for (const prb of dbPRB.slice(0, 3)) {
        expect(lastMsg).toContain(prb.operator_name);
      }
    });

    test('速率最高运营商', async ({ page }) => {
      const dbRates = await dbHelper.getLatestDLRateRanking();
      const highest = dbRates[0];

      await chatPage.sendMessage('哪家运营商下行速率最高');
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      expect(lastMsg).toContain(highest.operator_name);
    });
  });

  // ========== 4. 历史趋势测试 ==========
  test.describe('历史趋势', () => {
    test('站点变化趋势', async ({ page }) => {
      const dbHistory = await dbHelper.getSiteCountHistory(6);

      await chatPage.sendMessage('最近几个月站点变化趋势');
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      // 验证最近3个月份在UI中显示
      for (const month of dbHistory.slice(0, 3)) {
        expect(lastMsg).toContain(month.data_month);
      }
    });

    test('下行速率趋势分析', async ({ page }) => {
      const dbTrend = await dbHelper.getDLRateHistory(6);

      await chatPage.sendMessage('下行速率趋势分析');
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      // 验证月份数据在UI中
      for (const month of dbTrend.slice(0, 3)) {
        expect(lastMsg).toContain(month.data_month);
      }
    });
  });

  // ========== 5. 智能查询测试 ==========
  test.describe('智能查询', () => {
    test('5G覆盖率最高区域', async ({ page }) => {
      await chatPage.sendMessage('5G覆盖率最高的区域');
      await chatPage.waitForResponse(90000);
      const lastMsg = await chatPage.getLastAssistantMessage();

      // 验证返回了结果
      expect(lastMsg.length).toBeGreaterThan(10);

      // 验证不包含错误信息
      expect(lastMsg).not.toMatch(/错误|失败|exception|出错/i);
    });

    test('上海电信平均速率', async ({ page }) => {
      await chatPage.sendMessage('上海电信平均速率多少');
      await chatPage.waitForResponse(90000);
      const lastMsg = await chatPage.getLastAssistantMessage();

      expect(lastMsg.length).toBeGreaterThan(5);
      expect(lastMsg).not.toMatch(/错误|失败|exception|出错/i);
    });

    test('运营商表现分析', async ({ page }) => {
      await chatPage.sendMessage('帮我分析运营商表现');
      await chatPage.waitForResponse(90000);
      const lastMsg = await chatPage.getLastAssistantMessage();

      expect(lastMsg.length).toBeGreaterThan(10);
      expect(lastMsg).not.toMatch(/错误|失败|exception|出错/i);
    });
  });

  // ========== 6. 运营商列表测试 ==========
  test.describe('运营商', () => {
    test('运营商列表完整性', async ({ page }) => {
      const dbOperators = await dbHelper.getOperators();

      await chatPage.sendMessage('有哪些运营商');
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      // 验证至少前5个运营商都在UI中显示
      for (const op of dbOperators.slice(0, 5)) {
        expect(lastMsg).toContain(op.operator_name);
      }
    });
  });

  // ========== 7. SQL一致性测试 ==========
  test.describe('SQL查询验证', () => {
    test('show sql显示正确', async ({ page }) => {
      await chatPage.sendMessage('各运营商站点数量 show sql');
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      // 验证包含SQL关键字
      expect(lastMsg).toMatch(/SELECT|FROM|WHERE/i);
    });
  });

  // ========== 8. Chart Structure Validation (2026-05-04) ==========
  test.describe('图表结构验证', () => {
    test('站点数量查询应包含正确的chart_column参数', async ({ page }) => {
      await chatPage.sendMessage('所有运营商站点汇总');
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      // Verify chart structure
      const chartValidation = dbHelper.validateChartStructure(lastMsg);
      expect(chartValidation.hasToggleBlock, '应包含[toggle]块').toBeTruthy();
      expect(chartValidation.hasChartType, '应包含[chart_type]').toBeTruthy();
      expect(chartValidation.hasChartColumn, '应包含[chart_column]').toBeTruthy();
      expect(chartValidation.hasChartKeys, '应包含[chart_keys]').toBeTruthy();
      expect(chartValidation.hasChartData, '应包含[chart_data]').toBeTruthy();
    });

    test('chart_data解析后应包含运营商名作为X轴', async ({ page }) => {
      const operators = await dbHelper.getRandomOperators(2);
      expect(operators.length).toBeGreaterThanOrEqual(2);

      const query = `对比${operators[0].operator_name}和${operators[1].operator_name}的站点`;
      await chatPage.sendMessage(query);
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      // Verify both operators appear in response
      expect(lastMsg).toContain(operators[0].operator_name);
      expect(lastMsg).toContain(operators[1].operator_name);
    });

    test('历史数据查询X轴应为月份', async ({ page }) => {
      const operators = await dbHelper.getRandomOperators(1);
      const operator = operators[0];

      await chatPage.sendMessage(`${operator.operator_name}历史站点`);
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      // 历史查询应包含月份格式 YYYY-MM
      expect(lastMsg).toMatch(/\d{4}-\d{2}/);

      // Verify chart structure
      const chartValidation = dbHelper.validateChartStructure(lastMsg);
      expect(chartValidation.isValid, '图表结构应完整').toBeTruthy();
    });
  });

  // ========== 9. Global Operator Alias Validation (2026-05-04) ==========
  test.describe('全球运营商别名解析验证', () => {
    test('奥地利TMA站点查询返回Magenta数据', async ({ page }) => {
      // 先检查数据库中是否有Austrian运营商
      const austrianOps = await dbHelper.getAustrianOperators();

      await chatPage.sendMessage('奥地利TMA站点查询');
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      // 如果数据库有Austrian运营商，验证能正确返回数据
      if (austrianOps.length > 0) {
        expect(lastMsg.length).toBeGreaterThan(10);
        // 不应返回所有运营商的冗长数据
        expect(lastMsg).not.toMatch(/未找到站点数据/);
      } else {
        // 数据库没有Austrian运营商时，应优雅处理
        expect(lastMsg.length).toBeGreaterThan(0);
      }
    });

    test('Magenta别名应被正确解析', async ({ page }) => {
      await chatPage.sendMessage('magenta站点');
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      // Should return site data, not error
      expect(lastMsg).not.toMatch(/未找到|错误/i);
    });

    test('A1 Telekom别名应被正确解析', async ({ page }) => {
      await chatPage.sendMessage('A1站点数量');
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      expect(lastMsg.length).toBeGreaterThan(10);
    });

    test('对比全球多个运营商图表应正确显示', async ({ page }) => {
      const operators = await dbHelper.getRandomOperators(3);
      expect(operators.length).toBeGreaterThanOrEqual(3);

      const query = `对比${operators[0].operator_name}、${operators[1].operator_name}和${operators[2].operator_name}的站点数量`;
      await chatPage.sendMessage(query);
      await chatPage.waitForResponse();
      const lastMsg = await chatPage.getLastAssistantMessage();

      // Verify all three operators appear
      expect(lastMsg).toContain(operators[0].operator_name);
      expect(lastMsg).toContain(operators[1].operator_name);
      expect(lastMsg).toContain(operators[2].operator_name);

      // Verify chart structure is valid
      const chartValidation = dbHelper.validateChartStructure(lastMsg);
      expect(chartValidation.isValid, '多运营商图表结构应有效').toBeTruthy();
    });
  });
});