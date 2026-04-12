# OperatorBoard 系统规格说明书 (SPEC)

**文档版本**: 1.4
**编制日期**: 2026-04-12
**更新日期**: 2026-04-12
**项目代号**: OperatorBoard
**文档状态**: 正式版
**参考标准**: Google API Design Guide | OpenAPI 3.0 | Stripe Error Format | GitHub RFC 7807

---

## 参考标准与业界案例分析

### 参考标准来源

| 标准/案例 | 来源 | 关键特性 | 在本项目中的应用 |
|-----------|------|----------|------------------|
| Google API Design Guide | Google Cloud | 资源导向设计、标准方法映射 | 第4章接口规格结构 |
| OpenAPI 3.0 | OpenAPI Initiative | Schema复用、$ref组件共享 | 第4.6节OpenAPI规范 |
| Stripe Error Format | Stripe API | type+code+param+doc_url | 第6.1节错误响应扩展 |
| GitHub RFC 7807 | GitHub API | errors[]字段级错误数组 | 第6.1节错误响应扩展 |
| Twilio API | Twilio | 场景化组织、多语言示例 | 第3章功能规格描述 |

### 业界案例优劣势分析

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           业界优秀案例对比                                   │
├─────────────┬─────────────────────────┬─────────────────────────┬───────────┤
│   案例      │           优点           │           劣势           │ 适用场景  │
├─────────────┼─────────────────────────┼─────────────────────────┼───────────┤
│ Stripe API  │ 错误type+code+param+     │ 复杂度高、学习曲线较陡  │ 商业SDK   │
│             │ doc_url组合，交互式示例  │                         │           │
├─────────────┼─────────────────────────┼─────────────────────────┼───────────┤
│ Twilio API  │ 场景化组织、多语言SDK示例│ 场景优先可能掩盖技术深度 │ 垂直领域  │
│             │                         │                         │ API       │
├─────────────┼─────────────────────────┼─────────────────────────┼───────────┤
│ GitHub API  │ RFC 7807错误格式、       │ 文档分散需多次跳转       │ 开发者    │
│             │ 字段级errors数组        │                         │ 平台      │
├─────────────┼─────────────────────────┼─────────────────────────┼───────────┤
│ Google API  │ 资源导向设计、标准方法   │ 需要较强抽象能力        │ 企业级    │
│ Design     │ 映射(List/Get/Create等) │                         │ 分布式系统│
├─────────────┼─────────────────────────┼─────────────────────────┼───────────┤
│ OpenAPI 3.0 │ 标准化、工具支持强、     │ 纯YAML可读性差          │ API定义   │
│             │ 可生成代码              │                         │ 交换      │
└─────────────┴─────────────────────────┴─────────────────────────┴───────────┘
```

### 本项目采纳策略

| 维度 | 融合来源 | 采纳内容 |
|------|----------|----------|
| 错误处理 | Stripe + GitHub | code + message + category + detail + request_id + doc_url + errors[] |
| API结构 | GitHub + OpenAPI | Path/Query/Body参数分类 + 响应码矩阵 + $ref复用 |
| 数据模型 | Google + OpenAPI | 字段约束 + 枚举值 + example示例 + format定义 |
| 架构追溯 | MADR格式 | docs/adr/目录存储关键架构决策记录 |
| 标准合规 | OpenAPI 3.0 | 生成openapi.yaml规范文件 |

---

## 目录

1. [系统概述](#1-系统概述)
2. [系统架构](#2-系统架构)
3. [功能规格](#3-功能规格)
4. [接口规格](#4-接口规格)
5. [数据模型](#5-数据模型)
6. [安全规格](#6-安全规格)
7. [非功能性需求](#7-非功能性需求)
8. [测试规格](#8-测试规格)
9. [架构决策记录(ADR)](#9-架构决策记录adr)
10. [附录](#10-附录)

---

## 1. 系统概述

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

## 2. 系统架构

### 2.1 组件架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           用户层 (User Layer)                            │
│                      Web Browser (React Frontend)                        │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       前端层 (Frontend Layer)                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │   React 18      │  │  Recharts 2.10  │  │    Lucide React       │ │
│  │   UI Framework  │  │  Data Viz       │  │    Icons               │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Node.js API Proxy (Port 8000)                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ HTTP/REST
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       应用层 (Application Layer)                        │
│                                                                          │
│  ┌─────────────────────────────────┐  ┌───────────────────────────────┐ │
│  │     operator-agent (Python)     │  │  operator-service (Java)      │ │
│  │         (Port 8080)             │  │       (Port 8081)              │ │
│  │  ┌───────────────────────────┐  │  │  ┌─────────────────────────┐ │  │
│  │  │      FastAPI Server      │  │  │  │   MVC + CQRS 架构       │ │  │
│  │  │   Intent Detection       │  │  │  │   - Nl2SqlController   │ │  │
│  │  │   Tool Registry         │  │  │  │   - Query Controllers   │ │  │
│  │  │   Skill Executor        │  │  │  │   - MyBatis            │ │  │
│  │  └───────────────────────────┘  │  │  └─────────────────────────┘ │  │
│  └─────────────────────────────────┘  └───────────────────────────────┘ │
│  ┌─────────────────────────────────┐  ┌───────────────────────────────┐ │
│  │     predict-agent (Python)      │  │  predict-service (可选)       │ │
│  │         (Port 8083)             │  │                               │ │
│  │  Coverage QA + Simulation Tuning│  │                               │ │
│  └─────────────────────────────────┘  └───────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
                    ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        数据层 (Data Layer)                               │
│  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────────┐   │
│  │   SQLCoder LLM   │  │    MySQL 8.0     │  │   ChromaDB         │   │
│  │  (Self-hosted)   │  │   (Primary DB)   │  │   (Vector Store)   │   │
│  │   localhost      │  │   localhost:3306 │  │   (Optional)       │   │
│  └───────────────────┘  └───────────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈矩阵

| 组件 | 技术选型 | 版本 | 端口 |
|------|----------|------|------|
| 前端框架 | React + Vite | 18.2 / 5.0 | 3000 |
| API代理 | Node.js | 18+ | 8000 |
| Agent框架 | Python + FastAPI | 3.10+ / 0.100+ | 8080 |
| NL2SQL服务 | Java Spring Boot | 17 / 3.2 | 8081 |
| 数据库 | MySQL | 8.0 | 3306 |
| 向量存储 | ChromaDB | (可选) | - |
| LLM | SQLCoder | (自托管) | 8081 |
| 覆盖预测Agent | Python + FastAPI | 3.10+ | 8083 |

### 2.3 设计模式

| 模式 | 应用场景 | 实现位置 |
|------|----------|----------|
| 单例模式 | Agent实例、Registry | `BaseAgentServer`, `ToolRegistry` |
| 工厂模式 | LLM客户端创建 | `create_llm_client()` |
| 策略模式 | SQL构建、LLM调用 | `SqlBuilder`, `LLMClient` |
| 适配器模式 | 多LLM调用方式 | `METHOD_POST` / `METHOD_CHATOPENAI` |
| 模板方法 | Agent服务器基类 | `BaseAgentServer.create_agent()` |
| 组合模式 | Agent组件集成 | `BaseAgent._tools`, `_skills` |
| Registry模式 | 工具/技能注册 | `ToolRegistry`, `SkillRegistry` |
| CQRS模式 | 数据查询架构 | `Nl2SqlCommandService` vs `QueryService` |

---

## 3. 功能规格

### 3.1 Agent Framework 核心功能

#### 3.1.1 API服务器基类 (BaseAgentServer)

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

#### 3.1.2 错误处理系统

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

**错误响应格式**:
```json
{
    "code": "E3001",
    "message": "获取站点数据失败",
    "category": "DATA",
    "detail": "具体错误信息"
}
```

#### 3.1.3 工具系统 (Tool)

**BaseTool接口**:
```python
class BaseTool:
    name: str
    description: str
    enabled: bool = True

    async def ainvoke(self, tool_input: Dict[str, Any]) -> str
    def _run(self, tool_input: Dict[str, Any]) -> Any  # 同步桥接
```

**工具注册流程**:
1. 继承`BaseTool`实现具体工具
2. 通过`agent.add_tool()`注册
3. 通过`ToolManager.invoke_tool()`调用

#### 3.1.4 技能系统 (Skill)

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

#### 3.1.5 RAG语料加载器

| 加载器 | 功能 | 配置项 |
|--------|------|--------|
| DirectoryLoader | 目录扫描，支持txt/md/json/csv/pdf/docx | path, recursive, exclude_patterns, chunk_size |
| DatabaseLoader | MySQL查询加载 | connection_config, query_template, refresh_interval |
| HybridLoader | 多加载器组合 | loaders[], weights, priority, deduplicate |

**DocumentLoaderManager**: 统一加载器管理器，支持YAML配置加载。

### 3.2 Operator Agent 功能

#### 3.2.1 Intent Detection 意图识别

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

#### 3.2.2 NL2SQL查询流程

```
用户输入 → Intent Detection → 路由 → Java微服务调用 → 格式化响应
    │
    ├── site_data → /api/site-summary
    ├── indicator_data → /api/indicators/latest
    ├── operator_list → /api/operators
    └── nl2sql → /api/nl2sql/query
```

#### 3.2.3 JavaMicroserviceTool

**功能**: HTTP调用Java NL2SQL服务

**配置项**:
```yaml
java_services:
  - service_name: nl2sql-service
    base_url: http://localhost:8081
    api_prefix: /api
```

### 3.3 Operator Service (Java) 功能

#### 3.3.1 CQRS架构

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

#### 3.3.2 SQLCoder集成

**Prompt构建**:
```sql
You are a MySQL expert. Convert the following natural language query to SQL.

Database Schema:
{tables_and_columns}

Natural Language Query: {user_query}

Requirements:
- Only generate SELECT statements
- Use proper MySQL syntax
- Add LIMIT clause (default 1000)
```

**SQL安全检查**:
```java
private boolean isSqlSafe(String sql) {
    // 1. 必须以SELECT开头
    // 2. 禁止关键词: DROP, DELETE, INSERT, UPDATE, TRUNCATE, ALTER, CREATE, GRANT, REVOKE
}
```

#### 3.3.3 Prompt注入防护

```java
// 长度限制
private static final int MAX_QUERY_LENGTH = 500;

// 注入模式检测
private static final Pattern[] INJECTION_PATTERNS = {
    Pattern.compile("(?i)ignore\\s+previous\\s+instructions?"),
    Pattern.compile("(?i)you\\s+are\\s+now\\s+"),
    Pattern.compile("(?i)'\\s*;?\\s*drop\\s+table"),
    // ...
};
```

### 3.4 Predict Agent 功能

#### 3.4.1 覆盖预测Q&A

**端点**: `POST /coverage/query`

**请求**:
```json
{
    "query": "5G覆盖预测的关键参数有哪些？",
    "topic": "general"
}
```

**RAG检索**: 从向量存储检索相关文档，支持电信覆盖领域知识。

#### 3.4.2 仿真参数推荐

**端点**: `POST /simulation/recommend`

**场景化参数**:

| 场景 | 频段(MHz) | 功率(dBm) | 天线高度(m) | 下倾角(°) | 小区半径(m) |
|------|-----------|-----------|-------------|-----------|-------------|
| urban_5G | 3500 | 46 | 35 | 6 | 250 |
| suburban_5G | 2600 | 43 | 25 | 4 | 500 |
| rural_5G | 700 | 47 | 40 | 3 | 1500 |
| urban_4G | 1800 | 43 | 30 | 5 | 400 |

#### 3.4.3 仿真参数调优

**端点**: `POST /simulation/tune`

**调优规则**:

| 问题 | 调优动作 | 建议 |
|------|---------|------|
| 覆盖率低 | tx_power +2dBm | 提高发射功率 |
| 覆盖率低 | antenna_downtilt -1° | 扩大覆盖范围 |
| 吞吐量低 | frequency +500MHz | 增加带宽 |
| 干扰高 | cell_radius -50m | 降低小区半径 |

### 3.5 前端功能

#### 3.5.1 消息渲染 (MessageItem)

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

#### 3.5.2 图表类型

| 类型 | Recharts组件 | 用途 |
|------|-------------|------|
| bar | BarChart | 频段站点/小区数对比 |
| line | LineChart | 指标趋势 |
| pie | PieChart | 占比分布 |
| area | AreaChart | 累积趋势 |

#### 3.5.3 流式响应

**SSE格式**:
```
data: {"type": "start"}
data: {"type": "content", "content": "..."}
data: {"type": "chart", "chart": {...}}
data: {"type": "error", "code": "...", "message": "..."}
data: [DONE]
```

---

## 4. 接口规格

### 4.1 Operator Agent API

**Base URL**: `http://localhost:8080`

#### 4.1.1 健康检查

```
GET /health
```

**响应**:
```json
{"status": "healthy"}
```

#### 4.1.2 Agent同步执行

**端点**: `POST /api/agent/run`

**认证**: X-API-Key Header (必填)

**描述**: 同步执行Agent任务，返回格式化结果（支持Markdown表格、图表数据）

**请求头**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Content-Type | string | 是 | application/json |
| X-API-Key | string | 是 | API认证密钥 |

**请求体**:
| 参数 | 类型 | 必填 | 说明 | 约束 |
|------|------|------|------|------|
| input | string | 是 | 用户查询输入 | 最大长度500字符 |
| stream | boolean | 否 | 是否启用流式响应 | 默认false |
| confirmed | boolean | 否 | 是否已确认执行 | 默认false（需二次确认） |

**请求示例**:
```json
{
    "input": "查询北京联通的站点数据",
    "stream": false,
    "confirmed": false
}
```

**响应 (200 OK)**:
| 参数 | 类型 | 说明 |
|------|------|------|
| content | string | Markdown格式的响应内容 |
| chart | object | 图表数据对象（可选） |

**响应示例**:
```json
{
    "content": "## 北京联通站点数据\n\n| 频段 | 站点数 | 小区数 |\n|------|--------|-------|\n| LTE 700M | 120 | 360 |",
    "chart": {
        "type": "bar",
        "column": "band",
        "data": [...]
    }
}
```

**错误响应码**:

| HTTP Status | code | 说明 |
|-------------|------|------|
| 400 | E0001 | 请求参数错误 |
| 401 | E5001 | API Key无效或缺失 |
| 500 | E1001 | Agent执行内部错误 |

#### 4.1.3 Agent流式执行

**端点**: `POST /api/agent/stream`

**认证**: X-API-Key Header (必填)

**描述**: 流式执行Agent任务，通过SSE (Server-Sent Events)实时推送结果

**请求体**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| input | string | 是 | 用户查询输入 |
| stream | boolean | 是 | 必须为true |

**请求示例**:
```json
{
    "input": "查询北京联通的站点数据",
    "stream": true
}
```

**SSE响应格式** (参考GitHub API):
```
event: start
data: {"type": "start", "request_id": "req_abc123"}

event: content
data: {"type": "content", "content": "## 北京联通..."}

event: chart
data: {"type": "chart", "chart": {"type": "bar", "data": [...]}}

event: error
data: {"type": "error", "code": "E3001", "message": "获取数据失败"}

event: done
data: {"type": "done", "request_id": "req_abc123"}
```

**SSE事件类型**:

| 事件类型 | data内容 | 说明 |
|----------|----------|------|
| start | {type, request_id} | 流开始，携带请求ID |
| content | {type, content} | 文本内容片段 |
| chart | {type, chart} | 图表数据 |
| error | {type, code, message} | 错误信息 |
| done | {type, request_id} | 流结束 |

**错误响应码**:

| HTTP Status | code | 说明 |
|-------------|------|------|
| 400 | E0001 | stream参数必须为true |
| 401 | E5001 | API Key无效或缺失 |

#### 4.1.4 运营商指标

**端点**: `POST /api/operator/indicators/latest`

**认证**: X-API-Key Header (必填)

**描述**: 获取指定运营商的最新性能指标

**请求体**:
| 参数 | 类型 | 必填 | 说明 | 约束 |
|------|------|------|------|------|
| operatorName | string | 是 | 运营商名称 | 支持模糊匹配 |
| limit | integer | 否 | 返回条数限制 | 默认10，最大100 |

**请求示例**:
```json
{
    "operatorName": "中国联通",
    "limit": 10
}
```

**响应 (200 OK)**:
```json
{
    "indicators": {
        "operatorId": 1,
        "operatorName": "中国联通",
        "dataMonth": "2026-03",
        "lteAvgDlRate": 85.5,
        "lteAvgPrb": 65.2,
        "nrAvgDlRate": 420.8,
        "nrAvgPrb": 58.3
    }
}
```

**错误响应码**:

| HTTP Status | code | 说明 |
|-------------|------|------|
| 400 | E0001 | 参数验证失败 |
| 404 | E3001 | 运营商不存在 |

#### 4.1.5 站点小区汇总

**端点**: `POST /api/operator/site-cells`

**认证**: X-API-Key Header (必填)

**描述**: 获取运营商站点小区按频段分布汇总

**请求体**:
| 参数 | 类型 | 必填 | 说明 | 约束 |
|------|------|------|------|------|
| operatorId | integer | 是 | 运营商ID | 正整数 |
| band | string | 否 | 频段筛选 | 如"3500M"，为空则返回全部 |

**请求示例**:
```json
{
    "operatorId": 1,
    "band": "3500M"
}
```

**响应 (200 OK)**:
```json
{
    "siteCells": {
        "operatorId": 1,
        "operatorName": "中国联通",
        "dataMonth": "2026-03",
        "lteTotalSite": 1500,
        "lteTotalCell": 4500,
        "nrTotalSite": 800,
        "nrTotalCell": 2400,
        "bandDetails": [
            {"band": "LTE 700M", "siteCount": 120, "cellCount": 360},
            {"band": "NR 3500M", "siteCount": 600, "cellCount": 1800}
        ]
    }
}
```

**错误响应码**:

| HTTP Status | code | 说明 |
|-------------|------|------|
| 400 | E0001 | operatorId必须为正整数 |
| 404 | E3001 | 运营商不存在 |

### 4.2 Operator Service API

**Base URL**: `http://localhost:8081`

#### 4.2.1 NL2SQL查询

**端点**: `POST /api/v1/nl2sql/query`

**认证**: X-API-Key Header (可选)

**描述**: 将自然语言查询转换为SQL并执行（采用Google资源导向设计）

**请求体**:
| 参数 | 类型 | 必填 | 说明 | 约束 |
|------|------|------|------|------|
| naturalLanguageQuery | string | 是 | 自然语言查询 | 最大长度500字符 |
| maxResults | integer | 否 | 最大返回条数 | 默认1000，最大10000 |
| latest | boolean | 否 | 是否仅返回最新月份 | 默认true |

**请求示例**:
```json
{
    "naturalLanguageQuery": "北京联通有多少个5G站点？",
    "maxResults": 1000,
    "latest": true
}
```

**响应 (200 OK)**:
| 参数 | 类型 | 说明 |
|------|------|------|
| generatedSql | string | 生成的SQL语句 |
| results | array | 查询结果集 |
| rowCount | integer | 结果行数 |
| executionTimeMs | integer | 执行耗时(毫秒) |
| status | string | 状态: success/error |

**响应示例**:
```json
{
    "generatedSql": "SELECT COUNT(*) FROM site_info WHERE operator_id = 1 AND nr_total_site > 0 AND data_month = '2026-03'",
    "results": [{"site_count": 800}],
    "rowCount": 1,
    "executionTimeMs": 1523,
    "status": "success"
}
```

**错误响应码**:

| HTTP Status | code | 说明 |
|-------------|------|------|
| 400 | E3101 | SQL生成失败 |
| 400 | E3102 | SQL安全检查未通过 |
| 400 | E3103 | 查询执行失败 |
| 429 | E4001 | 请求频率超限 |

#### 4.2.2 运营商列表

**端点**: `GET /api/v1/query/operators`

**描述**: 获取运营商列表（采用Google List标准方法模式）

**Query参数**:
| 参数 | 类型 | 必填 | 说明 | 约束 |
|------|------|------|------|------|
| country | string | 否 | 国家筛选 | 如"中国" |
| page | integer | 否 | 页码 | 默认1 |
| pageSize | integer | 否 | 每页条数 | 默认20，最大100 |

**请求示例**:
```
GET /api/v1/query/operators?country=中国&page=1&pageSize=20
```

**响应 (200 OK)**:
```json
{
    "operators": [
        {
            "id": 1,
            "operatorName": "中国联通",
            "country": "中国",
            "region": "北京",
            "networkType": "4G/5G"
        }
    ],
    "pagination": {
        "page": 1,
        "pageSize": 20,
        "total": 5,
        "totalPages": 1
    }
}
```

**错误响应码**:

| HTTP Status | code | 说明 |
|-------------|------|------|
| 400 | E0001 | 分页参数无效 |

#### 4.2.3 站点汇总

**端点**: `GET /api/v1/query/site-summary`

**描述**: 获取指定运营商的站点汇总数据（宽表格式）

**Query参数**:
| 参数 | 类型 | 必填 | 说明 | 约束 |
|------|------|------|------|------|
| operatorId | integer | 是 | 运营商ID | 正整数 |
| dataMonth | string | 否 | 数据月份 | 格式YYYY-MM，默认最新 |

**请求示例**:
```
GET /api/v1/query/site-summary?operatorId=1&dataMonth=2026-03
```

**响应 (200 OK)**:
```json
{
    "siteSummary": {
        "operatorId": 1,
        "operatorName": "中国联通",
        "dataMonth": "2026-03",
        "lteTotalSite": 1500,
        "lteTotalCell": 4500,
        "nrTotalSite": 800,
        "nrTotalCell": 2400,
        "lte700MSite": 200,
        "lte800MSite": 150,
        "lte900MSite": 300,
        "lte1800MSite": 400,
        "lte2600MSite": 250,
        "nr700MSite": 50,
        "nr3500MSite": 600,
        "nr4900MSite": 100,
        "nr2300MSite": 50
    }
}
```

**错误响应码**:

| HTTP Status | code | 说明 |
|-------------|------|------|
| 400 | E0001 | operatorId必须为正整数 |
| 404 | E3001 | 运营商不存在 |

#### 4.2.4 指标查询

**端点**: `GET /api/v1/query/indicators/latest`

**描述**: 获取指定运营商的最新性能指标

**Query参数**:
| 参数 | 类型 | 必填 | 说明 | 约束 |
|------|------|------|------|------|
| operatorId | integer | 是 | 运营商ID | 正整数 |

**请求示例**:
```
GET /api/v1/query/indicators/latest?operatorId=1
```

**响应 (200 OK)**:
```json
{
    "indicators": {
        "operatorId": 1,
        "operatorName": "中国联通",
        "dataMonth": "2026-03",
        "lteAvgDlRate": 85.5,
        "lteAvgUlRate": 12.3,
        "lteAvgPrb": 65.2,
        "nrAvgDlRate": 420.8,
        "nrAvgUlRate": 58.3,
        "nrAvgPrb": 58.3,
        "trafficRatio": 35.5,
        "dwellRatio": 98.2,
        "durationDwellRatio": 95.6
    }
}
```

**错误响应码**:

| HTTP Status | code | 说明 |
|-------------|------|------|
| 400 | E0001 | operatorId必须为正整数 |
| 404 | E3001 | 运营商或指标数据不存在 |

### 4.3 Predict Agent API

**Base URL**: `http://localhost:8083`

#### 4.3.1 覆盖预测问答

```
POST /coverage/query
Content-Type: application/json

{
    "query": "5G覆盖预测的关键参数有哪些？",
    "topic": "general"
}
```

#### 4.3.2 仿真参数推荐

```
POST /simulation/recommend
Content-Type: application/json

{
    "scenario": "urban",
    "networkType": "5G"
}
```

**响应**:
```json
{
    "recommendation": {
        "frequency": 3500,
        "txPower": 46,
        "antennaHeight": 35,
        "antennaDowntilt": 6,
        "cellRadius": 250
    }
}
```

#### 4.3.3 仿真参数调优

```
POST /simulation/tune
Content-Type: application/json

{
    "currentParams": {
        "frequency": 3500,
        "txPower": 44,
        "cellRadius": 300
    },
    "performanceMetrics": {
        "coverage": 75.5,
        "throughput": 380.2,
        "interference": 25.0
    },
    "targetMetrics": {
        "coverage": 85.0
    }
}
```

### 4.4 前端API代理

**Base URL**: `http://localhost:8000`

| 路径 | 目标服务 | 说明 |
|------|----------|------|
| `/api/auth/*` | Auth Agent (8084) | 认证相关 |
| `/api/agent/stream` | Operator Agent (8080) | Agent流式执行 |
| `/api/operator/*` | Operator Agent (8080) | 运营商数据 |
| `/api/nl2sql/*` | NL2SQL Service (8081) | NL2SQL查询 |

---

## 5. 数据模型

### 5.1 数据库Schema

#### 5.1.1 operator_info (运营商信息表)

**说明**: 存储运营商基本信息，采用宽表设计支持多国家多地区扩展

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 主键 |
| operator_name | VARCHAR(100) | NOT NULL | 运营商名称 |
| country | VARCHAR(50) | NOT NULL, DEFAULT '中国' | 国家 |
| region | VARCHAR(100) | NOT NULL | 地区 |
| network_type | VARCHAR(50) | NOT NULL | 网络类型 |
| data_month | VARCHAR(7) | NOT NULL | 数据月份 (YYYY-MM) |
| created_time | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_time | DATETIME | NOT NULL, ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**字段约束说明**（采纳自Google + OpenAPI）:

| 字段 | 约束规则 |
|------|----------|
| operator_name | 最大长度100字符，禁止特殊字符 |
| country | 枚举值：中国、美国、英国... |
| network_type | 枚举值：4G、5G、4G/5G |
| data_month | 正则格式：`^\d{4}-(0[1-9]|1[0-2])$` |

**枚举值定义**（采纳自Google API Design）:

| 字段 | 枚举值 | 说明 |
|------|--------|------|
| network_type | 4G | 仅4G网络 |
| network_type | 5G | 仅5G网络 |
| network_type | 4G/5G | 混合4G/5G网络 |

**唯一索引**: `(operator_name, country, data_month)`

#### 5.1.4 band_info (频段维度表)

**说明**: 频段维度表，存储21个支持的频段信息。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 主键 |
| band_code | VARCHAR(20) | UNIQUE, NOT NULL | 频段代码 (如 LTE700M_FDD) |
| band_name | VARCHAR(50) | NOT NULL | 频段名称 (如 LTE 700M FDD) |
| technology | VARCHAR(10) | NOT NULL | 技术制式 LTE/NR |
| frequency_mhz | INT | NOT NULL | 中心频率 MHz |
| duplex_mode | VARCHAR(10) | NOT NULL | 双工模式 FDD/TDD |
| band_group | VARCHAR(20) | - | 频段组 700M/800M/900M等 |

**变更历史**:
| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 1.0 | 2026-04-10 | 初始版本 |
| 1.1 | 2026-04-11 | 增加region字段支持多地区 |
| 1.2 | 2026-04-12 | 重构数据模型：规范化表结构，新增band_name字段 |

#### 5.1.2 site_info (站点信息表)

**说明**: 规范化事实表，每行代表一个运营商在特定频段和月份的数据。通过SQL查询可生成宽表视图。

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | 主键 |
| operator_id | BIGINT | FK → operator_info.id | 运营商ID |
| band_id | BIGINT | FK → band_info.id | 频段ID |
| band_name | VARCHAR(50) | NOT NULL | 频段名称 (如 LTE 700M FDD) |
| data_month | VARCHAR(7) | NOT NULL | 数据月份 (YYYY-MM) |
| site_num | INT | DEFAULT 0 | 站点数量 |
| cell_num | INT | DEFAULT 0 | 小区数量 |
| technology | VARCHAR(10) | NOT NULL | 技术制式 LTE/NR |

**唯一索引**: `(operator_id, band_id, data_month)`

**频段信息** (关联 band_info 表):

| 网络类型 | 支持频段 |
|----------|----------|
| LTE | LTE700M_FDD, LTE800M_FDD, LTE900M_FDD, LTE1400M_FDD, LTE1800M_FDD, LTE2100M_FDD, LTE2300M_FDD, LTE2300M_TDD, LTE2600M_FDD, LTE2600M_TDD |
| NR | NR700M_FDD, NR800M_FDD, NR900M_FDD, NR1400M_FDD, NR1800M_FDD, NR2100M_FDD, NR2300M_FDD, NR2300M_TDD, NR2600M_FDD, NR2600M_TDD, NR3500M_TDD, NR4900M_TDD |

**宽表查询示例** (通过 JOIN 生成宽表视图):
```sql
SELECT
    o.id AS operator_id,
    ss.data_month,
    MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN ss.site_num END) AS lte_700M_site,
    MAX(CASE WHEN b.band_code = 'LTE700M_FDD' THEN ss.cell_num END) AS lte_700M_cell,
    ...
FROM operator_info o
LEFT JOIN site_info ss ON o.id = ss.operator_id
LEFT JOIN band_info b ON ss.band_id = b.id
GROUP BY o.id, ss.data_month
```

#### 5.1.3 indicator_info (指标信息表)

**说明**: 规范化事实表，每行代表一个运营商在特定频段和月份的网络指标数据。

| 字段 | 类型 | 约束 | 单位 | 说明 |
|------|------|------|------|------|
| id | BIGINT | PK, AUTO_INCREMENT | - | 主键 |
| operator_id | BIGINT | FK → operator_info.id | - | 运营商ID |
| band_id | BIGINT | FK → band_info.id | - | 频段ID |
| band_name | VARCHAR(50) | NOT NULL | - | 频段名称 (如 LTE 700M FDD) |
| data_month | VARCHAR(7) | NOT NULL | - | 数据月份 (YYYY-MM) |
| technology | VARCHAR(10) | NOT NULL | - | 技术制式 LTE/NR |
| dl_prb | DECIMAL(10,5) | - | % | 下行PRB利用率 |
| ul_prb | DECIMAL(10,5) | - | % | 上行PRB利用率 |
| dl_rate | DECIMAL(10,2) | - | Mbps | 下行速率 |
| ul_rate | DECIMAL(10,2) | - | Mbps | 上行速率 |
| total_traffic | DECIMAL(15,2) | - | MB | 总流量 |
| dl_traffic | DECIMAL(15,2) | - | MB | 下行流量 |
| ul_traffic | DECIMAL(15,2) | - | MB | 上行流量 |
| online_users | DECIMAL(10,2) | - | - | 在线用户数 |
| nr_users | DECIMAL(10,2) | - | - | NR用户数 |
| terminal_penetration_ratio | DECIMAL(10,4) | - | % | 终端渗透率 |

**唯一索引**: `(operator_id, band_id, data_month)`

**指标约束规则**（采纳自Google API Design数据验证）:

| 指标类型 | 约束规则 |
|----------|----------|
| *Rate (速率) | >= 0, <= 10000 Mbps |
| *Prb (资源) | >= 0, <= 100 % |
| Ratio类 | >= 0, <= 100 % |

### 5.2 前端数据结构

#### 5.2.1 会话模型 (ChatContext)

```typescript
interface Session {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
}

interface Message {
    id: string;
    sessionId: string;
    role: 'user' | 'assistant';
    content: string;
    metadata?: {
        chart?: ChartData;
        intent?: string;
        sql?: string;
    };
    timestamp: number;
}
```

#### 5.2.2 图表数据模型

```typescript
interface ChartData {
    type: 'bar' | 'line' | 'pie' | 'area';
    column: string;
    data: Array<{
        name: string;
        value: number;
    }>;
    title?: string;
}
```

### 5.3 配置数据结构

#### 5.3.1 Intent Detection配置

```yaml
# configs/intent_detection.yaml
enabled: true
llm_endpoint: https://api.minimaxi.com/v1/text/chatcompletion_v2
llm_model: MiniMax-M2-her
api_key: ${INTENT_API_KEY}
timeout: 30
max_tokens: 200
temperature: 0.1
```

#### 5.3.2 Java服务配置

```yaml
# configs/tools.yaml (参考实现)
java_services:
  - service_name: nl2sql-service
    base_url: ${NL2SQL_SERVICE_URL:http://localhost:8081}
    api_prefix: /api
    timeout: 60
```

---

## 6. 安全规格

### 6.1 错误响应扩展格式（参考Stripe + GitHub RFC 7807）

**标准错误响应格式**:
```json
{
    "code": "E3001",
    "message": "获取站点数据失败",
    "category": "DATA",
    "detail": "数据库连接超时",
    "request_id": "req_abc123xyz",
    "doc_url": "https://operatorboard.example.com/docs/errors/E3001",
    "errors": [
        {
            "field": "operator_id",
            "code": "invalid_type",
            "message": "operator_id必须为正整数"
        }
    ]
}
```

**错误字段说明**（采纳自Stripe + GitHub）:

| 字段 | 类型 | 说明 | 来源 |
|------|------|------|------|
| code | string | 错误码，如E3001 | 原有 |
| message | string | 人类可读的错误描述 | 原有 |
| category | string | 错误分类：GENERAL/AGENT/INTENT/DATA/NL2SQL等 | 原有 |
| detail | string | 具体错误详情，用于调试 | 原有 |
| request_id | string | 请求追踪ID，用于日志关联 | **新增-Stripe** |
| doc_url | string | 错误文档链接，开发者可查阅详细说明 | **新增-Stripe** |
| errors | array | 字段级错误数组，每个元素包含field/code/message | **新增-GitHub** |

**字段级错误对象结构**:

| 字段 | 类型 | 说明 |
|------|------|------|
| field | string | 错误关联的字段名 |
| code | string | 错误代码，如invalid_type/missing/format_error |
| message | string | 字段级错误描述 |

**HTTP状态码映射**:

| HTTP Status | 适用场景 |
|-------------|----------|
| 200 | 请求成功（业务错误在body中返回） |
| 400 | 请求参数错误（errors数组填充字段级错误） |
| 401 | 认证失败或API Key无效 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 429 | 请求频率超限 |
| 500 | 服务器内部错误 |

### 6.2 SQL注入防护

| 层级 | 措施 |
|------|------|
| 输入层 | PromptSanitizer过滤危险模式 |
| 生成层 | LLM生成SQL后必须通过isSqlSafe()检查 |
| 执行层 | 只允许SELECT语句，参数化LIMIT |

### 6.3 Prompt注入防护

```java
// 禁止模式
- "ignore previous instructions"
- "you are now a"
- "' OR '1'='1"
- "'; DROP TABLE"
```

### 6.4 API认证

| 组件 | 认证方式 | 配置 |
|------|----------|------|
| operator-agent | X-API-Key Header | OPERATOR_AGENT_API_KEYS |
| operator-service | X-API-Key Header (可选) | nl2sql.security.api-keys |
| 前端代理 | CORS配置 | ALLOWED_ORIGINS |

### 6.5 数据安全

- SQLCoder本地部署，数据不出网
- 数据库账号权限最小化（只读用户）
- 敏感操作审计日志

---

## 7. 非功能性需求

### 7.1 性能需求

| 指标 | 目标值 | 说明 |
|------|--------|------|
| API响应时间 | < 2s | P95 |
| 页面加载时间 | < 3s | 首屏 |
| 并发用户数 | 50+ | 支持 |
| 数据库连接 | 10-20 | HikariCP配置 |

### 7.2 可用性需求

| 指标 | 目标值 |
|------|--------|
| 系统可用性 | 99.5% |
| MTTR | < 30min |
| 备份频率 | 每日 |

### 7.3 可扩展性

- Agent: 通过add_tool()/add_skill()扩展
- NL2SQL: 新增SqlBuilder实现
- 前端: 组件化图表，添加新Recharts组件

### 7.4 可维护性

- 配置驱动：YAML配置文件
- 清晰日志：结构化日志输出
- 错误码体系：统一错误码规范

---

## 8. 测试规格

### 9.1 E2E测试框架

| 项目 | 说明 |
|------|------|
| 框架 | Playwright |
| 测试目录 | `src/agent-app/tests/` |
| 配置文件 | `playwright.config.js` |
| 默认超时 | 180000ms (3分钟) |

### 9.2 测试套件

| 测试文件 | 描述 | 测试数 |
|----------|------|--------|
| `18-functions-e2e.spec.js` | 18个核心功能E2E测试 + 数据库一致性验证 | 29 |
| `ui-optimizations-e2e.spec.js` | UI优化功能测试套件 | 20 |

### 9.3 测试覆盖范围

#### 功能测试 (18-functions-e2e.spec.js)
- **前置条件验证**: 系统可访问、登录功能、数据库连接、中国运营商数据存在
- **功能1-7**: 单运营商站点/小区/指标查询
  - 功能1: 中国联通有多少站点
  - 功能2: 中国联通有多少小区
  - 功能3: 中国联通小区上行负载
  - 功能4: 中国联通小区下行负载
  - 功能5: 中国联通小区上行速率
  - 功能6: 中国联通小区下行速率
  - 功能7: 中国联通小区指标
- **功能8-11**: 多运营商查询
  - 功能8: 查看所有运营商
  - 功能9: 查看所有运营商站点
  - 功能10: 查看所有运营商下行速率
  - 功能11: 查看所有运营商上行速率
- **功能12-18**: 历史数据查询
  - 功能12-18: 各种历史数据查询

#### UI优化测试 (ui-optimizations-e2e.spec.js)
- 可访问性验证 (ARIA标签)
- SQL块复制功能
- 空数据展示 ("--" vs "0")
- 滚动到底部按钮
- 月份选择器范围限制
- 命令面板功能

### 9.4 数据库一致性验证

测试通过以下方式验证UI结果与数据库数据一致性：

```javascript
// 直接数据库查询
async function getSiteCellData(operatorId, dataMonth = '2026-03') {
  const conn = await mysql.createConnection(DB_CONFIG);
  const [rows] = await conn.execute(`
    SELECT * FROM operator_total_site
    WHERE operator_id = ? AND data_month = ?
  `, [operatorId, dataMonth]);
  return rows[0] || null;
}

// UI结果对比
const uiValue = extractNumberFromContent(messageContent);
const dbValue = dbResult.lte_physical_site_num + dbResult.nr_physical_site_num;
expect(uiValue).toBeCloseTo(dbValue, 0);
```

### 9.5 测试配置

```javascript
// playwright.config.js
export default defineConfig({
  testDir: './tests',
  timeout: 180000,
  expect: { timeout: 30000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: process.env.CI ? 'on-first-retry' : 'retain-on-failure',
    screenshot: process.env.CI ? 'only-on-failure' : 'always',
    video: process.env.CI ? 'off' : 'retain-on-failure',
  },
});
```

### 9.6 运行测试

```bash
cd src/agent-app

# 安装浏览器
npx playwright install chromium

# 运行所有测试
npx playwright test --project=chromium --reporter=line

# 运行特定测试文件
npx playwright test tests/18-functions-e2e.spec.js --project=chromium

# 查看报告
npx playwright show-report
```

---

## 9. 架构决策记录(ADR)

**说明**: 本节记录项目中的关键架构决策，采用MADR (Markdown Any Decision Record)格式，便于追溯和审查。

### 9.1 ADR-001: FastAPI框架选择

**标题**: 采用FastAPI作为Agent API框架

**状态**: Accepted

**日期**: 2026-04-10

**上下文**:
- 需要快速构建高性能API服务
- 需要支持同步/异步调用
- 需要与现有LangChain框架集成
- 需要自动生成OpenAPI文档

**决策**:
采用FastAPI作为API框架，主要考虑：
- 使用Pydantic进行请求/响应数据验证
- 使用httpx进行HTTP调用（支持异步）
- 使用BackgroundTasks处理异步任务
- 自动生成符合OpenAPI 3.0规范的文档

**后果**:
| 类型 | 说明 |
|------|------|
| 正面 | 开发效率提升，类型安全，自动文档生成 |
| 负面 | 学习曲线，额外依赖 |
| 中性 | 与Flask相比性能更好但功能更少 |

**替代方案考虑**:
1. Flask: 简单但缺少Pydantic集成
2. Django: 功能完整但过于重量级
3. gRPC: 高性能但前端集成复杂

---

### 9.2 ADR-002: CQRS架构采用

**标题**: 在NL2SQL服务中采用CQRS模式

**状态**: Accepted

**日期**: 2026-04-10

**上下文**:
- 查询类型多样（站点数据、指标数据、NL2SQL查询）
- 需要分离读写职责
- Java Spring Boot项目中需要清晰的分层架构

**决策**:
在Java层采用CQRS (Command Query Responsibility Separation)模式：
- Command侧: Nl2SqlController处理NL2SQL写入/转换
- Query侧: OperatorQueryController/IndicatorQueryController处理数据查询

**后果**:
| 类型 | 说明 |
|------|------|
| 正面 | 职责清晰，便于优化查询性能 |
| 负面 | 架构复杂度增加 |
| 中性 | 需要维护两套查询逻辑 |

---

### 9.3 ADR-003: Intent Detection路由策略

**标题**: 采用MiniMax M2-her LLM进行意图识别与路由

**状态**: Accepted

**日期**: 2026-04-10

**上下文**:
- 用户查询类型多样（站点数据、指标、NL2SQL）
- 需要智能路由到不同处理模块
- 运营商名称需要中英文映射

**决策**:
采用MiniMax M2-her LLM进行意图识别：
- 英文Prompt避免中文编码问题
- 支持5种意图: site_data, indicator_data, operator_list, latest_data, nl2sql
- 动态运营商映射支持模糊匹配

**后果**:
| 类型 | 说明 |
|------|------|
| 正面 | 支持复杂自然语言，扩展性强 |
| 负面 | 额外API调用延迟，依赖外部LLM |
| 中性 | 需要维护Prompt模板 |

**替代方案考虑**:
1. 关键词匹配: 简单但无法处理复杂查询
2. 规则引擎: 性能好但维护成本高

---

### 9.4 ADR-004: NL2SQL SQLCoder方案

**标题**: 采用SQLCoder自托管模型实现NL2SQL

**状态**: Accepted

**日期**: 2026-04-10

**上下文**:
- 需要将自然语言转换为SQL查询
- 数据安全要求高，不能使用外部API
- 需要严格SQL安全检查

**决策**:
采用自托管SQLCoder模型：
- 本地部署，数据不出网
- 生成SQL后必须通过isSqlSafe()检查
- 只允许SELECT语句，参数化LIMIT

**后果**:
| 类型 | 说明 |
|------|------|
| 正面 | 数据安全可控，无外部依赖 |
| 负面 | 模型效果依赖SQLCoder版本 |
| 中性 | 需要额外运维成本 |

**替代方案考虑**:
1. OpenAI GPT-4: 效果好但数据出境
2. Claude API: 效果好但数据出境
3. 自训练模型: 效果最好但成本极高

---

### 9.5 ADR-005: 前端消息格式块协议

**标题**: 采用Markdown扩展块实现结构化消息渲染

**状态**: Accepted

**日期**: 2026-04-11

**上下文**:
- Agent响应需要包含表格、图表、SQL代码等多种格式
- 需要支持流式输出
- 前端需要可靠地解析和渲染

**决策**:
采用Markdown扩展块语法（参考Reveal.js幻灯片格式）：
```
:::table
| 列1 | 列2 |
|------|------|
| 数据 | 数据 |
:::

:::chart[bar]
{"type": "bar", "data": [...]}
:::

:::sql
SELECT * FROM table_name
:::
```

**块类型定义**:

| 块类型 | 语法 | 用途 |
|--------|------|------|
| thinking | `<!-- thinking_start -->...<!-- thinking_end -->` | 思考链 |
| table | `:::table...:::` | 表格渲染 |
| chart | `:::chart[type]...:::` | 图表渲染 |
| toggle | `:::toggle[name]...[table]...[chart]...:::` | 可折叠内容 |
| steps | `:::steps...:::` | 步骤列表 |
| sql | `:::sql...:::` | SQL代码高亮 |

**后果**:
| 类型 | 说明 |
|------|------|
| 正面 | 格式扩展性强，与Markdown兼容 |
| 负面 | 需要前端解析器，存在注入风险需严格过滤 |
| 中性 | 块语法需要文档说明 |

---

## 10. 附录

### 9.1 文件结构

```
OperatorBoard/
├── src/
│   ├── agent-framework/          # Python Agent框架
│   │   └── src/agent_framework/
│   │       ├── api/              # API基类、错误处理
│   │       ├── core/             # Agent核心、类型、异常
│   │       ├── tools/            # 工具系统
│   │       ├── skills/           # 技能系统
│   │       ├── llm/              # LLM客户端
│   │       ├── rag/              # RAG加载器
│   │       │   └── loaders/      # 目录/数据库/混合加载器
│   │       └── config/           # 配置加载
│   ├── operator-agent/           # 运营商Agent
│   │   └── src/operator_agent/
│   │       ├── api/              # FastAPI端点
│   │       ├── capabilities/    # 工具、技能、RAG
│   │       └── config/           # 配置加载
│   ├── predict-agent/            # 覆盖预测Agent
│   │   └── src/predict_agent/
│   │       ├── api/              # FastAPI端点
│   │       ├── capabilities/    # 覆盖Q&A、仿真调优
│   │       └── config/          # 配置加载
│   ├── operator-service/        # Java NL2SQL服务
│   │   └── src/main/
│   │       └── java/com/operator/nl2sql/
│   │           ├── controller/   # Controller层
│   │           ├── service/      # Service层 (CQRS)
│   │           ├── repository/   # Repository层
│   │           ├── entity/       # 实体类
│   │           ├── dto/          # DTO
│   │           └── config/       # 配置类
│   └── agent-app/                # React前端
│       ├── src/
│       │   ├── components/       # React组件
│       │   ├── context/          # Context状态
│       │   ├── hooks/            # 自定义Hooks
│       │   ├── utils/            # 工具函数
│       │   └── api/              # API调用
│       └── server/               # Node代理
├── configs/                       # YAML配置
├── docs/                          # 文档
│   ├── views/                     # 架构视图
│   └── adr/                       # 架构决策记录
├── SPEC.md                        # 本文档
└── README.md                      # 项目说明
```

### 9.2 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| DB_USERNAME | MySQL用户名 | test |
| DB_PASSWORD | MySQL密码 | test |
| NL2SQL_SERVICE_URL | Java服务地址 | http://localhost:8081 |
| AUTH_AGENT_URL | 认证服务地址 | http://localhost:8084 |
| INTENT_API_KEY | Intent检测API密钥 | - |
| INTENT_LLM_ENDPOINT | Intent LLM端点 | - |
| INTENT_LLM_MODEL | Intent LLM模型 | - |
| OPERATOR_AGENT_API_KEYS | Agent API密钥列表 | - |
| ALLOWED_ORIGINS | CORS允许源 | - |

### 9.3 端口分配

| 端口 | 服务 | 说明 |
|------|------|------|
| 3000 | React Dev Server | 前端开发 |
| 8000 | Node Proxy | API代理 |
| 8080 | operator-agent | Agent服务 |
| 8081 | operator-service | NL2SQL服务 |
| 8083 | predict-agent | 覆盖预测Agent |
| 8084 | auth-agent | 用户认证、角色权限管理 |
| 3306 | MySQL | 数据库 |
| 27017 | ChromaDB | 向量存储(可选) |

### 9.4 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.3 | 2026-04-12 | 重构数据模型：规范化表结构，新增band_name字段，site_info/indicator_info/band_info表 |
| 1.2 | 2026-04-11 | 增强错误处理(Stripe+GitHub)、API参数表、响应码矩阵、数据模型约束、ADR架构决策记录 |
| 1.1 | 2026-04-11 | 更新数据格式：频段完整命名(LTE 700M)、Chart格式(空格分隔)、Toggle块结构 |
| 1.0 | 2026-04-10 | 初始版本，整合所有模块规格 |

### 9.5 相关文档

| 文档 | 路径 | 说明 |
|------|------|------|
| OpenAPI规范 | `docs/openapi.yaml` | 完整API定义（符合OpenAPI 3.0.3标准） |
| ADR-001 | `docs/adr/ADR-001-fastapi-framework.md` | FastAPI框架选择决策 |
| ADR-002 | `docs/adr/ADR-002-cqrs-architecture.md` | CQRS架构采用决策 |
| ADR-003 | `docs/adr/ADR-003-intent-detection-routing.md` | Intent Detection路由策略决策 |
| ADR-004 | `docs/adr/ADR-004-nl2sql-sqlcoder.md` | NL2SQL SQLCoder方案决策 |
| ADR-005 | `docs/adr/ADR-005-message-block-format.md` | 前端消息格式块协议决策 |

---

**文档结束**
