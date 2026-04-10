# OperatorBoard E2E 测试策略总结

**文档版本**: 5.0
**更新日期**: 2026-04-11
**项目**: OperatorBoard
**新增**: Phase 1-3 增强功能测试

---

## 目录

1. [测试架构](#1-测试架构)
2. [数据流分析](#2-数据流分析)
3. [测试用例矩阵](#3-测试用例矩阵)
4. [发现的问题](#4-发现的问题)
5. [测试数据规格](#5-测试数据规格)
6. [运行指南](#6-运行指南)

---

## 1. 测试架构

### 1.1 测试金字塔

```
┌─────────────────────────────────────┐
│     E2E 测试 (Playwright)            │  ← 验证完整用户流程 + 数据流
├─────────────────────────────────────┤
│       集成测试 (组件交互)            │  ← 验证API端点 + 组件集成
├─────────────────────────────────────┤
│     单元测试 (数据解析/渲染)          │  ← 验证Parser + Formatter
└─────────────────────────────────────┘
```

### 1.2 当前测试文件

| 文件 | 类型 | 覆盖范围 |
|------|------|----------|
| `chat.spec.js` | E2E | 基础聊天功能 |
| `common.spec.js` | E2E | 通用组件 |
| `dashboard.spec.js` | E2E | 仪表盘 |
| `structured-data.spec.js` | 单元/E2E | 结构化数据解析 |
| `render-issues.spec.js` | E2E | 渲染问题 |
| `fix-verification.spec.js` | E2E | 修复验证 |
| `data-flow.spec.js` | E2E | 数据流完整性验证 |
| **`enhanced-ui.spec.js`** | **E2E** | **Phase 1-3 增强功能测试 (新增)** |
| `pages/ChatPage.js` | POM | 页面对象模型 |

### 1.3 测试覆盖矩阵

| 功能模块 | 测试类型 | 用例数 | 覆盖内容 |
|---------|---------|--------|---------|
| 数据流映射 | E2E | 15+ | 数据库→前端完整映射 |
| Chart解析 | 单元 | 10+ | 各种格式兼容性 |
| Table解析 | 单元 | 8+ | Markdown表格解析 |
| 思考链 | 单元 | 5+ | 解析和渲染 |
| Toggle块 | 单元 | 4+ | 表格/图表切换 |
| 边界条件 | E2E | 8+ | 空数据、零值、精度 |
| 已知问题 | 回归 | 3 | Issue #D2D-001/002/003 |
| **Phase 1 增强** | E2E | 12+ | 消息卡片、思维链、Citation、表格排序、图表切换 |
| **Phase 2 命令系统** | E2E | 6+ | 斜杠命令、@引用 |
| **Phase 3 会话管理** | E2E | 8+ | 会话分组、标签、书签 |

---

## 2. 数据流分析

### 2.1 完整数据流图

```
MySQL (lte_700M_site)
    ↓ 下划线命名
Java MyBatis (lte700MSite)  ← ResultMap驼峰映射
    ↓ JSON响应
Python Agent (cell.get("lte700MSite"))
    ↓ 格式化输出
前端 Parser (parseChartBlock)
    ↓ 解析
前端 Render (MessageItem.jsx)
    ↓ 渲染
最终用户界面
```

### 2.2 字段映射表

#### 站点数据映射

| 数据库字段 | Java字段 | Python获取 | 显示名称 | Chart格式 |
|-----------|----------|-----------|---------|----------|
| lte_700M_site | lte700MSite | cell.get("lte700MSite") | LTE 700M | LTE 700M: 45 |
| lte_700M_cell | lte700MCell | cell.get("lte700MCell") | LTE 700M | LTE 700M: 120 |
| nr_3500M_site | nr3500MSite | cell.get("nr3500MSite") | NR 3500M | NR 3500M: 35 |
| nr_3500M_cell | nr3500MCell | cell.get("nr3500MCell") | NR 3500M | NR 3500M: 85 |
| nr_2300M_site | nr2300MSite | cell.get("nr2300MSite") | NR 2300M | NR 2300M: 12 |
| nr_2300M_cell | nr2300MCell | cell.get("nr2300MCell") | NR 2300M | NR 2300M: 30 |

#### 指标数据映射

| 数据库字段 | Java字段 | Python获取 | 显示名称 |
|-----------|----------|-----------|---------|
| lte_700M_dl_rate | lte700MDlRate | item.get("lte700MDlRate") | LTE 700M 下行 |
| lte_700M_ul_rate | lte700MUlRate | item.get("lte700MUlRate") | LTE 700M 上行 |
| nr_3500M_dl_rate | nr3500MDlRate | item.get("nr3500MDlRate") | NR 3500M 下行 |
| nr_3500M_ul_rate | nr3500MUlRate | item.get("nr3500MUlRate") | NR 3500M 上行 |

### 2.3 支持的频段

| 网络类型 | 支持频段 | 数量 |
|----------|----------|------|
| LTE | 700M, 800M, 900M, 1400M, 1800M, 2100M, 2600M | 7 |
| NR | 700M, 800M, 900M, 1400M, 1800M, 2100M, 2600M, 3500M, 4900M, 2300M | 10 |

---

## 3. 测试用例矩阵

### TC001-TC003: 数据流完整性验证

| 用例ID | 描述 | 输入 | 期望输出 | 状态 |
|--------|------|------|---------|------|
| TC001 | 站点数据完整字段映射 | site_info记录 | Chart Block正确格式 | ✅ |
| TC002 | 指标数据完整字段映射 | indicator_info记录 | Chart + Table Block | ✅ |
| TC003 | NR 2300M频段支持 | nr2300MSite=12 | 表格和Chart包含NR 2300M | ✅ |

### TC010-TC011: 格式兼容性

| 用例ID | 描述 | 测试格式 | 兼容性 |
|--------|------|---------|--------|
| TC010 | Chart格式解析 | `- LTE 700M: 42` | ✅ |
| TC010 | Chart格式解析 | `- LTE 700M 站点: 42` | ✅ |
| TC010 | Chart格式解析 | `- LTE 700M小区: 42` | ❌ |
| TC011 | Table格式解析 | 标准Markdown表格 | ✅ |

### TC020: 边界条件

| 用例ID | 场景 | 预期行为 |
|--------|------|---------|
| TC020 | 空数据 | 返回"未找到站点数据" |
| TC020 | 零值 | 过滤不显示 |
| TC020 | 大数值 | 正确格式化 (999,999,999) |
| TC020 | 小数精度 | 保留两位小数 |

### TC030-TC031: 特殊Block

| 用例ID | Block类型 | 格式 |
|--------|-----------|------|
| TC030 | 思考链 | `<!-- thinking_start -->...<!-- thinking_end -->` |
| TC031 | Toggle | `:::toggle[site_cells]...:::` |

### TC040: 集成测试

| 用例ID | 描述 |
|--------|------|
| TC040 | 站点数据完整流程 (Java→Python→Frontend) |
| TC040 | 指标数据完整流程 |

### TC050: 已知问题验证

| Issue | 描述 | 测试验证 |
|-------|------|---------|
| #D2D-001 | Chart格式空格问题 | TC050-01 |
| #D2D-002 | NR 2300M数据遗漏 | TC050-02 |
| #D2D-003 | Toggle块格式不一致 | TC050-03 |

### TC100-TC115: Phase 1 增强功能 (2026-04-11)

| 用例ID | 描述 | 功能模块 | 状态 |
|--------|------|---------|------|
| TC100 | 消息 Header 元信息区显示 | 1.1 消息卡片分层 | ✅ |
| TC101 | 数据源 Database 图标显示 | 1.1 消息卡片分层 | ✅ |
| TC102 | 查询耗时 Clock 图标显示 | 1.1 消息卡片分层 | ✅ |
| TC103 | 置信度 Badge 显示 | 1.1 消息卡片分层 | ✅ |
| TC104 | 思维链 [action] 类型标注 | 1.2 思维链优化 | ✅ |
| TC105 | 思维链 [result] 类型标注 | 1.2 思维链优化 | ✅ |
| TC106 | 思维链 [error] 类型标注 | 1.2 思维链优化 | ✅ |
| TC107 | 思维链 source: 数据源标签 | 1.2 思维链优化 | ✅ |
| TC108 | 表格 Citation 引用解析 | 1.3 数据来源追溯 | ✅ |
| TC109 | Citation 列表渲染 | 1.3 数据来源追溯 | ✅ |
| TC110 | 表格列头排序功能 | 1.4 表格排序筛选 | ✅ |
| TC111 | 表格筛选输入框 | 1.4 表格排序筛选 | ✅ |
| TC112 | 表格 CSV 导出功能 | 1.4 表格排序筛选 | ✅ |
| TC113 | 图表类型切换按钮 | 1.5 图表类型切换 | ✅ |
| TC114 | 图表 Bar/Line/Pie/Area 切换 | 1.5 图表类型切换 | ✅ |

### TC200-TC206: Phase 2 命令系统 (2026-04-11)

| 用例ID | 描述 | 功能模块 | 状态 |
|--------|------|---------|------|
| TC200 | 输入 / 显示命令面板 | 2.1 斜杠命令 | ✅ |
| TC201 | 命令过滤搜索功能 | 2.1 斜杠命令 | ✅ |
| TC202 | 命令选择后填充输入框 | 2.1 斜杠命令 | ✅ |
| TC203 | /clear 清空对话 | 2.1 斜杠命令 | ✅ |
| TC204 | 输入 @ 显示历史引用 | 2.2 @历史引用 | ✅ |
| TC205 | 引用选择后插入格式 | 2.2 @历史引用 | ✅ |
| TC206 | @引用渲染为可点击卡片 | 2.2 @历史引用 | ✅ |

### TC300-TC308: Phase 3 会话管理 (2026-04-11)

| 用例ID | 描述 | 功能模块 | 状态 |
|--------|------|---------|------|
| TC300 | 会话按今天分组 | 3.1 会话分组 | ✅ |
| TC301 | 会话按昨天分组 | 3.1 会话分组 | ✅ |
| TC302 | 会话按更早分组 | 3.1 会话分组 | ✅ |
| TC303 | 分组可折叠展开 | 3.1 会话分组 | ✅ |
| TC304 | 书签切换功能 | 3.3 会话书签 | ✅ |
| TC305 | 书签会话置顶显示 | 3.3 会话书签 | ✅ |
| TC306 | 标签添加功能 | 3.2 会话标签 | ✅ |
| TC307 | 标签移除功能 | 3.2 会话标签 | ✅ |
| TC308 | 标签颜色区分 | 3.2 会话标签 | ✅ |

---

## 4. 发现的问题

### Issue #D2D-001: Chart格式中指标与频段无空格

**问题**: `server.py` 生成格式 `"LTE 700M站点:42"` 而非 `"LTE 700M 站点: 42"`

**位置**: `src/operator-agent/src/operator_agent/api/server.py`

**影响**:
- 简单Chart格式可正确解析
- 带指标后缀格式可能解析失败

**严重度**: P0 (高)

**状态**: ✅ 已修复 - 格式已更新为 `"- {band_name} 站点: {site_val}"`

### Issue #D2D-002: NR 2300M在Chart数据中遗漏

**问题**: `ALL_BANDS` 包含 NR 2300M 定义，但 chart_parts 生成逻辑可能遗漏

**位置**: `src/operator-agent/src/operator_agent/api/server.py`

**影响**: NR 2300M频段站点数据可能不显示在图表中

**严重度**: P1 (中)

**状态**: ✅ 已修复 - chart生成逻辑已完整包含NR 2300M

### Issue #D2D-003: Toggle块chart格式与Parser不完全匹配

**问题**: Toggle块内chart数据格式与 `parseChartBlock` 解析不完全匹配

**位置**: `src/operator-agent/src/operator_agent/api/server.py`

**影响**: Toggle视图切换时图表可能无法正确渲染

**严重度**: P1 (中)

**状态**: ✅ 已修复 - 统一使用 `{band_name} 站点: {val}` 格式

---

## 5. 测试数据规格

### 5.1 标准测试数据

**站点数据 (site_info)**

```javascript
const SITE_DATA = {
  operatorId: 1,
  dataMonth: '2026-03',
  lte700MSite: 45,
  lte700MCell: 120,
  lte800MSite: 30,
  lte800MCell: 80,
  nr3500MSite: 35,
  nr3500MCell: 85,
  nr2300MSite: 12,
  nr2300MCell: 30,
};
```

**指标数据 (indicator_info)**

```javascript
const INDICATOR_DATA = {
  dataMonth: '2026-03',
  lte700MDlRate: 45.50,
  lte700MUlRate: 8.30,
  nr3500MDlRate: 680.90,
  nr3500MUlRate: 125.60,
};
```

### 5.2 测试场景

| 场景 | 用户查询 | Intent | 数据范围 |
|------|---------|--------|---------|
| 站点查询 | "查询北京联通的站点数据" | site_data | site_info |
| 指标查询 | "北京联通的下行速率" | indicator_data | indicator_info |
| 最新数据 | "最新的站点分布" | latest_data | 最新月份 |
| 运营商列表 | "有哪些运营商" | operator_list | operator_info |

---

## 6. 运行指南

### 6.1 前置条件

1. 安装依赖: `npm install`
2. 确保后端服务运行（或使用 mock）
3. 数据库包含测试数据

### 6.2 运行命令

```bash
# 运行所有测试
npm run test

# 运行数据流测试
npm run test -- data-flow.spec.js

# 运行带UI的测试
npm run test:ui

# 运行特定用例
npm run test -- --grep "TC001"

# 运行特定问题验证
npm run test -- --grep "D2D"
```

### 6.3 测试设计原则

1. **测试隔离**: 每个测试独立运行，不依赖其他测试状态
2. **选择器稳定**: 使用语义化选择器，避免动态生成的索引
3. **适当等待**: 使用 `waitForLoadState('networkidle')` 而非固定timeout
4. **错误消息清晰**: 断言失败时提供上下文信息

---

## 7. 改进建议

### 短期 (P1)

1. ✅ 添加数据流完整性测试 (已完成)
2. ✅ 添加已知问题回归测试 (已完成)
3. ✅ 验证并修复 Issue #D2D-001/002/003 (已完成)

### 长期 (P2)

1. 添加视觉回归测试 (percy/applitools)
2. 添加Accessibility测试
3. 建立测试数据工厂
4. 集成CI/CD自动测试

---

## 8. 附录

### A. 相关文档

- [E2E_TEST_SPEC.md](./E2E_TEST_SPEC.md) - 详细测试规格
- [SPEC.md](../../SPEC.md) - 系统规格说明书

### B. 术语表

| 术语 | 定义 |
|------|------|
| E2E | End-to-End，端到端测试 |
| POM | Page Object Model，页面对象模型 |
| Chart Block | `:::chart[...]...:::` 格式的图表数据块 |
| Toggle Block | 支持表格/图表切换的组件 |

---

**文档结束**
