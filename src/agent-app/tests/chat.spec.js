import { test, expect } from '@playwright/test';

// E2E tests that require full backend stack
// Run with: BACKEND_AVAILABLE=true npm run test
const runE2ETests = process.env.BACKEND_AVAILABLE === 'true';

test.describe('Chat 功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('页面加载成功', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
  });

  test('聊天输入框存在', async ({ page }) => {
    const input = page.locator('input[placeholder*="输入"], input[type="text"]').first();
    await expect(input).toBeVisible({ timeout: 10000 });
  });

  test('发送消息按钮存在', async ({ page }) => {
    const sendButton = page.locator('button[type="submit"], button:has-text("发送")').first();
    await expect(sendButton).toBeVisible({ timeout: 10000 });
  });
});

test.describe('消息显示测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  (runE2ETests ? test : test.skip)('用户消息正确显示', async ({ page }) => {
    const input = page.locator('input[placeholder*="输入"], input[type="text"]').first();
    await input.fill('北京联通站点数据');
    const sendButton = page.locator('button[type="submit"], button:has-text("发送")').first();
    await sendButton.click();
    await expect(page.locator('.message-item.user')).toBeVisible({ timeout: 10000 });
  });

  (runE2ETests ? test : test.skip)('AI 响应包含分析过程', async ({ page }) => {
    const input = page.locator('input[placeholder*="输入"], input[type="text"]').first();
    await input.fill('北京联通站点数据');
    const sendButton = page.locator('button[type="submit"], button:has-text("发送")').first();
    await sendButton.click();
    await expect(page.locator('.message-item.assistant')).toBeVisible({ timeout: 30000 });
  });
});

test.describe('流式响应测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  (runE2ETests ? test : test.skip)('流式响应正确显示', async ({ page }) => {
    const input = page.locator('input[placeholder*="输入"], input[type="text"]').first();
    await input.fill('北京联通站点数据');
    const sendButton = page.locator('button[type="submit"], button:has-text("发送")').first();
    await sendButton.click();
    await page.waitForTimeout(5000);
    const messageContent = page.locator('.message-content, .message-bubble').first();
    await expect(messageContent).toBeVisible();
  });
});
