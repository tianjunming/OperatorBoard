import { test as base } from '@playwright/test';

export const test = base.extend({
  // 全局 setup
  page: async ({ page }, use) => {
    await page.goto('/');
    await use(page);
  },
});

export { expect } from '@playwright/test';
