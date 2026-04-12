# 架构深度分析

本文档提供 OperatorBoard 系统各组件的深度技术分析。

## 目录

1. [系统架构概览](#1-系统架构概览)
2. [agent-framework 分析](#2-agent-framework-分析)
3. [operator-agent 分析](#3-operator-agent-分析)
4. [operator-service 分析](#4-operator-service-分析)
5. [agent-app 分析](#5-agent-app-分析)
6. [关键技术债](#6-关键技术债)
7. [重构完成状态](#7-重构完成状态)

---

## 1. 系统架构概览

### 1.1 高层架构

```
┌─────────────────────────────────────────────────────────────────┐
│                         agent-app                                │
│                    (React + Node.js Proxy)                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP/SSE
┌─────────────────────────▼───────────────────────────────────────┐
│                      operator-agent                              │
│                  (Python FastAPI + LangChain)                    │
│  ┌─────────────┬─────────────┬─────────────┬─────────────────┐  │
│  │   Tools     │   Skills    │    RAG      │   MCP Client    │  │
│  └─────────────┴─────────────┴─────────────┴─────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP/REST
┌─────────────────────────▼───────────────────────────────────────┐
│                     operator-service                             │
│               (Java Spring Boot + MyBatis)                      │
│  ┌──────────────────┬──────────────────┬──────────────────────┐  │
│  │  Command (CQRS)  │  Query (CQRS)    │  SqlCoder LLM       │  │
│  │  Nl2SqlController│  QueryController │  Integration         │  │
│  └──────────────────┴──────────────────┴──────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ SQL
┌─────────────────────────▼───────────────────────────────────────┐
│                         MySQL                                    │
│              (operator_info, site_info, indicator_info)           │
└─────────────────────────────────────────────────────────────────┘
                          ▲
                          │
              ┌───────────▼───────────┐
              │     SQLCoder LLM       │
              │   (Self-hosted Model)   │
              └────────────────────────┘
```

### 1.2 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| agent-framework | Python 3.10+, LangChain | 核心 Agent 框架 |
| operator-agent | Python 3.10+, FastAPI, httpx | 业务 Agent + REST API |
| operator-service | Java 17, Spring Boot 3.2, MyBatis | NL2SQL 服务 |
| agent-app | React 18, Vite, Recharts, Node.js | 前端 + 代理服务器 |
| Database | MySQL 8.0, HikariCP | 关系型数据库 |
| LLM | SQLCoder (Self-hosted) | 自然语言转 SQL |

### 1.3 数据流

```
用户: "查询北京联通最新指标"
    ↓
React ChatContainer → useAgentStream
    ↓
Node Proxy Server (/api/agent/stream)
    ↓
operator-agent (/api/agent/run)
    ↓
LLM Intent Detection
    ├─ intent: "indicator_data"
    ├─ operator_name: "中国联通"
    └─ limit: 50
    ↓
Java NL2SQL Service (/api/v1/query/indicators/latest)
    ↓
SqlCoderService → SQLCoder LLM → 生成 SQL
    ↓
SqlExecutorService → MySQL 执行
    ↓
结果返回 → Markdown 格式化
    ↓
SSE 流式响应 → 前端渲染
```

---

## 2. agent-framework 分析

### 2.1 核心架构

```
BaseAgent
├── _tools: Dict[str, BaseTool]          # 工具注册表
├── _skills: Dict[str, BaseSkill]        # 技能注册表
├── _rag_retriever: Optional[RAGRetriever] # RAG 检索
└── config: AgentConfig                   # Pydantic 配置验证
```

### 2.2 工具系统

**继承链:**
```
LangChain BaseTool
    ↓
BaseTool
    ├── name: str
    ├── description: str
    ├── enabled: bool = True
    ├── config: Dict[str, Any]
    ├── async ainvoke(tool_input) → str   # 主入口
    └── async _arun(tool_input) → Any    # 可覆盖

AsyncTool (extends BaseTool)
    └── async _arun(tool_input) → Any    # 抽象实现
```

**ToolRegistry (单例 + 双检锁):**
```python
class ToolRegistry:
    _instance: Optional["ToolRegistry"] = None
    _lock = threading.Lock()
    _tools: Dict[str, Type[BaseTool]]       # 类注册
    _instances: Dict[str, BaseTool]          # 实例注册
```

### 2.3 技能系统

**生命周期:**
```
load_skill → validate → execute → cleanup (finally 块)
```

**执行模式:**
| 模式 | 方法 | 说明 |
|------|------|------|
| 单次 | `execute()` | 单技能执行 |
| 并行 | `execute_many()` | `asyncio.gather` 并发 |
| 链式 | `execute_chain()` | 顺序执行，结果链式传递 |

**SkillContext:**
```python
class SkillContext(BaseModel):
    skill_name: str
    input_data: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
```

### 2.4 RAG 实现

**RAGRetriever:**
```python
class RAGRetriever:
    _vector_manager: VectorStoreManager   # 后端抽象
    _default_store: str = "default"       # 多存储支持
    _default_k: int = 5                   # 默认结果数
    _transformers: List[callable]         # 后处理管道
```

**支持的向量存储:**
- Chroma (持久化)
- FAISS (内存)

**检索方法:**
- `retrieve(query, k, score_threshold)` - 带分数的相似性搜索
- `retrieve_by_documents()` - 以文本文档为查询
- `get_relevant_documents()` - LangChain 兼容接口

**语料加载器 (RAG Loaders):**

| 组件 | 说明 |
|------|------|
| `BaseLoader` | 语料加载器抽象基类 |
| `DirectoryLoader` | 目录扫描，支持 txt/md/json/csv/pdf/docx，自动分块 |
| `DatabaseLoader` | MySQL 查询，支持刷新间隔和行转换函数 |
| `HybridLoader` | 组合多加载器，支持权重配置和去重 |
| `DocumentLoaderManager` | 统一加载器管理，支持 YAML 配置 |

**VectorStoreManager 扩展方法:**
- `create_from_loader()`: 从加载器创建向量存储
- `create_hybrid()`: 从多加载器创建混合向量存储
- `add_loader_documents()`: 从加载器添加文档

### 2.5 MCP 协议

**JSON-RPC 2.0 实现:**
```python
class MCPMessageType(str, Enum):
    REQUEST = "request"       # 需要响应
    RESPONSE = "response"     # 响应
    NOTIFICATION = "notification"  # 通知
    ERROR = "error"          # 错误

class MCPRequest(BaseModel):
    jsonrpc: Literal["2.0"] = "2.0"
    id: str
    method: str
    params: Optional[Dict[str, Any]] = None
```

> 注意: 仅实现序列化层，传输层 (HTTP/WebSocket) 未在此模块实现。

### 2.6 设计模式

| 模式 | 实现 | 用途 |
|------|------|------|
| 单例 | `ToolRegistry` 双检锁 | 全局注册表 |
| 工厂 | `create_instance()` | 延迟实例化 |
| 模板方法 | `BaseTool._arun` | 可扩展行为 |
| 职责链 | `SkillExecutor.execute_chain()` | 技能管道 |
| 策略 | Document transformers | 可插拔后处理 |
| 协议 | `@runtime_checkable` | 运行时类型检查 |

---

## 3. operator-agent 分析

### 3.1 组件结构

```
operator-agent
├── operator_agent.py           # 主 Agent 类
├── api/
│   ├── server.py              # FastAPI 服务
│   └── auth.py               # API 认证
├── capabilities/
│   ├── tools/
│   │   ├── java_service_tool.py    # Java 服务调用
│   │   └── http_tool.py            # HTTP 服务调用
│   ├── skills/
│   │   ├── operator_data_skill.py  # 数据获取
│   │   ├── data_aggregator_skill.py # 数据聚合
│   │   └── report_generator_skill.py # 报告生成
│   └── mcp/
│       └── agent_mcp_client.py     # MCP 客户端
└── config/
    └── operator_config.py           # 配置加载
```

### 3.2 JavaMicroserviceTool

**核心功能:**
```python
class JavaMicroserviceTool(BaseTool):
    name: str = "java_microservice"
    description: str = "Call Java Spring Boot microservice APIs"
```

| 特性 | 实现 |
|------|------|
| URL 构建 | `base_url + api_prefix + endpoint` |
| 路径参数 | 支持 `/users/{id}` 替换 |
| API Key | 可选 `X-API-Key` header |
| 异步 HTTP | `httpx.AsyncClient` 60s 超时 |
| 批量调用 | `batch_call()` 并发执行 |

### 3.3 LLM 意图检测

**流程:**
```
process_natural_language_query()
    ↓
构造 Prompt (中文系统提示)
    ↓
POST 到 SQLCoder LLM
    ↓
解析 JSON 输出
```

**输出结构:**
```json
{
    "intent": "site_data | indicator_data | operator_list | latest_data | nl2sql",
    "operator_name": "中国联通",
    "band": "lte800M",
    "data_month": "2026-03",
    "limit": 50
}
```

**运营商名称映射:**
- "北京联通", "上海联通", "广州联通" → "中国联通"
- "北京移动", "上海移动" → "中国移动"
- "北京电信", "上海电信" → "中国电信"

### 3.4 技能实现

| 技能 | 职责 | 支持的操作 |
|------|------|------------|
| `OperatorDataSkill` | 数据获取 | network, subscriber, billing, service |
| `DataAggregatorSkill` | 数据聚合 | merge, sum, avg, compare |
| `ReportGeneratorSkill` | 报告生成 | JSON, Markdown, HTML, CSV, Text |

### 3.5 FastAPI 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/capabilities` | GET | Agent 能力列表 |
| `/api/agent/run` | POST | LLM 意图检测 + 执行 |
| `/api/operator/nl2sql/query` | POST | NL2SQL 查询 |
| `/api/operator/indicators/latest` | POST | 最新指标 |
| `/api/operator/indicators/compare` | POST | 指标对比 |
| `/api/operator/indicators/trend` | POST | 指标趋势 |
| `/api/operator/times` | POST | 可用时间点 |
| `/api/operator/site-cells` | POST | 站点小区汇总 |

---

## 4. operator-service 分析

### 4.1 CQRS 实现

```
命令端 (Command):
┌─────────────────────┐
│  Nl2SqlController   │
│  POST /api/v1/nl2sql│
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Nl2SqlCommandService│
│ - generateSql()      │
│ - executeQuery()     │
└──────────┬──────────┘
           ↓
    ┌──────┴──────┐
    ↓             ↓
SqlCoder     SqlExecutor
Service       Service

查询端 (Query):
┌─────────────────────────┐
│ OperatorQueryController │
│ GET /api/v1/query/*     │
└──────────┬──────────────┘
           ↓
┌─────────────────────────┐
│ OperatorQueryService    │
│ (预定义安全查询)         │
└─────────────────────────┘
```

### 4.2 SqlCoderService LLM 集成

```java
public String generateSql(Nl2SqlRequest request) {
    // 1. 输入清理
    String sanitizedQuery = promptSanitizer.sanitize(nlQuery);

    // 2. Prompt 构建
    String prompt = buildPrompt(sanitizedQuery, request);

    // 3. LLM 调用
    Map<String, Object> requestBody = Map.of(
        "prompt", prompt,
        "max_tokens", 500,
        "temperature", 0.1
    );

    String response = webClient.post()
        .uri("/v1/completions")
        .bodyValue(requestBody)
        .retrieve()
        .bodyToMono(String.class)
        .timeout(Duration.ofSeconds(sqlCoderConfig.getTimeout()))
        .block();

    return parseSqlFromResponse(response);
}
```

**Prompt 模板:**
```
You are a MySQL expert. Convert the following natural language query to SQL.

Database Schema:
{schemaContext}

{additionalContext}
Natural Language Query: {nlQuery}

Requirements:
- Only generate SELECT statements (no INSERT, UPDATE, DELETE, DROP, TRUNCATE)
- Use proper MySQL syntax
- Add LIMIT clause to prevent excessive results (default 1000)

Generated SQL:
```

### 4.3 SqlExecutorService 安全执行

```java
public List<Map<String, Object>> execute(String sql, Integer maxResults) {
    // 防御层 1: 静态分析
    if (!isSqlReadOnly(sql)) {
        throw new IllegalArgumentException("Only SELECT statements are allowed");
    }

    // 防御层 2: MyBatis 参数化 LIMIT
    Map<String, Object> params = new HashMap<>();
    params.put("sql", sql);
    params.put("limit", maxResults != null ? maxResults : 1000);
    return session.selectList("nl2sql.safe.executeWithLimit", params);
}

private boolean isSqlReadOnly(String sql) {
    String trimmed = sql.trim().toUpperCase();
    if (!trimmed.startsWith("SELECT")) return false;
    // 检查危险关键词
    String[] dangerous = {"DROP", "DELETE", "INSERT", "UPDATE",
                          "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE"};
    for (String pattern : dangerous) {
        if (trimmed.contains(pattern)) return false;
    }
    return true;
}
```

### 4.4 PromptSanitizer

```java
@Service
public class PromptSanitizer {
    // 注入模式检测
    private static final Pattern[] INJECTION_PATTERNS = {
        Pattern.compile("(?i)ignore\\s+previous\\s+instructions?"),
        Pattern.compile("(?i)you\\s+are\\s+now\\s+"),
        Pattern.compile("(?i)'\\s*;?\\s*drop\\s+table"),
        // ...
    };

    // 指示器白名单
    private static final Set<String> ALLOWED_INDICATORS = Set.of(
        "dl_rate", "ul_rate", "prb_usage", "split_ratio",
        "lte700M", "nr3500M", // ...
    );
}
```

### 4.5 数据库 Schema

**星型模型设计:**

| 表 | 主键 | 类型 | 说明 |
|----|------|------|------|
| `operator_info` | id | 维度表 | 运营商信息 |
| `band_info` | id | 维度表 | 频段信息 (21个频段) |
| `site_info` | id | 事实表 | 站点数据 (按运营商/频段/月) |
| `indicator_info` | id | 事实表 | 指标数据 (按运营商/频段/月) |
| `operator_total_site` | id | 聚合表 | 运营商月度站点汇总 |

**site_info 事实表字段:**
- id, operator_id, band_id, band_name, data_month, site_num, cell_num, technology

**indicator_info 事实表字段:**
- id, operator_id, band_id, band_name, data_month, technology, dl_prb, ul_prb, dl_rate, ul_rate, traffic, users, etc.

**band_info 频段列表:**
- LTE: LTE700M_FDD, LTE800M_FDD, LTE900M_FDD, LTE1400M_FDD, LTE1800M_FDD, LTE2100M_FDD, LTE2300M_FDD, LTE2300M_TDD, LTE2600M_FDD, LTE2600M_TDD
- NR: NR700M_FDD, NR800M_FDD, NR900M_FDD, NR1400M_FDD, NR1800M_FDD, NR2100M_FDD, NR2300M_FDD, NR2300M_TDD, NR2600M_FDD, NR2600M_TDD, NR3500M_TDD, NR4900M_TDD

---

## 5. agent-app 分析

### 5.1 应用结构

```jsx
App.jsx
├── useState('chat' | 'dashboard')  // 视图切换
├── Header (导航)
└── (view === 'chat')
    ? ChatContainer
    : OperatorDashboard
```

### 5.2 仪表盘数据流

```
useEffect(on mount)
    └─→ fetchOperators()

useEffect(on operatorId)
    ├─→ fetchSiteCells()
    ├─→ fetchLatestIndicators()
    └─→ fetchHistoryIndicators()
```

**图表类型 (Recharts):**
| 图表 | 用途 | 数据结构 |
|------|------|----------|
| 堆叠柱状图 | 频段小区数 | `{name, "4G小区", "5G小区", "小区总数"}` |
| 分组柱状图 | 速率对比 | `{name, "下行速率", "上行速率"}` |
| 饼图 | 小区分布 | `{name, value}` |

### 5.3 流式处理

```javascript
// useAgentStream.js
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    // 解析 SSE: data: <payload>
}
```

**SSE 协议:**
| 标记 | 处理 |
|------|------|
| `data: [DONE]` | 调用 `onComplete()` |
| `data: [AUTO_CONFIRM]` | 100ms 后自动确认 |
| `data: {"content": "..."}` | 调用 `onMessage()` |

### 5.4 Node 代理路由

```
/api/agent/stream      → operator-agent (主端点)
/api/agent/capabilities → operator-agent
/api/query/*           → NL2SQL Service (查询端)
/api/nl2sql/*          → NL2SQL Service (命令端)
```

---

## 6. 关键技术债

### 6.1 高优先级

| 问题 | 组件 | 影响 |
|------|------|------|
| 意图检测硬编码 | operator-agent | 无法适应复杂查询模式 |
| Java 服务无认证 | operator-service | 依赖 operator-agent 防护 |
| 无缓存层 | operator-service | 重复 Schema 获取 |

### 6.2 中优先级

| 问题 | 组件 | 影响 |
|------|------|------|
| `block()` 阻塞响应式 | SqlCoderService | 响应式优势丧失 |
| SchemaCache 无刷新 | operator-service | 运行时 Schema 变更不支持 |
| 前端无 error boundary | agent-app | API 错误显示空白状态 |
| 流式无重试机制 | useAgentStream | 连接中断无恢复 |

### 6.3 低优先级

| 问题 | 组件 | 影响 |
|------|------|------|
| MCP 传输层未实现 | agent-framework | 仅 JSON-RPC 序列化 |
| 共享 CSS 文件名 | agent-app | Dashboard.css 被 Chat 使用 |
| 单一 loading 状态 | agent-app | 并行请求共享状态 |
| 消息 complete 标志过早设置 | ChatContainer | 思考指示器过早消失 |

### 6.4 架构优化建议

1. **意图检测**: 考虑使用 ML 分类器或决策树替代硬编码 prompt
2. **认证**: 为 Java 服务添加 JWT 或 API Key 认证
3. **缓存**: 引入 Redis 缓存 Schema 和频繁查询结果
4. **响应式**: 将 `block()` 改为真正的响应式链式调用
5. **前端**: 添加 Error Boundary 和请求重试机制
6. **Schema**: 添加运行时 Schema 刷新端点

---

## 7. 重构完成状态

### 7.1 已完成重构

#### Phase 1: 高优先级 (安全 & 可靠性)

| 任务 | 状态 | 实现方式 |
|------|------|----------|
| Java 服务 API Key 认证 | ✅ 已完成 | Spring Security + ApiKeyAuthFilter，默认禁用 |
| 意图检测模板外部化 | ✅ 已完成 | `configs/intent_detection.yaml` + `configs/tools.yaml` |
| Schema 缓存刷新机制 | ✅ 已完成 | `@Scheduled` cron + `AtomicReference` 线程安全刷新 |

#### Phase 2: 中优先级 (性能 & UX)

| 任务 | 状态 | 实现方式 |
|------|------|----------|
| 消除 Reactive Block | ✅ 已完成 | `SqlCoderService.generateSqlAsync()` 返回 `Mono<String>` |
| 前端 Error Boundary | ✅ 已完成 | `ErrorBoundary.jsx` 组件 + App.jsx 集成 |
| 流式重试机制 | ✅ 已完成 | `useAgentStream.js` 指数退避 + `isRetryableError()` |

#### Phase 3: 低优先级 (代码质量)

| 任务 | 状态 | 实现方式 |
|------|------|----------|
| CSS 样式分离 | ✅ 已完成 | 共享样式移至 `index.css`，Dashboard.css 仅保留看板样式 |
| 独立请求 Loading 状态 | ✅ 已完成 | `loadingKeys: Set<string>` 替代单一 `loading: boolean` |

### 7.2 待完成项

| 任务 | 优先级 | 说明 |
|------|--------|------|
| - | - | 所有计划任务已完成 |

### 7.3 MCP 传输层实现

**PlantUML Diagram:** [06-mcp-transport.puml](../diagrams/06-mcp-transport.puml)

![MCP Transport](../diagrams/06-mcp-transport.png)

**新增文件:**
- `agent-framework/src/agent_framework/mcp/transport/http.py` - HTTP 传输层
- `agent-framework/src/agent_framework/mcp/transport/websocket.py` - WebSocket 传输层
- `agent-framework/src/agent_framework/mcp/transport/__init__.py` - 传输层模块

**传输类型:**

| 传输类型 | 实现类 | 说明 |
|----------|--------|------|
| HTTP | `HTTPTransport`, `HTTPTransportClient` | FastAPI-based JSON-RPC |
| WebSocket | `WebSocketTransport`, `WebSocketServer` | 双向流式通信 |
| Stdio | `StdioTransport` | 子进程 stdin/stdout |

**HTTP 端点:**
```
POST /mcp     - JSON-RPC 请求/响应
GET  /health  - 健康检查
WS   /ws/{id} - WebSocket  streaming
```

**依赖:** `fastapi`, `uvicorn`, `websockets`

### 7.4 配置说明

**Java 服务安全配置 (application.yml):**
```yaml
nl2sql:
  security:
    enabled: false  # 默认禁用，向后兼容
    api-keys: ${NL2SQL_API_KEYS:}  # 逗号分隔的 API Key 列表
```

**意图检测配置 (intent_detection.yaml):**
```yaml
intent_detection:
  enabled: true
  llm_endpoint: "http://localhost:8081/v1/completions"
  prompt_template: |  # 模板已外部化
    你是一个电信运营商数据查询助手...
```

**Schema 刷新配置 (application.yml):**
```yaml
nl2sql:
  schema:
    refresh-enabled: false  # 默认禁用
    refresh-cron: "0 0 * * * *"  # 每小时刷新
```

### 7.5 重构验证

```bash
# Java 编译
cd operator-service && mvn compile

# Python 语法检查
python -m py_compile operator-agent/src/operator_agent/operator_agent.py

# 前端构建
cd agent-app && npm run build
```

**手动测试清单:**
- [ ] 无 API Key 访问 Java 服务 (security.enabled=true) 应返回 401
- [ ] 意图检测配置变更 (intent_detection.yaml) 生效
- [ ] Schema 刷新定时任务执行 (refresh-enabled=true)
- [ ] 前端错误显示 Error Boundary 友好界面
- [ ] SSE 断开后自动重试 (3 次指数退避)
