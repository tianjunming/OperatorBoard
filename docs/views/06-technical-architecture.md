# 技术架构与选型文档

## 1. 概述

本文档描述整个系统的技术架构设计和选型决策，包括各组件的技术栈选择理由。

## 2. 系统架构总览

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           用户层 (User Layer)                            │
│                    Web Browser / Mobile Client                          │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       前端层 (Frontend Layer)                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐ │
│  │   React 18      │  │  Recharts       │  │    Lucide React       │ │
│  │   UI Framework  │  │  Data Viz      │  │    Icons              │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘ │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    Vite + Node.js Server                          │  │
│  │              (开发服务器 + API 代理 + CQRS 路由)                   │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ HTTP/REST
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       应用层 (Application Layer)                        │
│                                                                          │
│  ┌─────────────────────────────────┐  ┌───────────────────────────────┐ │
│  │     operator-agent (Python)     │  │  operator-nl2sql-service    │ │
│  │  ┌───────────────────────────┐  │  │     (Java Spring Boot)      │ │
│  │  │      FastAPI Server      │  │  │  ┌─────────────────────────┐│  │
│  │  │      (Agent + Tools)    │  │  │  │   MVC + CQRS 架构       ││  │
│  │  └───────────────────────────┘  │  │  │  ┌───────────────────┐ ││  │
│  │  ┌───────────────────────────┐  │  │  │  │ Controller Layer │ ││  │
│  │  │     OperatorAgent        │  │  │  │  │ - Nl2SqlController│ ││  │
│  │  │    (LangChain Based)     │  │  │  │  │ - OperatorQuery  │ ││  │
│  │  └───────────────────────────┘  │  │  │  │ - IndicatorQuery │ ││  │
│  │  ┌───────────────────────────┐  │  │  │  └───────────────────┘ ││  │
│  │  │    JavaMicroserviceTool  │  │  │  │  ┌───────────────────┐ ││  │
│  │  │    (HTTP Client)         │  │  │  │  │  Service Layer    │ ││  │
│  │  └───────────────────────────┘  │  │  │  │  (CQRS)           │ ││  │
│  └─────────────────────────────────┘  │  │  │  ┌───────────────┐ │ ││  │
│                                       │  │  │  │Command:      │ │ ││  │
│                                       │  │  │  │ Nl2SqlCommand│ │ ││  │
│                                       │  │  │  └───────────────┘ │ ││  │
│                                       │  │  │  ┌───────────────┐ │ ││  │
│                                       │  │  │  │Query:        │ │ ││  │
│                                       │  │  │  │OperatorQuery │ │ ││  │
│                                       │  │  │  │IndicatorQuery │ │ ││  │
│                                       │  │  │  └───────────────┘ │ ││  │
│                                       │  │  └───────────────────┘ ││  │
│                                       │  │  ┌───────────────────┐ ││  │
│                                       │  │  │ Repository Layer  │ ││  │
│                                       │  │  │ - OperatorRepo    │ ││  │
│                                       │  │  │ - IndicatorRepo   │ ││  │
│                                       │  │  └───────────────────┘ ││  │
│                                       │  └─────────────────────────┘│  │
│                                       │  ┌─────────────────────────┐│  │
│                                       │  │  SQLCoder + MyBatis     ││  │
│                                       │  └─────────────────────────┘│  │
│                                       └───────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        数据层 (Data Layer)                               │
│                                                                          │
│  ┌───────────────────┐  ┌───────────────────┐  ┌─────────────────────┐ │
│  │   SQLCoder LLM    │  │    MySQL 8.0     │  │   ChromaDB         │ │
│  │  (Self-hosted)    │  │   (Primary DB)   │  │   (Vector Store)    │ │
│  │  localhost:8081   │  │   localhost:3306  │  │                     │ │
│  └───────────────────┘  └───────────────────┘  └─────────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## 3. 技术选型

### 3.1 前端技术栈

| 组件 | 技术选型 | 版本 | 选择理由 |
|------|----------|------|----------|
| UI Framework | React | 18.2 | 生态成熟，组件丰富，社区活跃 |
| Build Tool | Vite | 5.0 | 极速开发体验，ESM 原生支持 |
| Charts | Recharts | 2.10 | React 原生，声明式 API，主题支持好 |
| Icons | Lucide React | 0.294 | SVG 图标，轻量易定制 |
| HTTP Client | Fetch API | - | 浏览器原生，无需额外依赖 |
| State | React Hooks | - | 够用且简洁 |

**备选方案考虑**:
- **Chart.js**: 更成熟但 React 绑定不够原生
- **Ant Design**: 功能完整但体积较大
- **ECharts**: 性能好但配置复杂

### 3.2 后端技术栈 (operator-agent)

| 组件 | 技术选型 | 版本 | 选择理由 |
|------|----------|------|----------|
| Language | Python | 3.10+ | AI/ML 生态首选，异步支持好 |
| Web Framework | FastAPI | 0.100+ | 异步优先，类型安全，自动文档 |
| HTTP Client | httpx | 0.24+ | 异步 HTTP，兼容 requests API |
| Agent Framework | LangChain | 0.3+ | Agent 能力抽象，工具集成 |
| Config | Pydantic + YAML | - | 配置验证，类型安全 |
| Server | Uvicorn | 0.23+ | ASGI 高性能服务器 |

**备选方案考虑**:
- **Django**: 过于重量级
- **Flask**: 异步支持不够原生
- **LangChain Agent**: 自主开发更灵活

### 3.3 NL2SQL 服务技术栈 (operator-nl2sql-service)

| 组件 | 技术选型 | 版本 | 选择理由 |
|------|----------|------|----------|
| Language | Java | 17 | 企业级，稳定，性能好 |
| Framework | Spring Boot | 3.2 | 生态完整，配置简便 |
| Architecture | MVC + CQRS | - | 命令查询职责分离，清晰可维护 |
| ORM | MyBatis | 3.0 | SQL 控制灵活，复杂查询支持好 |
| DB | MySQL | 8.0 | 运营商场景成熟方案 |
| HTTP Client | WebClient | - | Spring WebFlux 异步客户端 |
| LLM | SQLCoder | - | 自托管 NL2SQL 模型，隐私安全 |
| Connection Pool | HikariCP | - | Spring Boot 默认，高性能 |

**CQRS 架构优势**:
- **职责分离**: Command (NL2SQL) 和 Query (数据查询) 解耦
- **性能优化**: Query 端可直接映射数据库实体，减少转换开销
- **可维护性**: 逻辑清晰，领域边界明确
- **扩展性**: 独立扩展 Command 和 Query 端

**备选方案考虑**:
- **Spring Data JPA**: 适合简单 CRUD，复杂 SQL 不够灵活
- **MyBatis-Flex**: 更现代但社区较小
- **GPT-4 API**: 成本高，延迟大

### 3.4 数据库选型

| 数据库 | 用途 | 选择理由 |
|--------|------|----------|
| MySQL 8.0 | 运营商指标数据 | 关系型，SQL 支持好，运营商场景成熟 |
| ChromaDB | 电信知识向量存储 | 轻量，部署简单，LangChain 集成好 |

**备选方案考虑**:
- **PostgreSQL**: 更现代但运营商场景 MySQL 更普遍
- **Pinecone**: 云服务，有成本
- **Milvus**: 功能强但部署复杂

### 3.5 RAG 语料加载器

agent-framework 新增 RAG 语料加载器模块，支持从多种数据源加载语料:

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| DirectoryLoader | Python | 递归扫描目录，支持 txt/md/json/csv/pdf/docx，自动分块 |
| DatabaseLoader | mysql-connector-python | MySQL 查询，支持刷新间隔和行转换函数 |
| HybridLoader | Python | 组合多加载器，支持权重配置和去重 |
| DocumentLoaderManager | Python + YAML | 统一管理器，支持 YAML 配置加载 |

**VectorStoreManager 扩展方法**:
- `create_from_loader()`: 从加载器创建向量存储
- `create_hybrid()`: 从多加载器创建混合向量存储
- `add_loader_documents()`: 从加载器添加文档

**依赖更新**:
- `pypdf>=4.0.0` - PDF 解析
- `docx2txt>=0.8` - DOCX 解析
- `mysql-connector-python>=8.0.0` - MySQL 连接

## 4. NL2SQL 实现方案

### 4.1 方案对比

| 方案 | 准确率 | 成本 | 延迟 | 隐私 | 推荐 |
|------|--------|------|------|------|------|
| OpenAI GPT-4 | 高 | 高 | 中 | 低 | 中 |
| Claude API | 高 | 中 | 中 | 低 | 中 |
| SQLCoder 自托管 | 高 | 低 | 低 | 高 | **推荐** |
| 规则匹配 | 低 | 低 | 低 | 高 | 不推荐 |

### 4.2 SQLCoder 集成架构

```
┌─────────────────────────────────────────────────────────┐
│                  Nl2SqlCommandService                    │
│                      (CQRS Command)                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │  1. 构建 Prompt (Schema + Natural Language)     │    │
│  └─────────────────────────────────────────────────┘    │
│                         │                               │
│                         ▼                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │  2. 调用 SQLCoder API (/v1/completions)        │    │
│  │     POST { prompt, max_tokens, temperature }    │    │
│  └─────────────────────────────────────────────────┘    │
│                         │                               │
│                         ▼                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │  3. 解析 SQL 从响应                             │    │
│  └─────────────────────────────────────────────────┘    │
│                         │                               │
│                         ▼                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │  4. SQL 安全验证 (SELECT only)                   │    │
│  └─────────────────────────────────────────────────┘    │
│                         │                               │
│                         ▼                               │
│  ┌─────────────────────────────────────────────────┐    │
│  │  5. MyBatis 执行查询                            │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### 4.3 SQL 安全策略

```java
private boolean isSqlSafe(String sql) {
    // 1. 必须以 SELECT 开头
    if (!sql.trim().toUpperCase().startsWith("SELECT")) {
        return false;
    }

    // 2. 禁止危险关键词
    String[] dangerous = {
        "DROP", "DELETE", "INSERT", "UPDATE",
        "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE"
    };

    for (String keyword : dangerous) {
        if (sql.toUpperCase().contains(keyword)) {
            return false;
        }
    }

    return true;
}
```

## 5. CQRS 架构设计

### 5.1 Controller 层

```
┌─────────────────────────────────────────────────────────────┐
│                    Controller Layer                           │
│                                                              │
│  ┌─────────────────┐  ┌──────────────────────────┐          │
│  │ Nl2SqlController│  │ OperatorQueryController  │          │
│  │                 │  │                          │          │
│  │ POST /nl2sql/   │  │ GET  /query/operators    │          │
│  │      query      │  │ GET  /query/operators/{id}          │
│  │                 │  │ GET  /query/site-summary │          │
│  │ (Command Side)  │  │                          │          │
│  └─────────────────┘  │ (Query Side)            │          │
│                       └──────────────────────────┘          │
│                       ┌──────────────────────────┐          │
│                       │IndicatorQueryController  │          │
│                       │                          │          │
│                       │ GET  /query/indicators  │          │
│                       │ GET  /query/indicators/ │          │
│                       │      latest             │          │
│                       │ GET  /query/indicators/ │          │
│                       │      trend               │          │
│                       │                          │          │
│                       │ (Query Side)            │          │
│                       └──────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Service 层

```
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer (CQRS)                      │
│                                                              │
│  ┌─────────────────────────┐  ┌───────────────────────────┐  │
│  │ Nl2SqlCommandService   │  │ OperatorQueryService     │  │
│  │ (Command Side)          │  │ (Query Side)             │  │
│  │                         │  │                           │  │
│  │ - generateSql()         │  │ - findAllOperators()     │  │
│  │ - executeQuery()        │  │ - findByCountry()        │  │
│  │ - isSqlSafe()           │  │ - findByOperatorName()   │  │
│  │                         │  │ - findSiteCellSummary()  │  │
│  │ + SqlBuilder便捷方法     │  │                           │  │
│  └─────────────────────────┘  └───────────────────────────┘  │
│  ┌─────────────────────────┐  ┌───────────────────────────┐  │
│  │ SqlCoderService         │  │ IndicatorQueryService    │  │
│  │                         │  │ (Query Side)             │  │
│  │ - generateSql()         │  │                          │  │
│  │ - parseResponse()        │  │ - findLatestIndicators() │  │
│  │                         │  │ - findIndicatorsByMonth() │  │
│  └─────────────────────────┘  │ - findTrendData()         │  │
│                               └───────────────────────────┘  │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │              SqlBuilder Factory                         │  │
│  │  ┌───────────────────┐  ┌───────────────────────────┐    │  │
│  │  │OperatorSqlBuilder │  │ IndicatorSqlBuilder     │    │  │
│  │  │                   │  │                          │    │  │
│  │  │- buildAllOperators│  │- buildSelectSql()        │    │  │
│  │  │- buildSiteSummary │  │- buildByOperatorId()    │    │  │
│  │  │- buildByBand()   │  │- buildLatestForAll()     │    │  │
│  │  │                   │  │- buildTrendByOperatorId │    │  │
│  │  └───────────────────┘  └──────────────────────────┘    │  │
│  └─────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Repository 层

```
┌─────────────────────────────────────────────────────────────┐
│                    Repository Layer                          │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              OperatorRepository                      │    │
│  │              (MyBatis Mapper)                       │    │
│  │                                                       │    │
│  │ SQL:                                                  │    │
│  │ - findAll() → SELECT * FROM operator_info           │    │
│  │ - findByCountry(country)                            │    │
│  │ - findByOperatorName(name)                          │    │
│  │ - findSiteCellSummaryByOperatorId(id)               │    │
│  │ - findSiteCellSummaryByOperatorIdAndMonth(id, month)│    │
│  │ - findAllSiteCellSummary()                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              IndicatorRepository                     │    │
│  │              (MyBatis Mapper)                      │    │
│  │                                                       │    │
│  │ SQL:                                                  │    │
│  │ - findAll()                                          │    │
│  │ - findLatestIndicators(operatorId)                  │    │
│  │ - findIndicatorsByOperatorId(operatorId)            │    │
│  │ - findIndicatorsByOperatorIdAndMonth(id, month)     │    │
│  │ - findTrendData(operatorId)                         │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 6. 数据模型设计

### 6.1 核心实体

| 实体 | 说明 | 关键字段 |
|------|------|----------|
| OperatorInfo | 运营商维度表 | id, operator_code, operator_name, country, region, network_type, status |
| BandInfo | 频段维度表 | id, band_code, band_name, technology, frequency_mhz, duplex_mode, band_group |
| SiteInfo | 站点事实表 | id, operator_id, band_id, band_name, data_month, site_num, cell_num, technology |
| IndicatorInfo | 指标事实表 | id, operator_id, band_id, band_name, data_month, technology, dl_prb, ul_prb, dl_rate, ul_rate, traffic, users |
| OperatorTotalSite | 站点聚合表 | id, operator_id, data_month, technology, nr/lte_physical_site_num, nr/lte_physical_cell_num, total_site_num, total_cell_num |

### 6.2 指标体系 (宽表设计)

采用宽表设计，每行代表 1 个运营商 × 1 个月的数据，列按频段展开。

**LTE 频段 (7个)**: 700M, 800M, 900M, 1400M, 1800M, 2100M, 2600M
**NR 频段 (10个)**: 700M, 800M, 900M, 1400M, 1800M, 2100M, 2600M, 3500M, 4900M, 2300M

| 指标类型 | 字段模式 | 单位 | 说明 |
|----------|----------|------|------|
| LTE速率 | lte{band}DlRate, lte{band}UlRate | Mbps | LTE 各频段上下行速率 |
| LTE资源 | lte{band}DlPrb, lte{band}UlPrb | % | LTE 各频段 PRB 利用率 |
| NR速率 | nr{band}DlRate, nr{band}UlRate | Mbps | NR 各频段上下行速率 |
| NR资源 | nr{band}DlPrb, nr{band}UlPrb | % | NR 各频段 PRB 利用率 |
| LTE汇总 | lteAvgDlRate, lteAvgPrb | % | LTE 全网平均速率/PRB |
| NR汇总 | nrAvgDlRate, nrAvgPrb | % | NR 全网平均速率/PRB |
| 分流指标 | splitRatio, dwellRatio | % | 分流比, 驻留比 |
| 终端指标 | terminalPenetration, durationDwellRatio | % | 终端渗透率, 时长驻留比 |
| 回流指标 | fallbackRatio | % | 回流比 (原 return_ratio) |

**变更说明**:
- 采用宽表设计，每个频段独立列，避免行扩展
- 每行 = 1 运营商 × 1 月份
- 支持多频段对比分析

## 7. 部署架构

### 7.1 开发环境

```
┌─────────────────────────────────────────┐
│           Developer Workstation          │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │         Docker Compose            │  │
│  │  ┌─────────┐  ┌───────────────┐  │  │
│  │  │ MySQL   │  │   SQLCoder    │  │  │
│  │  │  :3306  │  │    :8081     │  │  │
│  │  └─────────┘  └───────────────┘  │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Terminal 1: npm run start:all (agent-app)  │
│  Terminal 2: mvn spring-boot:run (NL2SQL)   │
│  Terminal 3: python -m operator_agent       │
└─────────────────────────────────────────┘
```

### 7.2 生产环境建议

```
┌─────────────────────────────────────────────────────────┐
│                    Load Balancer                        │
│                     (Nginx)                            │
└────────────────────────┬──────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│   Frontend      │ │   Frontend      │ │   Frontend      │
│   (Static)      │ │   (Static)      │ │   (Static)      │
│   CDN           │ │   CDN           │ │   CDN           │
└─────────────────┘ └─────────────────┘ └─────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   API Gateway / Load Balancer           │
└────────────────────────┬──────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  operator-agent │ │  operator-agent │ │  operator-agent │
│    Instance 1   │ │    Instance 2   │ │    Instance N   │
│    (Python)     │ │    (Python)     │ │    (Python)     │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                     │
         ▼                    ▼                     ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  NL2SQL Service │ │  NL2SQL Service │ │  NL2SQL Service │
│    Instance 1   │ │    Instance 2   │ │    Instance N   │
│    (Java)       │ │    (Java)       │ │    (Java)       │
│    (MVC+CQRS)   │ │    (MVC+CQRS)   │ │    (MVC+CQRS)   │
└────────┬────────┘ └────────┬────────┘ └────────┬────────┘
         │                    │                     │
         └────────────────────┼────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                     │
         ▼                    ▼                     ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│     MySQL       │ │     MySQL       │ │    SQLCoder     │
│   Primary       │ │   Replica       │ │    Cluster      │
│    :3306        │ │    :3307        │ │    :8081        │
└─────────────────┘ └─────────────────┘ └─────────────────┘
```

## 8. API 端点汇总

### 8.1 NL2SQL API (Command Side)

| 端点 | 方法 | 描述 |
|------|------|------|
| /api/v1/nl2sql/query | POST | 自然语言转 SQL 查询 |
| /api/v1/nl2sql/schema | GET | 获取数据库 Schema |
| /api/v1/nl2sql/health | GET | 健康检查 |

### 8.2 Query API (CQRS Query Side)

| 端点 | 方法 | 参数 | 描述 |
|------|------|------|------|
| /api/v1/query/operators | GET | country, operatorName | 运营商列表 |
| /api/v1/query/operators/{id} | GET | - | 运营商详情 |
| /api/v1/query/site-summary | GET | operatorId, dataMonth | 站点汇总 (宽表) |
| /api/v1/query/indicators | GET | operatorId, dataMonth | 指标列表 (宽表) |
| /api/v1/query/indicators/latest | GET | operatorId | 最新指标 |
| /api/v1/query/indicators/trend | GET | operatorId | 趋势数据 |

## 9. 性能考量

### 9.1 前端性能

| 优化项 | 方案 | 预期收益 |
|--------|------|----------|
| 首屏加载 | Vite 预构建 | < 1s |
| 图表渲染 | 虚拟化大数据集 | 支持 10k+ 数据点 |
| API 请求 | 请求缓存 + 防抖 | 减少 50% 请求 |

### 9.2 后端性能

| 优化项 | 方案 | 预期收益 |
|--------|------|----------|
| 数据库连接 | HikariCP 连接池 | 100+ 并发 |
| SQLCoder 缓存 | Schema 内存缓存 | 减少 30% 延迟 |
| 异步处理 | WebClient 非阻塞 | 1000+ 并发 |

### 9.3 CQRS 性能优势

| 优化点 | 优势 |
|--------|------|
| 直接映射 | Query 端直接映射数据库实体，减少 DTO 转换 |
| 宽表设计 | site_cell_summary 和 indicator_info 采用宽表，每行=1运营商×1月份，减少 JOIN |
| 索引优化 | 支持 (operator_id, data_month) 联合索引 |
| 查询分离 | Command 和 Query 可独立优化 |
| SQL Builder | SQL 构建逻辑独立，便于优化和维护 |

## 10. 安全考量

### 10.1 SQL 注入防护

- 所有用户输入通过参数化查询
- NL2SQL 结果必须经过安全验证
- 数据库账号权限最小化

### 10.2 API 安全

- CORS 配置限制
- 请求频率限制（可选）
- 输入验证（必选）

### 10.3 数据安全

- SQLCoder 本地部署，数据不出网
- 数据库敏感字段加密
- 审计日志记录

## 11. 可扩展性设计

### 11.1 新增频段

1. 在 `band_info` 表添加新频段记录
2. 更新 `SchemaCache` 的 schema 描述
3. 更新 `IndicatorSqlBuilder` / `OperatorSqlBuilder` 的频段常量
4. 前端自动识别并支持展示

### 11.2 新增 LLM Provider

```java
public interface LlmProvider {
    String generateSql(String prompt);
}

// 实现示例
@Component
public class OpenAiProvider implements LlmProvider { ... }

@Component
public class SqlCoderProvider implements LlmProvider { ... }
```

### 11.3 新增图表类型

在 `OperatorDashboard.jsx` 中添加 Recharts 组件即可。

## 12. 技术债务与改进建议

| 优先级 | 项目 | 说明 |
|--------|------|------|
| P0 | 单元测试覆盖 | 当前缺少测试 |
| P1 | API 鉴权 | 生产环境需要 |
| P1 | 请求限流 | 防止滥用 |
| P2 | 监控告警 | 生产必备 |
| P2 | 日志聚合 | 问题排查 |

## 13. 总结

本系统采用前后端分离架构，后端使用 Python (Agent) + Java (NL2SQL+CQRS) 的混合方案:

- **Python**: AI/ML 生态成熟，适合 Agent 开发
- **Java**: 企业级稳定，性能优异，适合数据服务
- **MVC+CQRS**: 命令查询职责分离，架构清晰
- **React + Recharts**: 现代化前端，数据可视化能力强

NL2SQL 采用 SQLCoder 自托管方案，平衡了准确率、成本和隐私要求。

数据模型采用宽表设计，每行代表 1 个运营商 × 1 个月的数据，列按 LTE/NR 频段展开:
- **LTE**: 7 个频段 (700M-2600M)
- **NR**: 10 个频段 (700M-4900M, 2300M)
- **汇总指标**: 分流比、驻留比、终端渗透率、时长驻留比、回流比

SQL Builder 模式将 SQL 构建逻辑从 Service 层分离，便于维护和优化。
