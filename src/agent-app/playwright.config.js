import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 180000, // 3分钟超时 - E2E测试需要较长时间
  expect: {
    timeout: 30000, // 断言超时增加到 30s
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // 报告配置
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  use: {
    baseURL: 'http://localhost:3000',

    // ========== Trace Viewer 配置 ==========
    // 'on-first-retry' - 首次失败时保存 trace (默认)
    // 'retain-on-failure' - 保留所有失败的 trace (推荐开发使用)
    // 'on-all-retries' - 所有重试都保存 trace
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',

    // ========== 截图配置 ==========
    screenshot: process.env.CI ? 'only-on-failure' : 'always',

    // ========== 视频配置 ==========
    video: process.env.CI ? 'off' : 'retain-on-failure',

    // ========== 请求日志配置 ==========
    launchOptions: {
      args: ['--disable-dev-shm-usage'], // 避免 Docker 内存问题
    },
  },

  // ========== 项目配置 ==========
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    {
      name: 'chromium-mobile',
      use: {
        ...devices['Pixel 5'],
      },
    },
  ],

  // ========== Web Server 配置 ==========
  webServer: process.env.CI ? {
    command: 'npm run start:all',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  } : undefined,

  // ========== 全局 teardown ==========
  globalTeardown: process.env.CI ? undefined : undefined,

  // ========== 测试超时配置 ==========
  testMatch: '**/*.spec.js',

  // ========== 忽略的文件 ==========
  testIgnore: [
    '**/node_modules/**',
    '**/test-results/**',
    '**/playwright-report/**',
  ],
});
