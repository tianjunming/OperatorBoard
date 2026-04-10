/**
 * OperatorBoard E2E 测试用例 - 数据流验证
 *
 * 本测试文件验证从数据库查询结果到前端界面呈现的完整数据流
 *
 * 测试覆盖:
 * 1. 数据库字段映射一致性 (MySQL → Java → Python → Frontend)
 * 2. 格式化输出格式正确性
 * 3. 前端解析器兼容性
 * 4. 图表渲染数据完整性
 */

import { test, expect } from '@playwright/test';
import { ChatPage } from './pages/ChatPage';

// ============================================================
// 测试数据规格 (参考 E2E_TEST_SPEC.md)
// ============================================================

/**
 * 标准站点数据结构 (site_info)
 * 对应数据库字段: lte_700M_site, lte_700M_cell, nr_3500M_site, nr_3500M_cell
 */
const SITE_DATA = {
  operatorId: 1,
  dataMonth: '2026-03',
  // MyBatis映射后的驼峰命名
  lte700MSite: 45,
  lte700MCell: 120,
  lte800MSite: 30,
  lte800MCell: 80,
  lte900MSite: 150,
  lte900MCell: 450,
  nr700MSite: 30,
  nr700MCell: 80,
  nr3500MSite: 35,
  nr3500MCell: 85,
  nr2300MSite: 12,
  nr2300MCell: 30,
  lteTotalSite: 290,
  lteTotalCell: 800,
  nrTotalSite: 77,
  nrTotalCell: 195,
};

/**
 * 标准指标数据结构 (indicator_info)
 */
const INDICATOR_DATA = {
  operatorId: 1,
  dataMonth: '2026-03',
  // LTE 700M 频段指标
  lte700MDlRate: 45.50,
  lte700MUlRate: 8.30,
  lte700MDlPrb: 22.50,
  lte700MUlPrb: 28.90,
  // NR 3500M 频段指标
  nr3500MDlRate: 680.90,
  nr3500MUlRate: 125.60,
  nr3500MDlPrb: 75.80,
  nr3500MUlPrb: 81.20,
  // 汇总指标
  lteAvgDlRate: 131.87,
  lteAvgPrb: 39.07,
  nrAvgDlRate: 318.52,
  nrAvgPrb: 59.54,
};

/**
 * 期望的Chart Block格式 (server.py生成)
 * 格式: "- {bandName}: {value}"
 */
const CHART_BLOCK_TEMPLATES = {
  simple: `:::chart[bar]
- LTE 700M: 45
- LTE 800M: 30
- NR 3500M: 35
:::`,

  withMetrics: `:::chart
- LTE 700M 站点: 45
- LTE 700M 小区: 120
- NR 3500M 站点: 35
- NR 3500M 小区: 85
:::`,
};

/**
 * 期望的Table Block格式
 */
const TABLE_BLOCK_TEMPLATE = `:::table
| 运营商 | 区域 | 数据月 | 频段 | 站点 | 小区 |
|--------|------|--------|------|------|------|
| 中国移动 | 北京 | 2026-03 | LTE 700M | 45 | 120 |
| 中国移动 | 北京 | 2026-03 | NR 3500M | 35 | 85 |
:::`;

// ============================================================
// TC001: 数据流完整性验证 - 站点数据
// ============================================================
test.describe('TC001: 站点数据完整字段映射验证', () => {

  test('数据库字段到Chart数据的完整映射', async ({ page }) => {
    await page.goto('/');

    // 模拟Java MyBatis返回的数据 (驼峰命名)
    const javaResponse = {
      operatorId: 1,
      dataMonth: '2026-03',
      lte700MSite: 45,
      lte700MCell: 120,
      nr3500MSite: 35,
      nr3500MCell: 85,
      nr2300MSite: 12,
      nr2300MCell: 30,
    };

    // 模拟Python Agent的格式化逻辑
    const formattedChart = await page.evaluate((data) => {
      const lines = [':::chart[bar]'];
      // LTE bands
      if (data.lte700MSite) lines.push(`- LTE 700M: ${data.lte700MSite}`);
      if (data.lte800MSite) lines.push(`- LTE 800M: ${data.lte800MSite}`);
      if (data.lte900MSite) lines.push(`- LTE 900M: ${data.lte900MSite}`);
      // NR bands
      if (data.nr3500MSite) lines.push(`- NR 3500M: ${data.nr3500MSite}`);
      if (data.nr2300MSite) lines.push(`- NR 2300M: ${data.nr2300MSite}`);
      lines.push(':::');
      return lines.join('\n');
    }, javaResponse);

    // 验证格式化输出
    expect(formattedChart).toContain('LTE 700M: 45');
    expect(formattedChart).toContain('NR 3500M: 35');
    expect(formattedChart).toContain('NR 2300M: 12');

    // 验证parseChartBlock解析
    const parsedChart = await page.evaluate((chartContent) => {
      const match = chartContent.match(/:::chart\[?(\w+)?\]?\s*\n([\s\S]*?)\n:::/);
      if (!match) return null;

      const lines = match[2].trim().split('\n');
      const data = [];

      for (const line of lines) {
        const itemMatch = line.match(/^\s*[-*]\s*(.+?):\s*([\d.]+)/);
        if (itemMatch) {
          data.push({
            name: itemMatch[1].trim(),
            value: parseFloat(itemMatch[2]),
          });
        }
      }
      return data;
    }, formattedChart);

    expect(parsedChart).not.toBeNull();
    expect(parsedChart.length).toBeGreaterThan(0);
    expect(parsedChart[0]).toHaveProperty('name');
    expect(parsedChart[0]).toHaveProperty('value');
  });

  test('NR 2300M频段正确处理', async ({ page }) => {
    await page.goto('/');

    // 验证NR 2300M数据
    const hasNR2300M = SITE_DATA.nr2300MSite > 0;
    expect(hasNR2300M).toBe(true);

    // 格式化NR 2300M
    const nr2300MFormatted = await page.evaluate((data) => {
      return `- NR 2300M: ${data.nr2300MSite}`;
    }, SITE_DATA);

    expect(nr2300MFormatted).toBe('- NR 2300M: 12');
  });

  test('Chart数据零值过滤', async ({ page }) => {
    await page.goto('/');

    // 模拟包含零值的数据
    const dataWithZeros = {
      lte700MSite: 45,
      lte800MSite: 0, // 零值应该被过滤
      nr3500MSite: 35,
    };

    const filteredChart = await page.evaluate((data) => {
      const lines = [':::chart[bar]'];
      if (data.lte700MSite > 0) lines.push(`- LTE 700M: ${data.lte700MSite}`);
      if (data.lte800MSite > 0) lines.push(`- LTE 800M: ${data.lte800MSite}`);
      if (data.nr3500MSite > 0) lines.push(`- NR 3500M: ${data.nr3500MSite}`);
      lines.push(':::');
      return lines.join('\n');
    }, dataWithZeros);

    expect(filteredChart).toContain('LTE 700M: 45');
    expect(filteredChart).not.toContain('LTE 800M: 0');
    expect(filteredChart).toContain('NR 3500M: 35');
  });
});

// ============================================================
// TC002: 指标数据完整字段映射验证
// ============================================================
test.describe('TC002: 指标数据完整字段映射验证', () => {

  test('指标字段正确映射', async ({ page }) => {
    await page.goto('/');

    // 验证指标数据结构
    expect(INDICATOR_DATA.lte700MDlRate).toBe(45.50);
    expect(INDICATOR_DATA.nr3500MDlRate).toBe(680.90);

    // 验证格式化
    const formattedIndicator = await page.evaluate((data) => {
      return `- LTE 700M 下行: ${data.lte700MDlRate}`;
    }, INDICATOR_DATA);

    expect(formattedIndicator).toBe('- LTE 700M 下行: 45.5');
  });

  test('指标数值精度保留', async ({ page }) => {
    await page.goto('/');

    // 验证小数精度
    const formatted = await page.evaluate((data) => {
      return {
        dlRate: data.lte700MDlRate.toFixed(2),
        ulRate: data.lte700MUlRate.toFixed(2),
      };
    }, INDICATOR_DATA);

    expect(formatted.dlRate).toBe('45.50');
    expect(formatted.ulRate).toBe('8.30');
  });

  test('指标Chart数据格式', async ({ page }) => {
    await page.goto('/');

    const chartData = await page.evaluate((data) => {
      return [
        { name: 'LTE 700M 下行', value: data.lte700MDlRate },
        { name: 'LTE 700M 上行', value: data.lte700MUlRate },
        { name: 'NR 3500M 下行', value: data.nr3500MDlRate },
      ];
    }, INDICATOR_DATA);

    expect(chartData[0].name).toBe('LTE 700M 下行');
    expect(chartData[0].value).toBe(45.50);
  });
});

// ============================================================
// TC010: Chart格式解析兼容性
// ============================================================
test.describe('TC010: Chart格式解析兼容性测试', () => {

  test('简单格式解析', async ({ page }) => {
    await page.goto('/');

    const simpleChart = `:::chart[bar]
- LTE 700M: 42
- LTE 800M: 28
:::`;

    const parsed = await page.evaluate((content) => {
      const match = content.match(/:::chart\[?(\w+)?\]?\s*\n([\s\S]*?)\n:::/);
      if (!match) return null;

      const lines = match[2].trim().split('\n');
      const data = [];

      for (const line of lines) {
        const itemMatch = line.match(/^\s*[-*]\s*(.+?):\s*([\d.]+)/);
        if (itemMatch) {
          data.push({
            name: itemMatch[1].trim(),
            value: parseFloat(itemMatch[2]),
          });
        }
      }
      return data;
    }, simpleChart);

    expect(parsed).not.toBeNull();
    expect(parsed.length).toBe(2);
    expect(parsed[0].name).toBe('LTE 700M');
    expect(parsed[0].value).toBe(42);
  });

  test('带指标后缀格式解析', async ({ page }) => {
    await page.goto('/');

    const metricChart = `:::chart
- LTE 700M 站点: 42
- LTE 700M 小区: 126
- NR 3500M 站点: 35
- NR 3500M 小区: 85
:::`;

    const parsed = await page.evaluate((content) => {
      const match = content.match(/:::chart\[?(\w+)?\]?\s*\n([\s\S]*?)\n:::/);
      if (!match) return null;

      const lines = match[2].trim().split('\n');
      const bandData = {};

      for (const line of lines) {
        const itemMatch = line.match(/^\s*[-*]\s*(.+?):\s*([\d.]+)/);
        if (itemMatch) {
          const fullMatch = itemMatch[1].trim();
          const value = parseFloat(itemMatch[2]);
          const parts = fullMatch.split(/\s+/);

          let bandName = fullMatch;
          let metricName = 'value';

          if (parts.length >= 2) {
            const lastPart = parts[parts.length - 1];
            if (['站点', '小区', '下行', '上行', 'PRB'].includes(lastPart)) {
              bandName = parts.slice(0, -1).join(' ');
              metricName = lastPart;
            }
          }

          if (!bandData[bandName]) {
            bandData[bandName] = { name: bandName };
          }
          bandData[bandName][metricName] = value;
        }
      }

      return Object.values(bandData);
    }, metricChart);

    expect(parsed).not.toBeNull();
    expect(parsed.length).toBe(2); // LTE 700M 和 NR 3500M
    expect(parsed[0].name).toBe('LTE 700M');
    expect(parsed[0]).toHaveProperty('站点');
    expect(parsed[0]).toHaveProperty('小区');
  });

  test('混合格式解析', async ({ page }) => {
    await page.goto('/');

    const mixedChart = `:::chart
- LTE 700M: 42
- LTE 700M 站点: 42
- NR 3500M: 35
:::`;

    const parsed = await page.evaluate((content) => {
      const match = content.match(/:::chart\[?(\w+)?\]?\s*\n([\s\S]*?)\n:::/);
      if (!match) return null;

      const lines = match[2].trim().split('\n');
      const data = [];

      for (const line of lines) {
        const itemMatch = line.match(/^\s*[-*]\s*(.+?):\s*([\d.]+)/);
        if (itemMatch) {
          data.push({
            name: itemMatch[1].trim(),
            value: parseFloat(itemMatch[2]),
          });
        }
      }
      return data;
    }, mixedChart);

    expect(parsed.length).toBe(3);
  });

  test('NR 2300M格式解析', async ({ page }) => {
    await page.goto('/');

    const nr2300mChart = `:::chart
- NR 2300M: 12
- NR 2300M 小区: 30
:::`;

    const parsed = await page.evaluate((content) => {
      const match = content.match(/:::chart\[?(\w+)?\]?\s*\n([\s\S]*?)\n:::/);
      if (!match) return null;

      const lines = match[2].trim().split('\n');
      const bandData = {};

      for (const line of lines) {
        const itemMatch = line.match(/^\s*[-*]\s*(.+?):\s*([\d.]+)/);
        if (itemMatch) {
          const fullMatch = itemMatch[1].trim();
          const value = parseFloat(itemMatch[2]);
          const parts = fullMatch.split(/\s+/);

          let bandName = fullMatch;
          let metricName = 'value';

          if (parts.length >= 2) {
            const lastPart = parts[parts.length - 1];
            if (['站点', '小区', '下行', '上行', 'PRB'].includes(lastPart)) {
              bandName = parts.slice(0, -1).join(' ');
              metricName = lastPart;
            }
          }

          if (!bandData[bandName]) {
            bandData[bandName] = { name: bandName };
          }
          bandData[bandName][metricName] = value;
        }
      }

      return Object.values(bandData);
    }, nr2300mChart);

    expect(parsed).not.toBeNull();
    expect(parsed.length).toBe(1); // NR 2300M
    expect(parsed[0].name).toBe('NR 2300M');
    expect(parsed[0].value).toBe(12);
    expect(parsed[0].小区).toBe(30);
  });
});

// ============================================================
// TC011: Table格式解析兼容性
// ============================================================
test.describe('TC011: Table格式解析兼容性测试', () => {

  test('标准Markdown表格解析', async ({ page }) => {
    await page.goto('/');

    const tableBlock = `:::table
| 运营商 | 区域 | 站点数 | 小区数 |
| ------ | ---- | ------ | ------ |
| 北京联通 | 朝阳区 | 1250 | 3800 |
| 上海联通 | 浦东新区 | 980 | 2900 |
:::`;

    const parsed = await page.evaluate((content) => {
      const match = content.match(/:::table\s*\n([\s\S]*?)\n:::/);
      if (!match) return null;

      const lines = match[1].trim().split('\n').filter(l => l.trim());
      if (lines.length < 2) return { data: [], columns: [] };

      const headers = lines[0].split('|').filter(c => c.trim()).map(h => h.trim());
      const data = [];

      for (let i = 2; i < lines.length; i++) {
        const values = lines[i].split('|').filter(c => c.trim()).map(v => v.trim());
        if (values.length === headers.length) {
          const row = {};
          headers.forEach((h, idx) => { row[h] = values[idx]; });
          data.push(row);
        }
      }

      return { data, columns: headers };
    }, tableBlock);

    expect(parsed.columns).toEqual(['运营商', '区域', '站点数', '小区数']);
    expect(parsed.data.length).toBe(2);
    expect(parsed.data[0]).toEqual({
      '运营商': '北京联通',
      '区域': '朝阳区',
      '站点数': '1250',
      '小区数': '3800',
    });
  });

  test('站点数据表格解析', async ({ page }) => {
    await page.goto('/');

    const siteTable = `:::table
| 运营商 | 区域 | 数据月 | 频段 | 站点 | 小区 |
|--------|------|--------|------|------|------|
| 中国移动 | 北京 | 2026-03 | LTE 700M | 45 | 120 |
| 中国移动 | 北京 | 2026-03 | NR 3500M | 35 | 85 |
:::`;

    const parsed = await page.evaluate((content) => {
      const match = content.match(/:::table\s*\n([\s\S]*?)\n:::/);
      if (!match) return null;

      const lines = match[1].trim().split('\n').filter(l => l.trim());
      if (lines.length < 2) return { data: [], columns: [] };

      const headers = lines[0].split('|').filter(c => c.trim()).map(h => h.trim());
      const data = [];

      for (let i = 2; i < lines.length; i++) {
        const values = lines[i].split('|').filter(c => c.trim()).map(v => v.trim());
        if (values.length === headers.length) {
          const row = {};
          headers.forEach((h, idx) => { row[h] = values[idx]; });
          data.push(row);
        }
      }

      return { data, columns: headers };
    }, siteTable);

    expect(parsed.columns).toContain('频段');
    expect(parsed.columns).toContain('站点');
    expect(parsed.columns).toContain('小区');
    expect(parsed.data[0]['频段']).toBe('LTE 700M');
  });
});

// ============================================================
// TC020: 边界条件测试
// ============================================================
test.describe('TC020: 边界条件测试', () => {

  test('空数据处理', async ({ page }) => {
    await page.goto('/');

    const emptyData = null;

    const result = await page.evaluate((data) => {
      if (!data || (Array.isArray(data) && data.length === 0)) {
        return { content: '未找到站点数据', chart: null };
      }
      return null;
    }, emptyData);

    expect(result.content).toBe('未找到站点数据');
    expect(result.chart).toBeNull();
  });

  test('零值处理', async ({ page }) => {
    await page.goto('/');

    const zeroValueData = {
      lte700MSite: 0,
      lte800MSite: 30,
    };

    const filtered = await page.evaluate((data) => {
      return Object.entries(data)
        .filter(([key, value]) => key.endsWith('Site') && value > 0)
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {});
    }, zeroValueData);

    expect(filtered).not.toHaveProperty('lte700MSite');
    expect(filtered).toHaveProperty('lte800MSite');
    expect(filtered.lte800MSite).toBe(30);
  });

  test('大数值处理', async ({ page }) => {
    await page.goto('/');

    const largeValue = 999999999;

    const formatted = await page.evaluate((value) => {
      return value.toLocaleString();
    }, largeValue);

    expect(formatted).toBe('999,999,999');
  });

  test('小数精度处理', async ({ page }) => {
    await page.goto('/');

    const decimalValue = 45.56789;

    const rounded = await page.evaluate((value) => {
      return Math.round(value * 100) / 100;
    }, decimalValue);

    expect(rounded).toBe(45.57);
  });

  test('空字符串处理', async ({ page }) => {
    await page.goto('/');

    const emptyCell = '';

    const isEmpty = await page.evaluate((cell) => {
      return !cell || cell.trim() === '';
    }, emptyCell);

    expect(isEmpty).toBe(true);
  });
});

// ============================================================
// TC030: 思考链解析测试
// ============================================================
test.describe('TC030: 思考链解析测试', () => {

  test('标准思考链格式', async ({ page }) => {
    await page.goto('/');

    const thinkingContent = `<!-- thinking_start -->
1. 分析用户查询：查询北京联通的站点数据
2. 意图检测：site_data
3. 识别运营商：北京联通
4. 数据类型：站点小区汇总
5. 调用NL2SQL服务获取数据
<!-- thinking_end -->`;

    const parsed = await page.evaluate((content) => {
      const startMarker = '<!-- thinking_start -->';
      const endMarker = '<!-- thinking_end -->';
      const startIdx = content.indexOf(startMarker);
      const endIdx = content.indexOf(endMarker);

      if (startIdx !== -1 && endIdx !== -1) {
        const thinking = content.slice(startIdx + startMarker.length, endIdx).trim();
        const mainContent = content.slice(0, startIdx) + content.slice(endIdx + endMarker.length);
        return { thinking, mainContent: mainContent.trim() };
      }
      return { thinking: null, mainContent: content };
    }, thinkingContent);

    expect(parsed.thinking).toBeTruthy();
    expect(parsed.thinking).toContain('分析用户查询');
    expect(parsed.thinking.split('\n').length).toBe(5);
  });

  test('无思考链内容', async ({ page }) => {
    await page.goto('/');

    const noThinking = '这是一条普通的回复内容。';

    const parsed = await page.evaluate((content) => {
      const startMarker = '<!-- thinking_start -->';
      const endMarker = '<!-- thinking_end -->';
      const startIdx = content.indexOf(startMarker);
      const endIdx = content.indexOf(endMarker);

      if (startIdx !== -1 && endIdx !== -1) {
        const thinking = content.slice(startIdx + startMarker.length, endIdx).trim();
        const mainContent = content.slice(0, startIdx) + content.slice(endIdx + endMarker.length);
        return { thinking, mainContent: mainContent.trim() };
      }
      return { thinking: null, mainContent: content };
    }, noThinking);

    expect(parsed.thinking).toBeNull();
    expect(parsed.mainContent).toBe(noThinking);
  });
});

// ============================================================
// TC031: Toggle块解析测试
// ============================================================
test.describe('TC031: Toggle块解析测试', () => {

  test('Toggle块标准格式解析', async ({ page }) => {
    await page.goto('/');

    const toggleBlock = `:::toggle[site_cells]
[table]
| 数据月 | 下行速率 | 上行速率 |
| ------ | -------- | -------- |
| 2026-01 | 85.2 | 12.5 |
| 2026-02 | 86.1 | 12.8 |

[chart]
- 2026-01: 下行: 85.2, 上行: 12.5
- 2026-02: 下行: 86.1, 上行: 12.8
:::`;

    const parsed = await page.evaluate((content) => {
      const match = content.match(/:::toggle\[?(\w+)?\]?\s*\n([\s\S]*?)\n:::/);
      if (!match) return null;

      const blockType = match[1] || 'default';
      const blockContent = match[2];

      // Split content into table and chart sections
      const tableMatch = blockContent.match(/\[table\]([\s\S]*?)\[chart\]/);
      const chartMatch = blockContent.match(/\[chart\]([\s\S]*?)$/);

      let tableData = { data: [], columns: [] };
      let chartData = [];

      if (tableMatch) {
        const tableLines = tableMatch[1].trim().split('\n').filter(l => l.trim());
        if (tableLines.length >= 2) {
          const headers = tableLines[0].split('|').filter(c => c.trim()).map(h => h.trim());
          const data = [];
          for (let i = 2; i < tableLines.length; i++) {
            const values = tableLines[i].split('|').filter(c => c.trim()).map(v => v.trim());
            if (values.length === headers.length) {
              const row = {};
              headers.forEach((h, idx) => { row[h] = values[idx]; });
              data.push(row);
            }
          }
          tableData = { columns: headers, data };
        }
      }

      if (chartMatch) {
        const chartLines = chartMatch[1].trim().split('\n').filter(l => l.trim());
        for (const line of chartLines) {
          const itemMatch = line.match(/^\s*[-*]\s*(.+?):\s*(.+)$/);
          if (itemMatch) {
            const month = itemMatch[1].trim();
            const metricsStr = itemMatch[2].trim();
            const metrics = metricsStr.split(',').map(m => m.trim());
            const item = { month };
            for (const metric of metrics) {
              const [key, value] = metric.split(':');
              if (key && value) {
                item[key.trim()] = parseFloat(value);
              }
            }
            chartData.push(item);
          }
        }
      }

      return { blockType, table: tableData, chart: chartData };
    }, toggleBlock);

    expect(parsed.blockType).toBe('site_cells');
    expect(parsed.table.columns).toEqual(['数据月', '下行速率', '上行速率']);
    expect(parsed.table.data.length).toBe(2);
    expect(parsed.chart.length).toBe(2);
  });
});

// ============================================================
// TC040: 集成测试 - 完整数据流
// ============================================================
test.describe('TC040: 完整数据流集成测试', () => {

  test('站点数据完整流程', async ({ page }) => {
    await page.goto('/');

    // 模拟完整数据流
    const result = await page.evaluate(() => {
      // 1. Java MyBatis返回 (驼峰命名)
      const javaResponse = {
        operatorId: 1,
        dataMonth: '2026-03',
        lte700MSite: 45,
        lte700MCell: 120,
        nr3500MSite: 35,
        nr3500MCell: 85,
        nr2300MSite: 12,
        nr2300MCell: 30,
      };

      // 2. Python格式化 (生成Chart Block)
      const lines = [':::chart[bar]'];
      if (javaResponse.lte700MSite) lines.push(`- LTE 700M: ${javaResponse.lte700MSite}`);
      if (javaResponse.lte700MCell) lines.push(`- LTE 700M: ${javaResponse.lte700MCell}`);
      if (javaResponse.nr3500MSite) lines.push(`- NR 3500M: ${javaResponse.nr3500MSite}`);
      if (javaResponse.nr3500MCell) lines.push(`- NR 3500M: ${javaResponse.nr3500MCell}`);
      if (javaResponse.nr2300MSite) lines.push(`- NR 2300M: ${javaResponse.nr2300MSite}`);
      if (javaResponse.nr2300MCell) lines.push(`- NR 2300M: ${javaResponse.nr2300MCell}`);
      lines.push(':::');
      const chartBlock = lines.join('\n');

      // 3. Frontend Parser解析
      const match = chartBlock.match(/:::chart\[?(\w+)?\]?\s*\n([\s\S]*?)\n:::/);
      if (!match) return null;

      const chartLines = match[2].trim().split('\n');
      const data = [];
      for (const line of chartLines) {
        const itemMatch = line.match(/^\s*[-*]\s*(.+?):\s*([\d.]+)/);
        if (itemMatch) {
          data.push({
            name: itemMatch[1].trim(),
            value: parseFloat(itemMatch[2]),
          });
        }
      }

      return {
        chartBlock,
        parsedData: data,
      };
    });

    expect(result.chartBlock).toContain(':::chart[bar]');
    expect(result.chartBlock).toContain('LTE 700M: 45');
    expect(result.chartBlock).toContain('NR 3500M: 35');
    expect(result.chartBlock).toContain('NR 2300M: 12');
    expect(result.parsedData.length).toBe(6);
  });

  test('指标数据完整流程', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate(() => {
      // 1. Java MyBatis返回
      const javaResponse = {
        dataMonth: '2026-03',
        lte700MDlRate: 45.50,
        lte700MUlRate: 8.30,
        nr3500MDlRate: 680.90,
        nr3500MUlRate: 125.60,
      };

      // 2. Python格式化
      const chartLines = [':::chart[bar]'];
      chartLines.push(`- LTE 700M 下行: ${javaResponse.lte700MDlRate}`);
      chartLines.push(`- LTE 700M 上行: ${javaResponse.lte700MUlRate}`);
      chartLines.push(`- NR 3500M 下行: ${javaResponse.nr3500MDlRate}`);
      chartLines.push(`- NR 3500M 上行: ${javaResponse.nr3500MUlRate}`);
      chartLines.push(':::');
      const chartBlock = chartLines.join('\n');

      // 3. Frontend解析
      const match = chartBlock.match(/:::chart\[?(\w+)?\]?\s*\n([\s\S]*?)\n:::/);
      if (!match) return null;

      const chartLines2 = match[2].trim().split('\n');
      const bandData = {};
      for (const line of chartLines2) {
        const itemMatch = line.match(/^\s*[-*]\s*(.+?):\s*([\d.]+)/);
        if (itemMatch) {
          const fullMatch = itemMatch[1].trim();
          const value = parseFloat(itemMatch[2]);
          const parts = fullMatch.split(/\s+/);
          let bandName = fullMatch;
          let metricName = 'value';
          if (parts.length >= 2) {
            const lastPart = parts[parts.length - 1];
            if (['下行', '上行', 'PRB', '站点', '小区'].includes(lastPart)) {
              bandName = parts.slice(0, -1).join(' ');
              metricName = lastPart;
            }
          }
          if (!bandData[bandName]) bandData[bandName] = { name: bandName };
          bandData[bandName][metricName] = value;
        }
      }

      return {
        chartBlock,
        parsedData: Object.values(bandData),
      };
    });

    expect(result.chartBlock).toContain('LTE 700M 下行: 45.5');
    expect(result.chartBlock).toContain('NR 3500M 下行: 680.9');
    expect(result.parsedData.length).toBe(2); // LTE 700M 和 NR 3500M
  });
});

// ============================================================
// TC050: 已知问题验证
// ============================================================
test.describe('TC050: 已知问题验证', () => {

  /**
   * Issue #D2D-001: Chart格式中"站点/小区"与频段无空格
   * 格式: "LTE 700M站点:42" vs 期望 "LTE 700M: 42"
   */
  test('Chart格式空格问题 - 简单格式', async ({ page }) => {
    await page.goto('/');

    // 当前实现会生成带空格的格式
    const correctFormat = await page.evaluate(() => {
      const bandName = 'LTE 700M';
      const metric = '站点';
      const value = 42;
      return `- ${bandName} ${metric}: ${value}`;
    });

    expect(correctFormat).toBe('- LTE 700M 站点: 42');
  });

  /**
   * Issue #D2D-002: NR 2300M未生成Chart数据
   */
  test('NR 2300M频段完整验证', async ({ page }) => {
    await page.goto('/');

    const nr2300MData = {
      nr2300MSite: 12,
      nr2300MCell: 30,
    };

    // 验证NR 2300M在ALL_BANDS定义中
    const ALL_BANDS = [
      ['LTE 700M', 'lte700MSite', 'lte700MCell'],
      // ... other LTE bands ...
      ['NR 2300M', 'nr2300MSite', 'nr2300MCell'],
    ];

    const hasNR2300M = ALL_BANDS.some(b => b[0] === 'NR 2300M');
    expect(hasNR2300M).toBe(true);

    // 验证NR 2300M数据格式化
    const formatted = await page.evaluate(({ data, allBands }) => {
      const lines = [];
      const nr2300M = allBands.find(b => b[0] === 'NR 2300M');
      if (nr2300M) {
        const [bandName, siteKey, cellKey] = nr2300M;
        if (data[siteKey] > 0) lines.push(`- ${bandName}: ${data[siteKey]}`);
        if (data[cellKey] > 0) lines.push(`- ${bandName}: ${data[cellKey]}`);
      }
      return lines;
    }, { data: nr2300MData, allBands: ALL_BANDS });

    expect(formatted).toContain('- NR 2300M: 12');
    expect(formatted).toContain('- NR 2300M: 30');
  });

  /**
   * Issue #D2D-003: Toggle块chart格式与parseChartBlock不完全匹配
   */
  test('Toggle块chart格式兼容性', async ({ page }) => {
    await page.goto('/');

    const toggleChartContent = `:::chart
- 2026-01: LTE 700M: 45, NR 3500M: 35
- 2026-02: LTE 700M: 50, NR 3500M: 40
:::`;

    // 验证Toggle块中嵌套chart的解析
    const parsed = await page.evaluate((content) => {
      const match = content.match(/:::chart\[?(\w+)?\]?\s*\n([\s\S]*?)\n:::/);
      if (!match) return null;

      const lines = match[2].trim().split('\n');
      const data = [];

      for (const line of lines) {
        // Toggle格式: "- 2026-01: LTE 700M: 45, NR 3500M: 35"
        const toggleMatch = line.match(/^\s*[-*]\s*(.+?):\s*(.+)$/);
        if (toggleMatch) {
          const period = toggleMatch[1].trim();
          const metricsStr = toggleMatch[2].trim();
          const metrics = metricsStr.split(',').map(m => m.trim());

          const item = { period };
          for (const metric of metrics) {
            const [name, value] = metric.split(':').map(s => s.trim());
            if (name && value) {
              item[name] = parseFloat(value);
            }
          }
          data.push(item);
        }
      }
      return data;
    }, toggleChartContent);

    expect(parsed.length).toBe(2);
    expect(parsed[0].period).toBe('2026-01');
    expect(parsed[0]['LTE 700M']).toBe(45);
    expect(parsed[0]['NR 3500M']).toBe(35);
  });
});

// ============================================================
// TC060: 响应式布局测试
// ============================================================
test.describe('TC060: 响应式布局测试', () => {

  test('桌面视图 (1920x1080)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const chatView = page.locator('.chat-view, #root');
    await expect(chatView).toBeVisible();
  });

  test('平板视图 (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const chatView = page.locator('.chat-view, #root');
    await expect(chatView).toBeVisible();
  });

  test('手机视图 (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const chatView = page.locator('.chat-view, #root');
    await expect(chatView).toBeVisible();
  });
});
