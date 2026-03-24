# 场景视图 (Scenario View)

## 1. 概述

场景视图描述系统的功能需求和用户交互，解答"系统为用户做什么"的问题。

## 2. 主要参与者 (Actors)

| 参与者 | 描述 | 类型 |
|--------|------|------|
| User | 终端用户，通过 Agent 执行任务或查看数据看板 | Primary |
| Operator Dashboard | 前端数据可视化界面 | External |
| Java NL2SQL Service | 提供 NL2SQL + CQRS 查询能力的 Java 后端服务 | External |
| SQLCoder | 自托管的 NL2SQL LLM 模型 | External |
| MySQL Database | 存储运营商指标数据 | External |
| Other Agent | 系统中的其他 AI Agent | Internal |
| Telco Knowledge Base | 电信仿真知识库 | External |

## 3. 主要用例 (Use Cases)

### 3.1 NL2SQL 自然语言查询场景

```
用例: UC-001 NL2SQL 自然语言查询
参与者: User, Operator Dashboard, Java NL2SQL Service, SQLCoder, MySQL
描述: 用户通过自然语言查询运营商指标数据
前置条件: NL2SQL 服务运行正常，数据库有数据
后置条件: 返回查询结果和生成的 SQL

基本流程:
1. User 在 Dashboard 输入自然语言查询
2. Dashboard 调用 agent-app API
3. agent-app 调用 operator-agent API
4. operator-agent 调用 NL2SQL Service
5. NL2SQL Service 调用 SQLCoder 生成 SQL
6. NL2SQL Service 执行 SQL 查询 MySQL
7. 返回结果逐级传递到 Dashboard
8. Dashboard 以表格形式展示数据
```

### 3.2 运营商数据查询场景 (CQRS)

```
用例: UC-002 运营商数据查询
参与者: User, Operator Dashboard, Java NL2SQL Service, MySQL
描述: 查询运营商及其频段小区汇总数据
前置条件: 数据库中存在运营商数据
后置条件: 返回运营商列表或详情

基本流程:
1. User 选择运营商和数据类型
2. Dashboard 调用 /api/v1/query/operators
3. NL2SQL Service 通过 OperatorQueryService 查询
4. 返回运营商列表或站点小区汇总
5. Dashboard 以看板形式展示
```

### 3.3 最新指标数据查询场景 (CQRS)

```
用例: UC-003 查询运营商最新频段指标数据
参与者: User, Operator Dashboard, Java NL2SQL Service, MySQL
描述: 查看各频段最新的 KPI 指标
前置条件: 数据库中存在指标数据
后置条件: 返回最新时刻的指标数据

基本流程:
1. User 选择运营商和"最新数据"视图
2. Dashboard 调用 /api/v1/query/indicators/latest
3. NL2SQL Service 通过 IndicatorQueryService 查询 MAX(created_time) 的数据
4. 返回最新频段指标数据
5. Dashboard 以图表和表格形式展示
```

### 3.4 历史指标数据查询场景 (CQRS)

```
用例: UC-004 历史频段指标查询
参与者: User, Operator Dashboard, Java NL2SQL Service, MySQL
描述: 查看特定月份的频段指标数据
前置条件: 数据库中存在历史指标数据
后置条件: 返回指定月份的指标数据

基本流程:
1. User 选择运营商和月份
2. Dashboard 调用 /api/v1/query/indicators/history?dataMonth=2026-03
3. NL2SQL Service 通过 IndicatorQueryService 查询
4. 返回历史频段指标数据
5. Dashboard 以表格形式展示
```

### 3.5 指标趋势分析场景

```
用例: UC-005 指标趋势分析
参与者: User, Operator Dashboard, Java NL2SQL Service, MySQL
描述: 查看指标在时间范围内的变化趋势
前置条件: 数据库中存在历史数据
后置条件: 返回趋势数据

基本流程:
1. User 选择时间范围和筛选条件
2. Dashboard 调用 /api/v1/query/indicators/trend
3. NL2SQL Service 查询时间范围内的数据
4. Service 按日期聚合计算均值
5. 返回趋势数据
6. Dashboard 以折线图展示趋势
```

### 3.6 数据看板概览场景

```
用例: UC-006 数据看板概览
参与者: User, Operator Dashboard
描述: 在一个页面内查看关键指标和图表
前置条件: 已连接后端服务
后置条件: 展示综合数据看板

基本流程:
1. User 选择运营商
2. Dashboard 自动加载:
   - 运营商信息卡片（名称、国家、地区、网络类型）
   - 汇总卡片（频段数量、小区总数 4G/5G）
   - 指标卡片（平均 DL/UL PRB 利用率、平均 DL/UL 速率）
   - 频段小区数量柱状图
   - 各频段速率对比柱状图
   - 小区总数饼图
   - PRB 利用率对比柱状图
3. User 可切换对话和数据看板视图
```

### 3.7 RAG 知识查询场景

```
用例: UC-007 电信仿真知识查询
参与者: User, Operator Agent, Telco Knowledge Base
描述: 用户查询电信网络协议、仿真配置等知识
前置条件: RAG 系统已索引电信知识
后置条件: 返回相关文档

基本流程:
1. User 提交知识查询
2. Agent 调用 TelecomRAGRetriever
3. Retriever 在向量库中检索相似文档
4. 返回匹配的知识文档
```

### 3.8 跨 Agent 数据获取场景

```
用例: UC-008 获取其他 Agent 数据
参与者: User, Operator Agent, Other Agent
描述: 通过 MCP 协议从其他 Agent 获取数据
前置条件: Agent 注册到 Agent Registry
后置条件: 返回目标 Agent 的数据

基本流程:
1. User 请求特定数据
2. Agent 通过 AgentMCPClient 查询 Agent Registry
3. Client 向目标 Agent 发送数据请求
4. 目标 Agent 返回数据
5. 当前 Agent 汇总结果返回给 User
```

## 4. 场景列表

| ID | 场景 | 参与者 | 优先级 |
|----|------|--------|--------|
| UC-001 | NL2SQL 自然语言查询 | User, Dashboard, NL2SQL Service, SQLCoder | P0 |
| UC-002 | 运营商数据查询 (CQRS) | User, Dashboard, NL2SQL Service | P0 |
| UC-003 | 最新频段指标查询 (CQRS) | User, Dashboard, NL2SQL Service | P0 |
| UC-004 | 历史频段指标查询 (CQRS) | User, Dashboard, NL2SQL Service | P0 |
| UC-005 | 指标趋势分析 | User, Dashboard, NL2SQL Service | P0 |
| UC-006 | 数据看板概览 | User, Dashboard | P0 |
| UC-007 | 电信知识 RAG 查询 | User, Agent, Knowledge Base | P1 |
| UC-008 | 跨 Agent 数据获取 | User, Agent, Other Agents | P1 |
| UC-009 | 运营商数据汇总报告 | User, Agent, Skills | P1 |

## 5. 关键业务场景流

### 场景流: 完整数据查询与可视化流程 (CQRS 架构)

```
┌─────────────────────────────────────────────────────────────────┐
│                        agent-app (React Frontend)               │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────┐  │
│  │ Operator    │    │ Chat         │    │ Data Visualization │  │
│  │ Dashboard   │────│ Container    │    │ (Recharts)        │  │
│  └─────────────┘    └─────────────┘    └────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ /api/query/*, /api/nl2sql/*
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    agent-app Server (Node.js)                   │
│  ┌─────────────────────────────────────────────────────────┐     │
│  │  /api/query/* Routes (CQRS Query)                        │     │
│  │  /api/nl2sql/* Routes (NL2SQL Command)                   │     │
│  └─────────────────────────────────────────────────────────┘     │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  operator-nl2sql-service (Java)                  │
│                    MVC + CQRS 架构                                │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Controller Layer                                            │  │
│  │  ┌─────────────────┐  ┌──────────────────────────┐        │  │
│  │  │ Nl2SqlController│  │ OperatorQueryController │        │  │
│  │  │ (Command)       │  │ (Query)                  │        │  │
│  │  └────────┬────────┘  └────────────┬─────────────┘        │  │
│  │  ┌────────┴────────┐  ┌────────────┴─────────────┐        │  │
│  │  │ Nl2SqlController│  │ IndicatorQueryController │        │  │
│  │  │ (Command)       │  │ (Query)                  │        │  │
│  │  └─────────────────┘  └──────────────────────────┘        │  │
│  └─────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ Service Layer (CQRS)                                        │  │
│  │  ┌─────────────────┐  ┌──────────────────────────┐        │  │
│  │  │ Nl2SqlCommand   │  │ OperatorQueryService    │        │  │
│  │  │ Service         │  │ (Query)                  │        │  │
│  │  └────────┬────────┘  └────────────┬─────────────┘        │  │
│  │  ┌────────┴────────┐  ┌────────────┴─────────────┐        │  │
│  │  │ SqlCoderService │  │ IndicatorQueryService   │        │  │
│  │  └────────┬────────┘  └────────────┬─────────────┘        │  │
│  └───────────┼───────────────────────┼───────────────────────┘  │
│  ┌───────────┼───────────────────────┼───────────────────────┐  │
│  │ Repository│ Layer                 │                        │  │
│  │  ┌────────┴──────────────────────┴──────────────┐        │  │
│  │  │ OperatorRepository, IndicatorRepository       │        │  │
│  │  │ (MyBatis)                                    │        │  │
│  │  └──────────────────────────────────────────────┘        │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MySQL Database                              │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────┐  │
│  │ operator_   │    │ site_        │    │ indicator_         │  │
│  │ info        │    │ info         │    │ info               │  │
│  └─────────────┘    └──────────────┘    └────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                             │
                             │ REST /v1/completions
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SQLCoder (LLM)                             │
│  Self-hosted NL2SQL model at localhost:8081                     │
└─────────────────────────────────────────────────────────────────┘
```

## 6. 扩展点

| 扩展点 | 描述 | 扩展方式 |
|--------|------|----------|
| 新 LLM Provider | 支持不同的 NL2SQL 模型 | 实现 LLMProvider 接口 |
| 新数据源 | 连接新的数据存储 | 实现新的 Repository |
| 新图表类型 | 添加新的可视化组件 | 在 Dashboard 中添加 Recharts 组件 |
| 新指标维度 | 支持按天/周/年分析 | 扩展时间粒度参数 |
| 新频段 | 添加新的运营商频段 | 扩展 site_info 宽表 |
