# OperatorBoard 需求分析文档

**文档版本**: 1.0
**编制日期**: 2026-04-12
**参考标准**: Google PRD Template | IEEE 830

---

## 1. 概述

### 1.1 项目背景

OperatorBoard 是一个基于多Agent架构的电信运营商数据管理平台，集成NL2SQL（自然语言转SQL）能力，使用户能够通过自然语言查询运营商的站点、小区、频段分布和性能指标等数据。

### 1.2 系统目标

| 目标 | 描述 | 优先级 |
|------|------|--------|
| NL2SQL查询 | 通过自然语言查询数据库 | P0 |
| 站点管理 | 站点小区频段分布统计 | P0 |
| 指标分析 | 网络性能指标查询与趋势 | P0 |
| 数据可视化 | 图表化数据呈现 | P1 |
| 覆盖预测 | 覆盖预测知识问答与仿真参数调优 | P2 |

### 1.3 术语定义

| 术语 | 定义 |
|------|------|
| NL2SQL | Natural Language to SQL，自然语言转SQL |
| Agent | 智能代理，能够理解意图并执行任务 |
| RAG | Retrieval-Augmented Generation，检索增强生成 |
| CQRS | Command Query Responsibility Separation，命令查询职责分离 |
| 频段 | 无线通信频率范围，如700M、3500M |
| 宽表 | 列式存储设计，每行代表单一维度交叉 |

### 1.4 频段支持

| 网络类型 | 支持频段 |
|----------|----------|
| LTE | 700M, 800M, 900M, 1400M, 1800M, 2100M, 2600M |
| NR (5G) | 700M, 800M, 900M, 1400M, 1800M, 2100M, 2600M, 3500M, 4900M, 2300M |

---

## 2. 功能需求

### 2.1 Agent Framework 核心功能

#### 2.1.1 API服务器基类 (BaseAgentServer)

**功能**: 提供FastAPI服务器的抽象基类，实现单例Agent管理和通用路由。

**接口定义**:
```python
class BaseAgentServer:
    agent_class: Type  # Agent类引用
    _agent: Optional[Any] = None  # 单例实例

    async def get_agent() -> Any  # 获取/创建单例Agent
    async def create_agent() -> Any  # 抽象方法，子类实现
    def setup_routes() -> None  # 抽象方法，子类实现
```

**默认路由**:
| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/capabilities` | 获取Agent能力列表 |

#### 2.1.2 错误处理系统

**错误码体系** (ErrorCode):

| 范围 | 分类 | 示例 |
|------|------|------|
| E0001-E0099 | GENERAL | UNKNOWN_ERROR, INVALID_REQUEST |
| E1001-E1099 | AGENT | AGENT_NOT_INITIALIZED |
| E1101-E1199 | INTENT | INTENT_DETECTION_FAILED |
| E1201-E1299 | TOOL/SKILL | TOOL_NOT_FOUND |
| E2001-E2099 | CONFIG | CONFIG_NOT_FOUND |
| E2101-E2199 | RAG | RAG_RETRIEVAL_FAILED |
| E3001-E3099 | DATA | GET_SITE_CELLS_FAILED |
| E3101-E3199 | NL2SQL | NL2SQL_QUERY_FAILED |
| E4001-E4099 | EXTERNAL | EXTERNAL_SERVICE_ERROR |
| E5001-E5099 | AUTH | MISSING_API_KEY |

#### 2.1.3 工具系统 (Tool)

**BaseTool接口**:
```python
class BaseTool:
    name: str
    description: str
    enabled: bool = True

    async def ainvoke(self, tool_input: Dict[str, Any]) -> str
    def _run(self, tool_input: Dict[str, Any]) -> Any  # 同步桥接
```

#### 2.1.4 技能系统 (Skill)

**BaseSkill接口**:
```python
class SkillContext(BaseModel):
    skill_name: str
    input_data: Dict[str, Any] = {}
    metadata: Dict[str, Any] = {}

class BaseSkill:
    name: str
    description: str
    enabled: bool = True
    config: Dict[str, Any] = {}

    async def execute(self, context: SkillContext) -> Any
    async def validate(self, context: SkillContext) -> bool
    async def cleanup(self) -> None
```

#### 2.1.5 RAG语料加载器

| 加载器 | 功能 | 配置项 |
|--------|------|--------|
| DirectoryLoader | 目录扫描，支持txt/md/json/csv/pdf/docx | path, recursive, exclude_patterns, chunk_size |
| DatabaseLoader | MySQL查询加载 | connection_config, query_template, refresh_interval |
| HybridLoader | 多加载器组合 | loaders[], weights, priority, deduplicate |

### 2.2 Operator Agent 功能

#### 2.2.1 Intent Detection 意图识别

**功能**: 通过MiniMax M2-her LLM分析用户查询意图，实现智能路由。

**支持意图**:

| 意图 | 路由目标 | 数据类型 |
|------|----------|----------|
| site_data | get_site_cells() | 站点小区汇总 |
| indicator_data | get_latest_indicators() | 性能指标 |
| operator_list | /operators | 运营商列表 |
| latest_data | 最新月份过滤 | 最新数据 |
| nl2sql | query_nl2sql() | 自然语言SQL |

**Intent解析结果**:
```python
{
    "intent": "site_data",
    "operator_name": "中国联通",
    "data_month": "2026-03",
    "band": "3500M",
    "limit": 10
}
```

**运营商映射**:
```python
# 动态映射，支持模糊匹配
{"北京联通": "China Unicom", "上海联通": "China Unicom", ...}
```

#### 2.2.2 NL2SQL查询流程

```
用户输入 → Intent Detection → 路由 → Java微服务调用 → 格式化响应
    │
    ├── site_data → /api/site-summary
    ├── indicator_data → /api/indicators/latest
    ├── operator_list → /api/operators
    └── nl2sql → /api/nl2sql/query
```

#### 2.2.3 JavaMicroserviceTool

**功能**: HTTP调用Java NL2SQL服务

### 2.3 Operator Service (Java) 功能

#### 2.3.1 CQRS架构

**Command侧** (Nl2SqlController):
| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/v1/nl2sql/query` | POST | 自然语言转SQL查询 |
| `/api/v1/nl2sql/schema` | GET | 获取数据库Schema |

**Query侧** (OperatorQueryController, IndicatorQueryController):
| 端点 | 方法 | 功能 |
|------|------|------|
| `/api/v1/query/operators` | GET | 运营商列表 |
| `/api/v1/query/operators/{id}` | GET | 运营商详情 |
| `/api/v1/query/site-summary` | GET | 站点汇总 |
| `/api/v1/query/indicators` | GET | 指标列表 |
| `/api/v1/query/indicators/latest` | GET | 最新指标 |
| `/api/v1/query/indicators/trend` | GET | 指标趋势 |

### 2.4 Predict Agent 功能

#### 2.4.1 覆盖预测Q&A

**端点**: `POST /coverage/query`

**请求**:
```json
{
    "query": "5G覆盖预测的关键参数有哪些？",
    "topic": "general"
}
```

#### 2.4.2 仿真参数推荐

**端点**: `POST /simulation/recommend`

**场景化参数**:

| 场景 | 频段(MHz) | 功率(dBm) | 天线高度(m) | 下倾角(°) | 小区半径(m) |
|------|-----------|-----------|-------------|-----------|-------------|
| urban_5G | 3500 | 46 | 35 | 6 | 250 |
| suburban_5G | 2600 | 43 | 25 | 4 | 500 |
| rural_5G | 700 | 47 | 40 | 3 | 1500 |
| urban_4G | 1800 | 43 | 30 | 5 | 400 |

#### 2.4.3 仿真参数调优

**端点**: `POST /simulation/tune`

**调优规则**:

| 问题 | 调优动作 | 建议 |
|------|---------|------|
| 覆盖率低 | tx_power +2dBm | 提高发射功率 |
| 覆盖率低 | antenna_downtilt -1° | 扩大覆盖范围 |
| 吞吐量低 | frequency +500MHz | 增加带宽 |
| 干扰高 | cell_radius -50m | 降低小区半径 |

### 2.5 前端功能

#### 2.5.1 消息渲染 (MessageItem)

**支持的Block类型**:

| 类型 | 渲染器 | 格式标记 |
|------|--------|----------|
| thinking | renderThinkingChain() | `<!-- thinking_start -->...<!-- thinking_end -->` |
| table | renderTable() | `:::table...:::` |
| chart | renderChart() | `:::chart[type]...:::` |
| toggle | renderToggle() | `:::toggle[name]...[table]...[chart]...:::` |
| steps | renderSteps() | `:::steps...:::` |
| sql | renderSql() | `:::sql...:::` |
| text | renderText() | Markdown渲染 |
| metrics | renderMetrics() | 指标卡片渲染（KpiCard组件） |

#### 2.5.2 图表类型

| 类型 | Recharts组件 | 用途 |
|------|-------------|------|
| bar | BarChart | 频段站点/小区数对比 |
| line | LineChart | 指标趋势 |
| pie | PieChart | 占比分布 |
| area | AreaChart | 累积趋势 |

#### 2.5.3 流式响应

**SSE格式**:
```
data: {"type": "start"}
data: {"type": "content", "content": "..."}
data: {"type": "chart", "chart": {...}}
data: {"type": "confirmation", "options": {...}}
data: {"type": "error", "code": "...", "message": "..."}
data: [DONE]
```

**SSE事件类型**:

| 事件类型 | data内容 | 说明 |
|----------|----------|------|
| start | {type, request_id} | 流开始，携带请求ID |
| content | {type, content} | 文本内容片段 |
| chart | {type, chart} | 图表数据 |
| confirmation | {type, options} | 模糊查询确认请求 |
| error | {type, code, message} | 错误信息 |
| done | {type, request_id} | 流结束 |

### 2.6 交互体验优化

#### 2.6.1 智能图表推荐引擎

**功能**: 基于数据特征自动推荐最佳图表类型

**检测函数**:

| 函数 | 功能 |
|------|------|
| `hasTimeDimension()` | 检测时间维度（月份、日期等） |
| `hasRatioMetrics()` | 检测比率指标（0-100范围） |
| `isPartToWhole()` | 检测占比关系 |
| `recommendChartType()` | 推荐最佳图表类型 |

**推荐规则**:

| 条件 | 推荐类型 | 理由 |
|------|----------|------|
| 时间序列 + 单指标 | line | 展示趋势变化 |
| 时间序列 + 多指标 | area | 多指标对比 |
| 3+类别 + 单指标 | bar | 分类对比 |
| 2类别 + 多指标 | bar | 多指标对比 |
| 占比数据 (2-8类) | pie | 展示分布 |
| 类别>5 + 单指标 | line | 避免柱状图拥挤 |

#### 2.6.2 KPI卡片组件

**功能**: 增强版KPI卡片，支持Sparkline迷你趋势图

**组件接口**:
```jsx
<KpiCard
  title="LTE平均下行"
  value={126.87}
  unit="Mbps"
  trend="up"        // "up" | "down" | "stable"
  trendValue="+5.2%"
  sparklineData={[120, 122, 125, 124, 126, 127]}
  sparklineColor="#10b981"
  onClick={() => onExpand()}
/>
```

#### 2.6.3 模糊查询确认对话框

**功能**: 当用户查询模糊时，弹出对话框确认查询条件

**组件接口**:
```jsx
<QueryConfirmationDialog
  isOpen={showConfirmation}
  options={{
    operators: [{id: 1, name: '中国联通'}, ...],
    bands: ['LTE', 'NR', '全部'],
    months: ['2026-03', '2026-02', ...]
  }}
  onConfirm={(options) => handleConfirm(options)}
  onCancel={() => handleCancel()}
/>
```

#### 2.6.4 骨架屏组件

**功能**: 支持流式加载时的渐进式展示

**骨架类型**:

| 类型 | 用途 |
|------|------|
| `chart` | 图表骨架（柱状图动画） |
| `table` | 表格骨架 |
| `metrics` | KPI卡片骨架 |
| `text` | 文本骨架 |

#### 2.6.5 useStreamingAgent Hook增强

**新增功能**:

| 属性 | 类型 | 说明 |
|------|------|------|
| `showConfirmation` | boolean | 是否显示确认对话框 |
| `clarificationOptions` | object | 确认选项 {operators, bands, months} |
| `handleConfirmationConfirm` | function | 确认回调 |
| `handleConfirmationCancel` | function | 取消回调 |

---

## 3. 非功能性需求

### 3.1 性能需求

| 指标 | 目标值 | 说明 |
|------|--------|------|
| API响应时间 | < 2s | P95 |
| 页面加载时间 | < 3s | 首屏 |
| 并发用户数 | 50+ | 支持 |
| 数据库连接 | 10-20 | HikariCP配置 |

### 3.2 可用性需求

| 指标 | 目标值 |
|------|--------|
| 系统可用性 | 99.5% |
| MTTR | < 30min |
| 备份频率 | 每日 |

### 3.3 可扩展性

- Agent: 通过add_tool()/add_skill()扩展
- NL2SQL: 新增SqlBuilder实现
- 前端: 组件化图表，添加新Recharts组件

### 3.4 可维护性

- 配置驱动：YAML配置文件
- 清晰日志：结构化日志输出
- 错误码体系：统一错误码规范

---

## 4. 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.0 | 2026-04-12 | 初始版本，需求分析文档 |
