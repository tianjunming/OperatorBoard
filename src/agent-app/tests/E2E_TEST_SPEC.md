# OperatorBoard E2E 测试规格说明书

**文档版本**: 4.0
**编制日期**: 2026-04-11
**更新日期**: 2026-04-11
**项目**: OperatorBoard
**状态**: 正式版 (含 Phase 1-3 增强功能)

---

## 目录

1. [测试概述](#1-测试概述)
2. [数据流分析](#2-数据流分析)
3. [数据库到前端完整映射](#3-数据库到前端完整映射)
4. [测试用例设计](#4-测试用例设计)
5. [断言规格](#5-断言规格)
6. [测试数据规格](#6-测试数据规格)

---

## 1. 测试概述

### 1.1 测试目标

确保从**数据库查询结果**到**前端界面呈现**的完整数据流正确性，验证：
- 数据字段映射一致性
- 格式化输出格式正确性
- 前端解析器兼容性
- 图表渲染数据完整性

**Phase 1-3 增强功能测试目标**:
- 消息卡片分层设计、元信息显示
- 思维链增强类型标注、数据源追溯
- 表格排序筛选、图表类型切换
- 斜杠命令系统、@历史引用
- 会话分组、标签、书签

### 1.2 测试范围

| 层级 | 测试内容 | 状态 |
|------|----------|------|
| 数据库层 | Schema定义、字段命名 | 已分析 |
| Java服务层 | MyBatis映射、ResultMap | 已分析 |
| Python Agent层 | 格式化逻辑、字段获取 | 已分析 |
| 前端解析层 | responseParser解析 | 已分析 |
| 前端渲染层 | MessageItem渲染 | 已分析 |
| **Phase 1 增强** | 消息卡片、思维链、Citation、表格、图表 | 已实施 |
| **Phase 2 命令** | 斜杠命令、@引用 | 已实施 |
| **Phase 3 会话** | 分组、标签、书签 | 已实施 |

### 1.3 测试策略

```
┌─────────────────────────────────────────────────────────────┐
│                    端到端数据流测试                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  数据库 ──▶ Java MyBatis ──▶ Python Agent ──▶ 前端 Parser  │
│                                                             │
│     │           │              │              │             │
│     ▼           ▼              ▼              ▼             │
│  lte_700M  lte700MSite   "LTE 700M"    {name, value}      │
│  (下划线)    (驼峰)       (显示名)       (Chart数据)         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│              Phase 1-3 增强功能测试                          │
├─────────────────────────────────────────────────────────────┤
│  消息Header ──▶ 思维链 ──▶ Citation ──▶ 表格Sort ──▶ 图表  │
│       │                                                    │
│       ▼                                                    │
│  命令面板 ──▶ @引用 ──▶ 会话分组 ──▶ 标签 ──▶ 书签         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 数据流分析

### 2.1 数据库Schema (MySQL)

**表: site_info**

| 数据库字段 | 类型 | 说明 |
|-----------|------|------|
| lte_700M_site | INT | LTE 700M 物理站点数 |
| lte_700M_cell | INT | LTE 700M 物理小区数 |
| nr_3500M_site | INT | NR 3500M 物理站点数 |
| nr_3500M_cell | INT | NR 3500M 物理小区数 |
| nr_2300M_site | INT | NR 2300M 物理站点数 |
| nr_2300M_cell | INT | NR 2300M 物理小区数 |

**表: indicator_info**

| 数据库字段 | 类型 | 说明 |
|-----------|------|------|
| lte_700M_dl_rate | DECIMAL(10,2) | LTE 700M 下行速率 |
| lte_700M_ul_rate | DECIMAL(10,2) | LTE 700M 上行速率 |
| lte_700M_dl_prb | DECIMAL(5,2) | LTE 700M 下行PRB |
| nr_3500M_dl_rate | DECIMAL(10,2) | NR 3500M 下行速率 |

### 2.2 Java MyBatis映射

**SiteCellSummaryResultMap 字段映射规则**:

```
数据库(下划线)        →  Java驼峰        →  JSON响应
lte_700M_site        →  lte700MSite     →  "lte700MSite"
lte_700M_cell        →  lte700MCell     →  "lte700MCell"
nr_3500M_site        →  nr3500MSite     →  "nr3500MSite"
nr_3500M_cell        →  nr3500MCell     →  "nr3500MCell"
nr_2300M_site        →  nr2300MSite     →  "nr2300MSite"
nr_2300M_cell        →  nr2300MCell     →  "nr2300MCell"
lte_total_cell       →  lteTotalCell    →  "lteTotalCell" (Generated)
nr_total_cell        →  nrTotalCell     →  "nrTotalCell" (Generated)
```

**映射公式**: `lte_700M_site` → `lte700MSite` (去掉下划线，首字母大写)

### 2.3 Python Agent格式化

**频段定义常量**:

```python
LTE_BANDS = [
    ("LTE 700M", "lte700MSite", "lte700MCell"),
    ("LTE 800M", "lte800MSite", "lte800MCell"),
    ("LTE 900M", "lte900MSite", "lte900MCell"),
    ("LTE 1400M", "lte1400MSite", "lte1400MCell"),
    ("LTE 1800M", "lte1800MSite", "lte1800MCell"),
    ("LTE 2100M", "lte2100MSite", "lte2100MCell"),
    ("LTE 2600M", "lte2600MSite", "lte2600MCell"),
]

NR_BANDS = [
    ("NR 700M", "nr700MSite", "nr700MCell"),
    ("NR 800M", "nr800MSite", "nr800MCell"),
    ("NR 900M", "nr900MSite", "nr900MCell"),
    ("NR 1400M", "nr1400MSite", "nr1400MCell"),
    ("NR 1800M", "nr1800MSite", "nr1800MCell"),
    ("NR 2100M", "nr2100MSite", "nr2100MCell"),
    ("NR 2600M", "nr2600MSite", "nr2600MCell"),
    ("NR 3500M", "nr3500MSite", "nr3500MCell"),
    ("NR 4900M", "nr4900MSite", "nr4900MCell"),
    ("NR 2300M", "nr2300MSite", "nr2300MCell"),  # 注意：NR 2300M
]
```

**Chart Block格式**:

```markdown
:::chart[bar]
- LTE 700M 站点: 45
- LTE 700M 小区: 120
- NR 3500M 站点: 35
- NR 3500M 小区: 85
:::
```

**Table Block格式** (Toggle块内):

```markdown
:::toggle[site_cells]
[table]
| 数据月 | LTE 700M 站点 | LTE 700M 小区 | ... |
|--------|---------------|---------------|-----|
| 2026-03 | 45 | 120 | ... |
[chart]
- LTE 700M 站点: 45
- LTE 700M 小区: 120
...
:::
```

**注意**: 频段格式已更新为完整格式 (`LTE 700M` 而非 `700M`)，Chart格式使用空格分隔 (`LTE 700M 站点: 42`)。

### 2.4 前端Parser解析规则

**parseChartBlock 解析**:

```javascript
// 输入: "- LTE 700M 站点: 42" 或 "- LTE 700M 小区: 126"
// 正则: /^\s*[-*]\s*(.+?):\s*([\d.]+)/
// 提取: bandName = "LTE 700M 站点", value = 42

// 支持的格式:
"- LTE 700M 站点: 42"               // 带空格分隔
"- LTE 700M 小区: 126"              // 带空格分隔
"- LTE 700M 下行: 45.5"            // 指标类型
```

**parseTableBlock 解析**:

```javascript
// 输入: Markdown表格
// 解析规则:
// 1. 第一行为表头 | A | B | C |
// 2. 第二行为分隔 | --- | --- | --- |
// 3. 第三行起为数据行
// 4. 按 | 分割，过滤空白
```

---

## 3. 数据库到前端完整映射

### 3.1 站点数据映射表

| 数据库字段 | Java字段 | Python获取 | 显示名称 | Chart格式 |
|-----------|----------|-----------|---------|----------|
| lte_700M_site | lte700MSite | cell.get("lte700MSite") | LTE 700M | LTE 700M: 42 |
| lte_700M_cell | lte700MCell | cell.get("lte700MCell") | LTE 700M | LTE 700M: 126 |
| lte_800M_site | lte800MSite | cell.get("lte800MSite") | LTE 800M | LTE 800M: 28 |
| nr_3500M_site | nr3500MSite | cell.get("nr3500MSite") | NR 3500M | NR 3500M: 120 |
| nr_2300M_site | nr2300MSite | cell.get("nr2300MSite") | NR 2300M | NR 2300M: 12 |

### 3.2 指标数据映射表

| 数据库字段 | Java字段 | Python获取 | 显示名称 | 指标类型 |
|-----------|----------|-----------|---------|---------|
| lte_700M_dl_rate | lte700MDlRate | item.get("lte700MDlRate") | LTE 700M | 下行速率 |
| lte_700M_ul_rate | lte700MUlRate | item.get("lte700MUlRate") | LTE 700M | 上行速率 |
| lte_700M_dl_prb | lte700MDlPrb | item.get("lte700MDlPrb") | LTE 700M | 下行PRB |
| nr_3500M_dl_rate | nr3500MDlRate | item.get("nr3500MDlRate") | NR 3500M | 下行速率 |
| nr_2300M_dl_rate | nr2300MDlRate | item.get("nr2300MDlRate") | NR 2300M | 下行速率 |

### 3.3 已知问题与限制

| # | 问题描述 | 严重度 | 状态 |
|---|---------|--------|------|
| 1 | Chart数据格式中"站点/小区"与频段之间无空格: `LTE 700M站点:42` vs 期望 `LTE 700M: 42` | 高 | 需修复 |
| 2 | NR 2300M在chart数据的chart_parts生成时缺少NR 2300M的处理 | 中 | 需修复 |
| 3 | Toggle块的chart数据格式与parseChartBlock不完全匹配 | 中 | 需修复 |

---

## 4. 测试用例设计

### 4.1 数据流验证测试

#### TC001: 站点数据完整字段映射验证

**目的**: 验证数据库字段到前端Chart数据的完整映射

**输入**: 数据库site_info记录
```json
{
  "operatorId": 1,
  "dataMonth": "2026-03",
  "lte700MSite": 45,
  "lte700MCell": 120,
  "nr3500MSite": 35,
  "nr3500MCell": 85
}
```

**期望输出**: Toggle Block with Table and Chart
```markdown
:::toggle[site_cells]
[table]
| 数据月 | LTE 700M 站点 | LTE 700M 小区 | LTE 800M 站点 | ...
|--------|---------------|---------------|---------------| ...
| 2026-03 | 45 | 120 | 30 | ...
[chart]
- LTE 700M 站点: 45
- LTE 700M 小区: 120
...
:::
```

**验证点**:
- [ ] 频段名称格式正确 (`LTE 700M` vs `LTE700M`)
- [ ] 数值正确映射
- [ ] Chart数据可被parseChartBlock正确解析

#### TC002: 指标数据完整字段映射验证

**目的**: 验证指标数据的完整映射

**输入**: indicator_info记录
```json
{
  "dataMonth": "2026-03",
  "lte700MDlRate": 45.50,
  "lte700MUlRate": 8.30,
  "nr3500MDlRate": 680.90
}
```

**期望输出**: Chart + Table Block
```markdown
:::chart[bar]
- LTE 700M 下行: 45.5
- LTE 700M 上行: 8.3
- NR 3500M 下行: 680.9
:::

:::table
| 数据月 | 频段 | 下行速率(Mbps) | 上行速率(Mbps) |
|--------|------|----------------|----------------|
| 2026-03 | LTE 700M | 45.5 | 8.3 |
| 2026-03 | NR 3500M | 680.9 | N/A |
:::
```

#### TC003: NR 2300M频段支持验证

**目的**: 验证NR 2300M频段正确处理

**输入**: site_info记录包含nr2300MSite/nr2300MCell

**期望**:
- [ ] 表格包含NR 2300M列
- [ ] Chart数据包含NR 2300M
- [ ] Parser能正确解析NR 2300M格式

### 4.2 格式兼容性测试

#### TC010: Chart格式解析兼容性

**测试各种Chart格式的解析**:

| 输入格式 | 是否支持 | 说明 |
|---------|---------|------|
| `- LTE 700M 站点: 42` | ✅ | 正确格式 (空格分隔) |
| `- LTE 700M 小区: 126` | ✅ | 正确格式 |
| `- LTE 700M 下行: 45.5` | ✅ | 带指标类型 |
| `- LTE700M: 42` | ❌ | 频段格式错误 (缺少空格) |

#### TC011: Table格式解析兼容性

**测试各种Table格式的解析**:

| 输入格式 | 是否支持 | 说明 |
|---------|---------|------|
| `| A | B | C |` 标准格式 | ✅ | 标准markdown |
| `| A | B | C |` 空单元格 | ✅ | 过滤空白 |
| `| A | B | C |` 单元格内换行 | ❌ | 不支持 |

### 4.3 边界条件测试

#### TC020: 空数据处理

**输入**: 空site_cells数组

**期望输出**:
```json
{
  "content": "未找到站点数据",
  "chart": null
}
```

#### TC021: 零值处理

**输入**: lte700MSite = 0

**期望**: 该频段不应出现在chart数据中（被过滤）

#### TC022: 数值精度

**输入**: lte700MDlRate = 45.567

**期望**: 显示为 `45.57` (保留两位小数)

---

## 5. 断言规格

### 5.1 Chart数据断言

```javascript
// TC001: Chart数据格式断言
const expectedChartFormat = /- (LTE|NR) \d+M[\s\S]?: \d+/;
const chartLine = "- LTE 700M: 42";
expect(chartLine).toMatch(expectedChartFormat);

// TC001: Chart解析结果断言
const parsed = parseChartBlock(":::chart\n- LTE 700M: 42\n:::");
expect(parsed.data[0].name).toBe("LTE 700M");
expect(parsed.data[0].value).toBe(42);
```

### 5.2 Table数据断言

```javascript
// TC002: Table解析断言
const parsed = parseTableBlock(tableBlock);
expect(parsed.columns).toEqual(["数据月", "频段", "下行速率"]);
expect(parsed.data.length).toBeGreaterThan(0);
expect(parsed.data[0]["频段"]).toBe("LTE 700M");
```

### 5.3 字段映射断言

```javascript
// TC001: 字段映射一致性断言
const dbRecord = { lte_700M_site: 45 };           // 数据库
const javaRecord = { lte700MSite: 45 };           // Java
const pythonGet = cell.get("lte700MSite");         // Python获取
const chartFormat = "LTE 700M: 45";              // 显示

expect(pythonGet).toBe(45);
expect(chartFormat).toContain("LTE 700M");
```

---

## 6. 测试数据规格

### 6.1 标准测试数据集

**site_info 样例数据**:

| 字段 | 中国移动(北京) | 中国联通(上海) | 中国电信(广州) |
|------|---------------|---------------|---------------|
| lte700MSite | 45 | 35 | 40 |
| lte700MCell | 120 | 90 | 100 |
| nr3500MSite | 35 | 28 | 25 |
| nr3500MCell | 85 | 65 | 55 |
| nr2300MSite | 12 | 10 | 8 |
| nr2300MCell | 30 | 25 | 20 |

**indicator_info 样例数据**:

| 字段 | 中国移动(北京) | 说明 |
|------|---------------|------|
| lte700MDlRate | 45.50 | LTE 700M下行速率 |
| lte700MUlRate | 8.30 | LTE 700M上行速率 |
| nr3500MDlRate | 680.90 | NR 3500M下行速率 |
| nr3500MUlRate | 125.60 | NR 3500M上行速率 |

### 6.2 测试查询场景

| 场景 | 用户查询 | 期望Intent | 数据范围 |
|------|---------|-----------|---------|
| 站点查询 | "查询北京联通的站点数据" | site_data | site_info |
| 指标查询 | "北京联通的下行速率是多少" | indicator_data | indicator_info |
| 最新数据 | "最新的站点分布" | latest_data | 最新月份 |
| 运营商列表 | "有哪些运营商" | operator_list | operator_info |

---

## 附录A: 完整数据流图

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           完整数据流 (站点数据)                               │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  1. MySQL Database                                                           │
│     ┌─────────────────────────────────────────────────────────────────┐      │
│     │ site_info                                                        │      │
│     │ ├── operator_id: 1                                               │      │
│     │ ├── data_month: "2026-03"                                      │      │
│     │ ├── lte_700M_site: 45  ←── 下划线命名                          │      │
│     │ ├── lte_700M_cell: 120                                          │      │
│     │ ├── nr_3500M_site: 35                                           │      │
│     │ └── nr_3500M_cell: 85                                           │      │
│     └─────────────────────────────────────────────────────────────────┘      │
│                                    │                                          │
│                                    ▼                                          │
│  2. Java MyBatis (OperatorMapper.xml)                                       │
│     ┌─────────────────────────────────────────────────────────────────┐      │
│     │ <resultMap id="SiteCellSummaryResultMap">                      │      │
│     │   <result property="lte700MSite" column="lte_700M_site"/>      │      │
│     │   <!-- 映射: 下划线 → 驼峰 -->                                   │      │
│     │ </resultMap>                                                     │      │
│     └─────────────────────────────────────────────────────────────────┘      │
│                                    │                                          │
│                                    ▼                                          │
│  3. Java Service 返回 JSON                                                   │
│     ┌─────────────────────────────────────────────────────────────────┐      │
│     │ {                                                               │      │
│     │   "operatorId": 1,                                              │      │
│     │   "dataMonth": "2026-03",                                       │      │
│     │   "lte700MSite": 45,      ←── JSON驼峰命名                      │      │
│     │   "lte700MCell": 120,                                           │      │
│     │   "nr3500MSite": 35,                                            │      │
│     │   "nr3500MCell": 85                                              │      │
│     │ }                                                               │      │
│     └─────────────────────────────────────────────────────────────────┘      │
│                                    │                                          │
│                                    ▼                                          │
│  4. Python Agent (server.py)                                               │
│     ┌─────────────────────────────────────────────────────────────────┐      │
│     │ # 字段获取 - 使用驼峰命名                                         │      │
│     │ lte700MSite = cell.get("lte700MSite")  # → 45                   │      │
│     │                                                                  │      │
│     │ # 格式化 - 生成Toggle Block                                      │      │
│     │ chart_line = f"- LTE 700M 站点: {lte700MSite}"  # → "LTE 700M 站点: 45" │
│     └─────────────────────────────────────────────────────────────────┘      │
│                                    │                                          │
│                                    ▼                                          │
│  5. Python Agent 输出 (Markdown - Toggle块格式)                              │
│     ┌─────────────────────────────────────────────────────────────────┐      │
│     │ :::toggle[site_cells]                                           │      │
│     │ [table]                                                         │      │
│     │ | 数据月 | LTE 700M 站点 | LTE 700M 小区 | ...                  │      │
│     │ [chart]                                                         │      │
│     │ - LTE 700M 站点: 45    ←── 完整频段名 + 空格分隔                │      │
│     │ - LTE 700M 小区: 120                                            │      │
│     │ :::                                                             │      │
│     └─────────────────────────────────────────────────────────────────┘      │
│                                    │                                          │
│                                    ▼                                          │
│  6. Frontend responseParser.js                                               │
│     ┌─────────────────────────────────────────────────────────────────┐      │
│     │ // parseChartBlock 解析                                         │      │
│     │ const match = "- LTE 700M: 42".match(/^\s*[-*]\s*(.+?):\s*(\d+)/) │  │
│     │ // result: { name: "LTE 700M", value: 42 }                      │      │
│     └─────────────────────────────────────────────────────────────────┘      │
│                                    │                                          │
│                                    ▼                                          │
│  7. Frontend MessageItem.jsx 渲染                                            │
│     ┌─────────────────────────────────────────────────────────────────┐      │
│     │ <BarChart data={[{name: "LTE 700M", value: 45}]}>              │      │
│     │   <XAxis dataKey="name" />                                     │      │
│     │   <Bar dataKey="value" />                                       │      │
│     │ </BarChart>                                                     │      │
│     └─────────────────────────────────────────────────────────────────┘      │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 附录B: 问题追踪

| Issue | 描述 | 根本原因 | 修复方案 | 优先级 |
|-------|------|---------|---------|--------|
| #D2D-001 | Chart格式中"站点"与频段无空格 | server.py:560使用`f"{band_name}站点:{site_val}"` | ✅ 已修复：改为`f"- {band_name} 站点: {site_val}"` | P0 |
| #D2D-002 | NR 2300M未生成Chart数据 | ALL_BANDS包含但chart生成逻辑遗漏 | ✅ 已修复：chart生成逻辑已完整包含NR 2300M | P1 |
| #D2D-003 | Toggle块chart格式不一致 | toggle格式与parseChartBlock不完全匹配 | ✅ 已修复：统一使用`{band_name} 站点: {val}`格式 | P1 |

---

## 附录C: Phase 1-3 增强功能测试数据

### C.1 Phase 1 增强功能测试数据

**消息元信息数据结构**:

```javascript
const MESSAGE_WITH_METADATA = {
  id: 'msg-001',
  role: 'assistant',
  content: '北京联通站点数据如下...',
  metadata: {
    source: 'MySQL',
    query_time: 125,
    confidence: 92
  }
};
```

**增强思维链数据**:

```javascript
const ENHANCED_THINKING = `<!-- thinking_start -->
[action] 理解用户查询意图：查询北京联通站点数据
[step] 识别数据源：site_info 表
[result] 查询成功，返回 2026-03 月度数据 source: MySQL
[step] 处理站点数据：共 5 个频段
[result] 数据格式化完成，共 45 条记录
<!-- thinking_end -->

北京联通站点数据如下：`;
```

**带 Citation 的表格**:

```javascript
const TABLE_WITH_CITATION = `:::table
| 运营商 | 站点数 | 小区数 |
| ------ | ------ | ------ |
| 北京联通 | 1250 | 3800[1] |
| 上海联通 | 980 | 2900[2] |
:::`;

// citations: ['1', '2']
```

### C.2 Phase 2 命令系统测试数据

**斜杠命令定义**:

```javascript
const COMMANDS = [
  { id: 'site', label: '📍 站点查询', hint: '/site [区域] [运营商]' },
  { id: 'indicator', label: '📊 指标查询', hint: '/indicator [指标名]' },
  { id: 'compare', label: '📈 数据对比', hint: '/compare <对象1> <对象2>' },
  { id: 'export', label: '📥 导出数据', hint: '/export [csv/excel]' },
  { id: 'clear', label: '🗑️ 清空对话', hint: '/clear' },
  { id: 'help', label: '❓ 帮助', hint: '/help' },
];
```

**@引用消息格式**:

```javascript
// 插入引用
const input = '请问这个@';
const messageId = 'msg-123';
const result = input.slice(0, atIndex) + `[ref:${messageId}] `;
// 结果: '请问这个[ref:msg-123] '
```

### C.3 Phase 3 会话管理测试数据

**会话标签定义**:

```javascript
const SESSION_TAGS = [
  { id: 'site_data', label: '站点数据', color: '#4f46e5' },
  { id: 'indicator_data', label: '指标查询', color: '#10b981' },
  { id: 'comparison', label: '数据对比', color: '#f59e0b' },
  { id: 'general', label: '综合', color: '#6b7280' },
];
```

**会话分组逻辑**:

```javascript
const sessions = [
  { id: '1', title: '北京联通数据', updated_at: '2026-04-11T10:00:00Z', bookmarked: false },
  { id: '2', title: '重要分析', updated_at: '2026-04-10T10:00:00Z', bookmarked: true },
  { id: '3', title: '历史查询', updated_at: '2026-04-09T10:00:00Z', bookmarked: false },
];

// 分组结果:
// bookmarked: [{ id: '2', ... }]
// today: [{ id: '1', ... }]
// yesterday: []
// older: [{ id: '3', ... }]
```

### C.4 useTableSort Hook 测试数据

```javascript
const TABLE_DATA = [
  { name: 'LTE 700M', sites: 45, cells: 120 },
  { name: 'LTE 800M', sites: 28, cells: 84 },
  { name: 'NR 3500M', sites: 120, cells: 480 },
  { name: 'NR 2300M', sites: 12, cells: 30 },
];

// 排序: 按 sites 降序
const SORTED = [...TABLE_DATA].sort((a, b) => b.sites - a.sites);
// 结果: NR 3500M, LTE 700M, LTE 800M, NR 2300M

// 筛选: 包含 'LTE'
const FILTERED = TABLE_DATA.filter(row =>
  Object.values(row).some(val => String(val).toLowerCase().includes('lte'))
);
// 结果: LTE 700M, LTE 800M
```

### C.5 ChartTypeSelector 图表类型

```javascript
const CHART_TYPES = [
  { id: 'bar', icon: BarChart3, label: '柱状图' },
  { id: 'line', icon: LineChart, label: '折线图' },
  { id: 'pie', icon: PieChart, label: '饼图' },
  { id: 'area', icon: AreaChart, label: '面积图' },
];
```

---

**文档结束**
