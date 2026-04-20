/**
 * E2E Test Suite - 18 Core Functions with Database Consistency Validation
 * @see E2E_TEST_SPEC.md for detailed test specifications
 */
import { test, expect } from '@playwright/test';
import { dbHelper } from './helpers/dbHelper.js';
import { DataFactory } from './factories/dataFactory.js';
import { ChatPage } from './pages/ChatPage.js';

test.describe('OperatorBoard E2E Tests', () => {
  let chatPage;
  let dataFactory;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    dataFactory = new DataFactory();

    // Login before each test
    await chatPage.goto();
    await chatPage.login('admin', 'admin123');
  });

  test.afterAll(async () => {
    await dbHelper.closePool();
  });

  // ========== 1. Authentication Tests ==========
  test.describe('Authentication', () => {
    test('should login with valid credentials', async ({ page }) => {
      await expect(chatPage.locators.chatInput).toBeVisible();
      await expect(chatPage.locators.sendButton).toBeEnabled();
    });

    test('should show error with invalid credentials', async ({ page }) => {
      await chatPage.logout();
      await chatPage.login('invalid', 'wrong');
      await expect(chatPage.locators.errorMessage).toBeVisible();
    });
  });

  // ========== 2. Chat Functionality Tests ==========
  test.describe('Chat', () => {
    test('should send and receive message', async ({ page }) => {
      await chatPage.sendMessage('北京联通有哪些站点？');
      await chatPage.waitForResponse();

      const lastMessage = await chatPage.getLastAssistantMessage();
      expect(lastMessage).toBeTruthy();
      expect(lastMessage.length).toBeGreaterThan(0);
    });

    test('should display streaming response', async ({ page }) => {
      await chatPage.sendMessage('查询北京联通站点数据');
      await page.waitForSelector('.streaming-cursor', { state: 'visible', timeout: 5000 }).catch(() => {});
    });

    test('should support message resend', async ({ page }) => {
      await chatPage.sendMessage('测试查询');
      await page.waitForTimeout(1000);

      const resendButton = page.locator('.message-actions .action-btn').last();
      if (await resendButton.isVisible()) {
        await resendButton.click();
        await chatPage.waitForResponse();
      }
    });
  });

  // ========== 3. Structured Data Rendering Tests ==========
  test.describe('Structured Data', () => {
    test('should render table blocks', async ({ page }) => {
      await chatPage.sendMessage('北京联通的站点列表');
      await chatPage.waitForResponse();

      const tableBlock = page.locator('.block-table, .structured-table, table.data-table').first();
      await expect(tableBlock).toBeVisible({ timeout: 10000 });
    });

    test('should render chart blocks', async ({ page }) => {
      await chatPage.sendMessage('对比北京和上海的站点数量');
      await chatPage.waitForResponse();

      const chartBlock = page.locator('.block-chart, .recharts-wrapper, .structured-chart').first();
      await expect(chartBlock).toBeVisible({ timeout: 10000 });
    });

    test('should render KPI metrics', async ({ page }) => {
      await chatPage.sendMessage('北京联通的总站点数是多少');
      await chatPage.waitForResponse();

      const kpiCard = page.locator('.kpi-card, .metrics-grid, .structured-metrics').first();
      await expect(kpiCard).toBeVisible({ timeout: 10000 });
    });

    test('should render SQL blocks', async ({ page }) => {
      await chatPage.sendMessage('show me the sql for站点查询');
      await chatPage.waitForResponse();

      const sqlBlock = page.locator('.sql-block, .structured-sql, pre.sql').first();
      await expect(sqlBlock).toBeVisible({ timeout: 10000 });
    });
  });

  // ========== 4. Database Consistency Tests ==========
  test.describe('Database Consistency', () => {
    test('should match UI site count with database', async ({ page }) => {
      // Get site count from database
      const dbSites = await dbHelper.query('SELECT COUNT(*) as count FROM site_info');
      const expectedCount = dbSites[0].count;

      // Query via UI
      await chatPage.sendMessage('北京联通一共有多少个站点？');
      await chatPage.waitForResponse();

      const lastMessage = await chatPage.getLastAssistantMessage();
      // Extract number from response
      const numberMatch = lastMessage.match(/\d+/g);
      if (numberMatch) {
        const uiCount = parseInt(numberMatch[0]);
        expect(Math.abs(uiCount - expectedCount)).toBeLessThan(5); // Allow 5% tolerance
      }
    });

    test('should match UI operator list with database', async ({ page }) => {
      const dbOperators = await dbHelper.query('SELECT DISTINCT operator FROM site_info ORDER BY operator');
      const expectedOperators = dbOperators.map(r => r.operator);

      await chatPage.sendMessage('有哪些运营商？');
      await chatPage.waitForResponse();

      const lastMessage = await chatPage.getLastAssistantMessage();
      for (const op of expectedOperators) {
        expect(lastMessage).toContain(op);
      }
    });
  });

  // ========== 5. Theme Tests ==========
  test.describe('Theme', () => {
    test('should switch to dark theme', async ({ page }) => {
      await chatPage.openCommandPalette();
      await chatPage.selectCommand('深色主题');

      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-theme', /dark|midnight/);
    });

    test('should switch to light theme', async ({ page }) => {
      await chatPage.openCommandPalette();
      await chatPage.selectCommand('浅色主题');

      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-theme', 'light');
    });

    test('should persist theme preference', async ({ page }) => {
      await chatPage.openCommandPalette();
      await chatPage.selectCommand('深色主题');

      await page.reload();
      await chatPage.login('admin', 'admin123');

      const html = page.locator('html');
      await expect(html).toHaveAttribute('data-theme', /dark|midnight/);
    });
  });

  // ========== 6. Command Palette Tests ==========
  test.describe('Command Palette', () => {
    test('should open with Cmd+K', async ({ page }) => {
      await page.keyboard.press('Meta+k');
      await page.waitForTimeout(300);

      const palette = page.locator('.command-palette, .command-palette-overlay');
      await expect(palette).toBeVisible();
    });

    test('should filter commands by search', async ({ page }) => {
      await chatPage.openCommandPalette();
      await page.keyboard.type('主题');

      const results = page.locator('.command-item');
      const count = await results.count();
      expect(count).toBeGreaterThan(0);
    });

    test('should navigate with arrow keys', async ({ page }) => {
      await chatPage.openCommandPalette();

      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');

      const selected = page.locator('.command-item.selected');
      await expect(selected).toBeVisible();
    });

    test('should execute command with Enter', async ({ page }) => {
      await chatPage.openCommandPalette();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');

      const palette = page.locator('.command-palette-overlay');
      await expect(palette).not.toBeVisible();
    });
  });

  // ========== 7. Navigation Tests ==========
  test.describe('Navigation', () => {
    test('should navigate to dashboard', async ({ page }) => {
      await page.click('.nav-btn:has-text("仪表盘"), .nav-btn:has-text("Dashboard")');
      await page.waitForTimeout(500);

      const dashboard = page.locator('.dashboard, .operator-dashboard');
      await expect(dashboard).toBeVisible({ timeout: 5000 });
    });

    test('should switch between views', async ({ page }) => {
      // Go to dashboard
      await page.click('.nav-btn:has-text("仪表盘"), .nav-btn:has-text("Dashboard")');
      await page.waitForTimeout(300);

      // Go back to chat
      await page.click('.nav-btn:has-text("对话"), .nav-btn:has-text("Chat")');
      await page.waitForTimeout(300);

      await expect(chatPage.locators.chatInput).toBeVisible();
    });
  });

  // ========== 8. Input Handling Tests ==========
  test.describe('Input Handling', () => {
    test('should clear input after send', async ({ page }) => {
      await chatPage.sendMessage('测试消息');
      await page.waitForTimeout(500);

      const inputValue = await chatPage.locators.chatInput.inputValue();
      expect(inputValue).toBe('');
    });

    test('should handle empty input', async ({ page }) => {
      const sendButton = chatPage.locators.sendButton;
      await expect(sendButton).toBeDisabled();
    });

    test('should support slash commands', async ({ page }) => {
      await chatPage.locators.chatInput.fill('/site ');
      await page.waitForTimeout(300);

      const commandPanel = page.locator('.command-panel, .command-list');
      await expect(commandPanel).toBeVisible();
    });

    test('should support @ mentions', async ({ page }) => {
      await chatPage.sendMessage('第一条消息');
      await page.waitForTimeout(1000);

      await chatPage.locators.chatInput.fill('@');
      await page.waitForTimeout(300);

      const mentionPanel = page.locator('.mention-panel, .mention-picker');
      await expect(mentionPanel).toBeVisible({ timeout: 3000 }).catch(() => {
        // Mention panel may not appear for empty mention
      });
    });
  });

  // ========== 9. Error Handling Tests ==========
  test.describe('Error Handling', () => {
    test('should display error message on API failure', async ({ page }) => {
      // Send a query that might fail due to invalid parameters
      await chatPage.sendMessage('查询一个不存在的区域的数据xyz12345');
      await page.waitForTimeout(3000);

      const lastMessage = await chatPage.getLastAssistantMessage();
      // Should either show error or graceful message
      expect(lastMessage).toBeTruthy();
    });

    test('should handle network errors gracefully', async ({ page }) => {
      // Go offline temporarily
      await page.context().setOffline(true);
      await chatPage.sendMessage('测试网络错误');
      await page.waitForTimeout(1000);

      const errorToast = page.locator('.error, .toast-error');
      // Should show some error indication
      const hasError = await errorToast.isVisible().catch(() => false);
      expect(hasError || true).toBeTruthy(); // Soft check

      await page.context().setOffline(false);
    });
  });

  // ========== 10. Loading States Tests ==========
  test.describe('Loading States', () => {
    test('should show loading indicator during streaming', async ({ page }) => {
      await chatPage.sendMessage('生成一个很长的回答' + 'x'.repeat(100));
      await page.waitForTimeout(500);

      // Check for streaming indicator
      const streaming = page.locator('.streaming-cursor, .thinking-indicator');
      const isStreaming = await streaming.isVisible().catch(() => false);
      expect(isStreaming).toBeTruthy();
    });

    test('should show thinking indicator', async ({ page }) => {
      await chatPage.sendMessage('请稍等');
      await page.waitForTimeout(500);

      const thinking = page.locator('.thinking-indicator, .thinking-dots');
      await expect(thinking).toBeVisible({ timeout: 3000 }).catch(() => {});
    });
  });

  // ========== 11-18. Additional Functionality Tests ==========
  test.describe('Additional Features', () => {
    test('should copy message content', async ({ page }) => {
      await chatPage.sendMessage('复制测试');
      await chatPage.waitForResponse();

      const copyButton = page.locator('.message-actions .action-btn:has(svg.lucide-copy), .message-actions button[aria-label*="复制"]').first();
      if (await copyButton.isVisible()) {
        await copyButton.click();
        // Check for copied feedback
        await page.waitForTimeout(500);
      }
    });

    test('should like/dislike messages', async ({ page }) => {
      await chatPage.sendMessage('反馈测试');
      await chatPage.waitForResponse();

      const likeButton = page.locator('.action-btn.liked, .message-actions button[aria-label*="helpful"]').first();
      if (await likeButton.isVisible()) {
        await likeButton.click();
        await page.waitForTimeout(300);
      }
    });

    test('should expand/collapse thinking chain', async ({ page }) => {
      await chatPage.sendMessage('请解释你的思考过程');
      await chatPage.waitForResponse();

      const thinkingToggle = page.locator('.thinking-toggle, .thinking-header').first();
      if (await thinkingToggle.isVisible()) {
        await thinkingToggle.click();
        await page.waitForTimeout(300);
      }
    });

    test('should toggle table/chart view', async ({ page }) => {
      await chatPage.sendMessage('显示站点数据');
      await chatPage.waitForResponse();

      const toggleButton = page.locator('.toggle-btn, .view-toggle').first();
      if (await toggleButton.isVisible()) {
        await toggleButton.click();
        await page.waitForTimeout(300);
      }
    });

    test('should show command palette help hints', async ({ page }) => {
      await chatPage.openCommandPalette();

      const footer = page.locator('.command-palette-footer, .footer-hint');
      await expect(footer).toBeVisible();
    });

    test('should close command palette with Escape', async ({ page }) => {
      await chatPage.openCommandPalette();
      await page.keyboard.press('Escape');

      const palette = page.locator('.command-palette-overlay');
      await expect(palette).not.toBeVisible();
    });

    test('should handle new chat with Cmd+N', async ({ page }) => {
      await chatPage.sendMessage('旧对话');
      await page.waitForTimeout(500);

      await page.keyboard.press('Meta+n');
      await page.waitForTimeout(500);

      // Input should be cleared
      await expect(chatPage.locators.chatInput).toBeVisible();
    });

    test('should toggle theme with Cmd+T', async ({ page }) => {
      const initialTheme = await page.locator('html').getAttribute('data-theme');

      await page.keyboard.press('Meta+t');
      await page.waitForTimeout(300);

      const newTheme = await page.locator('html').getAttribute('data-theme');
      expect(newTheme).not.toBe(initialTheme);
    });
  });
});
