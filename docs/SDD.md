# OperatorBoard 软件设计文档

**文档版本**: 1.10
**编制日期**: 2026-05-05
**参考标准**: IEEE 1012 | ISO/IEC/IEEE 42010

---

## 1. 概述

### 1.1 文档目的

本文档定义OperatorBoard系统的软件架构设计，包括技术选型、模块划分、数据模型、接口规范和组件设计，为开发团队提供明确的实现指导。

### 1.2 范围

本文档覆盖以下系统的设计：
- Agent Framework 核心框架
- Operator Agent 运营商数据查询Agent
- Predict Agent 覆盖预测Agent
- Operator Service Java微服务
- Agent App React前端应用

---

## 2. 系统架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         agent-app (React)                          │
│                     Port: 3000 / 8000 (Proxy)                       │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                              ▼
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│       operator-agent (Python)    │  │         auth-agent (Python)      │
│            Port: 8080           │  │           Port: 8084              │
│  ┌─────────────┐ ┌────────────┐  │  │  ┌─────────────────────────┐    │
│  │IntentDetect │ │ NL2SQL     │  │  │  │ User Auth & Approval    │    │
│  │   Agent     │ │  Client    │  │  │  │ - JWT Management        │    │
│  └─────────────┘ └────────────┘  │  │  │ - Role/Permission       │    │
└──────────────────────────────────┘  │  └─────────────────────────┘    │
                    │                │              │                  │
                    ▼                │              ▼                  │
┌───────────────────────────┐  ┌─────┴───────────────────────────────┴─┐
│   operator-service (Java)  │  │         auth_db (MySQL)              │
│        Port: 8081         │  │         Database: auth                │
│  ┌─────────────────────┐  │  └──────────────────────────────────────┘
│  │   SQLCoder NL2SQL   │  │
│  │      Service        │  │
│  └─────────────────────┘  │
└───────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    operator_db (MySQL)                              │
│               Port: 3306  |  Database: operator                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 技术栈选型

#### 前端技术栈

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | React | 18.x | UI框架 |
| 构建 | Vite | 5.x | 快速构建 |
| 路由 | React Router | 6.x | SPA路由 |
| 状态 | Zustand | 4.x | 轻量状态管理 |
| 图表 | Recharts | 2.x | 数据可视化 |
| 图标 | Lucide React | 0.4.x | 图标库 |
| 样式 | CSS Modules | - | 组件样式隔离 |
| HTTP | Axios | 1.x | API调用 |

#### 后端技术栈 (Python)

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | FastAPI | 0.11.x | API框架 |
| 异步 | httpx | 0.27.x | 异步HTTP |
| LLM | LangChain | 0.2.x | LLM集成 |
| 验证 | Pydantic | 2.x | 数据验证 |
| 日志 | Loguru | 0.5.x | 结构化日志 |

#### 后端技术栈 (Java)

| 层级 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 框架 | Spring Boot | 3.2.x | 应用框架 |
| ORM | MyBatis | 3.5.x | 数据访问 |
| 连接池 | HikariCP | 5.x | 数据库连接 |
| SQL | SQLCoder LLM | - | NL2SQL引擎 |

#### 基础设施

| 组件 | 技术 | 用途 |
|------|------|------|
| 数据库 | MySQL 8.0 | 主数据存储 |
| 缓存 | 内存缓存 | 热数据缓存 |
| 日志 | ELK Stack | 日志收集分析 |

### 2.3 模块职责划分

#### Agent Framework
- **角色**: Python Agent基础设施库
- **职责**:
  - 提供BaseAgentServer基类
  - 管理Tools和Skills注册
  - 实现RAG语料加载
  - 统一错误处理

#### Operator Agent
- **角色**: 运营商数据查询入口
- **职责**:
  - 意图识别与路由
  - 调用Java NL2SQL服务
  - 格式化查询结果

#### Predict Agent
- **角色**: 覆盖预测问答
- **职责**:
  - 覆盖预测知识问答
  - 仿真参数推荐
  - 仿真参数调优

#### Operator Service
- **角色**: NL2SQL核心引擎
- **职责**:
  - SQLCoder模型调用
  - SQL执行与结果封装
  - CQRS读写分离

#### Agent App
- **角色**: 前端交互界面
- **职责**:
  - 流式响应渲染
  - 图表可视化
  - 用户交互体验

#### Auth Agent
- **角色**: 用户认证授权服务
- **职责**:
  - 用户注册与审批流程
  - JWT Token管理
  - 角色权限管理
  - 会话管理

---

## 3. 数据模型设计

### 3.1 数据库Schema

#### operator_info 表 (运营商维度表)
```sql
CREATE TABLE operator_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    operator_code VARCHAR(50) UNIQUE NOT NULL COMMENT '运营商代码',
    operator_name VARCHAR(255) NOT NULL COMMENT '运营商名称',
    alias_name VARCHAR(255) COMMENT '别名',
    country VARCHAR(100) NOT NULL COMMENT '国家',
    region VARCHAR(50) NOT NULL COMMENT '区域',
    network_type VARCHAR(20) COMMENT '网络类型 4G/5G',
    status TINYINT DEFAULT 1 COMMENT '状态 1-激活 0-停用',
    created_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_country (country),
    INDEX idx_region (region),
    INDEX idx_network_type (network_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```
**注**: 该表不存储 data_month 字段，数据月份存储在 site_info/indicator_info 等事实表中。

#### band_info 表 (频段维度表)
```sql
CREATE TABLE band_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    band_code VARCHAR(20) NOT NULL COMMENT '频段代码 如 LTE700M_FDD',
    band_name VARCHAR(50) COMMENT '频段名称 如 LTE 700M FDD',
    technology VARCHAR(10) COMMENT '技术制式 LTE/NR',
    frequency_mhz INT COMMENT '中心频率 MHz',
    duplex_mode VARCHAR(10) COMMENT '双工模式 FDD/TDD',
    band_group VARCHAR(20) COMMENT '频段组 700M/800M等',
    UNIQUE KEY uk_band_code (band_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### site_info 表 (站点信息 - 规范化事实表)
每行代表一个运营商在特定频段和月份的数据。

```sql
CREATE TABLE site_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    operator_id BIGINT NOT NULL COMMENT '外键关联 operator_info.id',
    band_id BIGINT NOT NULL COMMENT '外键关联 band_info.id',
    band_name VARCHAR(50) COMMENT '频段名称',
    data_month VARCHAR(7) NOT NULL COMMENT '数据月份 YYYY-MM',
    site_num INT COMMENT '站点数量',
    cell_num INT COMMENT '小区数量',
    technology VARCHAR(10) COMMENT '技术制式 LTE/NR',
    created_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_operator_band_month (operator_id, band_id, data_month),
    INDEX idx_operator_month (operator_id, data_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### indicator_info 表 (指标信息 - 规范化事实表)
每行代表一个运营商在特定频段和月份的网络指标。

```sql
CREATE TABLE indicator_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    operator_id BIGINT NOT NULL COMMENT '外键关联 operator_info.id',
    band_id BIGINT NOT NULL COMMENT '外键关联 band_info.id',
    band_name VARCHAR(50) NOT NULL COMMENT '频段名称 如 LTE 700M FDD',
    data_month VARCHAR(7) NOT NULL COMMENT '数据月份 YYYY-MM',
    technology VARCHAR(10) NOT NULL COMMENT '技术制式 LTE/NR',

    -- PRB指标
    dl_prb DECIMAL(10,5) COMMENT '下行PRB利用率',
    ul_prb DECIMAL(10,5) COMMENT '上行PRB利用率',

    -- 吞吐量指标
    dl_rate DECIMAL(10,2) COMMENT '下行速率 Mbps',
    ul_rate DECIMAL(10,2) COMMENT '上行速率 Mbps',

    -- 流量指标
    total_traffic DECIMAL(15,2) COMMENT '总流量 MB',
    dl_traffic DECIMAL(15,2) COMMENT '下行流量 MB',
    ul_traffic DECIMAL(15,2) COMMENT '上行流量 MB',

    -- 终端指标 (可选)
    terminal_penetration_ratio DECIMAL(10,4) COMMENT '终端渗透率',

    created_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_operator_band_month (operator_id, band_id, data_month),
    INDEX idx_operator_month (operator_id, data_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```
**注**: 汇总指标(分流比/驻留比/回流比等)存储在 operator_summary 表中，不在此表中。

#### operator_summary 表 (运营商汇总表 - 宽表设计)
```sql
CREATE TABLE operator_summary (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    operator_id BIGINT NOT NULL COMMENT '运营商ID',
    data_month VARCHAR(7) NOT NULL COMMENT '数据月份 YYYY-MM',
    technology VARCHAR(10) NOT NULL COMMENT '技术制式 LTE/NR/ALL',

    -- LTE和NR小区数（汇总）
    nr_physical_cell_num INT DEFAULT 0 COMMENT 'NR物理小区数',
    lte_physical_cell_num INT DEFAULT 0 COMMENT 'LTE物理小区数',

    -- LTE和NR物理站点（确定值，非汇总）
    lte_physical_site_num INT DEFAULT 0 COMMENT 'LTE物理站点数',
    nr_physical_site_num INT DEFAULT 0 COMMENT 'NR物理站点数',

    -- 总计
    total_site_num INT DEFAULT 0 COMMENT '总站点数',
    total_cell_num INT DEFAULT 0 COMMENT '总小区数',

    -- 用户指标
    online_users DECIMAL(10,2) COMMENT '在线用户数',
    nr_users DECIMAL(10,2) COMMENT 'NR用户数',

    -- 终端指标
    terminal_penetration_ratio DECIMAL(10,4) COMMENT '终端渗透率',

    -- 非汇总指标 (按技术类型 LTE/NR 获取实际值)
    lte_avg_dl_rate DECIMAL(10,2) COMMENT 'LTE平均下行速率 Mbps',
    lte_avg_ul_rate DECIMAL(10,2) COMMENT 'LTE平均上行速率 Mbps',
    lte_avg_dl_prb DECIMAL(10,5) COMMENT 'LTE平均下行PRB利用率',
    lte_avg_ul_prb DECIMAL(10,5) COMMENT 'LTE平均上行PRB利用率',
    nr_avg_dl_rate DECIMAL(10,2) COMMENT 'NR平均下行速率 Mbps',
    nr_avg_ul_rate DECIMAL(10,2) COMMENT 'NR平均上行速率 Mbps',
    nr_avg_dl_prb DECIMAL(10,5) COMMENT 'NR平均下行PRB利用率',
    nr_avg_ul_prb DECIMAL(10,5) COMMENT 'NR平均上行PRB利用率',

    -- 分流/驻留指标
    traffic_ratio DECIMAL(10,4) COMMENT '流量分流比',
    traffic_campratio DECIMAL(10,4) COMMENT '流量驻留比',
    duration_campratio DECIMAL(10,4) COMMENT '时长驻留比',
    fallback_ratio DECIMAL(10,4) COMMENT '回流比',

    FOREIGN KEY (operator_id) REFERENCES operator_info(id),
    UNIQUE KEY uk_op_month_tech (operator_id, data_month, technology),
    INDEX idx_month (data_month)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
```

#### indicator_summary 视图 (指标汇总)
```sql
CREATE VIEW indicator_summary AS
SELECT
    operator_name,
    network_type,
    band,
    data_month,
    COUNT(DISTINCT cell_id) as cell_count,
    ROUND(AVG(pdsch_throughput), 2) as avg_pdsch_throughput,
    ROUND(AVG(pusch_throughput), 2) as avg_pusch_throughput,
    ROUND(AVG(access_success_rate), 2) as avg_access_success_rate,
    ROUND(AVG(coverage_rate), 2) as avg_coverage_rate,
    ROUND(AVG(drop_rate), 2) as avg_drop_rate
FROM indicator_info
GROUP BY operator_name, network_type, band, data_month;
```

#### auth_user 表 (用户认证)
```sql
CREATE TABLE auth_user (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
    password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
    email VARCHAR(100) COMMENT '邮箱',
    full_name VARCHAR(100) COMMENT '姓名',
    is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
    is_superuser BOOLEAN DEFAULT FALSE COMMENT '是否超级管理员',
    is_approved BOOLEAN DEFAULT FALSE COMMENT '是否已审批',
    approval_status VARCHAR(20) DEFAULT 'pending' COMMENT '审批状态: pending/approved/rejected',
    approved_by BIGINT COMMENT '审批人ID',
    approved_at DATETIME COMMENT '审批时间',
    rejection_reason VARCHAR(255) COMMENT '拒绝原因',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login DATETIME COMMENT '最后登录时间',
    INDEX idx_username (username),
    INDEX idx_approval_status (approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### auth_role 表 (角色)
```sql
CREATE TABLE auth_role (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    role_code VARCHAR(50) NOT NULL UNIQUE COMMENT '角色代码',
    role_name VARCHAR(100) NOT NULL COMMENT '角色名称',
    description VARCHAR(255) COMMENT '描述',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### auth_permission 表 (权限)
```sql
CREATE TABLE auth_permission (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    permission_code VARCHAR(100) NOT NULL UNIQUE COMMENT '权限代码',
    permission_name VARCHAR(100) NOT NULL COMMENT '权限名称',
    permission_type VARCHAR(20) DEFAULT 'api' COMMENT '权限类型: api/menu/button',
    resource_path VARCHAR(255) COMMENT '资源路径',
    parent_id BIGINT DEFAULT 0 COMMENT '父权限ID',
    sort_order INT DEFAULT 0 COMMENT '排序',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### auth_user_role 表 (用户角色关联)
```sql
CREATE TABLE auth_user_role (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES auth_user(id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES auth_role(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### auth_role_permission 表 (角色权限关联)
```sql
CREATE TABLE auth_role_permission (
    role_id BIGINT NOT NULL,
    permission_id BIGINT NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES auth_role(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES auth_permission(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.2 数据模型 (Python Pydantic)

#### Agent Framework

```python
# agent_framework/core/types.py
class Intent(Enum):
    SITE_DATA = "site_data"
    INDICATOR_DATA = "indicator_data"
    OPERATOR_LIST = "operator_list"
    LATEST_DATA = "latest_data"
    NL2SQL = "nl2sql"

class IntentResult(BaseModel):
    intent: Intent
    operator_name: Optional[str] = None
    band: Optional[str] = None
    network_type: Optional[str] = None
    data_month: Optional[str] = None
    limit: int = 10
    confidence: float = 1.0

class ToolResult(BaseModel):
    success: bool
    data: Any = None
    error: Optional[str] = None
```

#### Operator Agent

```python
# operator_agent/schemas.py
class SiteSummaryQuery(BaseModel):
    operator_name: Optional[str] = None
    band: Optional[str] = None
    network_type: Optional[str] = None
    city: Optional[str] = None
    limit: int = 10

class IndicatorQuery(BaseModel):
    operator_name: Optional[str] = None
    band: Optional[str] = None
    network_type: Optional[str] = None
    data_month: Optional[str] = None
    limit: int = 10
```

#### Frontend

```typescript
// src/types/index.ts
interface Message {
  id: string;
  type: 'user' | 'agent';
  content: string;
  blocks?: ContentBlock[];
  timestamp: number;
  feedback?: 'positive' | 'negative';
}

interface ContentBlock {
  type: 'text' | 'table' | 'chart' | 'metrics' | 'sql' | 'thinking';
  data: any;
}

interface ChartRecommendation {
  type: 'bar' | 'line' | 'pie' | 'area';
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

interface KpiData {
  title: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  sparklineData?: number[];
}

interface ClarificationOptions {
  operators?: Array<{id: number; name: string}>;
  bands?: string[];
  months?: string[];
  networkTypes?: string[];
}
```

---

## 4. 接口设计

### 4.1 Agent API 接口

#### GET /health
健康检查接口

**响应**:
```json
{
  "status": "healthy",
  "agent": "operator_agent",
  "version": "1.0.0"
}
```

#### GET /capabilities
获取Agent能力列表

**响应**:
```json
{
  "agent": "OperatorAgent",
  "version": "1.0.0",
  "capabilities": [
    {
      "intent": "site_data",
      "description": "查询站点小区汇总",
      "parameters": ["operator_name", "band", "limit"]
    },
    {
      "intent": "indicator_data",
      "description": "查询性能指标",
      "parameters": ["operator_name", "band", "data_month", "limit"]
    }
  ]
}
```

#### POST /query
通用查询接口 (SSE流式响应)

**请求**:
```json
{
  "query": "北京联通有多少站点",
  "user_id": "user_001",
  "session_id": "sess_abc123"
}
```

**响应** (SSE):
```
event: start
data: {"type": "start", "request_id": "req_001"}

event: content
data: {"type": "content", "content": "正在查询北京联通的站点数据..."}

event: chart
data: {"type": "chart", "chart": {"chartType": "bar", "data": [...]}}

event: confirmation
data: {"type": "confirmation", "options": {"operators": [...], "bands": [...]}}

event: error
data: {"type": "error", "code": "E3001", "message": "查询超时"}

event: done
data: {"type": "done", "request_id": "req_001"}
```

#### POST /api/rag/store/create
创建向量存储（从加载器配置）

**请求**:
```json
{
  "store_name": "knowledge_base",
  "loader": {
    "name": "docs",
    "loader_type": "directory",
    "path": "./data/docs",
    "recursive": true,
    "glob_patterns": ["**/*.md", "**/*.txt"],
    "chunk_size": 1000
  },
  "persist_directory": "./data/vectorstore"
}
```

**响应**:
```json
{
  "status": "success",
  "message": "Vector store 'knowledge_base' created",
  "store_name": "knowledge_base"
}
```

#### POST /api/rag/store/update
更新向量存储（增量添加文档）

**请求**:
```json
{
  "store_name": "knowledge_base",
  "loader": {
    "name": "docs",
    "loader_type": "directory",
    "path": "./data/docs",
    "chunk_size": 1000
  },
  "clear_existing": false
}
```

#### POST /api/rag/documents/add
直接添加文档到向量存储

**请求**:
```json
{
  "store_name": "knowledge_base",
  "documents": [
    {
      "content": "Document text content",
      "metadata": {"source": "manual", "category": "guide"}
    }
  ]
}
```

#### POST /api/rag/search
搜索向量存储中的文档

**请求**:
```json
{
  "query": "What is the coverage prediction methodology?",
  "store_name": "knowledge_base",
  "k": 5,
  "score_threshold": 0.7
}
```

**响应**:
```json
{
  "status": "success",
  "results": [
    {
      "content": "...",
      "metadata": {"source": "..."},
      "score": 0.85
    }
  ],
  "count": 3
}
```

#### GET /api/rag/stores
列出所有向量存储

**响应**:
```json
{
  "status": "success",
  "stores": ["knowledge_base", "telecom_docs"],
  "count": 2
}
```

#### POST /api/rag/reranker/set
设置二次排序策略

**请求**: `strategy` = "default" | "recency" | "hybrid" | "weighted"

**响应**:
```json
{
  "status": "success",
  "message": "Reranker set to 'hybrid'",
  "strategy": "hybrid"
}
```

### 4.2 Java 微服务接口

#### NL2SQL Controller (Command侧)

##### POST /api/v1/nl2sql/query
自然语言转SQL查询

**请求**:
```json
{
  "question": "北京联通3500M频段有多少小区",
  "schema": {
    "tables": ["site_info", "cell_info", "indicator_info"],
    "description": "运营商站点和小区数据"
  },
  "options": {
    "top_k": 10,
    "temperature": 0.0
  }
}
```

**响应**:
```json
{
  "sql": "SELECT COUNT(*) FROM cell_info WHERE operator_name = 'China Unicom' AND band = '3500M'",
  "result": {
    "count": 1256
  },
  "confidence": 0.95
}
```

##### GET /api/v1/nl2sql/schema
获取数据库Schema

**响应**:
```json
{
  "tables": [
    {
      "name": "site_info",
      "columns": [
        {"name": "id", "type": "BIGINT", "description": "主键"},
        {"name": "site_name", "type": "VARCHAR", "description": "站点名称"}
      ]
    }
  ]
}
```

#### Query Controller (Query侧)

##### GET /api/v1/nl2sql/operators
获取运营商列表

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| country | string | 否 | 国家名称 |
| operatorName | string | 否 | 运营商名称（模糊匹配） |

**响应**:
```json
[
  {"id": 1, "operatorName": "China Mobile", "country": "中国", ...},
  {"id": 2, "operatorName": "China Unicom", "country": "中国", ...},
  {"id": 3, "operatorName": "China Telecom", "country": "中国", ...}
]
```

##### GET /api/v1/nl2sql/operators/{id}
获取运营商详情

**响应**:
```json
{
  "id": 1,
  "operatorName": "China Mobile",
  "country": "中国",
  "region": "华北",
  "networkType": "4G/5G",
  "dataMonth": "2026-03"
}
```

##### GET /api/v1/nl2sql/site-summary
站点汇总查询

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operatorId | long | 否 | 运营商ID |
| operatorName | string | 否 | 运营商名称 |
| dataMonth | string | 否 | 数据月份 |

**响应**:
```json
[
  {
    "operatorId": 174,
    "operatorName": "中国联通",
    "band": "LTE 700M FDD",
    "technology": "LTE",
    "siteNum": 123,
    "cellNum": 369
  }
]
```

##### GET /api/v1/nl2sql/operators/{operatorName}/sites/latest
获取指定运营商最新站点数据

**响应**:
```json
[
  {
    "operatorId": 174,
    "operatorName": "中国联通",
    "band": "LTE 700M FDD",
    "siteNum": 123,
    "cellNum": 369
  }
]
```

##### GET /api/v1/nl2sql/operators/{operatorName}/sites/history
获取指定运营商历史站点数据

**响应**: 站点历史列表

##### GET /api/v1/nl2sql/operators/all/sites/latest
获取所有运营商最新站点数据

**响应**: 所有运营商站点汇总列表

##### GET /api/v1/nl2sql/operators/{operatorName}/indicators/latest
获取指定运营商最新指标

**响应**:
```json
{
  "operatorId": 174,
  "operatorName": "中国联通",
  "dataMonth": "2026-03",
  "lteAvgDlRate": 113.02,
  "nrAvgDlRate": 255.40,
  ...
}
```

##### GET /api/v1/nl2sql/operators/{operatorName}/indicators/history
获取指定运营商指标历史趋势

**响应**: 指标历史列表

##### GET /api/v1/nl2sql/operators/all/indicators/latest
获取所有运营商最新指标

**响应**: 所有运营商指标列表

##### GET /api/v1/nl2sql/times
获取可用时间点列表

**响应**:
```json
["2026-03", "2026-02", "2026-01", ...]
```

##### GET /api/v1/nl2sql/operators/all/site-summary/latest
获取所有运营商最新站点汇总

**响应**: 所有运营商站点汇总列表

##### GET /api/v1/nl2sql/operators/{operatorName}/site-summary/latest
获取指定运营商最新站点汇总

**响应**:
```json
{
  "operatorId": 174,
  "operatorName": "中国联通",
  "dataMonth": "2026-03",
  "nrPhysicalSiteNum": 100,
  "ltePhysicalSiteNum": 200,
  "totalSiteNum": 300,
  "nrPhysicalCellNum": 500,
  "ltePhysicalCellNum": 800,
  "totalCellNum": 1300
}
```

##### GET /api/v1/nl2sql/operators/{operatorName}/site-summary/history
获取指定运营商站点汇总历史

**响应**: 站点汇总历史列表

##### GET /api/v1/nl2sql/operators/all/indicator-summary/latest
获取所有运营商最新指标汇总

##### GET /api/v1/nl2sql/operators/{operatorName}/indicator-summary/latest
获取指定运营商最新指标汇总

##### GET /api/v1/nl2sql/operators/{operatorName}/indicator-summary/history
获取指定运营商指标汇总历史

##### GET /api/v1/nl2sql/operators/all/indicators/ul-prb
获取所有运营商上行PRB利用率

##### GET /api/v1/nl2sql/operators/all/indicators/dl-prb
获取所有运营商下行PRB利用率

##### GET /api/v1/nl2sql/operators/all/indicators/ul-rate
获取所有运营商上行速率

##### GET /api/v1/nl2sql/operators/all/indicators/dl-rate
获取所有运营商下行速率

##### GET /api/v1/nl2sql/operators/all/indicators/traffic-metrics
获取所有运营商流量指标

##### GET /api/v1/nl2sql/operators/all/operator-summary/latest
获取所有运营商最新运营商汇总

##### GET /api/v1/nl2sql/operators/all/operator-summary/latest/by-technology
按技术类型获取所有运营商最新运营商汇总

##### GET /api/v1/nl2sql/operators/{operatorName}/operator-summary/latest
获取指定运营商最新运营商汇总

##### GET /api/v1/nl2sql/operators/{operatorName}/operator-summary/history
获取指定运营商运营商汇总历史

##### GET /api/v1/nl2sql/operators/all/operator-summary/latest/{technology}
按技术类型获取所有运营商最新运营商汇总 (technology: LTE/NR/ALL)

##### GET /api/v1/nl2sql/indicators
获取指标列表

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operatorId | long | 否 | 运营商ID |
| operatorName | string | 否 | 运营商名称 |
| dataMonth | string | 否 | 数据月份 |

**响应**: 指标列表

##### GET /api/v1/nl2sql/indicators/latest
最新指标查询

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operatorId | long | 否 | 运营商ID |
| operatorName | string | 否 | 运营商名称 |

**响应**:
```json
[
  {
    "operatorId": 174,
    "operatorName": "中国联通",
    "band": "3500M",
    "networkType": "NR",
    "dataMonth": "2026-03",
    "dlRate": 126.87,
    "ulRate": 45.23,
    ...
  }
]
```

##### GET /api/v1/nl2sql/indicators/trend
指标趋势数据

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operatorId | long | 否 | 运营商ID |
| operatorName | string | 否 | 运营商名称 |

**响应**: 时间范围内的指标趋势列表

##### GET /api/v1/nl2sql/indicators/band
按频段指标查询(LTE/NR区分，networkType为空时返回双版本)

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operatorId | long | 否 | 运营商ID |
| operatorName | string | 否 | 运营商名称 |
| band | string | 是 | 频段(如700M, 3500M) |
| networkType | string | 否 | 网络类型(LTE/NR)，为空时返回双版本 |

**响应(单版本)**:
```json
{
  "operatorId": 174,
  "operatorName": "中国联通",
  "band": "700M",
  "networkType": "LTE",
  "dataMonth": "2026-03",
  "dlRate": 35.75,
  "ulRate": 8.28,
  "dlPrb": 50.12,
  "ulPrb": 33.5
}
```

**响应(双版本networkType为空)**:
```json
{
  "operatorId": 174,
  "operatorName": "中国联通",
  "band": "700M",
  "dataMonth": "2026-03",
  "indicators": [
    {"networkType": "LTE", "dlRate": 35.75, "ulRate": 8.28, ...},
    {"networkType": "NR", "dlRate": 110.98, "ulRate": 16.54, ...}
  ]
}
```

##### GET /api/v1/nl2sql/indicators/metrics
运营商汇总指标查询(分流比/驻留比/终端渗透率)

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operatorId | long | 否 | 运营商ID |
| operatorName | string | 否 | 运营商名称 |
| dataMonth | string | 否 | 数据月份 |

**响应(数组)**:
```json
[
  {
    "operatorId": 174,
    "operatorName": "中国联通",
    "dataMonth": "2026-03",
    "trafficRatio": 0.7618,
    "trafficRatioDesc": "NR流量占总流量的比例",
    "durationCampRatio": 0.0876,
    "durationCampRatioDesc": "用户在NR网络驻留时长占总时长的比例",
    "terminalPenetration": 0.8989,
    "terminalPenetrationDesc": "支持NR的终端占比",
    "fallbackRatio": 0.7079,
    "fallbackRatioDesc": "NR用户回落到LTE的比例",
    "lteAvgDlRate": 113.02,
    "lteAvgUlRate": ...,
    "lteAvgDlPrb": ...,
    "lteAvgUlPrb": ...,
    "nrAvgDlRate": 255.40,
    "nrAvgUlRate": ...,
    "nrAvgDlPrb": ...,
    "nrAvgUlPrb": ...
  }
]
```

#### Auth Agent API (Port 8084)

##### POST /api/auth/register
用户注册（创建待审批用户）

**请求**:
```json
{
    "username": "user1",
    "password": "password123",
    "email": "user@example.com",
    "full_name": "张三"
}
```

**响应**:
```json
{
    "message": "Registration submitted. Please wait for admin approval.",
    "user_id": 123,
    "status": "pending"
}
```

##### POST /api/auth/login
用户登录

**请求**:
```json
{
    "username": "user1",
    "password": "password123"
}
```

**响应**:
```json
{
    "access_token": "eyJ...",
    "refresh_token": "eyJ...",
    "token_type": "bearer",
    "expires_in": 3600
}
```

##### GET /api/auth/approvals/pending
获取待审批用户列表（需superuser权限）

**响应**:
```json
{
    "items": [
        {
            "id": 123,
            "username": "user1",
            "email": "user@example.com",
            "full_name": "张三",
            "approval_status": "pending",
            "created_at": "2026-04-16T10:00:00"
        }
    ],
    "total": 1
}
```

##### POST /api/auth/approvals/approve/{user_id}
批准用户（需superuser权限）

**响应**:
```json
{
    "message": "User approved successfully",
    "user_id": 123
}
```

##### POST /api/auth/approvals/reject/{user_id}
拒绝用户（需superuser权限）

**请求** (可选):
```json
{
    "reason": "拒绝原因（可选）"
}
```

**响应**:
```json
{
    "message": "User rejected",
    "user_id": 123
}
```

#### 用户管理 API (Port 8084)

##### GET /api/users
获取用户列表（需system:user:list权限）

**响应**:
```json
{
    "items": [
        {
            "id": 1,
            "username": "admin",
            "email": "admin@example.com",
            "full_name": "管理员",
            "is_superuser": true,
            "approval_status": "approved",
            "created_at": "2026-04-16T10:00:00"
        }
    ],
    "total": 1
}
```

##### POST /api/users
创建用户（需system:user:create权限）

**请求**:
```json
{
    "username": "newuser",
    "password": "password123",
    "email": "user@example.com",
    "full_name": "新用户"
}
```

##### GET /api/users/{user_id}
获取用户详情

##### PUT /api/users/{user_id}
更新用户信息（需system:user:update权限）

##### DELETE /api/users/{user_id}
删除用户（需system:user:delete权限）

##### GET /api/users/{user_id}/roles
获取用户角色列表

##### PUT /api/users/{user_id}/roles
分配用户角色（需system:user:assign-roles权限）

#### 角色管理 API (Port 8084)

##### GET /api/roles
获取角色列表（需system:role:list权限）

**响应**:
```json
{
    "items": [
        {
            "id": 1,
            "role_code": "admin",
            "role_name": "管理员",
            "description": "系统管理员",
            "permissions": [...]
        }
    ],
    "total": 1
}
```

##### POST /api/roles
创建角色（需system:role:create权限）

##### GET /api/roles/{role_id}
获取角色详情

##### PUT /api/roles/{role_id}
更新角色（需system:role:update权限）

##### DELETE /api/roles/{role_id}
删除角色（需system:role:delete权限）

##### GET /api/roles/{role_id}/permissions
获取角色权限列表

##### PUT /api/roles/{role_id}/permissions
分配角色权限（需system:role:assign-permissions权限）

#### 权限管理 API (Port 8084)

##### GET /api/permissions
获取权限列表（需system:permission:list权限）

##### GET /api/permissions/tree
获取权限树形结构

**响应**:
```json
{
    "items": [
        {
            "id": 1,
            "permission_code": "system",
            "permission_name": "系统管理",
            "children": [
                {"id": 2, "permission_code": "system:user", "permission_name": "用户管理", ...}
            ]
        }
    ],
    "total": 10
}
```

### 4.3 前端组件接口

#### ChartBlock Props
```typescript
interface ChartBlockProps {
  chartType: 'bar' | 'line' | 'pie' | 'area';
  title?: string;
  data: Array<Record<string, any>>;
  xKey: string;
  yKeys: string[];
  height?: number;
  showRecommendation?: boolean;
  recommendation?: ChartRecommendation;
  acceptedRecommendation?: boolean;
  onAcceptRecommendation?: () => void;
}
```

#### KpiCard Props
```typescript
interface KpiCardProps {
  title: string;
  value: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  sparklineData?: number[];
  sparklineColor?: string;
  onClick?: () => void;
}
```

#### QueryConfirmationDialog Props
```typescript
interface QueryConfirmationDialogProps {
  isOpen: boolean;
  title?: string;
  options: ClarificationOptions;
  selectedOptions?: {
    operator?: string;
    band?: string;
    month?: string;
    networkType?: string;
  };
  onConfirm: (options: ClarificationOptions) => void;
  onCancel: () => void;
}
```

---

## 5. 组件设计

### 5.0 React Context

#### ThemeContext

| 属性 | 类型 | 说明 |
|------|------|------|
| themeMode | string | 当前主题: light/dark/midnight/system |
| setThemeMode | function | 设置主题 |
| toggleTheme | function | 切换主题 |

#### ChatContext

| 属性 | 类型 | 说明 |
|------|------|------|
| sessions | array | 会话列表 |
| currentSessionId | number | 当前会话ID |
| createSession | function | 创建新会话 |
| addMessage | function | 添加消息 |
| clearCurrentSession | function | 清除当前会话 |

#### AuthContext

| 属性 | 类型 | 说明 |
|------|------|------|
| user | object | 当前用户信息 |
| token | string | JWT token |
| permissions | array | 用户权限列表 |
| login | function | 登录 |
| logout | function | 登出 |
| hasPermission | function | 检查权限 |

### 5.1 前端组件结构

```
src/components/
├── ChatView.jsx              # 聊天主视图
├── MessageList.jsx           # 消息列表
├── MessageItem.jsx          # 消息项(含各类型Block渲染)
│   ├── renderText()         # 文本渲染
│   ├── renderTable()        # 表格渲染
│   ├── renderChart()        # 图表渲染
│   ├── renderMetrics()      # KPI指标渲染
│   ├── renderSql()          # SQL渲染
│   ├── renderThinking()     # 思考链渲染
│   └── renderSteps()        # 步骤渲染
├── QueryConfirmationDialog.jsx  # 查询确认对话框
├── KpiCard.jsx              # KPI卡片组件
├── SkeletonLoader.jsx       # 骨架屏组件
├── AuthLogin.jsx            # 用户登录组件
├── AuthRegister.jsx         # 用户注册组件
├── UserManagement.jsx       # 用户管理组件（含审批）
├── PendingApprovals.jsx     # 待审批用户列表组件
└── charts/
    ├── ChartContainer.jsx    # 图表容器
    ├── ChartBlock.jsx       # 图表Block
    └── RecommendationBadge.jsx  # 推荐徽章
```

### 5.2 核心组件设计

#### MessageItem 渲染流程
```
接收Message
    │
    ▼
解析blocks数组
    │
    ├── type: 'text' ──────────► renderText()
    ├── type: 'table' ─────────► renderTable()
    ├── type: 'chart' ─────────► renderChart() + RecommendationBadge
    ├── type: 'metrics' ───────► KpiCard
    ├── type: 'sql' ───────────► renderSql()
    ├── type: 'thinking' ──────► renderThinking()
    └── type: 'steps' ─────────► renderSteps()
```

#### ChartBlock 内部结构
```
ChartBlock
├── chart-header (标题 + 推荐徽章)
│   ├── title
│   └── RecommendationBadge (可选)
├── chart-body (Recharts组件)
│   ├── BarChart / LineChart / PieChart / AreaChart
│   └── 动画配置
└── chart-footer (图例说明)
```

#### KpiCard 内部结构
```
KpiCard
├── header
│   ├── title
│   └── trend-icon (上升/下降/稳定箭头)
├── value-section
│   ├── value (大字号数值)
│   └── unit (单位)
├── sparkline (迷你趋势图)
│   └── AreaChart (紧凑尺寸)
└── footer
    └── trendValue (+5.2% / -3.1%)
```

### 5.3 Hook 设计

#### useStreamingAgent
```typescript
interface UseStreamingAgentReturn {
  // 状态
  messages: Message[];
  isStreaming: boolean;
  streamingContent: string;
  showConfirmation: boolean;
  clarificationOptions: ClarificationOptions;

  // 方法
  sendMessage: (query: string) => Promise<void>;
  resendMessage: (messageId: string) => Promise<void>;
  handleFeedback: (messageId: string, feedback: 'positive' | 'negative') => void;
  handleConfirmationConfirm: (options: ClarificationOptions) => Promise<void>;
  handleConfirmationCancel: () => void;
}
```

### 5.4 RAG 语料加载器设计

RAG (Retrieval-Augmented Generation) 模块支持多种数据源加载，支持数据库、目录、文件等多种业界通用知识加载方式。

#### 5.4.1 加载器架构

```
BaseLoader (抽象基类)
├── DirectoryLoader    # 目录扫描加载器
├── DatabaseLoader     # MySQL数据库加载器
├── FileLoader         # 单文件加载器
└── HybridLoader       # 混合加载器（组合多个加载器）
```

#### 5.4.2 BaseLoader 抽象基类

```python
# agent_framework/rag/loaders/base.py
class BaseLoader:
    """语料加载器抽象基类"""

    @property
    def source(self) -> str:
        """返回加载源标识"""
        pass

    @property
    def metadata(self) -> Dict[str, Any]:
        """返回加载器元数据"""
        pass

    def load(self) -> List[Document]:
        """加载并返回文档列表"""
        pass
```

#### 5.4.3 DirectoryLoader 目录加载器

```python
# agent_framework/rag/loaders/directory.py
class DirectoryLoader(BaseLoader):
    """
    目录加载器 - 递归扫描目录下的文件

    支持格式: .txt, .md, .json, .csv, .pdf, .docx
    """

    SUPPORTED_EXTENSIONS = {
        ".txt", ".md", ".markdown", ".json", ".csv", ".pdf", ".docx"
    }

    def __init__(
        self,
        directory: str,
        glob_patterns: Optional[List[str]] = None,
        recursive: bool = True,
        exclude_patterns: Optional[List[str]] = None,
        chunk_size: int = 1000,
        chunk_overlap: int = 200,
    ):
        ...

    def load(self) -> List[Document]:
        """加载目录下所有支持的文档"""
        ...
```

**配置示例**:
```yaml
rag_loaders:
  directory_sources:
    - name: "telecom_docs"
      type: "directory"
      path: "./data/telecom_knowledge"
      recursive: true
      glob_patterns:
        - "**/*.txt"
        - "**/*.md"
        - "**/*.json"
      exclude_patterns:
        - "*.tmp"
        - "__pycache__"
      chunk_size: 1000
      chunk_overlap: 200
      enabled: true
```

#### 5.4.4 DatabaseLoader 数据库加载器

```python
# agent_framework/rag/loaders/database.py
class DatabaseLoader(BaseLoader):
    """
    数据库加载器 - 从 MySQL 查询生成 Document

    支持自定义 SQL 查询模板和行转换函数
    """

    def __init__(
        self,
        connection_config: Dict[str, Any],  # {host, port, user, password, database}
        query_template: str,
        row_to_document: Optional[Callable[[Dict], Document]] = None,
        params: Optional[Dict[str, Any]] = None,
        metadata_columns: Optional[List[str]] = None,
        refresh_interval: Optional[int] = None,
    ):
        ...

    def load(self) -> List[Document]:
        """从数据库加载文档（支持缓存和自动刷新）"""
        ...

    def refresh(self) -> List[Document]:
        """强制刷新缓存"""
        ...
```

**配置示例**:
```yaml
rag_loaders:
  database_sources:
    - name: "operator_data"
      type: "database"
      enabled: true
      connection:
        host: "${DB_HOST:localhost}"
        port: 3306
        user: "${DB_USERNAME}"
        password: "${DB_PASSWORD}"
        database: "operator_db"
      query_template: |
        SELECT title, content, category, created_at
        FROM knowledge_base
        WHERE deleted_at IS NULL
      metadata_columns:
        - category
        - created_at
      refresh_interval: 3600
```

#### 5.4.5 FileLoader 单文件加载器

```python
# agent_framework/rag/loaders/file.py
class FileLoader(BaseLoader):
    """
    文件加载器 - 从单个文件加载语料

    支持格式: .txt, .md, .json, .csv, .pdf, .docx
    """

    SUPPORTED_EXTENSIONS = {
        ".txt", ".md", ".markdown", ".json", ".csv", ".pdf", ".docx"
    }

    def __init__(
        self,
        file_path: Union[str, Path],
        extract_metadata: bool = True,
        chunk_size: int = 0,
        chunk_overlap: int = 0,
    ):
        ...

    @property
    def source(self) -> str:
        """返回文件源路径"""
        return f"file://{self._file_path.absolute()}"

    def load(self) -> List[Document]:
        """加载文件并返回 Document 列表"""
        ...
```

**使用示例**:
```python
from agent_framework.rag.loaders import FileLoader

loader = FileLoader("./data/guide.md", chunk_size=1000)
documents = loader.load()
```

#### 5.4.6 HybridLoader 混合加载器

```python
# agent_framework/rag/loaders/hybrid.py
class HybridLoader(BaseLoader):
    """
    混合加载器 - 组合多个加载器，统一检索接口

    支持权重配置和优先级设置
    """

    def __init__(
        self,
        loaders: List[BaseLoader],
        weights: Optional[Dict[str, float]] = None,
        priority: Optional[List[str]] = None,
        deduplicate: bool = True,
    ):
        ...

    def add_loader(self, loader: BaseLoader, weight: float = 1.0) -> None:
        """添加一个加载器"""
        ...

    def set_weight(self, source: str, weight: float) -> None:
        """设置加载器权重"""
        ...
```

#### 5.4.7 DocumentLoaderManager 加载器管理器

```python
# agent_framework/rag/loaders/manager.py
class DocumentLoaderManager:
    """
    文档加载器管理器 - 统一管理所有语料加载器

    支持从 YAML 配置加载和运行时注册
    """

    def __init__(self, config_path: Optional[str] = None):
        ...

    def load_config(self, config_path: str) -> None:
        """从 YAML 配置文件加载加载器"""
        ...

    def register_loader(self, name: str, loader: BaseLoader) -> None:
        """注册一个加载器"""
        ...

    def load_all(self) -> Dict[str, List[Document]]:
        """加载所有已注册加载器的文档"""
        ...

    def refresh(self, name: str) -> List[Document]:
        """刷新指定加载器的缓存"""
        ...
```

#### 5.4.8 DocumentReranker 二次排序器

```python
# agent_framework/rag/loaders/reranker.py
class DocumentReranker:
    """
    检索结果二次排序器

    支持基于多维度对检索结果进行重新排序：
    - 向量相似度分数 (SCORE)
    - 文档时间 (TIME) - 更新的优先
    - 加载器权重 (WEIGHT)
    - 文档来源 (SOURCE)
    - 文档大小 (SIZE)
    """

    def __init__(
        self,
        configs: Optional[List[RerankConfig]] = None,
        time_field: str = "modified_time",
        weight_field: str = "weight",
    ):
        ...

    def rerank(
        self,
        documents: List[Document],
        scores: Optional[List[float]] = None,
    ) -> List[Document]:
        """对文档列表进行二次排序"""
        ...


class HybridReranker(DocumentReranker):
    """
    混合排序器

    结合向量相似度、语义相关性和自定义规则进行排序
    """

    def __init__(
        self,
        base_score_weight: float = 0.7,
        recency_weight: float = 0.2,
        weight_weight: float = 0.1,
        **kwargs,
    ):
        ...

    def rerank_with_hybrid_score(
        self,
        documents: List[Document],
        base_scores: List[float],
        reference_time: Optional[datetime] = None,
    ) -> List[Document]:
        """使用混合评分重新排序"""
        ...


class RerankConfig:
    """二次排序配置"""
    field: SortField      # 排序字段
    order: SortOrder      # 排序顺序 (ASC/DESC)


class SortField(Enum):
    SCORE = "score"      # 向量相似度分数
    TIME = "time"        # 文档时间
    WEIGHT = "weight"    # 加载器权重
    SOURCE = "source"    # 来源
    SIZE = "size"        # 文档大小


def create_reranker(
    strategy: str = "default",
    **kwargs,
) -> DocumentReranker:
    """
    工厂函数：创建排序器

    Args:
        strategy: 排序策略
            - "default": 默认基于相似度
            - "recency": 强调时效性
            - "hybrid": 混合排序
            - "weighted": 强调来源权重
    """
    ...
```

**Reranker 配置示例**:
```yaml
reranker:
  default_strategy: "hybrid"
  strategies:
    default:
      type: "DocumentReranker"
      configs:
        - field: "score"
          order: "desc"
    recency:
      type: "DocumentReranker"
      configs:
        - field: "time"
          order: "desc"
        - field: "score"
          order: "desc"
    hybrid:
      type: "HybridReranker"
      base_score_weight: 0.7
      recency_weight: 0.2
      weight_weight: 0.1
    weighted:
      type: "DocumentReranker"
      configs:
        - field: "weight"
          order: "desc"
        - field: "score"
          order: "desc"
```

#### 5.4.9 RAGRetriever 检索器集成

```python
# agent_framework/rag/retriever.py
class RAGRetriever:
    """
    RAG retriever with reranking support
    """

    def __init__(
        self,
        vector_store_manager: VectorStoreManager,
        default_store: str = "default",
        default_k: int = 5,
    ):
        ...

    def set_reranker(self, reranker) -> None:
        """设置二次排序器"""
        ...

    def set_reranker_by_config(self, config: Dict[str, Any]) -> None:
        """从配置创建并设置排序器"""
        ...

    async def retrieve_with_scores(
        self,
        query: str,
        k: Optional[int] = None,
        store_name: Optional[str] = None,
    ) -> List[tuple[Document, float]]:
        """检索并返回带分数的文档（支持二次排序）"""
        ...
```

---

## 6. 错误处理设计

### 6.1 错误码体系

| 范围 | 分类 | 示例 |
|------|------|------|
| E0001-E0099 | GENERAL | UNKNOWN_ERROR, INVALID_REQUEST |
| E1001-E1099 | AGENT | AGENT_NOT_INITIALIZED |
| E1101-E1199 | INTENT | INTENT_DETECTION_FAILED |
| E1201-E1299 | TOOL | TOOL_NOT_FOUND |
| E2001-E2099 | CONFIG | CONFIG_NOT_FOUND |
| E2101-E2199 | RAG | RAG_RETRIEVAL_FAILED |
| E3001-E3099 | DATA | GET_SITE_CELLS_FAILED |
| E3101-E3199 | NL2SQL | NL2SQL_QUERY_FAILED |
| E4001-E4099 | EXTERNAL | EXTERNAL_SERVICE_ERROR |
| E5001-E5099 | AUTH | MISSING_API_KEY |

### 6.2 错误响应格式

```python
# Python (AgentAPIError)
{
    "error": {
        "code": "E3101",
        "message_zh": "NL2SQL查询失败",
        "message_en": "NL2SQL query failed",
        "detail": "Connection timeout to SQLCoder service"
    }
}
```

```json
// Frontend (SSE Error Event)
{
  "type": "error",
  "code": "E3001",
  "message": "获取站点小区数据失败"
}
```

### 6.3 运营商不存在响应

**OperatorNotFoundResponse** 是当查询的运营商不存在时返回的标准化错误响应：

```java
// Java DTO
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OperatorNotFoundResponse {
    private String error;              // 错误码: "OPERATOR_NOT_FOUND"
    private String message;            // 中文错误信息
    private String queriedName;        // 用户查询的名称
    private List<String> suggestions;   // 建议列表
    private List<String> availableOperators;  // 可用运营商列表

    public static OperatorNotFoundResponse of(
            String queriedName,
            List<String> availableOperators,
            List<String> suggestions) {
        return OperatorNotFoundResponse.builder()
                .error("OPERATOR_NOT_FOUND")
                .message("运营商不存在: " + queriedName)
                .queriedName(queriedName)
                .suggestions(suggestions)
                .availableOperators(availableOperators)
                .build();
    }
}
```

**BandIndicatorResponse** 是按频段查询指标时的响应DTO：

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BandIndicatorResponse {
    private Long operatorId;
    private String operatorName;
    private String band;
    private String networkType;
    private String dataMonth;
    private BigDecimal dlRate;    // 下行速率 (Mbps)
    private BigDecimal ulRate;    // 上行速率 (Mbps)
    private BigDecimal dlPrb;     // 下行PRB利用率
    private BigDecimal ulPrb;     // 上行PRB利用率
}
```

**OperatorMetricsResponse** 是运营商级别汇总指标的响应DTO：

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OperatorMetricsResponse {
    private Long operatorId;
    private String operatorName;
    private String dataMonth;

    // 分流比
    private BigDecimal trafficRatio;
    private String trafficRatioDesc;

    // 时长驻留比
    private BigDecimal durationCampRatio;
    private String durationCampRatioDesc;

    // 终端渗透率
    private BigDecimal terminalPenetration;
    private String terminalPenetrationDesc;

    // 回流比
    private BigDecimal fallbackRatio;
    private String fallbackRatioDesc;

    // LTE平均指标
    private BigDecimal lteAvgDlRate;
    private BigDecimal lteAvgUlRate;
    private BigDecimal lteAvgDlPrb;
    private BigDecimal lteAvgUlPrb;

    // NR平均指标
    private BigDecimal nrAvgDlRate;
    private BigDecimal nrAvgUlRate;
    private BigDecimal nrAvgDlPrb;
    private BigDecimal nrAvgUlPrb;
}
```

**建议生成策略**:
| 策略 | 触发条件 | 示例建议 |
|------|----------|----------|
| 相似匹配 | 存在部分匹配的运营商名 | "您是否要查询: Airtel DRC、Airtel Kenya？" |
| 国家引导 | 存在该国家运营商 | "按国家查询: 查看奥地利的所有运营商" |
| 时间查询 | 有可用月份数据 | "查看2026-03的最新数据" |
| 汇总查询 | - | "不带运营商名称查询，获取所有运营商汇总" |
| 指标查询 | - | "查询关键指标数据，如 '中国电信 指标'" |
| 数据探索 | - | "查询 'site-summary' 获取基站汇总" |

---

## 6.5 运营商指标对比查询

当用户查询涉及多个运营商的指标对比时（如"移动联通电信速率对比"），系统支持在同一图表中展示多个运营商的指标数据。

**功能特性**:
- 按国家/地区分组显示
- 支持同指标多运营商柱状图对比
- 显示各运营商具体数值

**API端点**: `/api/v1/nl2sql/operators/all/indicators/latest`

**响应处理**:
```python
# operator-agent/api/server.py
def format_indicator_comparison(indicators: list, operators: list, ...):
    # 按国家过滤
    # 显示同一国家下所有运营商的指标对比
    # 返回多系列柱状图数据
```

**流量指标乘以100展示**:
运营商指标中的分流比、驻留比、终端渗透率等指标存储为小数（如0.7618），前端展示时乘以100（显示为76.18%）。

```python
traffic_ratio = (ind.get("trafficRatio") or 0) * 100
duration_ratio = (ind.get("durationCampratio") or 0) * 100
traffic_camp_ratio = (ind.get("trafficCampratio") or 0) * 100
terminal_pen = (ind.get("terminalPenetration") or 0) * 100
```

---

## 7. 配置管理

### 7.1 Python 配置

| 配置文件 | 用途 |
|---------|------|
| configs/defaults.yaml | 公共默认配置 |
| configs/intent_detection.yaml | 意图识别LLM配置 |
| configs/tools.yaml | Java服务工具配置 |
| configs/coverage_prediction.yaml | 覆盖预测LLM配置 |
| configs/simulation.yaml | 仿真参数配置 |
| configs/rag_loaders.yaml | RAG加载器配置 |

### 7.2 Java 配置

```yaml
# application.yml
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST}:3306/operator
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 20
      minimum-idle: 10

server:
  port: 8081

nl2sql:
  service-url: ${NL2SQL_SERVICE_URL}
  model: SQLCoder
  timeout: 30000
```

---

## 8. 安全设计

### 8.1 认证授权

| 层级 | 机制 | 说明 |
|------|------|------|
| API Gateway | API Key | 外部API访问控制 |
| Agent | Session | 会话级用户识别 |
| Database | RBAC | 数据库级权限控制 |

### 8.2 输入校验

- 请求参数使用Pydantic/JSON Schema校验
- SQL参数使用预编译语句防注入
- 前端使用React Hook Form + Zod校验

---

## 9. 性能优化

### 9.1 前端优化

| 优化项 | 策略 |
|-------|------|
| 路由懒加载 | React.lazy + Suspense |
| 图表渲染 | useMemo缓存计算 |
| 列表虚拟化 | 大量数据时使用虚拟滚动 |
| 流式渲染 | 骨架屏 + 增量更新 |

### 9.2 后端优化

| 优化项 | 策略 |
|-------|------|
| 数据库连接 | HikariCP连接池 (10-20) |
| SQL缓存 | 查询结果缓存 |
| 意图识别 | 结果缓存 (TTL 5min) |
| 流式响应 | SSE分块传输编码 |

---

## 10. 版本历史

| 版本 | 日期 | 变更 |
|------|------|------|
| 1.9 | 2026-05-07 | 补充auth-agent Role/Permission管理API端点；补充ThemeContext、ChatContext、AuthContext章节 |
| 1.8 | 2026-05-05 | 完善API端点文档(+16个端点)；修正operator_info/indicator_info/operator_summary表Schema；补充times/site-summary/indicator-summary/operator-summary等系列端点 |
| 1.7 | 2026-05-05 | operator_summary表添加traffic_campratio字段；IndicatorSummary实体添加映射；流量指标(分流比/驻留比等)乘以100展示；operator-agent流量指标乘以100修复 |
| 1.6 | 2026-05-04 | 重构 Mapper XML 使用规范化 site_info/indicator_info 表 + PIVOT 聚合查询；简化 AuditLog 服务；E2E 测试报告更新；新增 OperatorSummary V4/V5 migration；Permission cache 缓存优化 |
| 1.5 | 2026-05-01 | 技术博客Word文档深度优化，新增11个可复用Skill |
| 1.4 | 2026-04-20 | 新增E2E测试套件、数据库一致性验证 |
| 1.3 | 2026-04-19 | 新增运营商站点/指标最新历史API端点、times端点、all operators端点；新增UserManagement前端组件、global.css全局样式 |
| 1.2 | 2026-04-16 | 新增频段指标查询(BandIndicatorResponse)、运营商汇总指标(OperatorMetricsResponse)、indicator_info表新增汇总指标字段 |
| 1.1 | 2026-04-16 | 新增Auth Agent模块、用户注册审批功能、运营商不存在响应DTO |
| 1.0 | 2026-04-12 | 初始版本，软件设计文档 |
