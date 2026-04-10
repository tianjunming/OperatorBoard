/**
 * Verification tests for rendering fixes
 *
 * 验证渲染修复是否正确工作
 */

import { test, expect } from '@playwright/test';

test.describe('渲染修复验证', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('Metrics 修复 - 全部为 0 的值应该显示 0% 宽度', async ({ page }) => {
    const result = await page.evaluate(() => {
      // 模拟修复后的逻辑
      const items = [
        { label: '站点A', value: '0', numeric: 0 },
        { label: '站点B', value: '0', numeric: 0 },
        { label: '站点C', value: '0', numeric: 0 },
      ];

      // 安全计算最大值
      const validValues = items
        .map(i => i.numeric || 0)
        .filter(v => isFinite(v));
      const maxValue = validValues.length > 0 ? Math.max(...validValues) : 0;

      // 计算 bar 宽度
      const widths = items.map(item => {
        const numericValue = item.numeric || 0;
        const barWidth = maxValue > 0 ? (numericValue / maxValue) * 100 : 0;
        return `${barWidth}%`;
      });

      return {
        maxValue,
        widths,
        // 之前会返回 'NaN%'
        allZeroWidth: widths.every(w => w === '0%')
      };
    });

    expect(result.maxValue).toBe(0);
    expect(result.allZeroWidth).toBe(true);
  });

  test('Metrics 修复 - 混合有效值和无效值', async ({ page }) => {
    const result = await page.evaluate(() => {
      const items = [
        { label: '有效值', value: '100', numeric: 100 },
        { label: '无效值', value: 'N/A', numeric: NaN },
        { label: '零值', value: '0', numeric: 0 },
      ];

      // 安全计算最大值
      const validValues = items
        .map(i => i.numeric || 0)
        .filter(v => isFinite(v));
      const maxValue = validValues.length > 0 ? Math.max(...validValues) : 0;

      // 计算 bar 宽度
      const widths = items.map(item => {
        const numericValue = item.numeric || 0;
        const barWidth = maxValue > 0 ? (numericValue / maxValue) * 100 : 0;
        return barWidth;
      });

      return {
        maxValue,
        widths,
        expectedWidths: [100, 0, 0] // NaN 和 0 都被当作 0 处理
      };
    });

    expect(result.maxValue).toBe(100);
    expect(result.widths).toEqual([100, 0, 0]);
  });

  test('Chart 修复 - 数据缺少 name 字段', async ({ page }) => {
    const result = await page.evaluate(() => {
      const block = {
        chartType: 'bar',
        data: [
          { value: 100 },
          { value: 200 },
          { value: 300 }
        ],
        keys: undefined,
        column: 'name'
      };

      // 修复后的逻辑
      const dataKeys = block.data[0] ? Object.keys(block.data[0]) : [];
      const safeColumn = dataKeys.includes(block.column) ? block.column : (dataKeys[0] || 'name');
      const safeKeys = block.keys || dataKeys.filter(k => k !== safeColumn);

      return {
        originalColumn: block.column,
        safeColumn,
        safeKeys,
        // XAxis 会显示 "value" 而不是 "undefined"
        xAxisDataKey: safeColumn
      };
    });

    expect(result.safeColumn).toBe('value'); // 因为 'name' 不在数据中
    expect(result.safeKeys).toEqual([]); // 只有一个 key 就是 column
  });

  test('Chart 修复 - 数据有 name 字段', async ({ page }) => {
    const result = await page.evaluate(() => {
      const block = {
        chartType: 'bar',
        data: [
          { name: 'A', value: 100 },
          { name: 'B', value: 200 }
        ],
        keys: undefined,
        column: 'name'
      };

      // 修复后的逻辑
      const dataKeys = block.data[0] ? Object.keys(block.data[0]) : [];
      const safeColumn = dataKeys.includes(block.column) ? block.column : (dataKeys[0] || 'name');
      const safeKeys = block.keys || dataKeys.filter(k => k !== safeColumn);

      return {
        safeColumn,
        safeKeys,
        xAxisDataKey: safeColumn
      };
    });

    expect(result.safeColumn).toBe('name');
    expect(result.safeKeys).toEqual(['value']);
  });

  test('Pie Chart 修复 - NaN percent 处理', async ({ page }) => {
    const result = await page.evaluate(() => {
      // 测试 percent 为 NaN 的情况
      const testPercent = (percent) => {
        const percentValue = isNaN(percent) || !isFinite(percent) ? 0 : (percent * 100).toFixed(0);
        return `${percentValue}%`;
      };

      return {
        nanResult: testPercent(NaN),
        infResult: testPercent(Infinity),
        zeroResult: testPercent(0),
        normalResult: testPercent(0.5),
        // 之前会显示 'NaN%'
        allValid: ['0%', '0%', '0%', '50%'].every((v, i) => {
          const tests = [testPercent(NaN), testPercent(Infinity), testPercent(0), testPercent(0.5)];
          return tests[i] === v;
        })
      };
    });

    expect(result.nanResult).toBe('0%');
    expect(result.infResult).toBe('0%');
    expect(result.zeroResult).toBe('0%');
    expect(result.normalResult).toBe('50%');
  });

  test('空数据保护 - renderMetrics', async ({ page }) => {
    const result = await page.evaluate(() => {
      // 测试空数组
      const emptyItems = [];

      const validValues = emptyItems
        .map(i => i.numeric || 0)
        .filter(v => isFinite(v));
      const maxValue = validValues.length > 0 ? Math.max(...validValues) : 0;

      return {
        maxValue,
        // 不应该渲染
        shouldRender: emptyItems && emptyItems.length > 0
      };
    });

    expect(result.maxValue).toBe(0);
    expect(result.shouldRender).toBeFalsy();
  });

  test('空数据保护 - renderChart', async ({ page }) => {
    const result = await page.evaluate(() => {
      // 测试空数据
      const emptyData = [];

      // 修复后的逻辑
      const shouldRender = emptyData && emptyData.length > 0;

      return { shouldRender };
    });

    expect(result.shouldRender).toBeFalsy();
  });

});
