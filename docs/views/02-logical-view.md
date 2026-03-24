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
│   ├── schema.py          # Pydantic 配置模型
│   ├── loader.py          # YAML 配置加载器
│   └── settings.py         # Settings 单例
│
└── utils/                 # 工具函数
    └── async_utils.py     # 异步工具
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
    │   ├── agent_mcp_client.py     # AgentMCPClient
    │   └── system_data_source.py   # SystemDataSource
    │
    └── skills/            # 数据处理 Skills
        ├── operator_data_skill.py     # OperatorDataSkill
        ├── data_aggregator_skill.py   # DataAggregatorSkill
        └── report_generator_skill.py  # ReportGeneratorSkill
```

### 2.3 Operator NL2SQL Service (Java Spring Boot) - MVC+CQRS 架构

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
        ├── controller/                    # MVC Controller 层
        │   ├── Nl2SqlController.java      # NL2SQL 自然语言查询
        │   └── query/                     # CQRS Query Controllers
        │       ├── OperatorQueryController.java  # 运营商查询
        │       └── IndicatorQueryController.java # 指标查询
        │
        ├── service/                      # Service 层 (CQRS)
        │   ├── command/                   # CQRS Command Side
        │   │   └── Nl2SqlCommandService.java  # NL2SQL 命令处理
        │   └── query/                     # CQRS Query Side
        │       ├── OperatorQueryService.java  # 运营商查询服务
        │       └── IndicatorQueryService.java # 指标查询服务
        │
        ├── repository/                   # Repository 层
        │   ├── OperatorRepository.java   # MyBatis Mapper 接口
        │   └── IndicatorRepository.java # MyBatis Mapper 接口
        │
        ├── dto/
        │   ├── Nl2SqlRequest.java        # 请求 DTO
        │   └── Nl2SqlResponse.java       # 响应 DTO
        │
        ├── mapper/
        │   ├── OperatorMapper.xml        # MyBatis Mapper XML
        │   └── IndicatorMapper.xml       # MyBatis Mapper XML
        │
        └── entity/
            ├── OperatorInfo.java          # 运营商实体
            ├── SiteCellSummary.java       # 频段小区汇总实体
            └── IndicatorInfo.java         # 频段指标实体
```

### 2.4 Agent App (React Frontend)

```
src/agent-app/
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
    │   ├── ChatInput.jsx         # 输入框
    │   ├── ChatMessage.jsx       # 消息组件
    │   └── OperatorDashboard.jsx # 数据看板组件 (更新)
    │
    ├── hooks/
    │   ├── useOperatorData.js    # 运营商数据 Hook (更新)
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

### 3.4 Nl2SqlController (NL2SQL Command Controller)

```java
@RestController
@RequestMapping("/api/v1/nl2sql")
public class Nl2SqlController {

    private final Nl2SqlCommandService nl2SqlCommandService;
    private final SchemaCache schemaCache;

    // POST /api/v1/nl2sql/query - 自然语言查询
    // GET  /api/v1/nl2sql/schema - 获取 Schema
    // GET  /api/v1/nl2sql/health - 健康检查
}
```

### 3.5 OperatorQueryController (CQRS Query Controller)

```java
@RestController
@RequestMapping("/api/v1/query")
public class OperatorQueryController {

    private final OperatorQueryService operatorQueryService;

    // GET /api/v1/query/operators - 所有运营商 (可选: country, operatorName)
    // GET /api/v1/query/operators/{id} - 运营商详情
    // GET /api/v1/query/site-cells - 站点小区汇总 (可选: band, operatorId)
}
```

### 3.6 IndicatorQueryController (CQRS Query Controller)

```java
@RestController
@RequestMapping("/api/v1/query/indicators")
public class IndicatorQueryController {

    private final IndicatorQueryService indicatorQueryService;

    // GET /api/v1/query/indicators/latest - 最新指标 (可选: operatorId, band)
    // GET /api/v1/query/indicators/history - 历史指标 (可选: operatorId, band, dataMonth)
    // GET /api/v1/query/indicators/trend - 趋势数据 (必需: start, end)
}
```

### 3.7 Nl2SqlCommandService (CQRS Command Side)

```java
@Service
public class Nl2SqlCommandService {

    private final SqlCoderService sqlCoderService;
    private final SqlExecutorService sqlExecutorService;
    private final SqlCoderConfig sqlCoderConfig;

    // 生成 NL2SQL 查询
    public String generateSql(Nl2SqlRequest request);

    // 执行查询
    public List<Map<String, Object>> executeQuery(String sql, Integer maxResults);

    // SQL 安全校验
    public boolean isSqlSafe(String sql);
}
```

### 3.8 OperatorQueryService (CQRS Query Side)

```java
@Service
public class OperatorQueryService {

    private final OperatorRepository operatorRepository;

    // 按国家查询
    public List<OperatorInfo> findByCountry(String country);

    // 按运营商名称查询
    public List<OperatorInfo> findByOperatorName(String operatorName);

    // 按频段查询站点小区汇总
    public List<SiteCellSummary> findSiteCellSummaryByBand(String frequencyBand);

    // 按运营商+频段查询
    public List<SiteCellSummary> findSiteCellSummaryByOperatorAndBand(Long operatorId, String frequencyBand);
}
```

### 3.9 IndicatorQueryService (CQRS Query Side)

```java
@Service
public class IndicatorQueryService {

    private final IndicatorRepository indicatorRepository;

    // 获取最新指标数据
    public List<IndicatorInfo> findLatestIndicators(Long operatorId, String frequencyBand);

    // 获取历史指标数据 (按月份)
    public List<IndicatorInfo> findIndicatorsByMonth(Long operatorId, String frequencyBand, String dataMonth);

    // 获取时间范围内的指标
    public List<IndicatorInfo> findTrendData(Long operatorId, String frequencyBand, LocalDateTime start, LocalDateTime end);
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
│  │  /api/query/* Routes (CQRS Query APIs)                           │   │
│  │  /api/nl2sql/* Routes (NL2SQL APIs)                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       operator-agent (Python)                            │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────────────┐   │
│  │ Operator    │    │ Java         │    │ NL2SQL API Endpoints   │   │
│  │ Agent       │────│ Service      │────│ - /v1/nl2sql/query     │   │
│  │             │    │ Tool         │    │ - /v1/query/*          │   │
│  └─────────────┘    └──────────────┘    └─────────────────────────┘   │
│         │ MCP                                │
│         ▼                                     │
│  ┌─────────────┐                             │
│  │ Agent       │                             │
│  │ Registry    │                             │
│  └─────────────┘                             │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ HTTP
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  operator-nl2sql-service (Java Spring Boot)              │
│                         MVC + CQRS 架构                                  │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                      Controller Layer                              │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │  │
│  │  │ Nl2SqlController│  │OperatorQuery   │  │IndicatorQuery   │  │  │
│  │  │ (Command)       │  │Controller      │  │Controller       │  │  │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘  │  │
│  └───────────┼───────────────────┼───────────────────┼───────────┘  │
│  ┌───────────┼───────────────────┼───────────────────┼───────────┐  │
│  │           │    Service Layer (CQRS)              │           │  │
│  │  ┌────────┴────────┐  ┌────────┴────────┐  ┌──────┴──────┐   │  │
│  │  │ Nl2SqlCommand  │  │OperatorQuery   │  │IndicatorQuery│   │  │
│  │  │ Service        │  │Service         │  │Service      │   │  │
│  │  │ (Command)      │  │(Query)         │  │(Query)      │   │  │
│  │  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘   │  │
│  └───────────┼───────────────────┼───────────────────┼───────────┘  │
│  ┌───────────┼───────────────────┼───────────────────┼───────────┐  │
│  │           │    Repository Layer                       │           │  │
│  │  ┌────────┴────────────────────────┐  ┌────────────┴────────┐   │  │
│  │  │ OperatorRepository              │  │ IndicatorRepository │   │  │
│  │  │ (MyBatis)                       │  │ (MyBatis)          │   │  │
│  │  └─────────────────────────────────┘  └────────────────────┘   │  │
│  └────────────────────────────────────┬───────────────────────────┘  │
│                                       │                                │
│  ┌────────────────────────────────────┼───────────────────────────┐  │
│  │                          MySQL Database                          │  │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────────────┐│  │
│  │  │ operator_   │  │ site_        │  │ indicator_             ││  │
│  │  │ info        │  │ info         │  │ info                   ││  │
│  │  └─────────────┘  └──────────────┘  └─────────────────────────┘│  │
│  └──────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                     │ REST /v1/completions
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           SQLCoder (LLM)                                 │
│  Self-hosted at localhost:8081                                          │
│  Converts natural language to SQL                                        │
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

### 5.4 NL2SQL API 接口 (Command Side)

| 接口 | 方法 | 参数 | 描述 |
|------|------|------|------|
| /api/v1/nl2sql/query | POST | naturalLanguageQuery | 自然语言查询 |
| /api/v1/nl2sql/schema | GET | - | 获取数据库 Schema |
| /api/v1/nl2sql/health | GET | - | 健康检查 |

### 5.5 Query API 接口 (CQRS Query Side)

| 接口 | 方法 | 参数 | 描述 |
|------|------|------|------|
| /api/v1/query/operators | GET | country, operatorName | 运营商列表 |
| /api/v1/query/operators/{id} | GET | - | 运营商详情 |
| /api/v1/query/site-cells | GET | band, operatorId | 站点小区汇总 |
| /api/v1/query/indicators/latest | GET | operatorId, band | 最新指标 |
| /api/v1/query/indicators/history | GET | operatorId, band, dataMonth | 历史指标 |
| /api/v1/query/indicators/trend | GET | operatorId, band, start, end | 趋势数据 |

## 6. 设计模式

| 模式 | 应用位置 | 描述 |
|------|----------|------|
| Factory | OperatorAgentFactory | 创建 Agent 实例 |
| Singleton | ToolRegistry, SkillRegistry | 全局注册表 |
| Template Method | BaseTool, BaseSkill | 定义执行骨架 |
| Strategy | DataAggregatorSkill | 多策略聚合 |
| Builder | TelecomDocumentBuilder | 文档构建 |
| Proxy | agent-app server | API 代理转发 |
| CQRS | operator-nl2sql-service | 命令查询职责分离 |

## 7. 数据库表结构

### 7.1 operator_info (运营商信息表)

| 字段 | 类型 | 描述 |
|------|------|------|
| id | BIGINT PK | 主键 |
| operator_name | VARCHAR(100) | 运营商名称 |
| country | VARCHAR(50) | 国家名称 |
| region | VARCHAR(100) | 地区 |
| network_type | VARCHAR(50) | 网络类型 (4G/5G) |
| data_month | VARCHAR(7) | 数据月份 (YYYY-MM) |
| created_time | DATETIME | 创建时间 |
| updated_time | DATETIME | 更新时间 |

### 7.2 site_info (站点信息表 - 宽表)

每行代表一个运营商在一个月的数据，频段作为列。

| 字段 | 类型 | 描述 |
|------|------|------|
| id | BIGINT PK | 主键 |
| operator_id | BIGINT FK | 外键关联 operator_info.id |
| data_month | VARCHAR(7) | 数据月份 (YYYY-MM) |
| lte_700M_site/cell | INT | LTE 700M 站点/小区数 |
| lte_800M_site/cell | INT | LTE 800M 站点/小区数 |
| lte_900M_site/cell | INT | LTE 900M 站点/小区数 |
| lte_1400M_site/cell | INT | LTE 1400M 站点/小区数 |
| lte_1800M_site/cell | INT | LTE 1800M 站点/小区数 |
| lte_2100M_site/cell | INT | LTE 2100M 站点/小区数 |
| lte_2600M_site/cell | INT | LTE 2600M 站点/小区数 |
| nr_700M_site/cell | INT | NR 700M 站点/小区数 |
| nr_800M_site/cell | INT | NR 800M 站点/小区数 |
| nr_900M_site/cell | INT | NR 900M 站点/小区数 |
| nr_1400M_site/cell | INT | NR 1400M 站点/小区数 |
| nr_1800M_site/cell | INT | NR 1800M 站点/小区数 |
| nr_2100M_site/cell | INT | NR 2100M 站点/小区数 |
| nr_2600M_site/cell | INT | NR 2600M 站点/小区数 |
| nr_3500M_site/cell | INT | NR 3500M 站点/小区数 |
| nr_4900M_site/cell | INT | NR 4900M 站点/小区数 |
| nr_2300M_site/cell | INT | NR 2300M 站点/小区数 |
| lte_total_site/cell | INT (Generated) | LTE 站点/小区总数 |
| nr_total_site/cell | INT (Generated) | NR 站点/小区总数 |
| created_time | DATETIME | 创建时间 |
| updated_time | DATETIME | 更新时间 |

**唯一索引**: `uk_operator_month (operator_id, data_month)`

### 7.3 indicator_info (指标信息表 - 宽表)

每行代表一个运营商在一个月的数据，频段指标作为列。

| 字段 | 类型 | 描述 |
|------|------|------|
| id | BIGINT PK | 主键 |
| operator_id | BIGINT FK | 外键关联 operator_info.id |
| data_month | VARCHAR(7) | 数据月份 (YYYY-MM) |
| lte_XXX_dl_rate/ul_rate | DECIMAL(10,2) | LTE 各频段下行/上行速率 (Mbps) |
| lte_XXX_dl_prb/ul_prb | DECIMAL(5,2) | LTE 各频段下行/上行 PRB 利用率 (%) |
| nr_XXX_dl_rate/ul_rate | DECIMAL(10,2) | NR 各频段下行/上行速率 (Mbps) |
| nr_XXX_dl_prb/ul_prb | DECIMAL(5,2) | NR 各频段下行/上行 PRB 利用率 (%) |
| lte_avg_dl_rate/prb | DECIMAL | LTE 平均下行速率/PRB 利用率 |
| nr_avg_dl_rate/prb | DECIMAL | NR 平均下行速率/PRB 利用率 |
| split_ratio | DECIMAL(5,2) | 分流比 (%) |
| dwell_ratio | DECIMAL(5,2) | 驻留比 (%) |
| terminal_penetration | DECIMAL(5,2) | 终端渗透率 (%) |
| duration_dwell_ratio | DECIMAL(5,2) | 时长驻留比 (%) |
| fallback_ratio | DECIMAL(5,2) | 回流比 (%) |
| created_time | DATETIME | 创建时间 |
| updated_time | DATETIME | 更新时间 |

**唯一索引**: `uk_operator_month (operator_id, data_month)`
