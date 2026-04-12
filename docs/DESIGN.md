# OperatorBoard 系统设计文档

**文档版本**: 1.0
**编制日期**: 2026-04-12
**项目代号**: OperatorBoard
**文档状态**: 正式版
**架构标准**: 4+1 View Architecture | ISO/IEC/IEEE 42010

---

## 目录

- [1. 概述](#1-概述)
- [2. 场景视图 (Scenario View)](#2-场景视图-scenario-view)
- [3. 逻辑视图 (Logical View)](#3-逻辑视图-logical-view)
- [4. 进程视图 (Process View)](#4-进程视图-process-view)
- [5. 部署视图 (Deployment View)](#5-部署视图-deployment-view)
- [6. 开发视图 (Development View)](#6-开发视图-development-view)
- [7. 技术架构 (Technical Architecture)](#7-技术架构-technical-architecture)
- [8. 测试规格 (Testing Specification)](#8-测试规格-testing-specification)
- [附录](#附录)

---

## 1. 概述

### 1.1 项目背景

OperatorBoard 是电信运营商数据管理平台，基于多 Agent 架构和 NL2SQL 能力构建。系统允许用户通过自然语言查询运营商站点小区数据和指标数据，降低数据分析的技术门槛。

### 1.2 系统架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              用户层 (User Layer)                              │
│                        Web Browser / Mobile Client                            │
└─────────────────────────────────┬───────────────────────────────────────────────┘
                                  │
                                  ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                            前端层 (Frontend Layer)                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌───────────────────────────────┐ │
│  │     React 18     │  │    Recharts     │  │      Lucide React           │ │
│  │  UI Framework    │  │   Data Viz      │  │       Icons                 │ │
│  └─────────────────┘  └─────────────────┘  └───────────────────────────────┘ │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                  Vite + Node.js Server (API Proxy + CQRS Routing)       │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────┬───────────────────────────────────────────────┘
                                  │ HTTP/SSE
                                  ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                           应用层 (Application Layer)                           │
│                                                                               │
│  ┌───────────────────────────────────┐  ┌───────────────────────────────────┐ │
│  │       operator-agent (Python)      │  │     operator-nl2sql-service   │ │
│  │  ┌─────────────────────────────┐   │  │         (Java Spring Boot)      │ │
│  │  │     FastAPI Server         │   │  │  ┌─────────────────────────────┐│ │
│  │  │     (Agent + Tools)        │   │  │  │   MVC + CQRS Architecture   ││ │
│  │  └─────────────────────────────┘   │  │  │  ┌─────────────────────────┐ ││ │
│  │  ┌─────────────────────────────┐   │  │  │  │  Controller Layer      │ ││ │
│  │  │      OperatorAgent          │   │  │  │  │  - Nl2SqlController    │ ││ │
│  │  │     (LangChain Based)       │   │  │  │  │  - OperatorQuery       │ ││ │
│  │  └─────────────────────────────┘   │  │  │  │  - IndicatorQuery       │ ││ │
│  │  ┌─────────────────────────────┐   │  │  │  └─────────────────────────┘ ││ │
│  │  │    JavaMicroserviceTool     │   │  │  │  ┌─────────────────────────┐ ││ │
│  │  │     (HTTP Client)          │   │  │  │  │  Service Layer (CQRS)  │ ││ │
│  │  └─────────────────────────────┘   │  │  │  │  Command: Nl2SqlCommand │ ││ │
│  │  ┌─────────────────────────────┐   │  │  │  │  Query: OperatorQuery   │ ││ │
│  │  │         Skills              │   │  │  │  │         IndicatorQuery  │ ││ │
│  │  │   - OperatorDataSkill       │   │  │  │  └─────────────────────────┘ ││ │
│  │  │   - DataAggregatorSkill     │   │  │  │  ┌─────────────────────────┐ ││ │
│  │  │   - ReportGeneratorSkill    │   │  │  │  │  Repository Layer       │ ││ │
│  │  └─────────────────────────────┘   │  │  │  │  - OperatorRepo         │ ││ │
│  │  ┌─────────────────────────────┐   │  │  │  │  - IndicatorRepo        │ ││ │
│  │  │          RAG                │   │  │  │  └─────────────────────────┘ ││ │
│  │  │   - VectorStoreManager      │   │  │  └─────────────────────────────┘│ │
│  │  │   - ChromaDB Integration    │   │  │  ┌─────────────────────────────┐│ │
│  │  └─────────────────────────────┘   │  │  │  │  SQLCoder + MyBatis       ││ │
│  │  ┌─────────────────────────────┐   │  │  └─────────────────────────────┘│ │
│  │  │         MCP Client           │   │  └───────────────────────────────────┘ │
│  │  └─────────────────────────────┘   │                                        │
│  └───────────────────────────────────┘                                        │
└─────────────────────────────────┬───────────────────────────────────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
              ▼                   ▼                   ▼
┌─────────────────────────┐ ┌─────────────────┐ ┌─────────────────────────┐
│      MySQL 8.0          │ │   SQLCoder LLM  │ │      ChromaDB           │
│    (Primary DB)         │ │  (Self-hosted)   │ │    (Vector Store)       │
│    localhost:3306       │ │  localhost:8081  │ │                         │
└─────────────────────────┘ └─────────────────┘ └─────────────────────────┘
```

### 1.3 技术栈总览

| 组件 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 前端 | React + Vite | 18.2 / 5.0 | UI 框架 + 构建工具 |
| 前端图表 | Recharts | 2.10 | 数据可视化 |
| 前端图标 | Lucide React | 0.294 | SVG 图标库 |
| Python Agent | Python + FastAPI | 3.10+ / 0.100+ | Agent 框架 + API 服务 |
| Python HTTP | httpx | 0.24+ | 异步 HTTP 客户端 |
| Agent 框架 | LangChain | 0.3+ | Agent 能力抽象 |
| Java NL2SQL | Java + Spring Boot | 17 / 3.2 | 企业级数据服务 |
| ORM | MyBatis | 3.0 | SQL 控制灵活 |
| 数据库 | MySQL | 8.0 | 关系型数据库 |
| 连接池 | HikariCP | - | 高性能连接池 |
| NL2SQL | SQLCoder | - | 自托管 LLM |
| 向量存储 | ChromaDB | - | 轻量向量数据库 |

### 1.4 核心设计原则

1. **CQRS 架构**: Command (NL2SQL) 与 Query (数据查询) 职责分离
2. **异步优先**: Python asyncio + Java WebFlux 响应式编程
3. **安全第一**: SQL 安全验证、API Key 认证、Prompt 注入防护
4. **可观测性**: 结构化日志、监控指标、Trace 录制

---

## 2. 场景视图 (Scenario View)

### 2.1 用户角色

| 角色 | 描述 | 权限范围 |
|------|------|----------|
| 数据分析师 | 查询和分析运营商数据 | 指标查询、趋势分析、导出报告 |
| 运维人员 | 监控站点状态 | 站点数据、实时指标 |
| 管理人员 | 查看经营数据 | 数据分析、报告生成 |

### 2.2 核心用例

#### UC-1: 自然语言数据查询

| 属性 | 描述 |
|------|------|
| 用例 ID | UC-1 |
| 用例名称 | 自然语言数据查询 |
| 参与者 | 数据分析师 |
| 前置条件 | 用户已登录系统 |
| 基本流程 | 1. 用户输入自然语言查询<br>2. 系统进行意图检测<br>3. 系统调用 NL2SQL 服务<br>4. 返回查询结果 |
| 备选流程 | 意图检测失败：提示用户重新输入<br>NL2SQL 执行失败：显示错误信息 |
| 后置条件 | 查询结果以表格或图表形式展示 |

**查询示例：**

| 用户输入 | 识别的意图 | 路由 |
|----------|-----------|------|
| "查询北京联通最新指标" | indicator_data | Query API |
| "显示上海电信的站点汇总" | site_data | Query API |
| "有哪些运营商" | operator_list | Query API |
| "最新的数据是什么时候" | latest_data | Query API |
| "联通的5G小区有多少" | nl2sql | NL2SQL Command |

#### UC-2: 指标趋势分析

| 属性 | 描述 |
|------|------|
| 用例 ID | UC-2 |
| 用例名称 | 指标趋势分析 |
| 参与者 | 数据分析师、管理人员 |
| 前置条件 | 用户已登录系统，存在历史数据 |
| 基本流程 | 1. 用户选择运营商和时间范围<br>2. 系统获取趋势数据<br>3. 以图表形式展示趋势 |

#### UC-3: 站点小区管理

| 属性 | 描述 |
|------|------|
| 用例 ID | UC-3 |
| 用例名称 | 站点小区管理 |
| 参与者 | 运维人员 |
| 前置条件 | 用户已登录系统 |
| 基本流程 | 1. 用户选择运营商和月份<br>2. 系统获取站点小区汇总<br>3. 以堆叠柱状图展示 |

#### UC-4: 指标对比分析

| 属性 | 描述 |
|------|------|
| 用例 ID | UC-4 |
| 用例名称 | 指标对比分析 |
| 参与者 | 数据分析师、管理人员 |
| 前置条件 | 用户已登录系统 |
| 基本流程 | 1. 用户选择多个运营商<br>2. 系统获取指标数据<br>3. 以分组柱状图展示对比 |

### 2.3 领域场景

#### 场景 1: 日常数据查询

```
场景: 数据分析师小王需要查看上周北京联通的指标趋势
─────────────────────────────────────────────────────────────
用户: "查询北京联通最近3个月的指标趋势"

系统处理:
1. 意图检测 → { intent: "indicator_data", operator_name: "中国联通", data_month: "2026-01~2026-03" }
2. 调用 Query API → /api/v1/query/indicators/trend?operator_id=174
3. 返回趋势数据 → { months: ["2026-01", "2026-02", "2026-03"], indicators: [...] }
4. 前端渲染 → 折线图展示趋势
```

#### 场景 2: 站点数据查询

```
场景: 运维人员需要了解上海电信的站点分布情况
─────────────────────────────────────────────────────────────
用户: "上海电信有多少个站点和小区"

系统处理:
1. 意图检测 → { intent: "site_data", operator_name: "中国电信" }
2. 调用 Query API → /api/v1/query/site-summary?operator_id=172
3. 返回汇总数据 → { lte_site: 100, nr_site: 50, lte_cell: 500, nr_cell: 200 }
4. 前端渲染 → 堆叠柱状图 + 饼图
```

#### 场景 3: 自定义 NL2SQL 查询

```
场景: 用户需要用自然语言查询复杂统计数据
─────────────────────────────────────────────────────────────
用户: "北京联通5G小区中，下行速率最高的前10个频段是哪些"

系统处理:
1. 意图检测 → { intent: "nl2sql" }
2. 调用 NL2SQL Command API → /api/v1/nl2sql/query
3. SQLCoder 生成 SQL → SELECT band_name, dl_rate FROM indicator_info WHERE ...
4. 执行 SQL 并返回结果
```

### 2.4 用户界面结构

```
┌─────────────────────────────────────────────────────────────────┐
│  Header                                                          │
│  ┌─────────────┬───────────────────────────────────┬──────────┐ │
│  │ Logo        │  OperatorBoard                    │ User     │ │
│  └─────────────┴───────────────────────────────────┴──────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  Tab: [聊天] [看板]                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Chat View (聊天视图)                      │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │ MessageList (消息列表)                                  │ │ │
│  │  │  ┌────────────────────────────────────────────────────┐ │ │ │
│  │  │  │ MessageItem (用户消息)                            │ │ │ │
│  │  │  └────────────────────────────────────────────────────┘ │ │ │
│  │  │  ┌────────────────────────────────────────────────────┐ │ │ │
│  │  │  │ MessageItem (Agent 响应 - SQL 块可复制)          │ │ │ │
│  │  │  └────────────────────────────────────────────────────┘ │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │ ChatInput (输入框 + 命令面板)                          │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  Dashboard View (看板视图)                    │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │ OperatorSelector (运营商选择器)                         │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │ MonthSelector (月份选择器: 2020-01 ~ 2030-12)           │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │  ┌─────────────────────┐ ┌─────────────────────────────────┐ │ │
│  │  │ SiteCellChart      │ │ IndicatorChart                   │ │ │
│  │  │ (站点小区堆叠图)     │ │ (指标分组柱状图)                 │ │ │
│  │  └─────────────────────┘ └─────────────────────────────────┘ │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │ IndicatorTable (指标数据表格 - 空值显示"--")            │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 逻辑视图 (Logical View)

### 3.1 包结构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           代码组织结构                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  D--claude-OperatorBoard/                                                   │
│  ├── src/                                                                   │
│  │   ├── agent-framework/         # 核心框架 (Python)                        │
│  │   │   ├── pyproject.toml                                              │
│  │   │   ├── configs/                                                       │
│  │   │   │   └── rag_loaders.yaml   # RAG 语料加载器配置                     │
│  │   │   └── agent_framework/                                               │
│  │   │       ├── __init__.py                                              │
│  │   │       ├── api/                  # API 模块                          │
│  │   │       │   ├── __init__.py                                              │
│  │   │       │   ├── server.py           # BaseAgentServer (FastAPI 基类)   │
│  │   │       │   ├── errors.py           # ErrorCode, AgentAPIError          │
│  │   │       │   └── response.py         # 统一响应构建                       │
│  │   │       ├── core/                  # 核心抽象                           │
│  │   │       │   ├── __init__.py                                              │
│  │   │       │   ├── base.py             # BaseAgent                        │
│  │   │       │   └── types.py            # 类型定义                          │
│  │   │       ├── tools/                 # 工具系统                          │
│  │   │       │   ├── __init__.py                                              │
│  │   │       │   ├── base.py             # BaseTool, ToolRegistry            │
│  │   │       │   └── async_utils.py     # async 工具函数                    │
│  │   │       ├── skills/                # 技能系统                           │
│  │   │       │   ├── __init__.py                                              │
│  │   │       │   ├── base.py             # BaseSkill, SkillContext           │
│  │   │       │   └── executor.py         # SkillExecutor                     │
│  │   │       ├── mcp/                    # MCP 协议                          │
│  │   │       │   ├── __init__.py                                              │
│  │   │       │   ├── protocol.py         # JSON-RPC 2.0 实现                 │
│  │   │       │   └── transport/         # 传输层实现                         │
│  │   │       │       ├── http.py         # HTTP 传输                         │
│  │   │       │       └── websocket.py    # WebSocket 传输                    │
│  │   │       ├── rag/                    # RAG 系统                          │
│  │   │       │   ├── __init__.py                                              │
│  │   │       │   ├── retriever.py        # RAGRetriever                      │
│  │   │       │   ├── vectorstore.py      # VectorStoreManager                │
│  │   │       │   └── loaders/           # 语料加载器                         │
│  │   │       │       ├── __init__.py                                          │
│  │   │       │       ├── base.py         # BaseLoader                        │
│  │   │       │       ├── directory.py    # DirectoryLoader                  │
│  │   │       │       ├── database.py     # DatabaseLoader                   │
│  │   │       │       └── hybrid.py       # HybridLoader                      │
│  │   │       ├── config/                # 配置系统                           │
│  │   │       │   ├── __init__.py                                              │
│  │   │       │   └── loader.py          # ConfigLoader                      │
│  │   │       ├── llm/                   # LLM 客户端                        │
│  │   │       │   ├── __init__.py                                              │
│  │   │       │   └── client.py          # LLMClient                         │
│  │   │       └── utils/                 # 工具函数                          │
│  │   │           └── async_utils.py     # gather_with_concurrency 等         │
│  │   │                                                                        │
│  │   ├── operator-agent/           # 业务 Agent (Python)                     │
│  │   │   ├── pyproject.toml                                                  │
│  │   │   ├── configs/                                                         │
│  │   │   │   ├── defaults.yaml           # 公共默认配置                       │
│  │   │   │   ├── intent_detection.yaml   # Intent Detection LLM 配置         │
│  │   │   │   └── tools.yaml             # Java 服务工具配置                   │
│  │   │   └── operator_agent/                                                   │
│  │   │       ├── __init__.py                                                  │
│  │   │       ├── operator_agent.py       # OperatorAgent 主类                │
│  │   │       ├── api/                                                         │
│  │   │       │   ├── __init__.py                                              │
│  │   │       │   └── server.py            # FastAPI 端点                     │
│  │   │       └── capabilities/                                                  │
│  │   │           ├── tools/              # Java 服务调用工具                  │
│  │   │           │   └── java_service_tool.py                               │
│  │   │           ├── skills/            # 业务技能                           │
│  │   │           └── rag/               # 电信 RAG                           │
│  │   │                                                                        │
│  │   ├── operator-service/         # NL2SQL 服务 (Java Spring Boot)           │
│  │   │   ├── pom.xml                                                          │
│  │   │   └── src/main/                                                      │
│  │   │       ├── java/com/operator/nl2sql/                                    │
│  │   │       │   ├── Nl2SqlApplication.java                                  │
│  │   │       │   ├── config/           # 配置类                              │
│  │   │       │   │   ├── AppConfig.java                                      │
│  │   │       │   │   └── WebClientConfig.java                                │
│  │   │       │   ├── controller/       # Controller 层                       │
│  │   │       │   │   ├── Nl2SqlController.java    # Command (NL2SQL)        │
│  │   │       │   │   └── query/       # Query Controllers                    │
│  │   │       │   │       ├── OperatorQueryController.java                   │
│  │   │       │   │       └── IndicatorQueryController.java                  │
│  │   │       │   ├── service/         # Service 层                           │
│  │   │       │   │   ├── command/     # CQRS Command                          │
│  │   │       │   │   │   ├── Nl2SqlCommandService.java                     │
│  │   │       │   │   │   └── SqlCoderService.java                          │
│  │   │       │   │   └── query/      # CQRS Query                            │
│  │   │       │   │       ├── OperatorQueryService.java                     │
│  │   │       │   │       └── IndicatorQueryService.java                    │
│  │   │       │   ├── repository/     # Repository 层 (MyBatis)               │
│  │   │       │   │   ├── OperatorRepository.java                           │
│  │   │       │   │   └── IndicatorRepository.java                           │
│  │   │       │   ├── entity/         # 实体类                                │
│  │   │       │   │   ├── OperatorInfo.java                                 │
│  │   │       │   │   ├── SiteInfo.java                                     │
│  │   │       │   │   └── IndicatorInfo.java                                │
│  │   │       │   ├── dto/            # DTO 类                               │
│  │   │       │   │   └── Nl2SqlRequest.java                                │
│  │   │       │   └── mapper/         # MyBatis Mapper XML                    │
│  │   │       │       ├── OperatorMapper.xml                                 │
│  │   │       │       └── IndicatorMapper.xml                                │
│  │   │       └── resources/                                                     │
│  │   │           ├── application.yml                                         │
│  │   │           └── schema.sql          # 数据库 Schema                      │
│  │   │                                                                        │
│  │   └── agent-app/                  # React 前端                             │
│  │       ├── package.json                                                     │
│  │       ├── vite.config.ts                                                   │
│  │       └── src/                                                              │
│  │           ├── main.jsx                                                     │
│  │           ├── App.jsx                                                      │
│  │           ├── components/                                                  │
│  │           │   ├── ChatContainer.jsx                                      │
│  │           │   ├── ChatInput.jsx        # 命令面板边界检测                    │
│  │           │   ├── MessageList.jsx     # 滚动到底部按钮                      │
│  │           │   ├── MessageItem.jsx     # SQL 复制 + ARIA                   │
│  │           │   ├── OperatorDashboard.jsx  # 月份限制 + 空值显示"--"          │
│  │           │   ├── Header.jsx                                               │
│  │           │   ├── ErrorBoundary.jsx                                      │
│  │           │   └── ...                                                     │
│  │           ├── hooks/                                                      │
│  │           │   ├── useAgentStream.js   # SSE 流式处理 + 重试                │
│  │           │   └── useTyping.js                                            │
│  │           └── styles/                                                     │
│  │               ├── index.css                                               │
│  │               └── Dashboard.css                                           │
│  │                                                                            │
│  └── docs/                             # 文档                                  │
│      └── views/                        # 4+1 架构视图                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 核心类设计

#### 3.2.1 agent-framework.api.server.BaseAgentServer

```python
class BaseAgentServer(FastAPI):
    """FastAPI 服务器基类，单例模式管理 Agent"""

    _instance: Optional["BaseAgentServer"] = None
    _agent: Optional[BaseAgent] = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, *args, agent_class: Type[B] = None, **kwargs):
        if self._agent is None and agent_class is not None:
            self._agent = agent_class()
        # ... 路由配置
```

#### 3.2.2 agent_framework.api.errors.ErrorCode

```python
@dataclass(frozen=True)
class ErrorCode:
    """不可变的错误码对象，支持国际化"""
    code: str                      # 错误码，如 "E1101"
    message_en: str                 # 英文错误消息
    message_zh: str                # 中文错误消息
    category: ErrorCategory         # 错误分类
    status_code: int               # HTTP 状态码

class ErrorCategory(Enum):
    GENERAL = "GENERAL"
    AGENT = "AGENT"
    INTENT = "INTENT"
    TOOL = "TOOL"
    SKILL = "SKILL"
    CONFIG = "CONFIG"
    RAG = "RAG"
    DATA = "DATA"
    NL2SQL = "NL2SQL"
    EXTERNAL = "EXTERNAL"
    AUTH = "AUTH"
```

#### 3.2.3 agent_framework.tools.base.BaseTool

```python
class BaseTool(langchain_core.tools.BaseTool):
    """Agent 工具基类，提供同步/异步桥接"""

    name: str
    description: str
    enabled: bool = True
    config: Dict[str, Any] = Field(default_factory=dict)

    async def ainvoke(self, tool_input: Dict[str, Any]) -> str:
        """异步调用入口"""
        try:
            result = await self._arun(tool_input)
            return json.dumps({"success": True, "result": result})
        except Exception as e:
            return json.dumps({"success": False, "error": str(e)})

    async def _run(self, tool_input: Dict[str, Any]) -> str:
        """同步 _run 到异步 _arun 的桥接 - 供子类实现"""
        raise NotImplementedError

    async def _arun(self, tool_input: Dict[str, Any]) -> Any:
        """异步实现 - 子类覆盖此方法"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._run, tool_input)
```

#### 3.2.4 operator-service.service.command.Nl2SqlCommandService

```java
@Service
@Slf4j
public class Nl2SqlCommandService {
    /** NL2SQL 命令处理 (CQRS Command Side) */

    @Autowired
    private SqlCoderService sqlCoderService;

    @Autowired
    private SqlBuilder sqlBuilder;

    public List<Map<String, Object>> executeQuery(Nl2SqlRequest request) {
        // 1. 生成 SQL
        String sql = sqlCoderService.generateSql(request.getQuery());

        // 2. 安全验证
        if (!isSqlSafe(sql)) {
            throw new IllegalArgumentException("Unsafe SQL detected");
        }

        // 3. 执行查询
        return sqlExecutorService.execute(sql, request.getMaxResults());
    }

    private boolean isSqlSafe(String sql) {
        if (!sql.trim().toUpperCase().startsWith("SELECT")) return false;
        String[] dangerous = {"DROP", "DELETE", "INSERT", "UPDATE",
                              "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE"};
        for (String keyword : dangerous) {
            if (sql.toUpperCase().contains(keyword)) return false;
        }
        return true;
    }
}
```

#### 3.2.5 operator-service.service.query.OperatorQueryService

```java
@Service
public class OperatorQueryService {
    /** 数据查询服务 (CQRS Query Side) */

    @Autowired
    private OperatorRepository operatorRepository;

    public List<OperatorInfo> findAllOperators() {
        return operatorRepository.findAll();
    }

    public List<OperatorTotalSite> findSiteCellSummary(Long operatorId, String dataMonth) {
        if (operatorId != null && dataMonth != null) {
            return operatorRepository.findSiteCellSummaryByOperatorIdAndMonth(operatorId, dataMonth);
        } else if (operatorId != null) {
            return operatorRepository.findSiteCellSummaryByOperatorId(operatorId);
        }
        return operatorRepository.findAllSiteCellSummary();
    }
}
```

### 3.3 数据模型

#### 3.3.1 核心实体

| 实体 | 说明 | 主键 | 关键字段 |
|------|------|------|----------|
| OperatorInfo | 运营商维度表 | id | operator_code, operator_name, country, region, network_type, status |
| BandInfo | 频段维度表 | id | band_code, band_name, technology, frequency_mhz, duplex_mode, band_group |
| SiteInfo | 站点事实表 | id | operator_id, band_id, band_name, data_month, site_num, cell_num, technology |
| IndicatorInfo | 指标事实表 | id | operator_id, band_id, band_name, data_month, technology, dl_prb, ul_prb, dl_rate, ul_rate, traffic, users, **lte_avg_\***, **nr_avg_\***, **traffic_ratio**, **duration_campratio**, **fallback_ratio** |
| OperatorTotalSite | 站点聚合表 | id | operator_id, data_month, technology, nr_physical_site_num, nr_physical_cell_num, lte_physical_site_num, lte_physical_cell_num, total_site_num, total_cell_num |

#### 3.3.2 频段列表

| 技术 | 频段 |
|------|------|
| LTE (7个) | LTE700M_FDD, LTE800M_FDD, LTE900M_FDD, LTE1400M_FDD, LTE1800M_FDD, LTE2100M_FDD, LTE2600M_FDD |
| NR (10个) | NR700M_FDD, NR800M_FDD, NR900M_FDD, NR1400M_FDD, NR1800M_FDD, NR2100M_FDD, NR2600M_FDD, NR3500M_TDD, NR4900M_TDD, NR2300M_FDD |

#### 3.3.3 指标体系 (宽表设计)

采用宽表设计，每行 = 1 运营商 × 1 月份，列按 LTE/NR 频段展开。

| 指标类型 | 字段模式 | 单位 | 说明 |
|----------|----------|------|------|
| LTE 速率 | lte{band}DlRate, lte{band}UlRate | Mbps | LTE 各频段上下行速率 |
| LTE 资源 | lte{band}DlPrb, lte{band}UlPrb | % | LTE 各频段 PRB 利用率 |
| NR 速率 | nr{band}DlRate, nr{band}UlRate | Mbps | NR 各频段上下行速率 |
| NR 资源 | nr{band}DlPrb, nr{band}UlPrb | % | NR 各频段 PRB 利用率 |
| LTE 汇总 | lteAvgDlRate, lteAvgPrb | % | LTE 全网平均速率/PRB |
| NR 汇总 | nrAvgDlRate, nrAvgPrb | % | NR 全网平均速率/PRB |
| 分流指标 | splitRatio, dwellRatio | % | 分流比, 驻留比 |
| 终端指标 | terminalPenetration, durationDwellRatio | % | 终端渗透率, 时长驻留比 |
| 回流指标 | fallbackRatio | % | 回流比 |

---

## 4. 进程视图 (Process View)

### 4.1 异步架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Event Loop                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                          Main Task                                      │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐              │ │
│  │  │Coroutine │  │Coroutine │  │Coroutine │  │Coroutine │              │ │
│  │  │ (Tool)   │  │ (Skill)  │  │  (RAG)   │  │  (MCP)   │              │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘              │ │
│  │       │              │              │              │                   │ │
│  │       ▼              ▼              ▼              ▼                   │ │
│  │  ┌────────────────────────────────────────────────────────────────┐   │ │
│  │  │                    Async I/O Operations                          │   │ │
│  │  │            (HTTP, File, Database, Vector Store)                  │   │ │
│  │  └────────────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 并发控制

```python
async def gather_with_concurrency(n, *tasks):
    """控制并发数的并行执行"""
    semaphore = asyncio.Semaphore(n)
    async def sem_task(task):
        async with semaphore:
            return await task
    return await asyncio.gather(*(sem_task(t) for t in tasks))
```

### 4.3 关键流程

#### 4.3.1 NL2SQL 命令流程 (CQRS Command Side)

```
User Request
     │
     ▼
┌─────────────────────┐
│ Nl2SqlController    │
│  POST /nl2sql/      │
│      query          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│ Nl2SqlCommand       │────▶│ SqlCoderService     │
│ Service             │     │  (LLM Call)         │
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           │ SQL                       │ Generated SQL
           ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│ isSqlSafe()         │────▶│   MyBatis           │
│ (Validation)        │     │   Executor          │
└──────────┬──────────┘     └──────────┬──────────┘
           │                           │
           │ Safe?                     │ Execute
           ▼                           ▼
      ┌─────────┐              ┌─────────────────┐
      │  Error  │              │    Results      │
      └─────────┘              └─────────────────┘
```

#### 4.3.2 数据查询流程 (CQRS Query Side)

```
User Request
     │
     ▼
┌─────────────────────┐  ┌─────────────────────┐
│OperatorQuery        │─▶│IndicatorQuery       │
│ Controller          │  │ Controller          │
└──────────┬──────────┘  └──────────┬──────────┘
           │                        │
           ▼                        ▼
┌─────────────────────┐  ┌─────────────────────┐
│OperatorQuery         │  │IndicatorQuery       │
│ Service              │  │ Service             │
└──────────┬──────────┘  └──────────┬──────────┘
           │                        │
           ▼                        ▼
┌─────────────────────┐  ┌─────────────────────┐
│OperatorRepo          │  │IndicatorRepo        │
│ (MyBatis)           │  │ (MyBatis)           │
└──────────┬──────────┘  └──────────┬──────────┘
           │                        │
           ▼                        ▼
┌─────────────────────────────────────────────────┐
│                   MySQL Database                │
│  ┌──────────┐  ┌──────────────┐ ┌────────────┐ │
│  │operator_ │  │ band_info    │ │site_info   │ │
│  │info      │  └──────────────┘ └────────────┘ │
│  └──────────┘  ┌──────────────┐ ┌────────────┐ │
│  ┌──────────────┐ │indicator_   │ │operator_  │ │
│  │operator_     │ │info         │ │total_site │ │
│  │total_site    │ └──────────────┘ └────────────┘ │
│  └──────────────┘                                │
└─────────────────────────────────────────────────┘
```

#### 4.3.3 工具调用流程

```
User Request
     │
     ▼
┌─────────────────────┐
│  OperatorAgent      │
│    .run()           │
└──────────┬──────────┘
           │ async
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│  ToolManager        │     │   HTTP Client       │
│ .invoke_tool()      │────▶│  (httpx)            │
└──────────┬──────────┘     └──────────┬──────────┘
           │                         │
           │                         │ async request
           ▼                         ▼
      ┌─────────┐            ┌─────────────────────┐
      │ ToolResult│◀─────────│ Java Microservice    │
      └─────────┘            └─────────────────────┘
           │
           ▼
      Return to User
```

#### 4.3.4 Skill 链式执行流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SkillExecutor                                      │
│                                                                              │
│  Input ──▶ Skill1 ──▶ Result1 ──▶ Skill2 ──▶ Result2 ──▶ ...                │
│           │                          │                                        │
│           └──────────────────────────┘                                        │
│                         (Optional Chain)                                      │
└─────────────────────────────────────────────────────────────────────────────┘

execute_chain():
  results = []
  for skill in chain:
      result = await execute(skill)
      results.append(result)
      if not result.success:
          break  # 短路评估
  return results
```

#### 4.3.5 MCP 客户端请求流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ OperatorAgent │────▶│  MCPClient   │────▶│ Agent Registry│
│              │◀────│              │◀────│              │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  │ async
                                                  ▼
                                          ┌──────────────┐
                                          │ Target Agent │
                                          └──────────────┘
```

### 4.4 线程模型

| 组件 | 线程模型 | 说明 |
|------|----------|------|
| Agent 主逻辑 (Python) | asyncio 单线程 | 事件循环驱动 |
| HTTP 请求 (Python) | asyncio 线程池 | 内部使用 event loop |
| Java NL2SQL Service | Spring Boot 线程池 | Tomcat/Netty 线程池 |
| MyBatis 查询 | HikariCP 连接池 | 数据库连接管理 |
| 向量操作 | asyncio 线程池 | 避免阻塞 |

### 4.5 资源管理

#### 4.5.1 连接池配置

```python
# Python: httpx 异步客户端
async with httpx.AsyncClient(timeout=30.0) as client:
    response = await client.request(method, url, ...)
```

```yaml
# Java: HikariCP 连接池 (application.yml)
spring:
  datasource:
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 30000
```

#### 4.5.2 批量处理

```python
class AsyncBatch:
    """批量处理器"""

    def __init__(self, batch_size=10, delay=0.1):
        self._batch_size = batch_size
        self._pending = []

    async def add(self, item):
        self._pending.append(item)
        if len(self._pending) >= self._batch_size:
            await self._process_batch()
```

### 4.6 错误处理与重试

```python
# Python: MCP 客户端重试
for attempt in range(retry_attempts):
    try:
        return await client.send_request(method, params)
    except HTTPError:
        if attempt == max_attempts - 1:
            raise
        await asyncio.sleep(retry_delay * (backoff ** attempt))
```

```java
// Java: Spring Retry
@Retryable(maxAttempts = 3, backoff = @Backoff(delay = 1000, multiplier = 2))
public String generateSql(Nl2SqlRequest request) {
    return sqlCoderService.generateSql(request);
}
```

### 4.7 性能优化点

| 优化点 | 策略 | 位置 |
|--------|------|------|
| 并发工具调用 | gather_with_concurrency | async_utils.py |
| 连接复用 | httpx AsyncClient | java_service_tool.py |
| 批量文档添加 | AsyncBatch | async_utils.py |
| 向量查询并行 | asyncio.gather | retriever.py |
| Skill 链式执行 | 短路评估 | executor.py |
| CQRS 查询分离 | 直接映射实体 | OperatorQueryService |
| 数据库连接池 | HikariCP | application.yml |

---

## 5. 部署视图 (Deployment View)

### 5.1 系统拓扑

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              End Users                                        │
│                         (REST Clients)                                        │
└─────────────────────────────────┬─────────────────────────────────────────────┘
                                  │ HTTPS
                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        API Gateway / Load Balancer                           │
└─────────────────────────────────┬─────────────────────────────────────────────┘
                                  │
               ┌──────────────────┼──────────────────┐
               │                  │                  │
               ▼                  ▼                  ▼
┌───────────────┐        ┌───────────────┐        ┌───────────────┐
│ OperatorAgent │        │ OperatorAgent │        │ OperatorAgent │
│   Instance 1  │        │   Instance 2  │        │   Instance N  │
│  (Python/AIO) │        │  (Python/AIO) │        │  (Python/AIO) │
└───────┬───────┘        └───────┬───────┘        └───────┬───────┘
        │                        │                        │
        └────────────────────────┼────────────────────────┘
                                 │
      ┌──────────────────────────┼──────────────────────────┐
      │                          │                          │
      ▼                          ▼                          ▼
┌─────────────┐           ┌─────────────┐           ┌─────────────┐
│ Java Micros │           │ Java Micros │           │ Java Micros │
│  Service A  │           │  Service B  │           │  Service C  │
│  (Spring)  │           │  (Spring)   │           │  (Spring)  │
│  MVC+CQRS  │           │  MVC+CQRS   │           │  MVC+CQRS  │
└─────────────┘           └─────────────┘           └─────────────┘

      ┌──────────────────────────────────────────────────────┐
      │                                                      │
      ▼                          ▼                          ▼
┌─────────────┐           ┌─────────────┐           ┌─────────────┐
│Agent Registry│           │Vector Store │           │   Message   │
│  (MCP Hub)  │           │  (Chroma)   │           │    Queue    │
└─────────────┘           └─────────────┘           └─────────────┘
```

### 5.2 Docker Compose 配置

```yaml
version: '3.8'

services:
  operator-agent:
    build:
      context: ./src/operator-agent
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - AGENT_REGISTRY_URL=http://agent-registry:8001
      - JAVA_SERVICE_BASE_URL=http://java-service:8080
      - VECTOR_STORE_PATH=/data/vectorstore
    volumes:
      - ./data:/data
    depends_on:
      - agent-registry
      - vector-store
    networks:
      - agent-network

  java-service:
    build:
      context: ./src/operator-service
      dockerfile: Dockerfile
    ports:
      - "8081:8081"
    environment:
      - DB_USERNAME=root
      - DB_PASSWORD=password
      - DB_URL=jdbc:mysql://mysql:3306/operator_db
      - NL2SQL_SERVICE_URL=http://sqlcoder:8081
    depends_on:
      - mysql
      - sqlcoder
    networks:
      - agent-network

  agent-registry:
    image: agent-registry:latest
    ports:
      - "8001:8001"
    networks:
      - agent-network

  vector-store:
    image: chromadb/chroma:latest
    ports:
      - "8002:8000"
    volumes:
      - ./chroma_data:/data
    networks:
      - agent-network

  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=operator_db
    volumes:
      - ./mysql_data:/var/lib/mysql
    networks:
      - agent-network

  sqlcoder:
    image: sqlcoder:latest
    ports:
      - "8081:8081"
    networks:
      - agent-network

networks:
  agent-network:
    driver: bridge
```

### 5.3 Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: operator-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: operator-agent
  template:
    metadata:
      labels:
        app: operator-agent
    spec:
      containers:
      - name: operator-agent
        image: operator-agent:latest
        ports:
        - containerPort: 8000
        resources:
          limits:
            memory: "2Gi"
            cpu: "1000m"
```

### 5.4 网络配置

#### 5.4.1 安全区域

| 区域 | CIDR | 服务 | 访问控制 |
|------|------|------|----------|
| DMZ | 10.0.1.0/24 | API Gateway | 外部 |
| App | 10.0.2.0/24 | Operator Agent | DMZ → App |
| Data | 10.0.3.0/24 | Java Services (NL2SQL), DB | App → Data |
| Storage | 10.0.4.0/24 | Vector Store | App → Storage |

#### 5.4.2 防火墙规则

```bash
# 允许 Agent 到 Java NL2SQL 服务
iptables -A FORWARD -s 10.0.2.0/24 -d 10.0.3.0/24 -p tcp --dport 8081 -j ACCEPT

# 允许 Agent 到 Vector Store
iptables -A FORWARD -s 10.0.2.0/24 -d 10.0.4.0/24 -p tcp --dport 8000 -j ACCEPT
```

### 5.5 配置管理

#### 5.5.1 Java NL2SQL Service 配置 (application.yml)

```yaml
server:
  port: 8081

spring:
  application:
    name: nl2sql-service
  datasource:
    url: jdbc:mysql://${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 30000

mybatis:
  mapper-locations: classpath:mapper/**/*.xml
  type-aliases-package: com.operator.nl2sql.entity
  configuration:
    map-underscore-to-camel-case: true

nl2sql:
  sqlcoder:
    url: ${NL2SQL_SERVICE_URL}
    timeout: ${SQLCODER_TIMEOUT:-60}
  security:
    allow-destructive-queries: false
    max-result-rows: ${MAX_RESULT_ROWS:-1000}
```

#### 5.5.2 Agent 配置

```bash
# Agent 配置
export AGENT_NAME="OperatorAgent"
export AGENT_MODEL="claude-3-sonnet-20240229"
export AGENT_REGISTRY_URL="http://agent-registry:8001"

# Java NL2SQL 服务配置
export JAVA_SERVICE_BASE_URL="http://java-service:8081"
export JAVA_SERVICE_TIMEOUT=60

# 向量存储配置
export VECTOR_STORE_TYPE="chroma"
export VECTOR_STORE_PATH="/data/vectorstore"

# MCP 配置
export MCP_SERVER_URL="http://mcp-server:9000"
export MCP_TIMEOUT=30
```

### 5.6 监控与日志

#### 5.6.1 Prometheus 指标

```yaml
# Prometheus metrics
- name: nl2sql_requests_total
  type: counter
  help: Total number of NL2SQL requests

- name: nl2sql_query_duration_seconds
  type: histogram
  help: NL2SQL query duration

- name: operator_query_requests_total
  type: counter
  help: Total number of operator query requests
```

#### 5.6.2 日志收集架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Operator   │────▶│    Fluentd  │────▶│Elasticsearch│
│   Agent     │     │   (Logs)    │     │  + Kibana   │
└─────────────┘     └─────────────┘     └─────────────┘
```

### 5.7 灾难恢复

| 组件 | RPO | RTO | 备份策略 |
|------|-----|-----|----------|
| Agent 配置 | 1h | 15min | ConfigMap + etcd |
| 向量存储 | 24h | 1h | S3 跨区域复制 |
| MySQL 数据 | 1h | 15min | 主从复制 + 定期备份 |
| NL2SQL 配置 | 1h | 15min | ConfigMap |

---

## 6. 开发视图 (Development View)

### 6.1 依赖管理

#### 6.1.1 Python 项目依赖 (agent-framework)

```toml
# pyproject.toml (agent-framework)
[project]
dependencies = [
    "langchain>=0.3.0",
    "langchain-core>=0.3.0",
    "langchain-community>=0.3.0",
    "pydantic>=2.0.0",
    "pyyaml>=6.0",
    "chromadb>=0.4.0",
    "httpx>=0.25.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "pytest-asyncio>=0.21.0",
    "pytest-cov>=4.0.0",
]
```

#### 6.1.2 Java 项目依赖 (operator-service)

```xml
<!-- operator-service/pom.xml -->
<dependencies>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    <dependency>
        <groupId>org.mybatis.spring.boot</groupId>
        <artifactId>mybatis-spring-boot-starter</artifactId>
        <version>3.0.3</version>
    </dependency>
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
    </dependency>
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
    </dependency>
</dependencies>
```

### 6.2 开发环境

```bash
# Python 环境
cd src/agent-framework && pip install -e ".[dev]"
cd src/operator-agent && pip install -e ".[dev]"
cd src/predict-agent && pip install -e ".[dev]"

# Java 环境
cd src/operator-service && mvn spring-boot:run

# 前端环境
cd src/agent-app && npm install && npm run dev
```

### 6.3 构建命令

```bash
# Python 项目
pip install -e ./src/agent-framework
pip install -e ./src/operator-agent
pip install -e ./src/predict-agent

# Java 项目
cd src/operator-service && mvn compile && mvn spring-boot:run

# 前端项目
cd src/agent-app && npm install && npm run build
```

### 6.4 命名约定

#### Python (agent-framework, operator-agent)

| 类型 | 约定 | 示例 |
|------|------|------|
| 类 | PascalCase | `BaseAgent`, `ToolRegistry` |
| 方法/函数 | snake_case | `add_tool()`, `invoke_tool()` |
| 常量 | UPPER_SNAKE | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| 模块 | snake_case | `async_utils.py`, `java_service_tool.py` |
| 类型 | PascalCase | `AgentConfig`, `ToolResult` |

#### Java (operator-service)

| 类型 | 约定 | 示例 |
|------|------|------|
| 类 | PascalCase | `Nl2SqlController`, `OperatorQueryService` |
| 方法 | camelCase | `findByCountry()`, `executeQuery()` |
| 常量 | UPPER_SNAKE | `MAX_RESULT_ROWS` |
| 包 | lowercase | `com.operator.nl2sql.controller.query` |
| 字段 | camelCase | `operatorName`, `frequencyBand` |

### 6.5 ErrorCode 系统

#### 错误码范围

| 范围 | 分类 | 说明 |
|------|------|------|
| E0001-E0099 | GENERAL | 通用错误 |
| E1001-E1099 | AGENT | Agent 相关错误 |
| E1101-E1199 | INTENT | 意图检测错误 |
| E1201-E1299 | TOOL/SKILL | 工具/技能错误 |
| E2001-E2099 | CONFIG | 配置错误 |
| E2101-E2199 | RAG | RAG 错误 |
| E3001-E3099 | DATA | 数据获取错误 |
| E3101-E3199 | NL2SQL | NL2SQL 查询错误 |
| E4001-E4099 | EXTERNAL | 外部服务错误 |
| E5001-E5099 | AUTH | 认证授权错误 |

#### 常用错误码

| 错误码 | 名称 | 说明 |
|--------|------|------|
| E0001 | UNKNOWN_ERROR | 未知错误 |
| E0002 | INVALID_REQUEST | 无效请求 |
| E1101 | INTENT_DETECTION_FAILED | 意图检测失败 |
| E3001 | GET_SITE_CELLS_FAILED | 获取站点数据失败 |
| E3002 | GET_INDICATORS_FAILED | 获取指标数据失败 |
| E3101 | NL2SQL_QUERY_FAILED | NL2SQL 查询失败 |
| E5001 | MISSING_API_KEY | 缺少 API 密钥 |

#### 统一响应格式

```python
{
    "code": "E1101",
    "message": "意图检测失败",
    "category": "INTENT",
    "detail": "API 超时"
}
```

### 6.6 LLM Client 配置

#### 调用方式

| 方式 | 值 | 说明 |
|------|-----|------|
| METHOD_POST | `post` | 直接 HTTP POST 调用 |
| METHOD_CHATOPENAI | `chatopenai` | OpenAI SDK 方式调用 |

#### 使用示例

```python
from agent_framework.llm import LLMClient, LLMConfig

# 方式一：POST 调用
config = LLMConfig(
    endpoint="https://api.minimaxi.com/v1/text/chatcompletion_v2",
    model="M2-her",
    api_key="your-api-key",
)
client = LLMClient(config)
result = await client.invoke(prompt="Hello", method=LLMClient.METHOD_POST)

# 方式二：ChatOpenAI 调用
config = LLMConfig(
    endpoint="https://api.minimaxi.com/v1",
    model="M2-her",
    api_key="your-api-key",
)
result = await client.invoke(
    messages=[{"role": "user", "content": "Hello"}],
    method=LLMClient.METHOD_CHATOPENAI
)
```

### 6.7 数据库迁移

```bash
# 初始化数据库
mysql -u root -p < src/operator-service/src/main/resources/schema.sql
```

---

## 7. 技术架构 (Technical Architecture)

### 7.1 NL2SQL 实现方案

#### 7.1.1 方案对比

| 方案 | 准确率 | 成本 | 延迟 | 隐私 | 推荐 |
|------|--------|------|------|------|------|
| OpenAI GPT-4 | 高 | 高 | 中 | 低 | 中 |
| Claude API | 高 | 中 | 中 | 低 | 中 |
| SQLCoder 自托管 | 高 | 低 | 低 | 高 | **推荐** |
| 规则匹配 | 低 | 低 | 低 | 高 | 不推荐 |

#### 7.1.2 SQLCoder 集成架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Nl2SqlCommandService (CQRS Command)                   │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  1. 构建 Prompt (Schema + Natural Language)                             │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                          │
│                                    ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  2. 调用 SQLCoder API (/v1/completions)                               │ │
│  │     POST { prompt, max_tokens, temperature }                             │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                          │
│                                    ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  3. 解析 SQL 从响应                                                     │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                          │
│                                    ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  4. SQL 安全验证 (SELECT only)                                          │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
│                                    │                                          │
│                                    ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │  5. MyBatis 执行查询                                                    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 CQRS 架构

#### 7.2.1 Controller 层

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Controller Layer                                 │
│                                                                              │
│  ┌─────────────────┐  ┌──────────────────────────┐                          │
│  │ Nl2SqlController│  │ OperatorQueryController  │                          │
│  │                 │  │                          │                          │
│  │ POST /nl2sql/   │  │ GET  /query/operators    │                          │
│  │                 │  │ GET  /query/operators/{id}                         │
│  │ (Command Side)  │  │ GET  /query/site-summary │                          │
│  └─────────────────┘  │                          │                          │
│                       │ (Query Side)            │                          │
│                       └──────────────────────────┘                          │
│                       ┌──────────────────────────┐                          │
│                       │IndicatorQueryController │                          │
│                       │                          │                          │
│                       │ GET  /query/indicators  │                          │
│                       │ GET  /query/indicators/ │                          │
│                       │      latest              │                          │
│                       │ GET  /query/indicators/ │                          │
│                       │      trend               │                          │
│                       │                          │                          │
│                       │ (Query Side)            │                          │
│                       └──────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 7.2.2 Service 层

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Service Layer (CQRS)                                 │
│                                                                              │
│  ┌─────────────────────────┐  ┌───────────────────────────┐                  │
│  │ Nl2SqlCommandService    │  │ OperatorQueryService      │                  │
│  │ (Command Side)          │  │ (Query Side)              │                  │
│  │                         │  │                           │                  │
│  │ - generateSql()          │  │ - findAllOperators()     │                  │
│  │ - executeQuery()         │  │ - findByCountry()        │                  │
│  │ - isSqlSafe()            │  │ - findSiteCellSummary()  │                  │
│  └─────────────────────────┘  └───────────────────────────┘                  │
│  ┌─────────────────────────┐  ┌───────────────────────────┐                  │
│  │ SqlCoderService         │  │ IndicatorQueryService    │                  │
│  │                         │  │ (Query Side)              │                  │
│  │ - generateSql()          │  │                           │                  │
│  │ - parseResponse()         │  │ - findLatestIndicators() │                  │
│  │                         │  │ - findIndicatorsByMonth() │                  │
│  └─────────────────────────┘  │ - findTrendData()         │                  │
│                                └───────────────────────────┘                  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         SqlBuilder Factory                              │ │
│  │  ┌───────────────────┐  ┌───────────────────────────┐                    │ │
│  │  │OperatorSqlBuilder│  │ IndicatorSqlBuilder      │                    │ │
│  │  │                   │  │                          │                    │ │
│  │  │- buildAllOperators│  │- buildSelectSql()       │                    │ │
│  │  │- buildSiteSummary │  │- buildByOperatorId()    │                    │ │
│  │  │- buildByBand()    │  │- buildLatestForAll()     │                    │ │
│  │  └───────────────────┘  └──────────────────────────┘                    │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 API 端点汇总

#### 7.3.1 NL2SQL API (Command Side)

| 端点 | 方法 | 描述 |
|------|------|------|
| /api/v1/nl2sql/query | POST | 自然语言转 SQL 查询 |
| /api/v1/nl2sql/schema | GET | 获取数据库 Schema |
| /api/v1/nl2sql/health | GET | 健康检查 |

#### 7.3.2 Query API (CQRS Query Side)

| 端点 | 方法 | 参数 | 描述 |
|------|------|------|------|
| /api/v1/query/operators | GET | country, operatorName | 运营商列表 |
| /api/v1/query/operators/{id} | GET | - | 运营商详情 |
| /api/v1/query/site-summary | GET | operatorId, dataMonth | 站点汇总 (宽表) |
| /api/v1/query/indicators | GET | operatorId, dataMonth | 指标列表 (宽表) |
| /api/v1/query/indicators/latest | GET | operatorId | 最新指标 |
| /api/v1/query/indicators/trend | GET | operatorId | 趋势数据 |

### 7.4 RAG 语料加载器

| 组件 | 技术选型 | 说明 |
|------|----------|------|
| BaseLoader | Python | 语料加载器抽象基类 |
| DirectoryLoader | Python | 目录扫描，支持 txt/md/json/csv/pdf/docx，自动分块 |
| DatabaseLoader | mysql-connector-python | MySQL 查询，支持刷新间隔和行转换函数 |
| HybridLoader | Python | 组合多加载器，支持权重配置和去重 |
| DocumentLoaderManager | Python + YAML | 统一管理器，支持 YAML 配置 |

### 7.5 性能优化

| 优化点 | 策略 | 预期收益 |
|--------|------|----------|
| 首屏加载 | Vite 预构建 | < 1s |
| 图表渲染 | 虚拟化大数据集 | 支持 10k+ 数据点 |
| API 请求 | 请求缓存 + 防抖 | 减少 50% 请求 |
| 数据库连接 | HikariCP 连接池 | 100+ 并发 |
| SQLCoder 缓存 | Schema 内存缓存 | 减少 30% 延迟 |
| 异步处理 | WebClient 非阻塞 | 1000+ 并发 |

### 7.6 安全设计

#### 7.6.1 SQL 注入防护

- 所有用户输入通过参数化查询
- NL2SQL 结果必须经过安全验证
- 数据库账号权限最小化

#### 7.6.2 Prompt 注入防护

```java
@Service
public class PromptSanitizer {
    // 注入模式检测
    private static final Pattern[] INJECTION_PATTERNS = {
        Pattern.compile("(?i)ignore\\s+previous\\s+instructions?"),
        Pattern.compile("(?i)you\\s+are\\s+now\\s+"),
        // ...
    };

    // 指示器白名单
    private static final Set<String> ALLOWED_INDICATORS = Set.of(
        "dl_rate", "ul_rate", "prb_usage", "split_ratio", "lte700M", "nr3500M"
    );
}
```

#### 7.6.3 API 安全

- CORS 配置限制
- 请求频率限制（可选）
- API Key 认证

---

## 8. 测试规格 (Testing Specification)

### 8.1 测试框架选型

#### 8.1.1 选型背景

E2E 测试是确保系统端到端功能正确性的关键手段。OperatorBoard 需要验证：
- 用户登录流程
- 18个核心查询功能
- UI 交互体验
- 数据库数据一致性

#### 8.1.2 框架对比矩阵

| 维度 | Playwright | Cypress | Selenium | Puppeteer |
|------|------------|---------|----------|-----------|
| **架构** | Chromium Driver-less | Chrome Driver | WebDriver | Chrome DevTools |
| **学习曲线** | 低 | 低 | 高 | 低 |
| **执行速度** | 快 | 中 | 慢 | 快 |
| **并行执行** | 原生支持 | 需要付费 | 需配置 | 需配置 |
| **调试体验** | 内置 Trace Viewer | 内置 DevTools | 依赖 IDE | 内置 DevTools |
| **移动端支持** | 模拟器+真机 | 模拟器 | 真机 | 模拟器 |

#### 8.1.3 最终选型：Playwright

**选型理由：**

1. **技术匹配度**
   - 前端 React + Vite 技术栈，Playwright 对现代前端框架支持最佳
   - 内置 TypeScript 支持，与前端项目技术一致
   - Trace Viewer 对复杂流式响应调试帮助大

2. **功能完整性**
   - 原生并行执行支持，多个测试可同时运行
   - 内置截图/视频/trace 录制，失败排查效率高
   - 智能等待机制，减少测试不稳定问题

3. **成本效益**
   - 开源免费，无功能限制
   - 内置并行支持，无需额外付费

### 8.2 测试覆盖金字塔

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              测试金字塔                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                              ▲ E2E Tests                                     │
│                             /     |     \                                    │
│                            /      |      \                                   │
│                           /       |       \                                  │
│                          /─────────┼─────────\                                │
│                                                                              │
│                          ▲ Integration Tests                                 │
│                         /     |     \                                        │
│                        /      |      \                                       │
│                       /───────┼───────\                                      │
│                                                                              │
│                          ▲ Unit Tests                                        │
│                         /  |  \                                              │
│                        /   |   \                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Unit Tests (底层)**
- Java: JUnit + Mockito
- Python: pytest
- JavaScript: Vitest / Jest

**Integration Tests (中层)**
- Java: Spring Test + MockMvc
- Python: pytest + httpx

**E2E Tests (顶层)**
- Playwright: 49 个测试用例
  - `18-functions-e2e.spec.js`: 18个核心功能 + 数据库验证 (29 tests)
  - `ui-optimizations-e2e.spec.js`: UI优化功能 (20 tests)

### 8.3 测试用例

#### 8.3.1 核心功能测试 (18-functions-e2e.spec.js)

| 序号 | 功能 | 测试用例 | 验证方式 |
|------|------|---------|----------|
| 1 | 登录 | 用户登录后 Token 存储 | localStorage |
| 2 | 退出 | 退出后清除 Token | localStorage |
| 3 | 运营商列表 | 切换到看板后获取运营商列表 | DB 一致性 |
| 4 | 运营商选择 | 选择运营商后更新 Dashboard | UI 更新 |
| 5 | 月份选择 | 月份选择器限制 2020-01 ~ 2030-12 | 范围验证 |
| 6 | 站点小区汇总 | 显示选定月份的站点和小区数 | DB 一致性 |
| 7 | 指标表格 | 空值显示"--" | UI 验证 |
| 8 | 指标趋势图 | 显示下行/上行速率趋势 | 图表渲染 |
| 9 | 指标对比图 | 多运营商指标对比 | 图表渲染 |
| 10 | 自然语言查询 | 输入查询后返回结果 | SSE 响应 |
| 11 | 意图检测 | 识别查询意图并路由 | 输出验证 |
| 12 | SQL 复制 | 点击复制按钮复制 SQL | 剪贴板 |
| 13 | 反馈功能 | 对结果进行正/负反馈 | UI 交互 |
| 14 | 重发功能 | 重新发送消息 | 消息列表 |
| 15 | 滚动加载 | 消息列表滚动到底部按钮 | UI 交互 |
| 16 | 命令面板 | 上滑打开命令面板 | UI 交互 |
| 17 | 命令执行 | 执行切换视图命令 | 状态切换 |
| 18 | 错误处理 | 无效输入显示友好错误 | UI 验证 |

#### 8.3.2 UI 优化测试 (ui-optimizations-e2e.spec.js)

| 序号 | 功能 | 测试用例 | 验证方式 |
|------|------|---------|----------|
| 1 | ARIA 标签 | 所有按钮有 aria-label | 辅助技术 |
| 2 | SQL 复制 | SQL 块有复制按钮 | UI 验证 |
| 3 | 空值显示 | 空数据显示"--" | UI 验证 |
| 4 | 滚动按钮 | 列表滚动时显示滚动按钮 | UI 验证 |
| 5 | 月份范围 | 月份选择器 min/max | 属性验证 |
| 6 | 键盘导航 | Tab 键可访问元素 | 键盘操作 |
| 7 | 焦点管理 | 焦点正确移动 | 焦点状态 |
| 8 | 错误边界 | API 错误显示友好界面 | UI 验证 |
| 9 | 加载状态 | 并行请求独立 loading | UI 验证 |
| 10 | 流式响应 | SSE 断开自动重试 | 重试机制 |

### 8.4 数据库一致性验证

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Playwright     │      │     MySQL       │      │     UI          │
│   E2E Test      │      │   Database     │      │   Content       │
└────────┬────────┘      └────────┬────────┘      └────────┬────────┘
         │                          │                          │
         │  1. Query DB            │                          │
         │────────────────────────▶│                          │
         │◀────────────────────────│                          │
         │  2. Get Expected        │                          │
         │         Value           │                          │
         │                          │                          │
         │  3. User Query          │                          │
         │────────────────────────────────────────────────────▶│
         │                          │                          │
         │  4. Extract              │                          │
         │◀─────────────────────────────────────────────────────│
         │         Numeric Value    │                          │
         │                          │                          │
         │  5. Assert               │                          │
         │    UI == DB             │                          │
         │         ✓ Pass / ✗ Fail│                          │
         │                          │                          │
```

### 8.5 测试执行

```bash
# 开发环境 - 快速反馈
npx playwright test --project=chromium --reporter=line

# CI 环境 - 完整报告
npx playwright test --project=chromium
  --reporter=html,json
  --trace=on-first-retry
  --retries=2

# UI 模式调试
npx playwright test --ui
```

### 8.6 测试实施成果

| 指标 | 数值 |
|------|------|
| 测试用例总数 | 49 |
| 核心功能覆盖率 | 18/18 (100%) |
| UI 交互覆盖率 | 15+ 项 |
| 数据库一致性验证 | 3 个端到端场景 |
| 测试执行时间 | ~5 分钟 (并行) |
| 通过率 | 95%+ |

---

## 附录

### A. 参考资料

| 标准/案例 | 来源 | 关键特性 |
|-----------|------|----------|
| Google API Design Guide | Google Cloud | 资源导向设计、标准方法映射 |
| OpenAPI 3.0 | OpenAPI Initiative | Schema复用、$ref组件共享 |
| Stripe Error Format | Stripe API | type+code+param+doc_url |
| GitHub RFC 7807 | GitHub API | errors[]字段级错误数组 |
| 4+1 View Architecture | Kruchten | 场景/逻辑/进程/部署/开发视图 |

### B. 术语表

| 术语 | 定义 |
|------|------|
| NL2SQL | Natural Language to SQL，自然语言转 SQL |
| CQRS | Command Query Responsibility Separation，命令查询职责分离 |
| RAG | Retrieval-Augmented Generation，检索增强生成 |
| MCP | Model Context Protocol，模型上下文协议 |
| E2E | End-to-End，端到端测试 |

### C. 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| 1.0 | 2026-04-12 | 初始版本，整合 4+1 视图文档 |
