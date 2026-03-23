# 逻辑视图 (Logical View)

## 1. 概述

逻辑视图描述系统的功能结构和主要组件设计。

## 2. 包结构

### 2.1 Agent Framework (核心框架)

```
agent_framework/
├── core/                    # 核心抽象
│   ├── agent.py           # BaseAgent 抽象类
│   ├── types.py           # 核心类型定义 (Tool, Skill, AgentConfig)
│   └── exceptions.py       # 异常类层次
│
├── tools/                  # 工具系统
│   ├── base.py            # BaseTool 抽象类
│   ├── registry.py        # ToolRegistry 单例
│   └── manager.py         # ToolManager
│
├── skills/                # Skills 系统
│   ├── base.py            # BaseSkill 抽象类
│   ├── registry.py        # SkillRegistry 单例
│   └── executor.py        # SkillExecutor
│
├── mcp/                   # MCP 协议系统
│   ├── protocol.py        # MCP 协议实现
│   ├── client.py          # MCPClient
│   └── server.py          # MCPServerConnection, MCPServerManager
│
├── rag/                   # RAG 系统
│   ├── embeddings.py      # EmbeddingsManager
│   ├── vectorstore.py     # VectorStoreManager
│   └── retriever.py       # RAGRetriever
│
├── config/               # 配置系统
│   ├── schema.py         # Pydantic 配置模型
│   ├── loader.py         # YAML 配置加载器
│   └── settings.py        # Settings 单例
│
└── utils/               # 工具函数
    └── async_utils.py    # 异步工具
```

### 2.2 Operator Agent (业务实现)

```
operator_agent/
├── operator_agent.py     # OperatorAgent 主类
├── api/
│   └── server.py         # FastAPI 服务（NL2SQL 端点）
├── config/
│   └── operator_config.py # 配置加载器
│
└── capabilities/         # 能力模块
    ├── tools/            # Java 微服务调用
    │   ├── http_tool.py          # HTTPServiceTool
    │   └── java_service_tool.py  # JavaMicroserviceTool
    │
    ├── rag/              # 电信仿真 RAG
    │   ├── telecom_vectorstore.py  # TelecomVectorStore
    │   └── telecom_retriever.py    # TelecomRAGRetriever
    │
    ├── mcp/              # Agent/系统数据获取
    │   ├── agent_mcp_client.py    # AgentMCPClient
    │   └── system_data_source.py  # SystemDataSource
    │
    └── skills/            # 数据处理 Skills
        ├── operator_data_skill.py    # OperatorDataSkill
        ├── data_aggregator_skill.py  # DataAggregatorSkill
        └── report_generator_skill.py # ReportGeneratorSkill
```

### 2.3 Operator NL2SQL Service (Java Spring Boot)

```
operator-nl2sql-service/
├── pom.xml
│
└── src/main/
    └── java/com/operator/nl2sql/
        ├── Nl2SqlApplication.java       # Spring Boot 主类
        │
        ├── config/
        │   ├── SqlCoderConfig.java       # SQLCoder LLM 配置
        │   └── SchemaCache.java          # 数据库 Schema 缓存
        │
        ├── controller/
        │   └── Nl2SqlController.java     # REST API 控制器
        │
        ├── dto/
        │   ├── Nl2SqlRequest.java        # 请求 DTO
        │   └── Nl2SqlResponse.java       # 响应 DTO
        │
        ├── service/
        │   ├── Nl2SqlService.java         # 核心 NL2SQL 服务
        │   ├── SqlCoderService.java       # SQLCoder LLM 调用
        │   └── SqlExecutorService.java     # SQL 执行服务
        │
        ├── mapper/
        │   └── RawQueryMapper.xml        # MyBatis Mapper
        │
        └── entity/
            ├── OperatorInfo.java          # 运营商实体
            ├── SiteInfo.java              # 基站实体
            └── IndicatorInfo.java         # 指标实体
```

### 2.4 Agent App (React Frontend)

```
agent-app/
├── package.json
├── vite.config.js
├── index.html
│
├── server/
│   └── index.js              # Node.js API 代理服务
│
└── src/
    ├── App.jsx               # 主应用组件
    ├── main.jsx              # React 入口
    │
    ├── components/
    │   ├── ChatContainer.jsx     # 对话容器
    │   ├── ChatInput.jsx        # 输入框
    │   ├── ChatMessage.jsx      # 消息组件
    │   └── OperatorDashboard.jsx # 数据看板组件
    │
    ├── hooks/
    │   ├── useOperatorData.js    # 运营商数据 Hook
    │   └── useAgentStream.js     # Agent 流式响应 Hook
    │
    ├── styles/
    │   ├── index.css            # 全局样式
    │   ├── Dashboard.css         # 看板样式
    │   ├── ChatContainer.css
    │   ├── ChatInput.css
    │   └── ChatMessage.css
    │
    └── utils/
        └── api.js               # API 工具函数
```

## 3. 核心类设计

### 3.1 BaseAgent (核心抽象)

```python
class BaseAgent(ABC):
    """Agent 基类，定义核心接口"""

    # 配置
    config: AgentConfig
    _tools: Dict[str, BaseTool]
    _skills: Dict[str, BaseSkill]
    _rag_retriever: Optional[RAGRetriever]

    # 核心方法
    async def run(self, input: str) -> str
    async def add_tool(self, tool: BaseTool) -> None
    async def add_skill(self, skill: BaseSkill) -> None
    async def search_rag(self, query: str) -> List[Document]
```

### 3.2 BaseTool (工具基类)

```python
class BaseTool(LangChainBaseTool):
    """工具基类，扩展 LangChain BaseTool"""

    name: str
    description: str
    enabled: bool
    config: Dict[str, Any]

    async def ainvoke(self, tool_input: dict) -> str
    async def run(self, tool_input: dict) -> Any
```

### 3.3 BaseSkill (Skill 基类)

```python
class BaseSkill(ABC):
    """Skill 基类"""

    name: str
    description: str
    enabled: bool
    config: Dict[str, Any]

    async def execute(self, context: SkillContext) -> Any
    async def validate(self, context: SkillContext) -> bool
```

### 3.4 Nl2SqlController (Java REST 控制器)

```java
@RestController
@RequestMapping("/api/v1/nl2sql")
public class Nl2SqlController {

    private final Nl2SqlService nl2SqlService;

    // POST /api/v1/nl2sql/query - 自然语言查询
    // GET  /api/v1/nl2sql/indicators - 指标查询
    // GET  /api/v1/nl2sql/indicators/latest - 最新指标
    // GET  /api/v1/nl2sql/indicators/compare - 月份对比
    // GET  /api/v1/nl2sql/indicators/trend - 趋势数据
    // GET  /api/v1/nl2sql/times - 可用时间点
    // GET  /api/v1/nl2sql/schema - 获取 Schema
    // GET  /api/v1/nl2sql/health - 健康检查
}
```

### 3.5 Nl2SqlService (Java 核心服务)

```java
@Service
public class Nl2SqlService {

    private final SqlCoderService sqlCoderService;
    private final SqlExecutorService sqlExecutorService;
    private final SqlCoderConfig sqlCoderConfig;
    private final SchemaCache schemaCache;

    // 核心方法
    public Nl2SqlResponse executeQuery(Nl2SqlRequest request);
    public List<Map<String, Object>> getLatestIndicators(...);
    public Nl2SqlResponse compareIndicatorsByMonth(...);
    public List<Map<String, Object>> getTrendData(...);
    public List<Map<String, Object>> getAvailableTimes(...);

    // SQL 安全验证
    private boolean isSqlSafe(String sql);
}
```

## 4. 模块依赖关系

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         agent-app (React Frontend)                      │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────┐   │
│  │ Operator    │    │ Chat        │    │ Recharts Charts       │   │
│  │ Dashboard   │    │ Container   │    │ (Line/Bar/Pie)        │   │
│  └─────────────┘    └─────────────┘    └─────────────────────────┘   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP JSON
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     agent-app Server (Node.js)                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              /api/operator/* Routes (API Proxy)                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ FastAPI
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       operator-agent (Python)                            │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────┐   │
│  │ Operator    │    │ Java         │    │ NL2SQL API Endpoints   │   │
│  │ Agent       │────│ Service      │────│ - /indicators/latest   │   │
│  │             │    │ Tool         │    │ - /indicators/compare  │   │
│  └─────────────┘    └──────────────┘    │ - /indicators/trend    │   │
│         │ MCP                                │ - /times               │   │
│         ▼                                     └─────────────────────────┘   │
│  ┌─────────────┐                                                     │
│  │ Agent       │                                                     │
│  │ Registry    │                                                     │
│  └─────────────┘                                                     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  operator-nl2sql-service (Java Spring Boot)              │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────┐   │
│  │ NL2SQL      │    │ SQLCoder     │    │ SQL Executor           │   │
│  │ Controller  │────│ Service      │───▶│ (MyBatis + MySQL)      │   │
│  └─────────────┘    └──────────────┘    └─────────────────────────┘   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ REST /v1/completions
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SQLCoder (LLM)                                 │
│  Self-hosted at localhost:8081                                          │
│  Converts natural language to SQL                                        │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ SQL Query
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           MySQL Database                                │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────┐   │
│  │ operator_   │    │ site_       │    │ indicator_            │   │
│  │ info        │    │ info        │    │ info                  │   │
│  └─────────────┘    └──────────────┘    └─────────────────────────┘   │
│                                                                          │
│  Tables:                                                                │
│  - operator_info: id, operator_name, region, network_type, created_at  │
│  - site_info: id, operator_id, site_name, site_code, band, ...         │
│  - indicator_info: cell_id, dl_rate, ul_rate, prb_usage, ...            │
└─────────────────────────────────────────────────────────────────────────┘
```

## 5. 接口设计

### 5.1 工具接口

| 接口 | 方法 | 描述 |
|------|------|------|
| BaseTool | ainvoke(input) | 异步调用工具 |
| HTTPServiceTool | run(input) | HTTP 请求执行 |
| JavaMicroserviceTool | call_endpoint(endpoint, **kwargs) | Java 服务调用 |

### 5.2 Skill 接口

| 接口 | 方法 | 描述 |
|------|------|------|
| BaseSkill | execute(context) | 执行 Skill |
| SkillContext | input_data, metadata | 上下文数据 |
| SkillResult | success, output, error | 执行结果 |

### 5.3 RAG 接口

| 接口 | 方法 | 描述 |
|------|------|------|
| RAGRetriever | retrieve(query, k) | 检索文档 |
| TelecomRAGRetriever | retrieve_protocol_info(query) | 协议检索 |
| VectorStoreManager | add_documents(store, docs) | 添加文档 |

### 5.4 NL2SQL API 接口

| 接口 | 方法 | 参数 | 描述 |
|------|------|------|------|
| /api/v1/nl2sql/query | POST | naturalLanguageQuery | 自然语言查询 |
| /api/v1/nl2sql/indicators | GET | operatorName, dataTime, limit | 指标查询 |
| /api/v1/nl2sql/indicators/latest | GET | operatorName, frequencyBands, limit | 最新指标 |
| /api/v1/nl2sql/indicators/compare | GET | operatorName, currentMonth, compareMonth | 月份对比 |
| /api/v1/nl2sql/indicators/trend | GET | operatorName, startTime, endTime, cellId | 趋势数据 |
| /api/v1/nl2sql/times | GET | operatorName, siteCode | 可用时间点 |
| /api/v1/nl2sql/schema | GET | - | 获取数据库 Schema |
| /api/v1/nl2sql/health | GET | - | 健康检查 |

## 6. 设计模式

| 模式 | 应用位置 | 描述 |
|------|----------|------|
| Factory | OperatorAgentFactory | 创建 Agent 实例 |
| Singleton | ToolRegistry, SkillRegistry | 全局注册表 |
| Template Method | BaseTool, BaseSkill | 定义执行骨架 |
| Strategy | DataAggregatorSkill | 多策略聚合 |
| Builder | TelecomDocumentBuilder | 文档构建 |
| Proxy | agent-app server | API 代理转发 |

## 7. 数据库表结构

### 7.1 operator_info (运营商信息表)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | BIGINT PK | 主键 |
| operator_name | VARCHAR(100) | 运营商名称 |
| region | VARCHAR(100) | 地区 |
| network_type | VARCHAR(50) | 网络类型 (4G/5G) |
| created_at | DATETIME | 创建时间 |

### 7.2 site_info (基站信息表)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | BIGINT PK | 主键 |
| operator_id | BIGINT FK | 外键关联 operator_info.id |
| site_name | VARCHAR(200) | 基站名称 |
| site_code | VARCHAR(100) | 基站编码(唯一) |
| longitude | DECIMAL(10,6) | 经度 |
| latitude | DECIMAL(10,6) | 纬度 |
| band | VARCHAR(50) | 频段 (700MHz/2.6GHz/3.5GHz) |
| created_at | DATETIME | 创建时间 |

### 7.3 indicator_info (指标信息表)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | BIGINT PK | 主键 |
| site_id | BIGINT FK | 外键关联 site_info.id |
| cell_id | VARCHAR(100) | 小区ID |
| cell_name | VARCHAR(200) | 小区名称 |
| frequency_band | VARCHAR(50) | 频段 |
| dl_rate | DECIMAL(10,2) | 下行速率 (Mbps) |
| ul_rate | DECIMAL(10,2) | 上行速率 (Mbps) |
| prb_usage | DECIMAL(5,2) | PRB利用率 (%) |
| split_ratio | DECIMAL(5,2) | 分流比 (%) |
| main_ratio | DECIMAL(5,2) | 主流比 (%) |
| data_time | DATETIME | 数据时间 |
| created_at | DATETIME | 创建时间 |
