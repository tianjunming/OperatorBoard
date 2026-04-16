# OperatorBoard 软件设计文档

**文档版本**: 1.2
**编制日期**: 2026-04-16
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

#### site_info 表 (站点信息)
```sql
CREATE TABLE site_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    site_name VARCHAR(100) NOT NULL COMMENT '站点名称',
    operator_name VARCHAR(50) NOT NULL COMMENT '运营商名称',
    city VARCHAR(50) COMMENT '城市',
    county VARCHAR(50) COMMENT '区县',
    longitude DECIMAL(10, 6) COMMENT '经度',
    latitude DECIMAL(10, 6) COMMENT '纬度',
    site_type VARCHAR(20) COMMENT '站点类型',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_operator (operator_name),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### cell_info 表 (小区信息)
```sql
CREATE TABLE cell_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    site_id BIGINT NOT NULL COMMENT '站点ID',
    cell_name VARCHAR(100) NOT NULL COMMENT '小区名称',
    operator_name VARCHAR(50) NOT NULL COMMENT '运营商名称',
    network_type VARCHAR(10) NOT NULL COMMENT '网络类型: LTE/NR',
    band VARCHAR(20) NOT NULL COMMENT '频段',
    earfcn INT COMMENT 'LTE频点',
    absolute_freq INT COMMENT 'NR绝对频点',
    pci INT COMMENT '物理小区标识',
    tac INT COMMENT '跟踪区域码',
    longitude DECIMAL(10, 6) COMMENT '经度',
    latitude DECIMAL(10, 6) COMMENT '纬度',
    status VARCHAR(20) DEFAULT 'active' COMMENT '状态',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_site_id (site_id),
    INDEX idx_operator_band (operator_name, band),
    INDEX idx_network_type (network_type),
    FOREIGN KEY (site_id) REFERENCES site_info(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### indicator_info 表 (指标信息)
```sql
CREATE TABLE indicator_info (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    cell_id BIGINT NOT NULL COMMENT '小区ID',
    operator_name VARCHAR(50) NOT NULL COMMENT '运营商名称',
    network_type VARCHAR(10) NOT NULL COMMENT '网络类型',
    band VARCHAR(20) NOT NULL COMMENT '频段',
    data_month VARCHAR(7) NOT NULL COMMENT '数据月份: YYYY-MM',
    pdsch_throughput DECIMAL(10, 2) COMMENT 'PDSCH平均吞吐量(Mbps)',
    pusch_throughput DECIMAL(10, 2) COMMENT 'PUSCH平均吞吐量(Mbps)',
    avg_access_delay DECIMAL(10, 2) COMMENT '平均接入时延(ms)',
    max_access_delay DECIMAL(10, 2) COMMENT '最大接入时延(ms)',
    access_success_rate DECIMAL(5, 2) COMMENT '接入成功率(%)',
    drop_rate DECIMAL(5, 2) COMMENT '掉线率(%)',
    coverage_rate DECIMAL(5, 2) COMMENT '覆盖率(%)',
    -- 汇总指标字段（2026-04新增）
    traffic_ratio DECIMAL(5, 2) COMMENT '分流比(%)',
    duration_camp_ratio DECIMAL(5, 2) COMMENT '时长驻留比(%)',
    terminal_penetration DECIMAL(5, 2) COMMENT '终端渗透率(%)',
    fallback_ratio DECIMAL(5, 2) COMMENT '回流比(%)',
    dl_prb DECIMAL(5, 2) COMMENT '下行PRB利用率(%)',
    ul_prb DECIMAL(5, 2) COMMENT '上行PRB利用率(%)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_cell_month (cell_id, data_month),
    INDEX idx_operator_month (operator_name, data_month),
    INDEX idx_band_month (band, data_month),
    FOREIGN KEY (cell_id) REFERENCES cell_info(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
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

##### GET /api/v1/query/operators
获取运营商列表

**响应**:
```json
{
  "operators": [
    {"id": 1, "name": "China Mobile"},
    {"id": 2, "name": "China Unicom"},
    {"id": 3, "name": "China Telecom"}
  ]
}
```

##### GET /api/v1/query/site-summary
站点汇总查询

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operator | string | 否 | 运营商名称 |
| band | string | 否 | 频段 |
| network_type | string | 否 | 网络类型 |
| city | string | 否 | 城市 |
| limit | int | 否 | 返回条数，默认10 |

**响应**:
```json
{
  "summary": [
    {
      "operator_name": "China Unicom",
      "band": "3500M",
      "site_count": 1256,
      "cell_count": 3812
    }
  ],
  "total": 1
}
```

##### GET /api/v1/query/indicators/latest
最新指标查询

**参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operator | string | 否 | 运营商名称 |
| band | string | 否 | 频段 |
| network_type | string | 否 | 网络类型 |
| limit | int | 否 | 返回条数，默认10 |

**响应**:
```json
{
  "indicators": [
    {
      "operator_name": "China Unicom",
      "band": "3500M",
      "network_type": "NR",
      "data_month": "2026-03",
      "cell_count": 3812,
      "avg_pdsch_throughput": 126.87,
      "avg_pusch_throughput": 45.23,
      "avg_access_success_rate": 99.2,
      "avg_coverage_rate": 95.8
    }
  ]
}
```

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
    "nrAvgDlRate": 255.40
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
| 1.2 | 2026-04-16 | 新增频段指标查询(BandIndicatorResponse)、运营商汇总指标(OperatorMetricsResponse)、indicator_info表新增汇总指标字段 |
| 1.1 | 2026-04-16 | 新增Auth Agent模块、用户注册审批功能、运营商不存在响应DTO |
| 1.0 | 2026-04-12 | 初始版本，软件设计文档 |
