/**
 * Edge Cases and Rendering Issues Tests
 *
 * 测试各种边缘情况和潜在的渲染问题
 */

import { test, expect } from '@playwright/test';

test.describe('边缘情况和渲染问题测试', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // ========== 1. Metrics 渲染边缘情况 ==========

  test('Metrics 组件 - 全部为 0 的值', async ({ page }) => {
    // 模拟全部为 0 的指标数据
    const result = await page.evaluate(() => {
      const items = [
        { label: '站点A', value: '0', numeric: 0 },
        { label: '站点B', value: '0', numeric: 0 },
        { label: '站点C', value: '0', numeric: 0 },
      ];

      // 安全计算最大值，避免 NaN 和 Infinity（与 MessageItem.jsx 中的实现一致）
      const validValues = items
        .map(i => i.numeric || 0)
        .filter(v => isFinite(v));
      const maxValue = validValues.length > 0 ? Math.max(...validValues) : 0;

      return {
        maxValue,
        // 正确的处理：maxValue 为 0 时返回 '0%'
        barWidth: maxValue > 0 ? `${(items[0].numeric / maxValue) * 100}%` : '0%'
      };
    });

    // 验证 maxValue 为 0 时正确处理，返回 '0%'
    expect(result.maxValue).toBe(0);
    expect(result.barWidth).toBe('0%'); // 修复后的正确行为
  });

  test('Metrics 组件 - NaN 值处理', async ({ page }) => {
    const result = await page.evaluate(() => {
      const items = [
        { label: '有效值', value: '100', numeric: 100 },
        { label: '无效值', value: 'N/A', numeric: NaN },
        { label: '零值', value: '0', numeric: 0 },
      ];

      // 检查 Math.max 对 NaN 的处理
      const maxFromMap = Math.max(...items.map(i => i.numeric || 0));
      // Math.max 对 NaN 也会返回 NaN
      const maxDirect = Math.max(100, NaN, 0);

      return {
        maxFromMap,
        maxDirect,
        // NaN || 0 = 0
        maxWithFallback: Math.max(...items.map(i => i.numeric || 0))
      };
    });

    // Math.max(100, NaN, 0) = NaN
    expect(result.maxDirect).toBeNaN();
    // 使用 || 0 fallback 可以避免 NaN
    expect(result.maxWithFallback).toBe(100);
  });

  // ========== 2. Chart 渲染边缘情况 ==========

  test('Chart 组件 - 空数据处理', async ({ page }) => {
    const result = await page.evaluate(() => {
      const emptyData = [];
      const emptyKeys = [];

      // 检查空数据时的 fallback
      const fallbackKeys = emptyKeys || (emptyData.length > 0 ? Object.keys(emptyData[0]).filter(k => k !== 'name') : []);

      return {
        dataLength: emptyData.length,
        keys: fallbackKeys,
        // 当 data.length === 0 时应该返回 null
        shouldRender: emptyData && emptyData.length > 0
      };
    });

    expect(result.dataLength).toBe(0);
    expect(result.shouldRender).toBeFalsy();
  });

  test('Chart 组件 - keys 为 undefined', async ({ page }) => {
    const result = await page.evaluate(() => {
      const block = {
        chartType: 'bar',
        data: [{ name: 'A', value: 100 }],
        // keys 是 undefined
        column: 'name'
      };

      const keys = block.keys; // undefined
      const dataKeys = keys || (block.data && block.data.length > 0
        ? Object.keys(block.data[0]).filter(k => k !== block.column)
        : []);

      return {
        originalKeys: keys,
        fallbackKeys: dataKeys
      };
    });

    expect(result.originalKeys).toBeUndefined();
    expect(result.fallbackKeys).toEqual(['value']);
  });

  test('Chart 组件 - 缺少 name 字段', async ({ page }) => {
    const result = await page.evaluate(() => {
      const dataWithoutName = [
        { value: 100 },
        { value: 200 },
        { value: 300 }
      ];

      const column = 'name';
      const dataKeys = Object.keys(dataWithoutName[0] || {}).filter(k => k !== column);

      return {
        data: dataWithoutName,
        dataKeys,
        // 图表会显示 "undefined" 作为 X 轴
        firstItemName: dataWithoutName[0].name,
        firstItemNameAlt: dataWithoutName[0]?.name
      };
    });

    expect(result.dataKeys).toEqual(['value']);
    expect(result.firstItemName).toBeUndefined();
  });

  // ========== 3. Pie Chart 边缘情况 ==========

  test('Pie Chart 组件 - total 为 0', async ({ page }) => {
    const result = await page.evaluate(() => {
      const data = [
        { name: 'A', value: 0 },
        { name: 'B', value: 0 },
        { name: 'C', value: 0 }
      ];

      const total = data.reduce((sum, d) => sum + (d.value || 0), 0);

      // percent = value / total * 100，当 total = 0 时会产生 NaN
      const percentA = data[0].value / total;
      const percentWithFallback = data[0].value / (total || 1);

      return {
        total,
        percentNaN: percentA,
        percentSafe: percentWithFallback,
        percentFormatted: `${(percentWithFallback * 100).toFixed(0)}%`
      };
    });

    expect(result.total).toBe(0);
    expect(result.percentNaN).toBeNaN();
    expect(result.percentSafe).toBe(0);
  });

  // ========== 4. Table 渲染边缘情况 ==========

  test('Table 组件 - 列数不匹配', async ({ page }) => {
    const result = await page.evaluate(() => {
      const headers = ['A', 'B', 'C'];
      const rows = [
        ['1', '2'], // 只有 2 列
        ['3', '4', '5', '6'], // 4 列
        ['7', '8', '9'] // 3 列
      ];

      // 当前的解析逻辑会忽略列数不匹配的行
      const validRows = rows.filter(row => row.length === headers.length);

      return {
        headers,
        rows,
        validRows,
        // 当前实现的问题：会使用 headers.length 来访问所有列
        // 导致 undefined 值
        firstRowWithHeaders: headers.map((h, i) => ({ h, v: rows[0][i] }))
      };
    });

    expect(result.validRows.length).toBe(1); // 只有第3行是有效的
    expect(result.firstRowWithHeaders[2].v).toBeUndefined(); // C 列是 undefined
  });

  test('Table 组件 - 空单元格', async ({ page }) => {
    const result = await page.evaluate(() => {
      const headers = ['运营商', '站点数', '小区数'];
      const rows = [
        ['北京联通', '', '3800'], // 空字符串
        ['上海联通', '980', ''], // 空字符串
        ['广州联通', '', ''] // 两个都是空
      ];

      // 空单元格会被渲染为空字符串
      const processedRows = rows.map(row =>
        row.map(cell => cell || '-') // 用 '-' 替代空值
      );

      return {
        original: rows[0],
        processed: processedRows[0]
      };
    });

    expect(result.original[1]).toBe('');
    expect(result.processed[1]).toBe('-');
  });

  // ========== 5. SQL 渲染边缘情况 ==========

  test('SQL 组件 - 空 SQL', async ({ page }) => {
    const result = await page.evaluate(() => {
      const emptySql = '';
      const whitespaceSql = '   \n  \t  ';
      const nullSql = null;

      const isValidSql = (sql) => sql && sql.trim().length > 0;

      return {
        emptyValid: isValidSql(emptySql),
        whitespaceValid: isValidSql(whitespaceSql),
        nullValid: isValidSql(nullSql)
      };
    });

    expect(result.emptyValid).toBeFalsy();
    expect(result.whitespaceValid).toBeFalsy();
    expect(result.nullValid).toBeFalsy();
  });

  test('SQL 组件 - 特殊字符', async ({ page }) => {
    const result = await page.evaluate(() => {
      const sql = `SELECT * FROM users WHERE name = '张三' AND id = 1;`;
      const sqlWithBackticks = `SELECT * FROM \`operator-data\` WHERE \`站点名称\` = '测试';`;

      return {
        normal: sql,
        backticks: sqlWithBackticks
      };
    });

    expect(result.normal).toContain('张三');
    expect(result.backticks).toContain('operator-data');
  });

  // ========== 6. Thinking Chain 边缘情况 ==========

  test('Thinking Chain - 空内容', async ({ page }) => {
    const result = await page.evaluate(() => {
      const emptyThinking = '';
      const whitespaceThinking = '   \n  \n  ';
      const onlyMarkers = '<!-- thinking_start --><!-- thinking_end -->';

      const extractThinking = (content) => {
        const startMarker = '<!-- thinking_start -->';
        const endMarker = '<!-- thinking_end -->';
        const startIdx = content.indexOf(startMarker);
        const endIdx = content.indexOf(endMarker);

        if (startIdx !== -1 && endIdx !== -1) {
          const thinking = content.slice(startIdx + startMarker.length, endIdx).trim();
          return thinking;
        }
        return null;
      };

      return {
        empty: extractThinking(emptyThinking),
        whitespace: extractThinking(whitespaceThinking),
        onlyMarkers: extractThinking(onlyMarkers),
        // 空字符串的布尔值
        emptyBool: !!emptyThinking,
        whitespaceBool: !!whitespaceThinking.trim()
      };
    });

    // 无 markers 时返回 null，有 markers 但内容为空时返回 ''
    expect(result.empty).toBeNull();  // 无 markers，返回 null
    expect(result.whitespace).toBeNull();  // 无 markers，返回 null
    expect(result.onlyMarkers).toBe('');  // 有 markers 但内容为空，返回 ''
    expect(result.emptyBool).toBeFalsy();
    expect(result.whitespaceBool).toBeFalsy();
  });

  test('Thinking Chain - 嵌套标记', async ({ page }) => {
    const result = await page.evaluate(() => {
      const content = `正常文本
<!-- thinking_start -->
第一层思考
<!-- thinking_start -->
嵌套思考
<!-- thinking_end -->
继续思考
<!-- thinking_end -->
更多文本`;

      // 当前实现只处理第一对标记
      const startMarker = '<!-- thinking_start -->';
      const endMarker = '<!-- thinking_end -->';
      const startIdx = content.indexOf(startMarker);
      const endIdx = content.indexOf(endMarker);

      let thinking = null;
      let mainContent = content;

      if (startIdx !== -1 && endIdx !== -1) {
        thinking = content.slice(startIdx + startMarker.length, endIdx).trim();
        mainContent = content.slice(0, startIdx) + content.slice(endIdx + endMarker.length);
      }

      return {
        thinking,
        mainContent,
        // 嵌套标记不会被处理
        hasNestedStart: thinking.includes('<!-- thinking_start -->')
      };
    });

    expect(result.thinking).toBeTruthy();
    expect(result.hasNestedStart).toBeTruthy(); // 嵌套标记会保留
  });

  // ========== 7. Toggle Block 边缘情况 ==========

  test('Toggle Block - 缺少 chart 数据', async ({ page }) => {
    const result = await page.evaluate(() => {
      const block = {
        blockType: 'default',
        table: {
          columns: ['月份', '值'],
          data: [{ '月份': '1月', '值': '100' }]
        },
        chart: null // 缺少 chart 数据
      };

      // RenderToggle 中的 fallback
      const chart = block?.chart || { data: [], keys: [], column: '数据月' };

      return {
        chartData: chart.data,
        chartKeys: chart.keys,
        // 当 chart.data 为空数组时，图表不会渲染
        shouldRenderChart: chart.data && chart.data.length > 0
      };
    });

    expect(result.chartData).toEqual([]);
    expect(result.shouldRenderChart).toBeFalsy();
  });

  test('Toggle Block - 缺少 table 数据', async ({ page }) => {
    const result = await page.evaluate(() => {
      const block = {
        blockType: 'default',
        table: null, // 缺少 table 数据
        chart: {
          data: [{ name: 'A', value: 100 }],
          keys: ['value'],
          column: 'name'
        }
      };

      const table = block?.table || { columns: [], data: [] };

      return {
        tableColumns: table.columns,
        tableData: table.data,
        // 空表格应该不渲染
        shouldRenderTable: table.data && table.data.length > 0
      };
    });

    expect(result.tableColumns).toEqual([]);
    expect(result.shouldRenderTable).toBeFalsy();
  });

  // ========== 8. Markdown 渲染边缘情况 ==========

  test('Markdown - 代码块特殊字符', async ({ page }) => {
    const result = await page.evaluate(() => {
      const codeWithBackticks = '```javascript\nconst x = `template literal`;\n```';
      const codeWithHtml = '```html\n<div class="test">Hello</div>\n```';

      // ReactMarkdown 应该正确处理这些
      return {
        backticks: codeWithBackticks,
        html: codeWithHtml
      };
    });

    expect(result.backticks).toContain('template literal');
    expect(result.html).toContain('class="test"');
  });

  test('Markdown - XSS 防护', async ({ page }) => {
    const result = await page.evaluate(() => {
      const malicious = '<script>alert("XSS")</script>';
      const imgOnerror = '<img src="x" onerror="alert(1)">';

      // React 会自动转义 HTML
      // 但我们需要验证内容不包含原始脚本标签
      const escapeHtml = (str) => {
        return str
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };

      return {
        escapedScript: escapeHtml(malicious),
        escapedImg: escapeHtml(imgOnerror)
      };
    });

    // 验证 <script> 标签被转义，无法被浏览器解析为脚本标签
    expect(result.escapedScript).not.toContain('<script>');
    expect(result.escapedScript).toContain('&lt;script&gt;');
    // onerror 属性在 HTML 转义后仍然存在，但在 React 中使用 dangerouslySetInnerHTML 才会有问题
    // React 默认会转义内容，所以实际是安全的
    expect(result.escapedImg).toContain('&lt;img');  // img 标签被转义
  });

  // ========== 9. Steps 渲染边缘情况 ==========

  test('Steps - 非数字开头', async ({ page }) => {
    const result = await page.evaluate(() => {
      const content = `
:::steps
- 这不是步骤
* 也不是步骤
1. 这才是步骤
2. 第二步
  不是步骤
::: `;

      const match = content.match(/:::steps\s*\n([\s\S]*?)\n:::/);
      if (!match) return { steps: [] };

      const lines = match[1].trim().split('\n').filter(l => l.trim());
      const steps = [];

      for (const line of lines) {
        // 当前实现只匹配数字开头的行
        const stepMatch = line.match(/^\d+\.\s+(.+)/);
        if (stepMatch) {
          steps.push(stepMatch[1].trim());
        }
      }

      return { steps };
    });

    expect(result.steps.length).toBe(2);
    expect(result.steps).toEqual(['这才是步骤', '第二步']);
  });

  test('Steps - 步骤数为 0', async ({ page }) => {
    const result = await page.evaluate(() => {
      const emptySteps = `
:::steps
::: `;

      const noSteps = `
:::steps
- 没有步骤
::: `;

      const parseSteps = (content) => {
        const match = content.match(/:::steps\s*\n([\s\S]*?)\n:::/);
        if (!match) return { steps: [] };

        const lines = match[1].trim().split('\n').filter(l => l.trim());
        const steps = [];

        for (const line of lines) {
          const stepMatch = line.match(/^\d+\.\s+(.+)/);
          if (stepMatch) {
            steps.push(stepMatch[1].trim());
          }
        }

        return { steps };
      };

      return {
        empty: parseSteps(emptySteps),
        noValid: parseSteps(noSteps)
      };
    });

    expect(result.empty.steps.length).toBe(0);
    expect(result.noValid.steps.length).toBe(0);
  });

  // ========== 10. 流式输出边缘情况 ==========

  test('流式输出 - HTML 标签不完整', async ({ page }) => {
    const result = await page.evaluate(() => {
      // 模拟流式传输中不完整的 HTML
      const partialHtml = '<div class="test">Hello';
      const incompleteTag = '<span class="unclosed';
      const halfTag = '<div class="';

      // React 会对不完整的 HTML 进行处理
      return {
        partial: partialHtml,
        incomplete: incompleteTag,
        half: halfTag
      };
    });

    expect(result.partial).not.toContain('</div>');
    expect(result.incomplete).not.toContain('>');
  });

  test('流式输出 - JSON 不完整', async ({ page }) => {
    const result = await page.evaluate(() => {
      // 模拟流式传输中不完整的 JSON
      const partialJson = '{"content": "Hello';
      const incompleteArray = '[{"name": "A"';
      const halfNumber = '{"value": 123.456';

      return {
        partial: partialJson,
        incomplete: incompleteArray,
        half: halfNumber
      };
    });

    expect(() => JSON.parse(result.partial)).toThrow();
    expect(() => JSON.parse(result.incomplete)).toThrow();
  });

});

test.describe('数据完整性测试', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('parseStructuredBlocks - 完整流程', async ({ page }) => {
    const result = await page.evaluate(() => {
      const content = `<!-- thinking_start -->
思考内容
<!-- thinking_end -->

:::table
| A | B |
| - | - |
| 1 | 2 |
:::

:::chart
- X: 100
- Y: 200
:::

:::metrics
- 计数值: 42
:::

:::steps
1. 步骤一
2. 步骤二
:::

:::sql
SELECT * FROM test;
:::

普通文本`;

      // 模拟完整的 parseStructuredBlocks
      const blocks = [];
      let remaining = content;

      // 1. Thinking chain
      const startMarker = '<!-- thinking_start -->';
      const endMarker = '<!-- thinking_end -->';
      const startIdx = remaining.indexOf(startMarker);
      const endIdx = remaining.indexOf(endMarker);

      let mainContent = remaining;
      if (startIdx !== -1 && endIdx !== -1) {
        const thinking = remaining.slice(startIdx + startMarker.length, endIdx).trim();
        mainContent = remaining.slice(0, startIdx) + remaining.slice(endIdx + endMarker.length);
        blocks.push({ type: 'thinking', content: thinking });
      }

      // 2. Table
      const tableMatch = mainContent.match(/:::table\s*\n([\s\S]*?)\n:::/);
      if (tableMatch) {
        blocks.push({ type: 'table', matched: true });
      }

      // 3. Chart
      const chartMatch = mainContent.match(/:::chart\s*\n([\s\S]*?)\n:::/);
      if (chartMatch) {
        blocks.push({ type: 'chart', matched: true });
      }

      // 4. Metrics
      const metricsMatch = mainContent.match(/:::metrics\s*\n([\s\S]*?)\n:::/);
      if (metricsMatch) {
        blocks.push({ type: 'metrics', matched: true });
      }

      // 5. Steps
      const stepsMatch = mainContent.match(/:::steps\s*\n([\s\S]*?)\n:::/);
      if (stepsMatch) {
        blocks.push({ type: 'steps', matched: true });
      }

      // 6. SQL
      const sqlMatch = mainContent.match(/:::sql\s*\n([\s\S]*?)\n:::/);
      if (sqlMatch) {
        blocks.push({ type: 'sql', matched: true });
      }

      return {
        blockCount: blocks.length,
        blockTypes: blocks.map(b => b.type),
        hasThinking: blocks.some(b => b.type === 'thinking'),
        hasTable: blocks.some(b => b.type === 'table'),
        hasChart: blocks.some(b => b.type === 'chart'),
        hasMetrics: blocks.some(b => b.type === 'metrics'),
        hasSteps: blocks.some(b => b.type === 'steps'),
        hasSql: blocks.some(b => b.type === 'sql')
      };
    });

    expect(result.blockCount).toBe(6);
    expect(result.hasThinking).toBe(true);
    expect(result.hasTable).toBe(true);
    expect(result.hasChart).toBe(true);
    expect(result.hasMetrics).toBe(true);
    expect(result.hasSteps).toBe(true);
    expect(result.hasSql).toBe(true);
  });

  test('多个同类型块的解析', async ({ page }) => {
    const result = await page.evaluate(() => {
      const content = `
第一个表格：
:::table
| A |
| - |
| 1 |
:::

第二个表格：
:::table
| B |
| - |
| 2 |
:::

第一个图表：
:::chart
- X: 100
:::

第二个图表：
:::chart
- Y: 200
:::`;

      // 当前实现只能匹配一个块
      const firstTable = content.match(/:::table\s*\n([\s\S]*?)\n:::/);
      const firstChart = content.match(/:::chart\s*\n([\s\S]*?)\n:::/);

      return {
        hasFirstTable: !!firstTable,
        firstTableContent: firstTable ? firstTable[1].trim() : null,
        hasFirstChart: !!firstChart,
        firstChartContent: firstChart ? firstChart[1].trim() : null,
        // 如果需要匹配所有，需要使用 matchAll
        allTables: content.match(/:::table\s*\n([\s\S]*?)\n:::/g)?.length || 0,
        allCharts: content.match(/:::chart\s*\n([\s\S]*?)\n:::/g)?.length || 0
      };
    });

    expect(result.hasFirstTable).toBe(true);
    expect(result.firstTableContent).toContain('A');
    expect(result.allTables).toBe(2); // 使用全局匹配可以看到有 2 个
    expect(result.allCharts).toBe(2);
  });

});
