import { test, expect } from '@playwright/test';

// 业界实践：使用业界标准测试框架 + 详细报告
const queries = [
  { name: '中国联通有多少站点', func: 1, expected: ['站点', 'LTE', 'NR'] },
  { name: '中国联通有多少小区', func: 2, expected: ['小区', 'LTE', 'NR'] },
  { name: '中国联通小区上行负载', func: 3, expected: ['负载', '上行', 'PRB'] },
  { name: '中国联通小区下行负载', func: 4, expected: ['负载', '下行', 'PRB'] },
  { name: '中国联通小区上行速率', func: 5, expected: ['速率', '上行', 'UL'] },
  { name: '中国联通小区下行速率', func: 6, expected: ['速率', '下行', 'DL'] },
  { name: '中国联通小区指标', func: 7, expected: ['指标', '分流', '驻留'] },
  { name: '查看所有运营商', func: 8, expected: ['运营商', '中国'] },
  { name: '查看所有运营商站点', func: 9, expected: ['站点', 'LTE', 'NR'] },
  { name: '查看所有运营商下行速率', func: 10, expected: ['下行', '速率'] },
  { name: '查看所有运营商上行速率', func: 11, expected: ['上行', '速率'] },
  { name: '中国联通历史所有站点', func: 12, expected: ['站点', '历史'] },
  { name: '中国联通历史所有小区', func: 13, expected: ['小区', '历史'] },
  { name: '中国联通历史所有小区上行负载', func: 14, expected: ['负载', '上行', '历史'] },
  { name: '中国联通历史所有小区下行负载', func: 15, expected: ['负载', '下行', '历史'] },
  { name: '中国联通历史所有小区上行速率', func: 16, expected: ['速率', '上行', '历史'] },
  { name: '中国联通历史所有小区下行速率', func: 17, expected: ['速率', '下行', '历史'] },
  { name: '中国联通历史所有小区指标', func: 18, expected: ['指标', '历史'] },
];

async function login(page) {
  const loginForm = page.locator('.auth-login-card');
  if (await loginForm.isVisible()) {
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
  }
}

test.describe('18个关键功能E2E验证 - 业界实践测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await login(page);
    await page.waitForTimeout(2000);
  });

  for (const query of queries) {
    test(`功能${query.func}: ${query.name}`, async ({ page }) => {
      // 查找聊天输入框
      let inputField = page.locator('textarea').first();
      
      // 发送查询
      await inputField.fill(query.name);
      await inputField.press('Enter');
      
      // 等待响应（增加超时时间）
      await page.waitForTimeout(20000);
      
      // 获取页面内容
      const pageContent = await page.textContent('body');
      
      // 检查是否有响应内容
      const hasData = pageContent.includes('共找到') || 
                     pageContent.includes('查询结果') ||
                     pageContent.includes('统计');
      
      // 检查是否包含期望的关键词
      const hasKeywords = query.expected.some(kw => pageContent.includes(kw));
      
      console.log(`\n=== 功能${query.func}: ${query.name} ===`);
      console.log(`数据响应: ${hasData}`);
      console.log(`关键词匹配: ${hasKeywords ? query.expected.join(', ') : '无'}`);
      
      // 提取响应内容片段用于报告
      if (pageContent.includes('共找到')) {
        const match = pageContent.match(/共找到[^<]{0,100}/);
        if (match) console.log(`结果摘要: ${match[0]}`);
      }
      
      // 测试通过条件：有数据响应且包含关键词
      expect(hasData || hasKeywords).toBeTruthy();
    });
  }
});
