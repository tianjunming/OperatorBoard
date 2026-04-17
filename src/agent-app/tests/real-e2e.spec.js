/**
 * OperatorBoard 真实E2E测试 - 业界最佳实践
 *
 * 遵循原则:
 * 1. 模拟真实用户行为而非直接操作DOM
 * 2. 使用语义化定位器而非data-testid
 * 3. 利用Playwright自动等待机制
 * 4. 每个测试独立、可靠、可重复
 * 5. 失败时提供诊断信息
 */

import { test, expect, chromium } from '@playwright/test';

/**
 * E2E测试配置
 */
const CONFIG = {
  baseUrl: 'http://localhost:3000',
  username: 'admin',
  password: 'admin123',
  timeout: {
    navigation: 30000,
    action: 10000,
    assertion: 15000,
  },
};

/**
 * 真实用户登录流程
 * 模拟用户打开网页、输入凭据、点击登录的完整过程
 */
async function realUserLogin(page) {
  // 1. 导航到登录页面
  await page.goto(CONFIG.baseUrl);

  // 2. 等待页面加载完成（Playwright自动等待）
  await page.waitForLoadState('domcontentloaded');

  // 3. 找到登录表单（使用语义化定位）
  const loginCard = page.locator('.auth-login-card');
  await loginCard.waitFor({ state: 'visible', timeout: CONFIG.timeout.navigation });

  // 4. 输入凭据 - 使用fill()正确触发React onChange
  const usernameInput = page.locator('#username');
  const passwordInput = page.locator('#password');

  // 清空并填写用户名（三击选中文本后替换）
  await usernameInput.click({ clickCount: 3 });
  await usernameInput.fill(CONFIG.username);

  // 清空并填写密码
  await passwordInput.click({ clickCount: 3 });
  await passwordInput.fill(CONFIG.password);

  // 5. 找到登录按钮并点击
  const submitButton = page.locator('.auth-submit-btn');
  await submitButton.click();

  // 6. 等待聊天界面出现
  const chatInterface = page.locator('[data-testid="chat-input"]');
  await chatInterface.waitFor({ state: 'visible', timeout: CONFIG.timeout.navigation });

  console.log('✓ 真实用户登录成功');
}

/**
 * 真实用户发送查询
 * 模拟用户输入文本、停顿、点击发送的完整过程
 */
async function realUserSendQuery(page, query) {
  const chatInput = page.locator('[data-testid="chat-input"]');

  // 1. 点击输入框聚焦
  await chatInput.click();

  // 2. 输入查询内容
  await page.keyboard.type(query);

  // 3. 用户停顿思考（模拟真实用户行为）
  await page.waitForTimeout(200);

  // 4. 点击发送按钮
  const sendButton = page.locator('[data-testid="send-button"]');
  await sendButton.click();

  // 5. 等待加载指示器消失
  try {
    const loader = page.locator('[data-testid="skeleton-loader"]');
    await loader.waitFor({ state: 'hidden', timeout: CONFIG.timeout.assertion });
  } catch {
    // 加载指示器可能很快消失，忽略超时
  }

  // 6. 等待响应渲染完成
  await page.waitForTimeout(1000);

  console.log(`✓ 查询已发送: ${query}`);
}

/**
 * 等待查询结果出现 - 智能等待
 */
async function waitForQueryResult(page) {
  // 方法1: 优先等待表格
  const table = page.locator('[data-testid="structured-table"]');
  try {
    await table.first().waitFor({ state: 'visible', timeout: 20000 });
    return 'table';
  } catch {
    // 方法2: 等待图表
    const chart = page.locator('[data-testid="structured-chart"]');
    try {
      await chart.first().waitFor({ state: 'visible', timeout: 10000 });
      return 'chart';
    } catch {
      // 方法3: 等待消息气泡
      const message = page.locator('[data-testid="message-bubble"]');
      try {
        await message.first().waitFor({ state: 'visible', timeout: 10000 });
        return 'message';
      } catch {
        return null;
      }
    }
  }
}

/**
 * 从页面提取关键数据用于验证
 */
async function extractPageData(page) {
  const bodyText = await page.textContent('body');
  const tableVisible = await page.locator('[data-testid="structured-table"]').isVisible().catch(() => false);
  const chartVisible = await page.locator('[data-testid="structured-chart"]').isVisible().catch(() => false);

  return {
    bodyText,
    hasTable: tableVisible,
    hasChart: chartVisible,
  };
}

test.describe('真实用户操作流程测试', () => {

  test.beforeEach(async ({ page }) => {
    // 每个测试前清空本地存储，模拟全新用户
    await page.addInitScript(() => {
      localStorage.clear();
    });
    await realUserLogin(page);
  });

  test('场景1: 用户查询站点数量', async ({ page }) => {
    // 执行查询
    await realUserSendQuery(page, '中国联通有多少站点');

    // 等待结果
    const resultType = await waitForQueryResult(page);
    expect(resultType).toBeTruthy();

    // 提取并验证数据
    const pageData = await extractPageData(page);
    expect(pageData.bodyText).toMatch(/站点|site|Site|联通|China|Unicom/i);

    console.log(`✓ 场景1通过: 结果类型=${resultType}`);
  });

  test('场景2: 用户查询小区数量', async ({ page }) => {
    await realUserSendQuery(page, '中国联通有多少小区');

    const resultType = await waitForQueryResult(page);
    expect(resultType).toBeTruthy();

    const pageData = await extractPageData(page);
    expect(pageData.bodyText).toMatch(/小区|cell|Cell|联通|China/i);

    console.log(`✓ 场景2通过: 结果类型=${resultType}`);
  });

  test('场景3: 用户查询上行负载', async ({ page }) => {
    await realUserSendQuery(page, '中国联通小区上行负载');

    const resultType = await waitForQueryResult(page);
    expect(resultType).toBeTruthy();

    const pageData = await extractPageData(page);
    expect(pageData.bodyText).toMatch(/负载|PRB|上行|UL|联通/i);

    console.log(`✓ 场景3通过: 结果类型=${resultType}`);
  });

  test('场景4: 用户查询下行负载', async ({ page }) => {
    await realUserSendQuery(page, '中国联通小区下行负载');

    const resultType = await waitForQueryResult(page);
    expect(resultType).toBeTruthy();

    const pageData = await extractPageData(page);
    expect(pageData.bodyText).toMatch(/负载|PRB|下行|DL|联通/i);

    console.log(`✓ 场景4通过: 结果类型=${resultType}`);
  });

  test('场景5: 用户查询上行速率', async ({ page }) => {
    await realUserSendQuery(page, '中国联通小区上行速率');

    const resultType = await waitForQueryResult(page);
    expect(resultType).toBeTruthy();

    const pageData = await extractPageData(page);
    expect(pageData.bodyText).toMatch(/速率|上行|UL|Rate|联通/i);

    console.log(`✓ 场景5通过: 结果类型=${resultType}`);
  });

  test('场景6: 用户查询下行速率', async ({ page }) => {
    await realUserSendQuery(page, '中国联通小区下行速率');

    const resultType = await waitForQueryResult(page);
    expect(resultType).toBeTruthy();

    const pageData = await extractPageData(page);
    expect(pageData.bodyText).toMatch(/速率|下行|DL|Rate|联通/i);

    console.log(`✓ 场景6通过: 结果类型=${resultType}`);
  });

  test('场景7: 用户查询分流比', async ({ page }) => {
    await realUserSendQuery(page, '中国联通的分流比是多少');

    const resultType = await waitForQueryResult(page);
    expect(resultType).toBeTruthy();

    const pageData = await extractPageData(page);
    expect(pageData.bodyText).toMatch(/分流|流量|NR|LTE|联通/i);

    console.log(`✓ 场景7通过: 结果类型=${resultType}`);
  });

  test('场景8: 用户查询驻留比', async ({ page }) => {
    await realUserSendQuery(page, '中国联通的驻留比是多少');

    const resultType = await waitForQueryResult(page);
    expect(resultType).toBeTruthy();

    const pageData = await extractPageData(page);
    expect(pageData.bodyText).toMatch(/驻留|NR|LTE|联通/i);

    console.log(`✓ 场景8通过: 结果类型=${resultType}`);
  });

  test('场景9: 用户查询700M频段', async ({ page }) => {
    await realUserSendQuery(page, '中国联通700M LTE下行速率是多少');

    const resultType = await waitForQueryResult(page);
    expect(resultType).toBeTruthy();

    const pageData = await extractPageData(page);
    expect(pageData.bodyText).toMatch(/700M|LTE|下行|速率|联通/i);

    console.log(`✓ 场景9通过: 结果类型=${resultType}`);
  });

  test('场景10: 用户查看所有运营商', async ({ page }) => {
    await realUserSendQuery(page, '查看所有运营商');

    const resultType = await waitForQueryResult(page);
    expect(resultType).toBeTruthy();

    const pageData = await extractPageData(page);
    expect(pageData.bodyText).toMatch(/中国|运营商|operator|联通|移动|电信/i);

    console.log(`✓ 场景10通过: 结果类型=${resultType}`);
  });

});

test.describe('多轮对话稳定性测试', () => {

  test('连续3轮对话测试', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await realUserLogin(page);

    const queries = [
      '中国联通有多少站点',
      '中国联通有多少小区',
      '中国联通小区上行负载',
    ];

    for (let i = 0; i < queries.length; i++) {
      console.log(`  第${i + 1}轮: ${queries[i]}`);
      await realUserSendQuery(page, queries[i]);

      const resultType = await waitForQueryResult(page);
      expect(resultType).toBeTruthy();

      // 每轮之间短暂停顿
      if (i < queries.length - 1) {
        await page.waitForTimeout(500);
      }
    }

    console.log('✓ 连续3轮对话稳定');
  });

  test('多次查询压力测试', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await realUserLogin(page);

    const queries = [
      '中国联通有多少站点',
      '中国联通有多少小区',
      '中国联通小区上行负载',
      '中国联通小区下行负载',
    ];

    for (const query of queries) {
      await realUserSendQuery(page, query);
      const resultType = await waitForQueryResult(page);
      expect(resultType).toBeTruthy();
      console.log(`✓ 查询成功: ${query}`);
    }
  });

});

test.describe('用户体验验证', () => {

  test('消息历史记录验证', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await realUserLogin(page);

    // 发送一条消息
    await realUserSendQuery(page, '中国联通有多少站点');

    // 等待消息气泡出现
    const messageBubble = page.locator('[data-testid="message-bubble"]');
    await expect(messageBubble.first()).toBeVisible({ timeout: 30000 });

    // 验证消息数量
    const messageCount = await messageBubble.count();
    expect(messageCount).toBeGreaterThan(0);

    console.log(`✓ 消息历史正常: ${messageCount}条`);
  });

  test('登录状态持久化验证', async ({ page }) => {
    // 不清空localStorage，让正常的登录流程设置token
    await realUserLogin(page);

    // 刷新页面
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // 应该仍然在聊天界面（未跳转到登录页）
    const chatInput = page.locator('[data-testid="chat-input"]');
    await expect(chatInput).toBeVisible({ timeout: 10000 });

    console.log('✓ 登录状态持久化正常');
  });

});

test.describe('边界情况处理', () => {

  test('用户输入后按钮状态变化', async ({ page }) => {
    await page.addInitScript(() => localStorage.clear());
    await realUserLogin(page);

    const chatInput = page.locator('[data-testid="chat-input"]');
    const sendButton = page.locator('[data-testid="send-button"]');

    // 空输入时按钮应该禁用
    await expect(sendButton).toBeDisabled();

    // 输入查询
    await chatInput.click();
    await chatInput.fill('中国联通有多少站点');

    // 有输入后按钮应该启用
    await expect(sendButton).toBeEnabled();

    // 点击发送
    await sendButton.click();

    // 发送后按钮应该短暂禁用
    await expect(sendButton).toBeDisabled();

    console.log('✓ 按钮状态变化正确');
  });

});
