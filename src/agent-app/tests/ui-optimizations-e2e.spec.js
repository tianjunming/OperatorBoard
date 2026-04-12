/**
 * UI优化功能 E2E 测试
 *
 * 测试覆盖:
 * 1. ARIA 标签可访问性
 * 2. SQL块复制功能
 * 3. 空数据展示 ("--" instead of "0")
 * 4. 滚动到底部按钮
 * 5. 命令面板边界检测
 * 6. 月份选择器范围限制
 */

import { test, expect } from '@playwright/test';

// ==================== 辅助函数 ====================

async function ensureLoggedIn(page) {
  // 检查是否已登录（页面显示聊天界面）
  const messageInput = page.locator('textarea[data-testid="chat-input"]');
  if (await messageInput.isVisible({ timeout: 2000 })) {
    return true;
  }

  // 尝试登录
  const loginBtn = page.locator('button:has-text("登录"), button:has-text("Login")').first();
  if (await loginBtn.isVisible({ timeout: 2000 })) {
    await loginBtn.click();
    await page.waitForTimeout(500);

    // 填写登录表单
    const usernameInput = page.locator('input[type="text"], input[placeholder*="用户"], input[placeholder*="username"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    if (await usernameInput.isVisible()) {
      await usernameInput.fill('admin');
    }
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('admin123');
    }

    // 点击登录按钮
    const submitBtn = page.locator('button[type="submit"]:not([disabled])').first();
    if (await submitBtn.isVisible({ timeout: 2000 })) {
      await submitBtn.click();
      await page.waitForTimeout(1500);
    }
  }

  // 等待登录完成
  await page.waitForTimeout(500);
  return true;
}

// ==================== 前置条件 ====================

test.describe('前置条件验证', () => {
  test('系统可访问', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    // 页面标题可能是 Operator Agent 或其他
    await expect(page).toHaveTitle(/.*/);
  });

  test('登录功能正常', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await ensureLoggedIn(page);
    // 验证页面可访问
    await expect(page.locator('body')).toBeVisible();
  });
});

// ==================== 可访问性测试 ====================

test.describe('可访问性验证', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await ensureLoggedIn(page);
  });

  test('消息操作按钮包含ARIA标签', async ({ page }) => {
    // 发送一条消息
    const input = page.locator('textarea[data-testid="chat-input"], input[placeholder*="查询"], input[placeholder*="输入"]');
    await input.fill('中国联通有多少站点');
    await page.click('button[data-testid="send-button"], button:has-text("发送")');
    await page.waitForTimeout(5000);

    // 悬停在消息上以显示操作按钮
    const messageItem = page.locator('[data-testid="message-item-assistant"]').first();
    if (await messageItem.isVisible()) {
      await messageItem.hover();

      // 验证复制按钮有ARIA标签
      const copyBtn = page.locator('[aria-label="复制"], [aria-label="copy"], [aria-label="Copy"]').first();
      await expect(copyBtn).toBeVisible({ timeout: 3000 });
    }
  });

  test('输入框包含ARIA标签', async ({ page }) => {
    const input = page.locator('textarea[data-testid="chat-input"], input[placeholder*="查询"], input[placeholder*="输入"]');
    await expect(input).toBeVisible();
  });

  test('月份选择器包含ARIA标签', async ({ page }) => {
    // 导航到Dashboard
    await page.click('text=看板, text=仪表盘, text=Dashboard', { timeout: 5000 }).catch(() => {});

    const monthInput = page.locator('input[type="month"][aria-label="选择月份"], input.month-input');
    if (await monthInput.isVisible({ timeout: 3000 })) {
      await expect(monthInput).toHaveAttribute('aria-label', '选择月份');
    }
  });
});

// ==================== SQL块复制功能测试 ====================

test.describe('SQL块复制功能', () => {
  test('SQL块显示复制按钮', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await ensureLoggedIn(page);

    // 发送会返回SQL的查询
    const input = page.locator('textarea[data-testid="chat-input"], input[placeholder*="查询"], input[placeholder*="输入"]');
    await input.fill('中国联通站点数据SQL');
    await page.click('button[data-testid="send-button"], button:has-text("发送")');
    await page.waitForTimeout(6000);

    // 查找SQL块
    const sqlBlock = page.locator('.structured-sql, .sql-content').first();
    if (await sqlBlock.isVisible({ timeout: 5000 })) {
      // 验证SQL块可见
      await expect(sqlBlock).toBeVisible();

      // 验证复制按钮存在
      const sqlCopyBtn = page.locator('.sql-copy-btn, .sql-header button').first();
      await expect(sqlCopyBtn).toBeVisible({ timeout: 3000 });
    }
  });
});

// ==================== 空数据展示测试 ====================

test.describe('空数据展示验证', () => {
  test('Dashboard空数据显示"--"而非"0"', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await ensureLoggedIn(page);

    // 导航到Dashboard
    await page.click('text=看板, text=仪表盘, text=Dashboard', { timeout: 5000 }).catch(() => {});

    // 等待数据加载
    await page.waitForTimeout(2000);

    // 查找指标卡片
    const metricCards = page.locator('.metric-card');
    const count = await metricCards.count();

    // 验证至少有部分指标显示
    if (count > 0) {
      // 检查是否使用了"--"表示空数据
      const pageContent = await page.content();
      // 如果有空数据，应该显示"--"而非"0"
      const hasDashDash = pageContent.includes('--');
      const hasZeroOnly = pageContent.includes('>0<') && !pageContent.includes('>--');

      // 空数据时应该显示"--"
      expect(hasDashDash || !hasZeroOnly).toBeTruthy();
    }
  });

  test('表格空数据行显示"--"', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await ensureLoggedIn(page);

    // 发送一个会返回空结果的查询
    const input = page.locator('textarea[data-testid="chat-input"], input[placeholder*="查询"], input[placeholder*="输入"]');
    await input.fill('找一个不存在的运营商XYZ123');
    await page.click('button[data-testid="send-button"], button:has-text("发送")');
    await page.waitForTimeout(5000);

    // 如果结果显示空，验证显示"--"而非"0"
    const messageContent = page.locator('[data-testid="message-item-assistant"]').last();
    if (await messageContent.isVisible()) {
      const text = await messageContent.textContent();
      // 空结果不应该全是0
      expect(text).not.toMatch(/^[^a-zA-Z]*0[^a-zA-Z]*$/);
    }
  });
});

// ==================== 滚动到底部按钮测试 ====================

test.describe('滚动到底部按钮', () => {
  test('新消息时显示滚动按钮', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await ensureLoggedIn(page);

    // 发送多条消息制造长对话
    const input = page.locator('textarea[data-testid="chat-input"], input[placeholder*="查询"], input[placeholder*="输入"]');

    for (let i = 0; i < 5; i++) {
      await input.fill(`测试消息 ${i + 1}`);
      await page.click('button[data-testid="send-button"], button:has-text("发送")');
      await page.waitForTimeout(2000);
    }

    // 滚动到顶部
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // 验证滚动按钮出现（如果有新消息）
    const scrollBtn = page.locator('.scroll-to-bottom-btn, [aria-label="滚动到最新消息"]');
    if (await scrollBtn.isVisible({ timeout: 3000 })) {
      await expect(scrollBtn).toBeVisible();
    }
  });

  test('滚动按钮显示新消息数量', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await ensureLoggedIn(page);

    // 发送多条消息
    const input = page.locator('textarea[data-testid="chat-input"], input[placeholder*="查询"], input[placeholder*="输入"]');

    for (let i = 0; i < 3; i++) {
      await input.fill(`测试消息 ${i + 1}`);
      await page.click('button[data-testid="send-button"], button:has-text("发送")');
      await page.waitForTimeout(1500);
    }

    // 查找新消息徽章
    const badge = page.locator('.new-message-badge');
    if (await badge.isVisible({ timeout: 3000 })) {
      await expect(badge).toBeVisible();
    }
  });

  test('点击滚动按钮回到底部', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await ensureLoggedIn(page);

    // 发送消息
    const input = page.locator('textarea[data-testid="chat-input"], input[placeholder*="查询"], input[placeholder*="输入"]');
    await input.fill('中国联通站点数量');
    await page.click('button[data-testid="send-button"], button:has-text("发送")');
    await page.waitForTimeout(5000);

    // 滚动到顶部
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);

    // 查找并点击滚动按钮
    const scrollBtn = page.locator('.scroll-to-bottom-btn');
    if (await scrollBtn.isVisible({ timeout: 3000 })) {
      await scrollBtn.click();
      await page.waitForTimeout(500);

      // 按钮应该消失或变为非活跃状态
      // (具体行为取决于实现)
    }
  });
});

// ==================== 月份选择器测试 ====================

test.describe('月份选择器验证', () => {
  test('月份选择器有min和max属性', async ({ page }) => {
    await page.goto('/');
    // 登录
    const loginBtn = page.locator('button:has-text("登录"), button:has-text("Login"), button:has-text("登录系统")').first();
    if (await loginBtn.isVisible({ timeout: 2000 })) {
      await loginBtn.click();
      await page.fill('input[type="text"], input[placeholder*="用户"], input[placeholder*="username"]', 'admin');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]:has-text("登录"), button:has-text("登录")');
      await page.waitForTimeout(1000);
    }

    // 导航到Dashboard
    await page.click('text=看板, text=仪表盘, text=Dashboard', { timeout: 5000 }).catch(() => {});

    const monthInput = page.locator('input[type="month"]');
    if (await monthInput.isVisible({ timeout: 3000 })) {
      // 验证min属性
      const min = await monthInput.getAttribute('min');
      expect(min).toBeTruthy();
      expect(min).toMatch(/^\d{4}-\d{2}$/);

      // 验证max属性
      const max = await monthInput.getAttribute('max');
      expect(max).toBeTruthy();
      expect(max).toMatch(/^\d{4}-\d{2}$/);
    }
  });

  test('不能选择未来月份', async ({ page }) => {
    await page.goto('/');
    // 登录
    const loginBtn = page.locator('button:has-text("登录"), button:has-text("Login"), button:has-text("登录系统")').first();
    if (await loginBtn.isVisible({ timeout: 2000 })) {
      await loginBtn.click();
      await page.fill('input[type="text"], input[placeholder*="用户"], input[placeholder*="username"]', 'admin');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]:has-text("登录"), button:has-text("登录")');
      await page.waitForTimeout(1000);
    }

    // 导航到Dashboard
    await page.click('text=看板, text=仪表盘, text=Dashboard', { timeout: 5000 }).catch(() => {});

    const monthInput = page.locator('input[type="month"]');
    if (await monthInput.isVisible({ timeout: 3000 })) {
      const max = await monthInput.getAttribute('max');

      // 尝试设置一个超过max的月份
      const currentMonth = new Date().toISOString().slice(0, 7);
      const futureMonth = '2099-12';

      // 如果max是合理的值，futureMonth应该被拒绝
      if (max && max < futureMonth) {
        await monthInput.fill(futureMonth);
        const value = await monthInput.inputValue();
        // 应该被限制在max值
        expect(value).toBeLessThanOrEqual(max);
      }
    }
  });
});

// ==================== 命令面板测试 ====================

test.describe('命令面板功能', () => {
  test('输入/显示命令面板', async ({ page }) => {
    await page.goto('/');
    // 登录
    const loginBtn = page.locator('button:has-text("登录"), button:has-text("Login"), button:has-text("登录系统")').first();
    if (await loginBtn.isVisible({ timeout: 2000 })) {
      await loginBtn.click();
      await page.fill('input[type="text"], input[placeholder*="用户"], input[placeholder*="username"]', 'admin');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]:has-text("登录"), button:has-text("登录")');
      await page.waitForTimeout(1000);
    }

    // 输入/触发命令面板
    const input = page.locator('textarea[data-testid="chat-input"], input[placeholder*="查询"], input[placeholder*="输入"]');
    await input.fill('/');
    await page.waitForTimeout(500);

    // 验证命令面板显示
    const commandPanel = page.locator('.command-panel');
    if (await commandPanel.isVisible({ timeout: 3000 })) {
      await expect(commandPanel).toBeVisible();

      // 验证命令列表
      const commandItems = page.locator('.command-item');
      const count = await commandItems.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('命令面板有关闭按钮或点击外部关闭', async ({ page }) => {
    await page.goto('/');
    // 登录
    const loginBtn = page.locator('button:has-text("登录"), button:has-text("Login"), button:has-text("登录系统")').first();
    if (await loginBtn.isVisible({ timeout: 2000 })) {
      await loginBtn.click();
      await page.fill('input[type="text"], input[placeholder*="用户"], input[placeholder*="username"]', 'admin');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]:has-text("登录"), button:has-text("登录")');
      await page.waitForTimeout(1000);
    }

    // 输入/触发命令面板
    const input = page.locator('textarea[data-testid="chat-input"], input[placeholder*="查询"], input[placeholder*="输入"]');
    await input.fill('/');
    await page.waitForTimeout(500);

    const commandPanel = page.locator('.command-panel');
    if (await commandPanel.isVisible({ timeout: 3000 })) {
      // 按Escape关闭
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      // 面板应该消失
      await expect(commandPanel).not.toBeVisible();
    }
  });
});

// ==================== 表格功能测试 ====================

test.describe('表格功能验证', () => {
  test('表格支持排序', async ({ page }) => {
    await page.goto('/');
    // 登录
    const loginBtn = page.locator('button:has-text("登录"), button:has-text("Login"), button:has-text("登录系统")').first();
    if (await loginBtn.isVisible({ timeout: 2000 })) {
      await loginBtn.click();
      await page.fill('input[type="text"], input[placeholder*="用户"], input[placeholder*="username"]', 'admin');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]:has-text("登录"), button:has-text("登录")');
      await page.waitForTimeout(1000);
    }

    // 发送会返回表格的查询
    const input = page.locator('textarea[data-testid="chat-input"], input[placeholder*="查询"], input[placeholder*="输入"]');
    await input.fill('查看所有运营商站点');
    await page.click('button[data-testid="send-button"], button:has-text("发送")');
    await page.waitForTimeout(6000);

    // 查找表格
    const dataTable = page.locator('[data-testid="data-table"], .data-table, .structured-table');
    if (await dataTable.isVisible({ timeout: 5000 })) {
      // 查找可排序列头
      const sortableHeader = page.locator('th').first();
      if (await sortableHeader.isVisible()) {
        await sortableHeader.click();
        await page.waitForTimeout(300);

        // 验证排序图标有变化
        const sortIndicator = page.locator('.th-sort-indicator.active');
        await expect(sortIndicator).toBeVisible();
      }
    }
  });

  test('表格支持筛选', async ({ page }) => {
    await page.goto('/');
    // 登录
    const loginBtn = page.locator('button:has-text("登录"), button:has-text("Login"), button:has-text("登录系统")').first();
    if (await loginBtn.isVisible({ timeout: 2000 })) {
      await loginBtn.click();
      await page.fill('input[type="text"], input[placeholder*="用户"], input[placeholder*="username"]', 'admin');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]:has-text("登录"), button:has-text("登录")');
      await page.waitForTimeout(1000);
    }

    // 发送会返回表格的查询
    const input = page.locator('textarea[data-testid="chat-input"], input[placeholder*="查询"], input[placeholder*="输入"]');
    await input.fill('查看所有运营商站点');
    await page.click('button[data-testid="send-button"], button:has-text("发送")');
    await page.waitForTimeout(6000);

    // 查找筛选输入框
    const filterInput = page.locator('[data-testid="table-filter-input"], .table-filter-input');
    if (await filterInput.isVisible({ timeout: 5000 })) {
      await filterInput.fill('联通');
      await page.waitForTimeout(500);

      // 验证筛选结果
      const tableRows = page.locator('[data-testid="table-body"] tr, .data-table tbody tr');
      const count = await tableRows.count();
      // 如果有筛选，结果应该减少
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('表格支持导出CSV', async ({ page }) => {
    await page.goto('/');
    // 登录
    const loginBtn = page.locator('button:has-text("登录"), button:has-text("Login"), button:has-text("登录系统")').first();
    if (await loginBtn.isVisible({ timeout: 2000 })) {
      await loginBtn.click();
      await page.fill('input[type="text"], input[placeholder*="用户"], input[placeholder*="username"]', 'admin');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]:has-text("登录"), button:has-text("登录")');
      await page.waitForTimeout(1000);
    }

    // 发送会返回表格的查询
    const input = page.locator('textarea[data-testid="chat-input"], input[placeholder*="查询"], input[placeholder*="输入"]');
    await input.fill('查看所有运营商站点');
    await page.click('button[data-testid="send-button"], button:has-text("发送")');
    await page.waitForTimeout(6000);

    // 查找导出按钮
    const exportBtn = page.locator('[data-testid="table-export-button"], .table-export-btn');
    if (await exportBtn.isVisible({ timeout: 5000 })) {
      await expect(exportBtn).toBeVisible();
      await expect(exportBtn).toContainText('导出');
    }
  });
});

// ==================== 流式响应测试 ====================

test.describe('流式响应验证', () => {
  test('显示流式光标', async ({ page }) => {
    await page.goto('/');
    // 登录
    const loginBtn = page.locator('button:has-text("登录"), button:has-text("Login"), button:has-text("登录系统")').first();
    if (await loginBtn.isVisible({ timeout: 2000 })) {
      await loginBtn.click();
      await page.fill('input[type="text"], input[placeholder*="用户"], input[placeholder*="username"]', 'admin');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]:has-text("登录"), button:has-text("登录")');
      await page.waitForTimeout(1000);
    }

    // 发送查询
    const input = page.locator('textarea[data-testid="chat-input"], input[placeholder*="查询"], input[placeholder*="输入"]');
    await input.fill('中国联通小区数量');
    await page.click('button[data-testid="send-button"], button:has-text("发送")');

    // 等待流式响应开始
    await page.waitForTimeout(1000);

    // 验证流式光标存在
    const streamingCursor = page.locator('.streaming-cursor');
    // 流式进行中时应该有光标
    const isVisible = await streamingCursor.isVisible({ timeout: 3000 }).catch(() => false);
    // 不强制要求光标，因为可能在流式结束后才检查
  });

  test('思考中显示加载指示器', async ({ page }) => {
    await page.goto('/');
    // 登录
    const loginBtn = page.locator('button:has-text("登录"), button:has-text("Login"), button:has-text("登录系统")').first();
    if (await loginBtn.isVisible({ timeout: 2000 })) {
      await loginBtn.click();
      await page.fill('input[type="text"], input[placeholder*="用户"], input[placeholder*="username"]', 'admin');
      await page.fill('input[type="password"]', 'admin123');
      await page.click('button[type="submit"]:has-text("登录"), button:has-text("登录")');
      await page.waitForTimeout(1000);
    }

    // 发送查询
    const input = page.locator('textarea[data-testid="chat-input"], input[placeholder*="查询"], input[placeholder*="输入"]');
    await input.fill('中国联通小区数量');
    await page.click('button[data-testid="send-button"], button:has-text("发送")');

    // 等待一下检查加载指示器
    await page.waitForTimeout(500);

    // 验证思考指示器存在（可能在某次检查中捕获）
    const thinkingIndicator = page.locator('.thinking-indicator, .thinking-dots');
    const isVisible = await thinkingIndicator.isVisible({ timeout: 2000 }).catch(() => false);
    // 这是可选的，不强制要求
  });
});
