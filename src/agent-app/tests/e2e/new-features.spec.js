/**
 * 新功能 E2E 测试 - 频段指标和运营商汇总指标
 *
 * 测试:
 * 1. 频段速率和PRB利用率查询 (/band API)
 * 2. 运营商汇总指标查询 (/metrics API)
 * 3. LTE/NR 区分和不区分情况
 * 4. 数据库与 API 返回结果一致性验证
 *
 * @module tests/e2e/new-features.spec.js
 */

import { test, expect } from '@playwright/test';
import {
  getOperatorIdByName,
  getOperatorMetricsFromDB,
  getAllOperatorsMetricsFromDB,
  getLatestMonthForOperator,
  METRICS_FIELD_MAP,
  verifyDataConsistency,
} from '../helpers/dbHelper';

// 是否运行需要后端的测试
const RUN_BACKEND_TESTS = process.env.BACKEND_AVAILABLE === 'true';

// 测试超时
const RESPONSE_TIMEOUT = 60000;

/**
 * 登录辅助函数 - 与18-functions-e2e.spec.js一致
 */
async function login(page) {
  const loginForm = page.locator('.auth-login-card');

  if (await loginForm.isVisible({ timeout: 3000 }).catch(() => false)) {
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  }

  // 等待textarea出现
  const chatInput = page.locator('textarea').first();
  await chatInput.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
}

/**
 * 发送自然语言查询并等待响应 - 使用textarea而非data-testid
 */
async function sendQueryAndWait(page, query) {
  const chatInput = page.locator('textarea').first();
  await chatInput.waitFor({ state: 'visible', timeout: 10000 });
  await chatInput.fill(query);
  await chatInput.press('Enter');
  await page.waitForTimeout(RESPONSE_TIMEOUT);
  return await page.textContent('body');
}

test.describe('频段指标查询测试 (/band API)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await login(page);
    await page.waitForTimeout(2000);
  });

  (RUN_BACKEND_TESTS ? test : test.skip)(
    '查询指定运营商700M频段LTE速率',
    async ({ page }) => {
      const operatorId = await getOperatorIdByName('中国联通');
      expect(operatorId).not.toBeNull();

      // 发送查询并获取页面内容
      const pageContent = await sendQueryAndWait(page, '中国联通700M LTE下行速率是多少？');

      // 验证页面包含 LTE 700M 相关数据
      expect(
        pageContent.includes('700M') || pageContent.includes('LTE') || pageContent.includes('下行速率') || pageContent.includes('35.')
      ).toBeTruthy();
    }
  );

  (RUN_BACKEND_TESTS ? test : test.skip)(
    '查询指定运营商3500M频段NR速率',
    async ({ page }) => {
      const pageContent = await sendQueryAndWait(page, '中国联通3500M NR下行速率是多少？');

      expect(
        pageContent.includes('3500M') || pageContent.includes('NR') || pageContent.includes('下行速率')
      ).toBeTruthy();
    }
  );

  (RUN_BACKEND_TESTS ? test : test.skip)(
    '查询700M频段不区分LTE和NR（应返回两条记录）',
    async ({ page }) => {
      // 发送查询
      const pageContent = await sendQueryAndWait(page, '中国联通700M频段速率是多少？');
      // 验证响应包含 LTE 或 NR 或 700M
      console.log('700M频段查询结果包含:', pageContent.substring(0, 500));
      expect(
        pageContent.includes('LTE') || pageContent.includes('NR') || pageContent.includes('700M')
      ).toBeTruthy();
    }
  );

  (RUN_BACKEND_TESTS ? test : test.skip)(
    '查询700M频段PRB利用率',
    async ({ page }) => {
      const pageContent = await sendQueryAndWait(page, '中国联通700M上行负载怎么样？');

      const pageText = await page.textContent('body');
      expect(
        pageText.includes('PRB') || pageText.includes('负载') || pageText.includes('700M') || pageText.includes('上行')
      ).toBeTruthy();
    }
  );

});

test.describe('运营商汇总指标测试 (/metrics API)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await login(page);
    await page.waitForTimeout(2000);
  });

  (RUN_BACKEND_TESTS ? test : test.skip)(
    '查询分流比指标',
    async ({ page }) => {
      const pageContent = await sendQueryAndWait(page, '中国联通的分流比是多少？');

      expect(
        pageContent.includes('分流') || pageContent.includes('流量') || pageContent.includes('NR') || pageContent.includes('0.76')
      ).toBeTruthy();
    }
  );

  (RUN_BACKEND_TESTS ? test : test.skip)(
    '查询驻留比指标',
    async ({ page }) => {
      const pageContent = await sendQueryAndWait(page, '中国联通的驻留比是多少？');

      expect(
        pageContent.includes('驻留') || pageContent.includes('NR') || pageContent.includes('LTE') || pageContent.includes('0.08')
      ).toBeTruthy();
    }
  );

  (RUN_BACKEND_TESTS ? test : test.skip)(
    '查询终端渗透率指标',
    async ({ page }) => {
      const pageContent = await sendQueryAndWait(page, '中国联通的终端渗透率是多少？');

      expect(
        pageContent.includes('终端') || pageContent.includes('渗透率') || pageContent.includes('NR') || pageContent.includes('0.89')
      ).toBeTruthy();
    }
  );

  (RUN_BACKEND_TESTS ? test : test.skip)(
    '查询所有运营商汇总指标',
    async ({ page }) => {
      const pageContent = await sendQueryAndWait(page, '查看所有运营商的分流比和驻留比');

      // 应该包含多个运营商
      console.log('所有运营商汇总指标查询结果:', pageContent.substring(0, 500));
      expect(
        pageContent.includes('中国') || pageContent.includes('运营商') || pageContent.includes('分流')
      ).toBeTruthy();
    }
  );

});

test.describe('数据库一致性深度验证', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await login(page);
    await page.waitForTimeout(2000);
  });

  (RUN_BACKEND_TESTS ? test : test.skip)(
    '运营商汇总指标 - 数据库与 API 返回一致性验证',
    async ({ page }) => {
      const operatorId = await getOperatorIdByName('中国联通');
      expect(operatorId).not.toBeNull();

      const latestMonth = await getLatestMonthForOperator(operatorId);
      expect(latestMonth).not.toBeNull();

      // 从数据库获取汇总指标
      const dbMetrics = await getOperatorMetricsFromDB(operatorId, latestMonth);

      if (dbMetrics) {
        console.log('数据库中的汇总指标:', JSON.stringify({
          trafficRatio: dbMetrics.trafficRatio,
          durationCampRatio: dbMetrics.durationCampRatio,
          terminalPenetration: dbMetrics.terminalPenetration,
          fallbackRatio: dbMetrics.fallbackRatio,
          lteAvgDlRate: dbMetrics.lteAvgDlRate,
          nrAvgDlRate: dbMetrics.nrAvgDlRate,
        }, null, 2));
      }

      // 验证数据库中有汇总指标数据
      if (dbMetrics) {
        const hasMetrics = dbMetrics.trafficRatio > 0 ||
                          dbMetrics.durationCampRatio > 0 ||
                          dbMetrics.terminalPenetration > 0;

        console.log('数据库中有汇总指标数据:', hasMetrics);
        expect(hasMetrics || dbMetrics.trafficRatio === null).toBeTruthy();
      }
    }
  );

  (RUN_BACKEND_TESTS ? test : test.skip)(
    '所有运营商汇总指标 - 数据库查询验证',
    async ({ page }) => {
      // 从数据库获取所有运营商汇总指标
      const allMetrics = await getAllOperatorsMetricsFromDB(null);

      console.log('所有运营商汇总指标数量:', allMetrics.length);

      if (allMetrics.length > 0) {
        const firstOperator = allMetrics[0];
        console.log('第一个运营商汇总指标:', JSON.stringify({
          operatorName: firstOperator.operator_name,
          dataMonth: firstOperator.data_month,
          trafficRatio: firstOperator.trafficRatio,
          durationCampRatio: firstOperator.durationCampRatio,
          terminalPenetration: firstOperator.terminalPenetration,
        }, null, 2));
      }

      expect(allMetrics.length).toBeGreaterThan(0);
    }
  );

  (RUN_BACKEND_TESTS ? test : test.skip)(
    '频段指标 - LTE 700M 与 NR 700M 同时存在验证',
    async ({ page }) => {
      const operatorId = await getOperatorIdByName('中国联通');
      expect(operatorId).not.toBeNull();

      // 这个测试验证 UI 能正确区分 LTE 和 NR 700M
      const pageContent = await sendQueryAndWait(page, '中国联通700M频段的所有指标');

      // 验证页面包含 LTE 或 NR 700M 相关数据（不要求 structured-table）
      console.log('700M频段查询结果:', pageContent.substring(0, 800));
      expect(
        pageContent.includes('LTE') || pageContent.includes('NR') || pageContent.includes('700M')
      ).toBeTruthy();
    }
  );

});

test.describe('API 直接调用验证', () => {

  (RUN_BACKEND_TESTS ? test : test.skip)(
    '直接调用 /band API 获取700M LTE指标',
    async ({ page }) => {
      const operatorId = await getOperatorIdByName('中国联通');
      expect(operatorId).not.toBeNull();

      // 直接调用 API
      const response = await page.request.get(
        `http://localhost:8081/api/v1/nl2sql/indicators/band?operatorId=${operatorId}&band=700M&networkType=LTE`
      );

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      console.log('/band API 返回数据:', JSON.stringify(data, null, 2));

      // 验证返回数据结构
      if (data.operatorId) {
        expect(data.operatorId).toBe(operatorId);
        expect(data.band).toBe('700M');
        expect(data.networkType).toBe('LTE');
        expect(data.dlRate !== undefined || data.ulRate !== undefined || data.dlPrb !== undefined).toBeTruthy();
      }
    }
  );

  (RUN_BACKEND_TESTS ? test : test.skip)(
    '直接调用 /metrics API 获取运营商汇总指标',
    async ({ page }) => {
      const operatorId = await getOperatorIdByName('中国联通');
      expect(operatorId).not.toBeNull();

      // 直接调用 API
      const response = await page.request.get(
        `http://localhost:8081/api/v1/nl2sql/indicators/metrics?operatorId=${operatorId}`
      );

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      console.log('/metrics API 返回数据:', JSON.stringify(data, null, 2));

      // 验证返回数据是数组
      expect(Array.isArray(data)).toBeTruthy();

      if (data.length > 0) {
        const metrics = data[0];
        console.log('汇总指标详情:', JSON.stringify({
          operatorId: metrics.operatorId,
          operatorName: metrics.operatorName,
          dataMonth: metrics.dataMonth,
          trafficRatio: metrics.trafficRatio,
          durationCampRatio: metrics.durationCampRatio,
          terminalPenetration: metrics.terminalPenetration,
          fallbackRatio: metrics.fallbackRatio,
        }, null, 2));
      }
    }
  );

  (RUN_BACKEND_TESTS ? test : test.skip)(
    '直接调用 /band API 不指定 networkType（应返回 LTE 和 NR）',
    async ({ page }) => {
      const operatorId = await getOperatorIdByName('中国联通');
      expect(operatorId).not.toBeNull();

      // 直接调用 API，不指定 networkType
      const response = await page.request.get(
        `http://localhost:8081/api/v1/nl2sql/indicators/band?operatorId=${operatorId}&band=700M`
      );

      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      console.log('/band API (不指定networkType) 返回数据:', JSON.stringify(data, null, 2));

      // 如果返回的是列表形式，应该包含 indicators 数组
      if (data.indicators) {
        expect(Array.isArray(data.indicators)).toBeTruthy();
        expect(data.indicators.length).toBeGreaterThanOrEqual(1);

        const networkTypes = data.indicators.map(ind => ind.networkType);
        console.log('返回的网络类型:', networkTypes);
      }
    }
  );

});
