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

## PlantUML  Diagrams

4+1 视图的 PlantUML 源文件位于 `docs/diagrams/` 目录：

| 视图 | 文件 | 说明 |
|------|------|------|
| 场景视图 | [01-scenario-view.puml](../diagrams/01-scenario-view.puml) | 用例图、参与者和关系 |
| 逻辑视图 | [02-logical-view.puml](../diagrams/02-logical-view.puml) | 包结构、组件关系 |
| 进程视图 | [03-process-view.puml](../diagrams/03-process-view.puml) | 活动图、异步流程 |
| 部署视图 | [04-deployment-view.puml](../diagrams/04-deployment-view.puml) | 部署拓扑、节点关系 |
| 开发视图 | [05-development-view.puml](../diagrams/05-development-view.puml) | 代码组织、模块依赖 |
| MCP传输层 | [06-mcp-transport.puml](../diagrams/06-mcp-transport.puml) | HTTP/WebSocket/Stdio 传输架构 |

**渲染工具:** 可使用 [PlantUML Online Editor](https://www.plantuml.com/online/) 或本地 PlantUML 渲染器生成图片。

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
| auth-agent | Python FastAPI | 用户认证、角色权限管理 (Port 8084) |
| agent-app | React + Node.js | 前端应用 |

### 核心变更 (MVC+CQRS)

operator-service 已从传统三层架构迁移到 MVC+CQRS 架构:

- **Controller Layer**: Nl2SqlController (Command) + OperatorQueryController/IndicatorQueryController (Query)
- **Service Layer**: Nl2SqlCommandService (Command) + OperatorQueryService/IndicatorQueryService (Query)
- **Repository Layer**: OperatorRepository + IndicatorRepository (MyBatis)
- **数据模型**: operator_info (运营商) + site_info (站点宽表) + indicator_info (指标宽表)

### LLM-based Intent Detection

operator-agent 新增 LLM-based 自然语言查询路由:

- **Intent Detection**: 通过 MiniMax M2-her LLM 分析用户查询意图
- **支持的 Intent**: site_data, indicator_data, operator_list, latest_data, nl2sql
- **运营商匹配**: 支持模糊匹配和名称映射 (北京联通→中国联通)
- **数据来源**: 中国/欧洲 8 家运营商测试数据
- **配置**: `configs/defaults.yaml` (默认模型), `configs/intent_detection.yaml` (详细配置)
- **Note**: 使用英文 prompt 避免 MiniMax 中文编码问题

### RAG 语料加载器

agent-framework 新增 RAG 语料加载器，支持从目录和数据库加载语料:

| 组件 | 说明 |
|------|------|
| `DirectoryLoader` | 递归扫描目录，支持 txt/md/json/csv/pdf/docx，自动分块 |
| `DatabaseLoader` | MySQL 查询，支持刷新间隔和行转换函数 |
| `HybridLoader` | 组合多加载器，支持权重配置和去重 |
| `DocumentLoaderManager` | 统一管理器，支持 YAML 配置加载 |

**VectorStoreManager 扩展方法**:
- `create_from_loader()`: 从加载器创建向量存储
- `create_hybrid()`: 从多加载器创建混合向量存储
- `add_loader_documents()`: 从加载器添加文档

**配置**: `configs/rag_loaders.yaml`
