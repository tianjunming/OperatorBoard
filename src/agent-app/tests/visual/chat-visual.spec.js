/**
 * 视觉回归测试
 *
 * 使用 Playwright Screenshots API 进行视觉比对
 *
 * @module tests/visual/chat-visual.spec.js
 */

import { test, expect } from '@playwright/test';

// 是否运行视觉测试（视觉测试较慢，仅在 CI 或明确指定时运行）
const RUN_VISUAL_TESTS = process.env.RUN_VISUAL_TESTS === 'true';

// 是否运行需要后端的视觉测试
const RUN_BACKEND_VISUAL_TESTS = RUN_VISUAL_TESTS && process.env.BACKEND_AVAILABLE === 'true';

test.describe('聊天界面视觉回归测试', () => {

  test.beforeEach(async ({ page }) => {
    // 禁用动画以获得稳定截图
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('空状态聊天界面截图', async ({ page }) => {
    await expect(page).toHaveScreenshot('chat-empty-state.png', {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled',
    });
  });

  test('输入框聚焦状态截图', async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]');
    await input.focus();

    await expect(page).toHaveScreenshot('chat-input-focused.png', {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled',
    });
  });

  test('输入文本后界面截图', async ({ page }) => {
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill('北京联通站点数据');

    await expect(page).toHaveScreenshot('chat-input-filled.png', {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled',
    });
  });

  (RUN_BACKEND_VISUAL_TESTS ? test : test.skip)(
    'AI 响应包含图表时截图',
    async ({ page }) => {
      // 发送查询
      await page.locator('[data-testid="chat-input"]').fill('北京联通站点数据');
      await page.locator('[data-testid="send-button"]').click();

      // 等待图表渲染
      await expect(page.locator('[data-testid="structured-chart"]')).toBeVisible({
        timeout: 60000,
      });

      await expect(page).toHaveScreenshot('chat-with-chart.png', {
        maxDiffPixelRatio: 0.15,
        animations: 'disabled',
      });
    }
  );

  (RUN_BACKEND_VISUAL_TESTS ? test : test.skip)(
    'AI 响应包含表格时截图',
    async ({ page }) => {
      await page.locator('[data-testid="chat-input"]').fill('北京联通站点分布表格');
      await page.locator('[data-testid="send-button"]').click();

      await expect(page.locator('[data-testid="structured-table"]')).toBeVisible({
        timeout: 60000,
      });

      await expect(page).toHaveScreenshot('chat-with-table.png', {
        maxDiffPixelRatio: 0.15,
        animations: 'disabled',
      });
    }
  );

  (RUN_BACKEND_VISUAL_TESTS ? test : test.skip)(
    '思维链显示状态截图',
    async ({ page }) => {
      await page.locator('[data-testid="chat-input"]').fill('北京联通站点数据');
      await page.locator('[data-testid="send-button"]').click();

      // 等待思维链出现
      const thinkingChain = page.locator('[data-testid="thinking-chain"]');
      await expect(thinkingChain).toBeVisible({ timeout: 60000 });

      await expect(page).toHaveScreenshot('chat-with-thinking.png', {
        maxDiffPixelRatio: 0.15,
        animations: 'disabled',
      });
    }
  );

});

test.describe('侧边栏视觉回归测试', () => {

  test('侧边栏默认状态截图', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('[data-testid="sidebar"]');

    await expect(sidebar).toBeVisible();

    await expect(page).toHaveScreenshot('sidebar-default.png', {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled',
    });
  });

  test('新对话按钮状态截图', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const newChatBtn = page.locator('[data-testid="new-chat-button"]');

    // 聚焦按钮
    await newChatBtn.focus();

    await expect(page).toHaveScreenshot('sidebar-new-chat-focused.png', {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled',
    });
  });

});

test.describe('响应式布局视觉测试', () => {

  test('桌面视图 (1920x1080)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('desktop-1920x1080.png', {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled',
    });
  });

  test('笔记本视图 (1366x768)', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('laptop-1366x768.png', {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled',
    });
  });

  test('平板视图 (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('tablet-768x1024.png', {
      maxDiffPixelRatio: 0.1,
      animations: 'disabled',
    });
  });

  test('手机视图 (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('mobile-375x667.png', {
      maxDiffPixelRatio: 0.15,
      animations: 'disabled',
    });
  });

});
