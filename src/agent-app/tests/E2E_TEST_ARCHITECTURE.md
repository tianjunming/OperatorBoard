# OperatorBoard E2E 测试架构文档

**文档版本**: 6.0
**更新日期**: 2026-04-11
**项目**: OperatorBoard

---

## 目录

1. [架构概览](#1-架构概览)
2. [技术选型决策](#2-技术选型决策)
3. [测试分层架构](#3-测试分层架构)
4. [核心模块设计](#4-核心模块设计)
5. [数据一致性验证](#5-数据一致性验证)
6. [视觉回归测试](#6-视觉回归测试)
7. [测试数据管理](#7-测试数据管理)
8. [CI/CD 集成](#8-cicd-集成)
9. [运行指南](#9-运行指南)

---

## 1. 架构概览

### 1.1 测试架构全景图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        OperatorBoard 测试架构                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      Playwright Test Runner                          │   │
│  │  ├─ Trace Viewer (失败调试)                                      │   │
│  │  ├─ Screenshots API (视觉回归)                                    │   │
│  │  └─ Video Recording (回放)                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                          │
│         ┌──────────────────────────┼──────────────────────────┐            │
│         ▼                          ▼                          ▼            │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐     │
│  │  E2E Tests  │          │  Integration │          │   Visual   │     │
│  │  (e2e/)     │          │  Tests       │          │  Tests     │     │
│  └──────┬──────┘          └──────┬──────┘          └──────┬──────┘     │
│         │                        │                        │              │
│         ▼                        ▼                        ▼              │
│  ┌─────────────┐          ┌─────────────┐          ┌─────────────┐     │
│  │  Database   │          │   Parser    │          │  Screenshots│     │
│  │  Direct     │          │   Logic     │          │  Baseline   │     │
│  │  Query      │          │   Verify    │          │  Compare    │     │
│  └──────┬──────┘          └─────────────┘          └─────────────┘     │
│         │                                                                │
│         ▼                                                                │
│  ┌─────────────────────────────────────────────────────────────┐         │
│  │                    MySQL Database                              │         │
│  │  └─ site_info, indicator_info, operator_info                 │         │
│  └─────────────────────────────────────────────────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 测试文件结构

```
src/agent-app/tests/
├── e2e/
│   ├── data-consistency.spec.js    # 数据库一致性测试
│   └── chat-flow.spec.js          # 聊天流程测试
├── visual/
│   └── chat-visual.spec.js         # 视觉回归测试
├── integration/
│   └── parser-integration.spec.js  # 解析器集成测试
├── helpers/
│   ├── index.js                    # 导出入口
│   └── dbHelper.js                # 数据库助手
├── factories/
│   └── dataFactory.js             # 测试数据工厂
├── pages/
│   └── ChatPage.js                # Page Object Model
├── chat.spec.js                   # 基础聊天测试
├── structured-data.spec.js         # 结构化数据测试
├── enhanced-ui.spec.js            # Phase 1-3 增强功能测试
├── common.spec.js                  # 通用组件测试
├── E2E_TEST_SPEC.md               # 测试规格说明书
├── E2E_TEST_SUMMARY.md            # 测试策略总结
└── E2E_TEST_ARCHITECTURE.md       # 本文档 - 架构设计
```

---

## 2. 技术选型决策

### 2.1 框架对比分析

| 框架 | Playwright | Cypress | Selenium | Applitools |
|------|-----------|---------|----------|-------------|
| **视觉回归** | 内置 Screenshots | 需扩展 | 需扩展 | AI 驱动 |
| **数据库集成** | 需扩展 | 需扩展 | 需扩展 | 无 |
| **Trace Viewer** | 内置 ⭐ | 有限 | 无 | 无 |
| **选择器稳定性** | 强 | 中 | 弱 | N/A |
| **学习曲线** | 低 ⭐ | 低 | 高 | 中 |
| **MCP/AI 集成** | 支持 ⭐ | 有限 | 无 | AI 驱动 |

### 2.2 选型结论

**核心框架**: Playwright

**决策理由**:
1. **Trace Viewer** - 内置的调试工具大大提升失败定位效率
2. **Screenshots API** - 内置视觉回归支持，无需额外付费
3. **数据一致性验证** - 通过直连 MySQL 实现真实数据验证
4. **选择器稳定性** - 支持 data-testid 属性，语义化选择器
5. **生态扩展** - MCP 工具集成，AI 辅助测试生成

### 2.3 技术栈

| 组件 | 技术 | 版本 |
|------|------|------|
| 测试框架 | Playwright | ^1.40.0 |
| 数据库客户端 | mysql2/promise | ^3.x |
| 截图比对 | Playwright Screenshots | 内置 |
| 调试工具 | Playwright Trace Viewer | 内置 |
| 测试报告 | Playwright HTML Reporter | 内置 |

---

## 3. 测试分层架构

### 3.1 测试金字塔

```
                          ┌─────────────────────┐
                          │   E2E Tests       │  ← 真实用户流程
                          │   (e2e/)         │    + DB 一致性
                          └──────────┬────────┘
                                     │
                          ┌──────────┴────────┐
                          │  Visual Tests     │  ← Screenshots
                          │  (visual/)       │    基线比对
                          └──────────┬────────┘
                                     │
                          ┌──────────┴────────┐
                          │ Integration Tests │  ← API + Parser
                          │ (integration/)    │
                          └─────────────────────┘
```

### 3.2 各层测试职责

| 层级 | 测试类型 | 职责 | 依赖 |
|------|----------|------|------|
| L1 | E2E + DB 一致性 | 完整数据流验证 | MySQL, Backend |
| L2 | 视觉回归 | UI 渲染一致性 | Screenshots |
| L3 | 集成测试 | API + Parser 验证 | Mock Server |
| L4 | 单元测试 | 纯函数逻辑 | 无 |

### 3.3 测试隔离策略

```javascript
// 环境变量控制测试执行
const RUN_BACKEND_TESTS = process.env.BACKEND_AVAILABLE === 'true';
const RUN_VISUAL_TESTS = process.env.RUN_VISUAL_TESTS === 'true';

// 有条件跳过
(RUN_BACKEND_TESTS ? test : test.skip)(
  '需要后端的测试',
  async ({ page }) => { /* ... */ }
);
```

---

## 4. 核心模块设计

### 4.1 数据库助手 (dbHelper.js)

**职责**: 提供数据库直连查询和数据一致性验证

```javascript
// 核心功能
export async function getSiteDataFromDB(operatorId, dataMonth)
export async function getIndicatorDataFromDB(operatorId, dataMonth)
export async function verifyDataConsistency(uiData, dbData, fieldMap)
export async function extractTableDataFromPage(page, selector)
```

**字段映射表**:

```javascript
export const SITE_FIELD_MAP = {
  'LTE 700M 站点': 'lte_700M_site',
  'LTE 700M 小区': 'lte_700M_cell',
  'NR 3500M 站点': 'nr_3500M_site',
  'NR 2300M 站点': 'nr_2300M_site',
  // ...
};
```

### 4.2 测试数据工厂 (dataFactory.js)

**职责**: 创建可预测的测试数据

```javascript
// 站点数据工厂
SiteDataFactory.createValidSiteData()
SiteDataFactory.createZeroSiteData()
SiteDataFactory.createLargeSiteData()
SiteDataFactory.createSingleBandData(band, siteValue, cellValue)

// 指标数据工厂
IndicatorDataFactory.createValidIndicatorData()
IndicatorDataFactory.createZeroIndicatorData()

// 运营商工厂
OperatorFactory.getChinaOperators()
OperatorFactory.getOperatorByName(name)

// 聊天消息工厂
ChatMessageFactory.createMessage(role, content)
ChatMessageFactory.createAssistantWithThinking(thinking, main)
```

### 4.3 Page Object Model (ChatPage.js)

**职责**: 封装页面元素选择器和操作

```javascript
export class ChatPage {
  async sendMessage(text)
  async getAssistantMessages()
  async getCharts()
  async extractTableData(tableLocator)
  async hasChartRendered()
  async waitForThinkingChain()
}
```

---

## 5. 数据一致性验证

### 5.1 验证流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    数据一致性验证流程                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. UI 触发查询                                                            │
│     └─ page.locator('[data-testid="chat-input"]').fill('北京联通站点数据') │
│                                                                             │
│  2. 等待 AI 响应                                                          │
│     └─ await expect(page.locator('[data-testid="structured-table"]'))      │
│                                                                             │
│  3. 从 UI 提取数据                                                        │
│     └─ const uiTable = await extractTableDataFromPage(page, selector)     │
│                                                                             │
│  4. 直连数据库查询                                                        │
│     └─ const dbData = await getSiteDataFromDB(operatorId, '2026-03')     │
│                                                                             │
│  5. 字段映射验证                                                          │
│     └─ const result = verifyDataConsistency(uiTable.data, dbData, FIELD_MAP)│
│                                                                             │
│  6. 断言一致                                                              │
│     └─ expect(result.isConsistent).toBe(true)                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 验证示例

```javascript
test('站点数据一致性', async ({ page }) => {
  // 1. UI 查询
  await page.locator('[data-testid="chat-input"]').fill('北京联通站点数据');
  await page.locator('[data-testid="send-button"]').click();

  // 2. 等待表格
  await expect(page.locator('[data-testid="structured-table"]')).toBeVisible();

  // 3. 提取 UI 数据
  const uiTable = await extractTableDataFromPage(page, '[data-testid="structured-table"]');

  // 4. 查询数据库
  const dbData = await getSiteDataFromDB(3, '2026-03');

  // 5. 验证一致性
  const result = verifyDataConsistency(uiTable.data, dbData, SITE_FIELD_MAP);
  expect(result.isConsistent).toBe(true);
});
```

### 5.3 支持的字段映射

**站点数据 (site_info)**:

| UI 显示 | 数据库字段 |
|---------|-----------|
| LTE 700M 站点 | lte_700M_site |
| LTE 700M 小区 | lte_700M_cell |
| NR 3500M 站点 | nr_3500M_site |
| NR 2300M 站点 | nr_2300M_site |
| ... | ... |

**指标数据 (indicator_info)**:

| UI 显示 | 数据库字段 |
|---------|-----------|
| LTE 700M 下行 | lte_700M_dl_rate |
| LTE 700M 上行 | lte_700M_ul_rate |
| NR 3500M 下行 | nr_3500M_dl_rate |
| NR 2300M 下行 | nr_2300M_dl_rate |

---

## 6. 视觉回归测试

### 6.1 Screenshots API 使用

```javascript
// 基线截图
await expect(page).toHaveScreenshot('chat-empty-state.png', {
  maxDiffPixelRatio: 0.1,    // 允许 10% 像素差异
  animations: 'disabled',       // 禁用动画
});
```

### 6.2 视觉测试配置

```javascript
// playwright.config.js
{
  screenshot: 'always',        // 每次都截图
  video: 'retain-on-failure', // 失败时保留视频
  trace: 'retain-on-failure', // 保留失败 trace
}
```

### 6.3 视觉测试场景

| 场景 | 截图文件 | 说明 |
|------|---------|------|
| 空状态 | chat-empty-state.png | 无消息时界面 |
| 输入聚焦 | chat-input-focused.png | 输入框聚焦 |
| 文本输入 | chat-input-filled.png | 输入内容后 |
| 图表显示 | chat-with-chart.png | AI 响应带图表 |
| 表格显示 | chat-with-table.png | AI 响应带表格 |
| 思维链 | chat-with-thinking.png | 思维链展开 |

### 6.4 响应式视觉测试

| 视图 | 分辨率 | 截图文件 |
|------|--------|---------|
| 桌面 | 1920x1080 | desktop-1920x1080.png |
| 笔记本 | 1366x768 | laptop-1366x768.png |
| 平板 | 768x1024 | tablet-768x1024.png |
| 手机 | 375x667 | mobile-375x667.png |

---

## 7. 测试数据管理

### 7.1 测试数据源

**源数据**: `src/operator-service/src/main/resources/generated_test_data.sql`

包含 180 个全球运营商的站点和指标数据。

### 7.2 数据工厂模式

```javascript
// 创建标准数据
const siteData = SiteDataFactory.createValidSiteData();

// 创建边界数据
const zeroData = SiteDataFactory.createZeroSiteData();

// 创建大数据
const largeData = SiteDataFactory.createLargeSiteData();

// 单频段隔离数据
const singleBand = SiteDataFactory.createSingleBandData('NR 2300M', 12, 30);
```

### 7.3 中国运营商测试数据

```javascript
const CHINA_OPERATORS = [
  { id: 1, name: '中国移动' },
  { id: 2, name: '中国电信' },
  { id: 3, name: '中国联通' },
  { id: 4, name: '中国铁塔' },
];
```

---

## 8. CI/CD 集成

### 8.1 GitHub Actions 工作流

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: operator_board
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        env:
          DB_HOST: localhost
          DB_USERNAME: root
          DB_PASSWORD: root
          DB_NAME: operator_board
          BACKEND_AVAILABLE: true
          RUN_VISUAL_TESTS: ${{ github.event_name == 'pull_request' }}
        run: npm run test

      - name: Upload artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/

      - name: Upload traces
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-traces
          path: test-results/
```

### 8.2 环境变量配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DB_HOST` | 数据库主机 | localhost |
| `DB_PORT` | 数据库端口 | 3306 |
| `DB_USERNAME` | 用户名 | root |
| `DB_PASSWORD` | 密码 | password |
| `DB_NAME` | 数据库名 | operator_board |
| `BACKEND_AVAILABLE` | 是否运行后端测试 | false |
| `RUN_VISUAL_TESTS` | 是否运行视觉测试 | false |

---

## 9. 运行指南

### 9.1 本地运行

```bash
# 安装依赖
npm install

# 运行所有测试（无后端）
npm run test

# 运行有后端的测试
BACKEND_AVAILABLE=true npm run test

# 运行视觉测试（较慢）
RUN_VISUAL_TESTS=true npm run test

# 运行特定测试文件
npm run test -- data-consistency.spec.js

# 运行特定用例
npm run test -- --grep "一致性"
```

### 9.2 调试失败的测试

```bash
# 打开 Playwright Trace Viewer
npx playwright show-trace test-results/trace.zip

# 运行带 UI 的测试
npm run test:ui

# 运行单个测试并调试
npx playwright test --debug data-consistency.spec.js
```

### 9.3 更新视觉基线

```bash
# 在确认 UI 变更正确后，更新基线截图
npm run test:update-screenshots

# 或手动删除 test-results/screenshots/ 中的过期基线
```

### 9.4 测试报告

```bash
# 查看 HTML 报告
open playwright-report/index.html

# 查看 JSON 结果
cat test-results/results.json
```

---

## 附录 A: data-testid 属性清单

| 组件 | data-testid | 说明 |
|------|-------------|------|
| ChatInput | `chat-input` | 文本输入框 |
| ChatInput | `send-button` | 发送按钮 |
| Sidebar | `sidebar` | 侧边栏容器 |
| Sidebar | `new-chat-button` | 新建对话按钮 |
| Sidebar | `session-search-input` | 会话搜索框 |
| Sidebar | `session-list` | 会话列表 |
| MessageItem | `message-item-user` | 用户消息 |
| MessageItem | `message-item-assistant` | 助手消息 |
| MessageItem | `message-bubble` | 消息气泡 |
| MessageItem | `thinking-chain` | 思维链容器 |
| MessageItem | `thinking-toggle` | 思维链切换按钮 |
| MessageItem | `structured-table` | 结构化表格 |
| MessageItem | `structured-chart` | 结构化图表 |
| MessageItem | `table-filter-input` | 表格筛选输入 |
| MessageItem | `table-export-button` | 表格导出按钮 |
| MessageItem | `chart-container` | 图表容器 |

---

## 附录 B: 关键文件路径

| 文件 | 用途 |
|------|------|
| `playwright.config.js` | Playwright 配置 |
| `tests/helpers/dbHelper.js` | 数据库助手 |
| `tests/factories/dataFactory.js` | 测试数据工厂 |
| `tests/e2e/data-consistency.spec.js` | 一致性测试 |
| `tests/visual/chat-visual.spec.js` | 视觉测试 |
| `tests/pages/ChatPage.js` | Page Object Model |

---

**文档结束**
