# 4+1 架构视图

本文档描述了 Agent Framework 和 Operator Agent 的 4+1 架构视图。

## 目录

1. [场景视图 (Scenario View)](01-scenario-view.md)
2. [逻辑视图 (Logical View)](02-logical-view.md)
3. [进程视图 (Process View)](03-process-view.md)
4. [部署视图 (Deployment View)](04-deployment-view.md)
5. [开发视图 (Development View)](05-development-view.md)
6. [技术架构与选型](06-technical-architecture.md)
7. [架构深度分析](07-architecture-analysis.md)

---

## 概述

### 4+1 视图模型

| 视图 | 关注点 | 读者 |
|------|--------|------|
| 场景视图 | 功能需求、用户交互 | 用户、业务分析师 |
| 逻辑视图 | 功能结构、模块设计 | 开发人员 |
| 进程视图 | 并发、异步、执行流程 | 开发人员、运维 |
| 部署视图 | 物理部署、基础设施 | 运维、基础设施团队 |
| 开发视图 | 代码组织、依赖管理 | 开发团队 |
| 技术架构 | 技术选型、系统设计 | 架构师、技术负责人 |

### 架构原则

1. **模块化**: 核心框架与业务实现分离
2. **可扩展性**: 工具、Skills、MCP 均支持动态注册
3. **异步优先**: 所有 I/O 操作采用异步实现
4. **类型安全**: 使用 Pydantic 进行配置验证
5. **前后端分离**: API 解耦，独立部署
6. **NL2SQL 自托管**: 数据隐私优先，本地 LLM 部署
7. **CQRS 架构**: 命令查询职责分离，清晰可维护

### 系统组件

| 组件 | 技术栈 | 职责 |
|------|--------|------|
| agent-framework | Python | 核心 Agent 框架 |
| operator-agent | Python | 业务 Agent 实现 |
| operator-service | Java Spring Boot | NL2SQL 服务 (MVC+CQRS) |
| agent-app | React + Node.js | 前端应用 |

### 核心变更 (MVC+CQRS)

operator-service 已从传统三层架构迁移到 MVC+CQRS 架构:

- **Controller Layer**: Nl2SqlController (Command) + OperatorQueryController/IndicatorQueryController (Query)
- **Service Layer**: Nl2SqlCommandService (Command) + OperatorQueryService/IndicatorQueryService (Query)
- **Repository Layer**: OperatorRepository + IndicatorRepository (MyBatis)
- **数据模型**: operator_info (运营商) + site_info (站点宽表) + indicator_info (指标宽表)

### LLM-based Intent Detection

operator-agent 新增 LLM-based 自然语言查询路由:

- **Intent Detection**: 通过 LLM prompt 分析用户查询意图
- **支持的 Intent**: site_data, indicator_data, operator_list, latest_data, nl2sql
- **运营商匹配**: 支持模糊匹配和名称映射 (北京联通→中国联通)
- **数据来源**: 中国/欧洲 8 家运营商测试数据
