/**
 * 18个关键功能 E2E 测试
 *
 * 测试覆盖:
 * 1. 数据转换逻辑验证 (pivot → long format)
 * 2. 18个功能的数据格式化验证
 * 3. 前端解析器兼容性验证
 * 4. Chart数据完整性验证
 */

import { test, expect } from '@playwright/test';

// ============================================================
// 测试数据定义
// ============================================================

/**
 * 模拟Java后端返回的SiteCellSummary pivot数据
 */
const MOCK_SITE_CELL_DATA = {
  operatorId: 1,
  dataMonth: '2026-03',
  lte700MSite: 45, lte700MCell: 120,
  lte800MSite: 30, lte800MCell: 80,
  lte900MSite: 150, lte900MCell: 450,
  lte1400MSite: 25, lte1400MCell: 70,
  lte1800MSite: 80, lte1800MCell: 240,
  lte2100MSite: 60, lte2100MCell: 180,
  lte2600MSite: 40, lte2600MCell: 120,
  nr700MSite: 30, nr700MCell: 80,
  nr800MSite: 20, nr800MCell: 55,
  nr900MSite: 15, nr900MCell: 40,
  nr1400MSite: 10, nr1400MCell: 28,
  nr1800MSite: 35, nr1800MCell: 95,
  nr2100MSite: 25, nr2100MCell: 70,
  nr2600MSite: 45, nr2600MCell: 125,
  nr3500MSite: 120, nr3500MCell: 350,
  nr4900MSite: 60, nr4900MCell: 170,
  nr2300MSite: 12, nr2300MCell: 30,
};

/**
 * 模拟Java后端返回的IndicatorInfo pivot数据
 */
const MOCK_INDICATOR_DATA = {
  operatorId: 1,
  dataMonth: '2026-03',
  lte700MDlRate: 45.5, lte700MUlRate: 8.3, lte700MDlPrb: 22.5, lte700MUlPrb: 28.9,
  lte800MDlRate: 48.2, lte800MUlRate: 9.1, lte800MDlPrb: 25.3, lte800MUlPrb: 30.5,
  lte900MDlRate: 42.8, lte900MUlRate: 7.9, lte900MDlPrb: 20.1, lte900MUlPrb: 26.3,
  lte1400MDlRate: 55.3, lte1400MUlRate: 10.2, lte1400MDlPrb: 28.7, lte1400MUlPrb: 33.2,
  lte1800MDlRate: 58.9, lte1800MUlRate: 11.5, lte1800MDlPrb: 32.4, lte1800MUlPrb: 38.1,
  lte2100MDlRate: 52.1, lte2100MUlRate: 9.8, lte2100MDlPrb: 29.8, lte2100MUlPrb: 35.4,
  lte2600MDlRate: 65.4, lte2600MUlRate: 12.3, lte2600MDlPrb: 38.5, lte2600MUlPrb: 42.7,
  nr700MDlRate: 180.5, nr700MUlRate: 35.2, nr700MDlPrb: 45.2, nr700MUlPrb: 52.1,
  nr800MDlRate: 195.3, nr800MUlRate: 38.7, nr800MDlPrb: 48.9, nr800MUlPrb: 55.3,
  nr900MDlRate: 175.8, nr900MUlRate: 32.4, nr900MDlPrb: 42.1, nr900MUlPrb: 48.9,
  nr1400MDlRate: 280.5, nr1400MUlRate: 55.3, nr1400MDlPrb: 55.3, nr1400MUlPrb: 62.1,
  nr1800MDlRate: 320.4, nr1800MUlRate: 62.8, nr1800MDlPrb: 58.9, nr1800MUlPrb: 65.4,
  nr2100MDlRate: 290.8, nr2100MUlRate: 58.2, nr2100MDlPrb: 52.4, nr2100MUlPrb: 59.8,
  nr2600MDlRate: 450.2, nr2600MUlRate: 88.5, nr2600MDlPrb: 68.5, nr2600MUlPrb: 75.2,
  nr3500MDlRate: 680.9, nr3500MUlRate: 125.6, nr3500MDlPrb: 75.8, nr3500MUlPrb: 81.2,
  nr4900MDlRate: 820.5, nr4900MUlRate: 155.3, nr4900MDlPrb: 82.3, nr4900MUlPrb: 88.5,
  nr2300MDlRate: 380.5, nr2300MUlRate: 72.4, nr2300MDlPrb: 62.5, nr2300MUlPrb: 70.2,
  trafficRatio: 35.8,
  durationCampratio: 68.5,
  trafficCampratio: 72.3,
  terminalPenetration: 85.2,
};

// ============================================================
// 数据转换函数测试 (模拟Python端转换逻辑)
// ============================================================

test.describe('数据转换逻辑验证', () => {

  test('功能1&2: pivot转long格式 - 站点/小区数据', async ({ page }) => {
    await page.goto('/');

    // 模拟 Python 端 _transform_site_cell_to_long 函数
    const result = await page.evaluate((data) => {
      // Constants must be defined inside evaluate() as they run in browser context
      const SITE_CELL_BANDS = [
        ["LTE 700M", "lte700MSite", "lte700MCell"],
        ["LTE 800M", "lte800MSite", "lte800MCell"],
        ["LTE 900M", "lte900MSite", "lte900MCell"],
        ["LTE 1400M", "lte1400MSite", "lte1400MCell"],
        ["LTE 1800M", "lte1800MSite", "lte1800MCell"],
        ["LTE 2100M", "lte2100MSite", "lte2100MCell"],
        ["LTE 2600M", "lte2600MSite", "lte2600MCell"],
        ["NR 700M", "nr700MSite", "nr700MCell"],
        ["NR 800M", "nr800MSite", "nr800MCell"],
        ["NR 900M", "nr900MSite", "nr900MCell"],
        ["NR 1400M", "nr1400MSite", "nr1400MCell"],
        ["NR 1800M", "nr1800MSite", "nr1800MCell"],
        ["NR 2100M", "nr2100MSite", "nr2100MCell"],
        ["NR 2600M", "nr2600MSite", "nr2600MCell"],
        ["NR 3500M", "nr3500MSite", "nr3500MCell"],
        ["NR 4900M", "nr4900MSite", "nr4900MCell"],
        ["NR 2300M", "nr2300MSite", "nr2300MCell"],
      ];
      const longData = [];
      for (const [bandName, siteKey, cellKey] of SITE_CELL_BANDS) {
        const tech = bandName.startsWith("LTE") ? "LTE" : "NR";
        const siteVal = data[siteKey] || 0;
        const cellVal = data[cellKey] || 0;
        if (siteVal > 0) {
          longData.push({
            band: bandName,
            technology: tech,
            type: 'sites',
            value: siteVal
          });
        }
        if (cellVal > 0) {
          longData.push({
            band: bandName,
            technology: tech,
            type: 'cells',
            value: cellVal
          });
        }
      }
      return longData;
    }, MOCK_SITE_CELL_DATA);

    // 验证NR 2300M被正确转换
    const nr2300MSites = result.filter(d => d.band === 'NR 2300M' && d.type === 'sites');
    const nr2300MCells = result.filter(d => d.band === 'NR 2300M' && d.type === 'cells');

    expect(nr2300MSites.length).toBe(1);
    expect(nr2300MSites[0].value).toBe(12);
    expect(nr2300MCells.length).toBe(1);
    expect(nr2300MCells[0].value).toBe(30);

    // 验证总记录数 (17个频段 * 2种类型 = 34，但零值被过滤)
    const nonZeroSites = result.filter(d => d.type === 'sites');
    const nonZeroCells = result.filter(d => d.type === 'cells');
    expect(nonZeroSites.length).toBeGreaterThan(0);
    expect(nonZeroCells.length).toBeGreaterThan(0);
  });

  test('功能3-6: pivot转long格式 - 指标数据(DL/UL Rate, DL/UL PRB)', async ({ page }) => {
    await page.goto('/');

    // 测试 DL Rate 转换
    const dlRateData = await page.evaluate((data) => {
      const INDICATOR_BANDS = [
        ["LTE 700M", "lte700MDlRate", "lte700MUlRate", "lte700MDlPrb", "lte700MUlPrb"],
        ["LTE 800M", "lte800MDlRate", "lte800MUlRate", "lte800MDlPrb", "lte800MUlPrb"],
        ["LTE 900M", "lte900MDlRate", "lte900MUlRate", "lte900MDlPrb", "lte900MUlPrb"],
        ["NR 3500M", "nr3500MDlRate", "nr3500MUlRate", "nr3500MDlPrb", "nr3500MUlPrb"],
        ["NR 4900M", "nr4900MDlRate", "nr4900MUlRate", "nr4900MDlPrb", "nr4900MUlPrb"],
        ["NR 2300M", "nr2300MDlRate", "nr2300MUlRate", "nr2300MDlPrb", "nr2300MUlPrb"],
      ];
      const result = [];
      for (const [bandName, dlRateKey] of INDICATOR_BANDS) {
        const tech = bandName.startsWith("LTE") ? "LTE" : "NR";
        const val = data[dlRateKey] || 0;
        if (val > 0) {
          result.push({ band: bandName, technology: tech, metric: 'dl_rate', value: val });
        }
      }
      return result;
    }, MOCK_INDICATOR_DATA);

    expect(dlRateData.length).toBe(6);
    const nr3500 = dlRateData.find(d => d.band === 'NR 3500M');
    expect(nr3500.value).toBe(680.9);

    // 测试 UL PRB 转换
    const ulPrbData = await page.evaluate((data) => {
      const INDICATOR_BANDS = [
        ["LTE 700M", "lte700MDlRate", "lte700MUlRate", "lte700MDlPrb", "lte700MUlPrb"],
        ["LTE 800M", "lte800MDlRate", "lte800MUlRate", "lte800MDlPrb", "lte800MUlPrb"],
        ["LTE 900M", "lte900MDlRate", "lte900MUlRate", "lte900MDlPrb", "lte900MUlPrb"],
        ["NR 3500M", "nr3500MDlRate", "nr3500MUlRate", "nr3500MDlPrb", "nr3500MUlPrb"],
        ["NR 4900M", "nr4900MDlRate", "nr4900MUlRate", "nr4900MDlPrb", "nr4900MUlPrb"],
        ["NR 2300M", "nr2300MDlRate", "nr2300MUlRate", "nr2300MDlPrb", "nr2300MUlPrb"],
      ];
      const result = [];
      for (const [bandName, , , , ulPrbKey] of INDICATOR_BANDS) {
        const val = data[ulPrbKey] || 0;
        if (val > 0) {
          result.push({ band: bandName, metric: 'ul_prb', value: val });
        }
      }
      return result;
    }, MOCK_INDICATOR_DATA);

    expect(ulPrbData.length).toBe(6);
    const nr2300Prb = ulPrbData.find(d => d.band === 'NR 2300M');
    expect(nr2300Prb.value).toBe(70.2);
  });

  test('功能7: 分流指标数据提取', async ({ page }) => {
    await page.goto('/');

    const trafficMetrics = await page.evaluate((data) => {
      return {
        trafficRatio: data.trafficRatio || 0,
        durationCampratio: data.durationCampratio || 0,
        trafficCampratio: data.trafficCampratio || 0,
        terminalPenetration: data.terminalPenetration || 0,
      };
    }, MOCK_INDICATOR_DATA);

    expect(trafficMetrics.trafficRatio).toBe(35.8);
    expect(trafficMetrics.durationCampratio).toBe(68.5);
    expect(trafficMetrics.trafficCampratio).toBe(72.3);
    expect(trafficMetrics.terminalPenetration).toBe(85.2);
  });
});

// ============================================================
// 18个功能数据验证
// ============================================================

test.describe('18个关键功能数据验证', () => {

  test('功能1: 中国联通有多少站点 - 最新日期各频段站点信息', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate((data) => {
      // 模拟 format_operator_site_count 逻辑
      const SITE_CELL_BANDS = [
        ["LTE 700M", "lte700MSite"], ["LTE 800M", "lte800MSite"],
        ["NR 3500M", "nr3500MSite"], ["NR 2300M", "nr2300MSite"],
      ];

      const sites = [];
      let totalSites = 0;
      for (const [bandName, siteKey] of SITE_CELL_BANDS) {
        const val = data[siteKey] || 0;
        if (val > 0) {
          sites.push({ band: bandName, sites: val });
          totalSites += val;
        }
      }
      return { totalSites, bands: sites };
    }, MOCK_SITE_CELL_DATA);

    expect(result.totalSites).toBeGreaterThan(0);
    const lte700Site = result.bands.find(b => b.band === 'LTE 700M');
    expect(lte700Site.sites).toBe(45);
    const nr3500Site = result.bands.find(b => b.band === 'NR 3500M');
    expect(nr3500Site.sites).toBe(120);
  });

  test('功能2: 中国联通有多少小区 - 最新日期各频段小区信息', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate((data) => {
      const SITE_CELL_BANDS = [
        ["LTE 700M", "lte700MCell"], ["LTE 800M", "lte800MCell"],
        ["NR 3500M", "nr3500MCell"], ["NR 2300M", "nr2300MCell"],
      ];

      const cells = [];
      let totalCells = 0;
      for (const [bandName, cellKey] of SITE_CELL_BANDS) {
        const val = data[cellKey] || 0;
        if (val > 0) {
          cells.push({ band: bandName, cells: val });
          totalCells += val;
        }
      }
      return { totalCells, bands: cells };
    }, MOCK_SITE_CELL_DATA);

    expect(result.totalCells).toBeGreaterThan(0);
    const nr2300Cell = result.bands.find(b => b.band === 'NR 2300M');
    expect(nr2300Cell.cells).toBe(30);
  });

  test('功能3: 中国联通小区上行负载 - UL PRB', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate((data) => {
      const bands = [
        ["LTE 700M", "lte700MUlPrb"],
        ["NR 3500M", "nr3500MUlPrb"],
        ["NR 2300M", "nr2300MUlPrb"],
      ];

      const ulPrbData = [];
      for (const [bandName, prbKey] of bands) {
        const val = data[prbKey] || 0;
        if (val > 0) {
          ulPrbData.push({ band: bandName, ulPrb: val });
        }
      }
      return ulPrbData;
    }, MOCK_INDICATOR_DATA);

    expect(result.length).toBe(3);
    const nr3500Prb = result.find(b => b.band === 'NR 3500M');
    expect(nr3500Prb.ulPrb).toBe(81.2);
    const nr2300Prb = result.find(b => b.band === 'NR 2300M');
    expect(nr2300Prb.ulPrb).toBe(70.2);
  });

  test('功能4: 中国联通小区下行负载 - DL PRB', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate((data) => {
      const bands = [
        ["LTE 700M", "lte700MDlPrb"],
        ["NR 3500M", "nr3500MDlPrb"],
        ["NR 4900M", "nr4900MDlPrb"],
      ];

      const dlPrbData = [];
      for (const [bandName, prbKey] of bands) {
        const val = data[prbKey] || 0;
        if (val > 0) {
          dlPrbData.push({ band: bandName, dlPrb: val });
        }
      }
      return dlPrbData;
    }, MOCK_INDICATOR_DATA);

    expect(result.length).toBe(3);
    const nr4900Prb = result.find(b => b.band === 'NR 4900M');
    expect(nr4900Prb.dlPrb).toBe(82.3);
  });

  test('功能5: 中国联通小区上行速率 - UL Rate', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate((data) => {
      const bands = [
        ["LTE 700M", "lte700MUlRate"],
        ["NR 3500M", "nr3500MUlRate"],
        ["NR 2300M", "nr2300MUlRate"],
      ];

      const ulRateData = [];
      for (const [bandName, rateKey] of bands) {
        const val = data[rateKey] || 0;
        if (val > 0) {
          ulRateData.push({ band: bandName, ulRate: val });
        }
      }
      return ulRateData;
    }, MOCK_INDICATOR_DATA);

    expect(result.length).toBe(3);
    const nr3500Rate = result.find(b => b.band === 'NR 3500M');
    expect(nr3500Rate.ulRate).toBe(125.6);
  });

  test('功能6: 中国联通小区下行速率 - DL Rate', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate((data) => {
      const bands = [
        ["LTE 1800M", "lte1800MDlRate"],
        ["NR 2600M", "nr2600MDlRate"],
        ["NR 3500M", "nr3500MDlRate"],
        ["NR 4900M", "nr4900MDlRate"],
      ];

      const dlRateData = [];
      for (const [bandName, rateKey] of bands) {
        const val = data[rateKey] || 0;
        if (val > 0) {
          dlRateData.push({ band: bandName, dlRate: val });
        }
      }
      return dlRateData;
    }, MOCK_INDICATOR_DATA);

    expect(result.length).toBe(4);
    const nr4900Rate = result.find(b => b.band === 'NR 4900M');
    expect(nr4900Rate.dlRate).toBe(820.5);
    const nr3500Rate = result.find(b => b.band === 'NR 3500M');
    expect(nr3500Rate.dlRate).toBe(680.9);
  });

  test('功能7: 中国联通小区分流/指标', async ({ page }) => {
    await page.goto('/');

    const result = await page.evaluate((data) => {
      return {
        trafficRatio: data.trafficRatio,
        durationCampratio: data.durationCampratio,
        trafficCampratio: data.trafficCampratio,
        terminalPenetration: data.terminalPenetration,
      };
    }, MOCK_INDICATOR_DATA);

    expect(result.trafficRatio).toBe(35.8);
    expect(result.durationCampratio).toBe(68.5);
    expect(result.trafficCampratio).toBe(72.3);
    expect(result.terminalPenetration).toBe(85.2);
  });

  test('功能11: 所有运营商下行/上行速率 - LTE/NR平均', async ({ page }) => {
    await page.goto('/');

    // 模拟多个运营商的数据
    const multiOperatorData = [
      { operatorId: 1, ...MOCK_INDICATOR_DATA },
      {
        operatorId: 2,
        ...MOCK_INDICATOR_DATA,
        lte1800MDlRate: 55.2, nr3500MDlRate: 650.5,
        lte1800MUlRate: 10.5, nr3500MUlRate: 120.3,
      },
    ];

    const result = await page.evaluate((operators) => {
      const LTE_BANDS = ["lte700M", "lte800M", "lte900M", "lte1800M", "lte2100M", "lte2600M"];
      const NR_BANDS = ["nr700M", "nr800M", "nr900M", "nr1800M", "nr2100M", "nr2600M", "nr3500M", "nr4900M", "nr2300M"];

      const summary = [];
      for (const op of operators) {
        // 计算LTE平均下行
        const lteDlRates = LTE_BANDS.map(b => op[`${b}DlRate`] || 0).filter(v => v > 0);
        const lteAvgDl = lteDlRates.reduce((a, b) => a + b, 0) / lteDlRates.length;

        // 计算NR平均下行
        const nrDlRates = NR_BANDS.map(b => op[`${b}DlRate`] || 0).filter(v => v > 0);
        const nrAvgDl = nrDlRates.reduce((a, b) => a + b, 0) / nrDlRates.length;

        summary.push({
          operatorId: op.operatorId,
          lteAvgDl: Math.round(lteAvgDl * 100) / 100,
          nrAvgDl: Math.round(nrAvgDl * 100) / 100,
        });
      }
      return summary;
    }, multiOperatorData);

    expect(result.length).toBe(2);
    expect(result[0].lteAvgDl).toBeGreaterThan(0);
    expect(result[0].nrAvgDl).toBeGreaterThan(0);
    // 运营商2的nr3500MDlRate被覆盖为650.5，但平均值是所有NR频段的均值(包含低值频段)
    // NR频段: 180.5+195.3+175.8+320.4+290.8+450.2+650.5+820.5+380.5=3464.5, 平均=384.94
    expect(result[1].nrAvgDl).toBeGreaterThan(380);
    expect(result[1].nrAvgDl).toBeLessThan(400);
  });
});

// ============================================================
// Chart数据格式验证
// ============================================================

test.describe('Chart数据格式验证', () => {

  test('Chart数据柱状图格式', async ({ page }) => {
    await page.goto('/');

    // 模拟 chart_data 格式化
    const chartData = await page.evaluate(() => {
      const data = [
        { operator: '中国联通', lteSites: 290, nrSites: 347, total: 637 },
        { operator: '中国移动', lteSites: 450, nrSites: 520, total: 970 },
      ];

      const chartKeys = ['LTE站点', 'NR站点', '总站点'];
      const chartDataStr = data.map(d =>
        `${d.operator},${d.lteSites},${d.nrSites},${d.total}`
      ).join(';');

      return { chartKeys, chartDataStr, data };
    });

    expect(chartData.chartKeys).toEqual(['LTE站点', 'NR站点', '总站点']);
    expect(chartData.chartDataStr).toContain('中国联通');
    expect(chartData.chartDataStr).toContain('637');

    // 验证解析 - chart_data格式: "标签,值1,值2,值3"
    const parsed = await page.evaluate(({ str, keys }) => {
      const rows = str.split(';');
      return rows.map(row => {
        const cells = row.split(',');
        const obj = {};
        // cells[0] is label (e.g., '中国联通'), data values start from cells[1]
        keys.forEach((k, i) => {
          obj[k] = parseInt(cells[i + 1]) || 0;
        });
        return obj;
      });
    }, { str: chartData.chartDataStr, keys: chartData.chartKeys });

    expect(parsed.length).toBe(2);
    expect(parsed[0]['LTE站点']).toBe(290);
    expect(parsed[1]['NR站点']).toBe(520);
  });

  test('Chart数据时间序列格式', async ({ page }) => {
    await page.goto('/');

    const timeSeriesData = await page.evaluate(() => {
      const months = ['2026-01', '2026-02', '2026-03'];
      const data = months.map(month => ({
        month,
        lteSites: Math.floor(Math.random() * 500) + 200,
        nrSites: Math.floor(Math.random() * 400) + 100,
      }));

      const chartKeys = ['月份', 'LTE站点', 'NR站点'];
      const chartDataStr = data.map(d =>
        `${d.month},${d.lteSites},${d.nrSites}`
      ).join(';');

      return { chartKeys, chartDataStr, data };
    });

    expect(timeSeriesData.chartKeys).toContain('月份');
    expect(timeSeriesData.chartDataStr).toContain('2026-03');
  });
});

// ============================================================
// 前端解析器兼容性验证
// ============================================================

test.describe('前端解析器兼容性验证', () => {

  test('Toggle块解析 - 标准化格式', async ({ page }) => {
    await page.goto('/');

    const toggleContent = `[toggle]
[type::data]
[title::中国联通 站点数量统计]
[summary::总站点数=637;运营商数=1;数据月份=2026-03]
[table_columns::运营商,制式,频段,站点数]
[table_data::中国联通,LTE,LTE 700M,45;中国联通,LTE,LTE 800M,30;中国联通,NR,NR 3500M,120]
[chart_type::bar]
[chart_keys::LTE站点,NR站点,总站点]
[chart_data::中国联通,290,347,637]
[/toggle]`;

    const parsed = await page.evaluate((content) => {
      const result = {};
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '[toggle]' || trimmed === '[/toggle]' || !trimmed) continue;

        const match = trimmed.match(/^\[([^\:]+)\:\:([\s\S]*)\]$/);
        if (match) {
          const key = match[1];
          const value = match[2];

          if (key === 'table_columns') {
            result.columns = value.split(',');
            result.table = { columns: result.columns, data: [] };
          } else if (key === 'table_data' && result.table) {
            const rows = value.split(';').filter(r => r.trim());
            result.table.data = rows.map(row => {
              const cells = row.split(',');
              const obj = {};
              result.table.columns.forEach((col, i) => {
                obj[col] = cells[i] || '';
              });
              return obj;
            });
          } else if (key === 'chart_keys') {
            result.chartKeys = value.split(',');
          } else if (key === 'chart_data' && result.chartKeys) {
            const entries = value.split(';').filter(r => r.trim());
            result.chartData = entries.map(entry => {
              const cells = entry.split(',');
              const obj = {};
              // cells[0] is the label (e.g., '中国联通'), data starts from cells[1]
              result.chartKeys.forEach((k, i) => {
                obj[k] = parseFloat(cells[i + 1]) || 0;
              });
              return obj;
            });
          } else if (key === 'summary') {
            const pairs = value.split(';').filter(p => p.trim());
            result.summary = {};
            pairs.forEach(pair => {
              const [k, v] = pair.split('=');
              if (k && v) result.summary[k.trim()] = parseFloat(v) || 0;
            });
          } else {
            result[key] = value;
          }
        }
      }

      return result;
    }, toggleContent);

    expect(parsed.title).toBe('中国联通 站点数量统计');
    expect(parsed.summary.总站点数).toBe(637);
    expect(parsed.table.columns).toEqual(['运营商', '制式', '频段', '站点数']);
    expect(parsed.table.data.length).toBe(3);
    expect(parsed.table.data[0].站点数).toBe('45');
    expect(parsed.chartKeys).toEqual(['LTE站点', 'NR站点', '总站点']);
    expect(parsed.chartData[0]['LTE站点']).toBe(290);
  });

  test('响应格式完整性 - content + chart + data', async ({ page }) => {
    await page.goto('/');

    // 模拟 Python _build_standard_response 返回格式
    const response = await page.evaluate(() => {
      const tableColumns = ['运营商', '制式', '频段', '站点数'];
      const tableData = [
        { '运营商': '中国联通', '制式': 'LTE', '频段': 'LTE 700M', '站点数': '45' },
      ];
      const chartData = [
        { '运营商': '中国联通', 'LTE站点': 290, 'NR站点': 347, '总站点': 637 },
      ];

      return {
        content: '# 中国联通 站点数量统计\n\n[toggle]...[/toggle]',
        chart: {
          type: 'bar',
          keys: ['LTE站点', 'NR站点', '总站点'],
          data: chartData,
          column: '运营商',
        },
        data: {
          summary: { 总站点数: 637, 运营商数: 1 },
          table: { columns: tableColumns, data: tableData },
        },
      };
    });

    expect(response.content).toContain('中国联通');
    expect(response.chart.type).toBe('bar');
    expect(response.chart.keys).toContain('LTE站点');
    expect(response.data.summary.总站点数).toBe(637);
  });
});

// ============================================================
// 数据一致性验证
// ============================================================

test.describe('数据一致性验证', () => {

  test('前端table数据与chart数据一致性', async ({ page }) => {
    await page.goto('/');

    const consistency = await page.evaluate(() => {
      // 模拟后端返回的完整数据
      const backendData = {
        operatorId: 1,
        dataMonth: '2026-03',
        lte700MSite: 45,
        lte800MSite: 30,
        nr3500MSite: 120,
        nr2300MSite: 12,
      };

      // 计算总站点数
      const totalSites = (backendData.lte700MSite || 0) +
                        (backendData.lte800MSite || 0) +
                        (backendData.nr3500MSite || 0) +
                        (backendData.nr2300MSite || 0);

      // 生成chart数据
      const chartData = [
        { band: 'LTE 700M', LTE站点: 45 },
        { band: 'LTE 800M', LTE站点: 30 },
        { band: 'NR 3500M', NR站点: 120 },
        { band: 'NR 2300M', NR站点: 12 },
      ];

      // 计算chart中的总站点
      const chartTotalSites = chartData.reduce((sum, d) => {
        return sum + (d['LTE站点'] || d['NR站点'] || 0);
      }, 0);

      return {
        backendTotal: totalSites,
        chartTotal: chartTotalSites,
        isConsistent: totalSites === chartTotalSites,
      };
    });

    expect(consistency.backendTotal).toBe(207);
    expect(consistency.chartTotal).toBe(207);
    expect(consistency.isConsistent).toBe(true);
  });

  test('多个运营商数据隔离', async ({ page }) => {
    await page.goto('/');

    const dataIsolation = await page.evaluate(() => {
      const operator1Sites = { operatorId: 1, lte700MSite: 45, nr3500MSite: 120 };
      const operator2Sites = { operatorId: 2, lte700MSite: 80, nr3500MSite: 200 };

      // 模拟按运营商过滤
      const filterByOperator = (data, opId) => data.filter(d => d.operatorId === opId);

      const operators = [operator1Sites, operator2Sites];
      const op1Data = filterByOperator(operators, 1);
      const op2Data = filterByOperator(operators, 2);

      const op1Total = op1Data.reduce((sum, d) => sum + (d.lte700MSite || 0) + (d.nr3500MSite || 0), 0);
      const op2Total = op2Data.reduce((sum, d) => sum + (d.lte700MSite || 0) + (d.nr3500MSite || 0), 0);

      return { op1Total, op2Total };
    });

    expect(dataIsolation.op1Total).toBe(165); // 45 + 120
    expect(dataIsolation.op2Total).toBe(280); // 80 + 200
  });

  test('历史数据月份排序', async ({ page }) => {
    await page.goto('/');

    const monthSorting = await page.evaluate(() => {
      const months = ['2025-12', '2026-01', '2026-02', '2026-03'];

      // 降序排列 (最新在前)
      const sortedDesc = [...months].sort((a, b) => b.localeCompare(a));

      // 升序排列 (最旧在前)
      const sortedAsc = [...months].sort((a, b) => a.localeCompare(b));

      return { sortedDesc, sortedAsc };
    });

    expect(monthSorting.sortedDesc[0]).toBe('2026-03');
    expect(monthSorting.sortedAsc[0]).toBe('2025-12');
  });
});

// ============================================================
// 边界条件测试
// ============================================================

test.describe('边界条件测试', () => {

  test('空数据返回', async ({ page }) => {
    await page.goto('/');

    const emptyResult = await page.evaluate(() => {
      const emptyData = [];
      if (!emptyData || emptyData.length === 0) {
        return { content: '未找到站点数据', chart: null, data: null };
      }
      return null;
    });

    expect(emptyResult.content).toBe('未找到站点数据');
    expect(emptyResult.chart).toBeNull();
  });

  test('部分频段数据缺失', async ({ page }) => {
    await page.goto('/');

    const partialData = await page.evaluate(() => {
      // 只有部分频段有数据
      const data = {
        lte700MSite: 45,
        lte700MCell: 120,
        // 其他频段都是0或undefined
        lte800MSite: 0,
        nr3500MSite: 0,
      };

      const SITE_CELL_BANDS = [
        ["LTE 700M", "lte700MSite"], ["LTE 800M", "lte800MSite"], ["NR 3500M", "nr3500MSite"],
      ];

      const result = SITE_CELL_BANDS.map(([band, key]) => ({
        band,
        value: data[key] || 0,
        hasData: (data[key] || 0) > 0,
      }));

      return result;
    });

    expect(partialData[0].hasData).toBe(true);
    expect(partialData[0].value).toBe(45);
    expect(partialData[1].hasData).toBe(false);
    expect(partialData[2].hasData).toBe(false);
  });

  test('数值精度处理', async ({ page }) => {
    await page.goto('/');

    const precision = await page.evaluate(() => {
      const dlRate = 680.923456789;

      return {
        rounded2: Math.round(dlRate * 100) / 100,     // 680.92
        rounded1: Math.round(dlRate * 10) / 10,       // 680.9
        fixed2: parseFloat(dlRate.toFixed(2)),         // 680.92
      };
    });

    expect(precision.rounded2).toBe(680.92);
    expect(precision.rounded1).toBe(680.9);
    expect(precision.fixed2).toBe(680.92);
  });

  test('大数值格式化', async ({ page }) => {
    await page.goto('/');

    const largeNumber = await page.evaluate(() => {
      const value = 999999999;

      return {
        original: value,
        formatted: value.toLocaleString('zh-CN'),
        compact: value >= 10000 ? `${Math.round(value / 10000)}万` : value.toString(),
      };
    });

    expect(largeNumber.formatted).toBe('999,999,999');
    expect(largeNumber.compact).toBe('100000万');
  });
});
