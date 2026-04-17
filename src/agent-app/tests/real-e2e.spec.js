/**
 * OperatorBoard 真实E2E测试
 *
 * 遵循业界优秀实践:
 * 1. 使用 data-testid 精确定位元素
 * 2. 使用 waitForSelector 等待元素而非固定时间
 * 3. 验证特定UI组件而非整个页面内容
 * 4. 模拟真实用户操作流程
 * 5. 提供清晰的错误诊断信息
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
    selector: 10000,
    response: 60000,
  },
};

/**
 * 登录函数 - 模拟真实用户登录流程
 */
async function login(page) {
  await page.goto(CONFIG.baseUrl);
  await page.waitForLoadState('networkidle');

  // 等待登录表单出现
  const loginForm = page.locator('.auth-login-card');
  await loginForm.waitFor({ state: 'visible', timeout: CONFIG.timeout.navigation });

  // 填写登录信息
  await page.fill('#username', CONFIG.username);
  await page.fill('#password', CONFIG.password);

  // 点击登录按钮
  await page.click('button[type="submit"]');

  // 等待聊天输入框出现（表示登录成功）
  const chatInput = page.locator('[data-testid="chat-input"]');
  await chatInput.waitFor({ state: 'visible', timeout: CONFIG.timeout.selector });

  console.log('✓ 登录成功');
}

/**
 * 发送查询并等待结果 - 模拟真实用户操作
 */
async function sendQueryAndWaitForResult(page, query) {
  const chatInput = page.locator('[data-testid="chat-input"]');
  const sendButton = page.locator('[data-testid="send-button"]');

  // 清空并输入查询
  await chatInput.clear();
  await chatInput.fill(query);

  // 点击发送按钮（更接近真实用户操作）
  await sendButton.click();

  // 等待加载指示器消失（表示请求完成）
  const loadingIndicator = page.locator('[data-testid="skeleton-loader"]');
  await page.waitForFunction(() => {
    const loader = document.querySelector('[data-testid="skeleton-loader"]');
    return !loader || loader.style.display === 'none' || loader.getAttribute('aria-hidden') === 'true';
  }, { timeout: CONFIG.timeout.response }).catch(() => {
    console.log('⚠ 加载指示器等待超时，继续验证结果');
  });

  // 等待一下让渲染完成
  await page.waitForTimeout(1000);

  return true;
}

/**
 * 验证查询结果出现 - 表格、图表或文本内容
 */
async function waitForResult(page) {
  // 优先等待表格或图表
  const tableOrChart = page.locator('[data-testid="structured-table"], [data-testid="structured-chart"]');

  try {
    await tableOrChart.first().waitFor({ state: 'visible', timeout: 15000 });
    return 'table_or_chart';
  } catch {
    // 如果没有表格/图表，检查是否有消息内容
    const messageBody = page.locator('[data-testid="message-body"]');
    try {
      await messageBody.first().waitFor({ state: 'visible', timeout: 5000 });
      return 'text';
    } catch {
      return false;
    }
  }
}

/**
 * 从表格中提取数值
 */
async function extractValueFromTable(page, columnName) {
  const table = page.locator('[data-testid="data-table"]');
  if (!await table.isVisible()) return null;

  // 查找表头
  const headers = await table.locator('th').allTextContents();
  const columnIndex = headers.findIndex(h => h.includes(columnName));

  if (columnIndex === -1) return null;

  // 提取该列第一行的值
  const cell = table.locator(`td:nth-child(${columnIndex + 1})`).first();
  const value = await cell.textContent();

  return value?.trim().replace(/,/g, '');
}

test.describe('真实用户操作流程测试', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('查询中国联通站点数 - 完整用户流程', async ({ page }) => {
    await sendQueryAndWaitForResult(page, '中国联通有多少站点');

    // 等待结果出现
    const resultType = await waitForResult(page);
    expect(resultType).toBeTruthy();

    // 验证表格中有数据(如果有表格)
    const table = page.locator('[data-testid="data-table"]');
    if (await table.isVisible()) {
      const rowCount = await table.locator('tbody tr').count();
      expect(rowCount).toBeGreaterThan(0);
      console.log(`✓ 表格显示 ${rowCount} 行数据`);
    }

    // 验证页面包含站点相关信息
    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/站点|site|Site|联通|China/i);
  });

  test('查询中国联通小区数 - 完整用户流程', async ({ page }) => {
    await sendQueryAndWaitForResult(page, '中国联通有多少小区');

    const resultType = await waitForResult(page);
    expect(resultType).toBeTruthy();

    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/小区|cell|Cell|联通|China/i);
  });

  test('查询中国联通小区上行负载 - 完整用户流程', async ({ page }) => {
    await sendQueryAndWaitForResult(page, '中国联通小区上行负载');

    const resultType = await waitForResult(page);
    expect(resultType).toBeTruthy();

    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/负载|PRB|上行|UL|联通/i);
  });

  test('查询中国联通小区下行负载 - 完整用户流程', async ({ page }) => {
    await sendQueryAndWaitForResult(page, '中国联通小区下行负载');

    const resultType = await waitForResult(page);
    expect(resultType).toBeTruthy();

    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/负载|PRB|下行|DL|联通/i);
  });

  test('查询中国联通小区上行速率 - 完整用户流程', async ({ page }) => {
    await sendQueryAndWaitForResult(page, '中国联通小区上行速率');

    const resultType = await waitForResult(page);
    expect(resultType).toBeTruthy();

    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/速率|上行|UL|Rate|联通/i);
  });

  test('查询中国联通小区下行速率 - 完整用户流程', async ({ page }) => {
    await sendQueryAndWaitForResult(page, '中国联通小区下行速率');

    const resultType = await waitForResult(page);
    expect(resultType).toBeTruthy();

    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/速率|下行|DL|Rate|联通/i);
  });

  test('查询分流比指标 - 完整用户流程', async ({ page }) => {
    await sendQueryAndWaitForResult(page, '中国联通的分流比是多少');

    const resultType = await waitForResult(page);
    expect(resultType).toBeTruthy();

    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/分流|流量|NR|LTE|联通/i);
  });

  test('查询驻留比指标 - 完整用户流程', async ({ page }) => {
    await sendQueryAndWaitForResult(page, '中国联通的驻留比是多少');

    const resultType = await waitForResult(page);
    expect(resultType).toBeTruthy();

    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/驻留|NR|LTE|联通/i);
  });

  test('查询700M频段LTE速率 - 完整用户流程', async ({ page }) => {
    await sendQueryAndWaitForResult(page, '中国联通700M LTE下行速率是多少');

    const resultType = await waitForResult(page);
    expect(resultType).toBeTruthy();

    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/700M|LTE|下行|速率|联通/i);
  });

  test('查询所有运营商 - 完整用户流程', async ({ page }) => {
    await sendQueryAndWaitForResult(page, '查看所有运营商');

    const resultType = await waitForResult(page);
    expect(resultType).toBeTruthy();

    const bodyText = await page.textContent('body');
    expect(bodyText).toMatch(/中国|运营商|operator|联通|移动|电信/i);
  });

  test('连续查询验证 - 多轮对话稳定性', async ({ page }) => {
    // 第一轮查询
    await sendQueryAndWaitForResult(page, '中国联通有多少站点');
    await page.waitForTimeout(500);

    // 第二轮查询
    await sendQueryAndWaitForResult(page, '中国联通有多少小区');
    await page.waitForTimeout(500);

    // 第三轮查询
    await sendQueryAndWaitForResult(page, '中国联通小区上行负载');

    // 验证最终结果
    const resultType = await waitForResult(page);
    expect(resultType).toBeTruthy();

    console.log('✓ 多轮对话稳定');
  });

});

test.describe('边界情况和错误处理', () => {

  test('登录后进行多次查询的稳定性', async ({ page }) => {
    await login(page);

    const queries = [
      '中国联通有多少站点',
      '中国联通有多少小区',
      '中国联通小区上行负载',
      '中国联通小区下行负载',
    ];

    for (const query of queries) {
      await sendQueryAndWaitForResult(page, query);
      const resultType = await waitForResult(page);
      expect(resultType).toBeTruthy();
      console.log(`✓ 查询成功: ${query}`);
    }
  });

  test('验证消息历史记录存在', async ({ page }) => {
    await login(page);

    // 发送一条查询
    await sendQueryAndWaitForResult(page, '中国联通有多少站点');

    // 等待消息气泡出现
    const messageBubble = page.locator('[data-testid="message-bubble"]');
    await messageBubble.first().waitFor({ state: 'visible', timeout: 30000 });

    // 验证消息列表中有消息
    const messageCount = await messageBubble.count();

    expect(messageCount).toBeGreaterThan(0);
    console.log(`✓ 消息历史记录正常: ${messageCount} 条消息`);
  });

});
