# OperatorBoard

运营商数据管理平台，基于多Agent架构和NL2SQL能力。

## 系统架构

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              OperatorBoard                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│  │  agent-app   │     │operator-agent│     │operator-svc  │               │
│  │   (React)    │────▶│   (Python)    │────▶│    (Java)    │               │
│  │   :3000      │     │   :8080       │     │   :8081      │               │
│  └──────────────┘     └──────────────┘     └──────────────┘               │
│         │                    │                    │                        │
│         │                    │                    ▼                        │
│         │                    │             ┌──────────────┐                 │
│         │                    │             │    MySQL     │                 │
│         │                    │             │    :3306     │                 │
│         │                    │             └──────────────┘                 │
│         │                    │                    │                        │
│         │                    │             ┌──────────────┐                 │
│         │                    └─────────────▶│  SQLCoder   │                 │
│         │                              LLM │   (LLM)     │                 │
│         │                              │   └──────────────┘                 │
│         │                              │                                    │
│  ┌──────┴──────┐                       │                                    │
│  │ API Proxy   │                       │                                    │
│  │  (Node)     │                       │                                    │
│  │   :8000     │                       │                                    │
│  └─────────────┘                       │                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| agent-app | 3000 | React 前端 |
| API Proxy | 8000 | Node.js API 代理 |
| operator-agent | 8080 | Python FastAPI Agent |
| operator-service | 8081 | Java Spring Boot NL2SQL |
| MySQL | 3306 | 数据库 |
| SQLCoder | 8081 | LLM NL2SQL 模型 |

## API 调用流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API 请求处理流程                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. 客户端请求                                                               │
│     │                                                                      │
│     ▼                                                                      │
│  2. [认证检查] X-API-Key 验证                                                │
│     │                                                                      │
│     ├── 失败 ──▶ HTTP 401/403 + E4001/E4002                                 │
│     │                                                                      │
│     ▼                                                                      │
│  3. [意图理解] LLM 分析用户查询                                              │
│     │                                                                      │
│     ├── 失败 ──▶ HTTP 500 + E1001 (INTENT_DETECTION_FAILED)                  │
│     │                                                                      │
│     ▼                                                                      │
│  4. [路由分发] 根据意图类型选择处理器                                          │
│     │                                                                      │
│     ├── site_data ──▶ /api/operator/site-cells                             │
│     ├── latest_data ──▶ /api/operator/indicators/latest                    │
│     ├── indicator_data ──▶ /api/operator/indicators/latest                 │
│     ├── operator_list ──▶ /api/operator/operators                           │
│     ├── nl2sql ──▶ /api/operator/nl2sql/query                               │
│     │                                                                      │
│     ▼                                                                      │
│  5. [数据获取] 调用 Java NL2SQL 服务                                          │
│     │                                                                      │
│     ├── 失败 ──▶ HTTP 500 + Exxxx (根据错误类型)                             │
│     │                                                                      │
│     ▼                                                                      │
│  6. [格式化响应] 返回结构化数据                                               │
│     │                                                                      │
│     ▼                                                                      │
│  7. 响应客户端                                                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Agent 意图检测流程

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Agent 意图检测流程                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  用户输入: "查询中国移动2024年1月的基站数据"                                   │
│                                                                             │
│                              │                                              │
│                              ▼                                              │
│                    ┌─────────────────┐                                      │
│                    │   LLM 意图分析   │                                      │
│                    │ process_natural │                                      │
│                    │ _language_query  │                                      │
│                    └────────┬────────┘                                      │
│                             │                                               │
│                             ▼                                               │
│                    ┌─────────────────┐                                      │
│                    │    解析结果     │                                      │
│                    │  intent:        │                                      │
│                    │   "site_data"   │                                      │
│                    │  operator_name: │                                      │
│                    │   "中国移动"    │                                      │
│                    │  data_month:    │                                      │
│                    │   "202401"      │                                      │
│                    └────────┬────────┘                                      │
│                             │                                               │
│              ┌──────────────┼──────────────┐                                │
│              │              │              │                                 │
│              ▼              ▼              ▼                                 │
│        ┌──────────┐  ┌──────────┐  ┌──────────┐                              │
│        │site_data │  │latest_   │  │indicator │                              │
│        │          │  │data      │  │_data     │                              │
│        └──────────┘  └──────────┘  └──────────┘                              │
│              │              │              │                                 │
│              │              │              │                                 │
│              ▼              ▼              ▼                                 │
│        ┌─────────────────────────────────────────┐                           │
│        │         获取站点小区数据                  │                           │
│        │    agent.get_site_cells()              │                           │
│        └─────────────────────────────────────────┘                           │
│                             │                                               │
│                             ▼                                               │
│                    ┌─────────────────┐                                      │
│                    │   格式化输出     │                                      │
│                    │ (Markdown 表格) │                                      │
│                    └─────────────────┘                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 请求/响应完整示例

### 示例 1: Agent 自然语言查询

**请求:**
```bash
curl -X POST http://localhost:8080/api/agent/run \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key-123" \
  -H "X-Locale: zh" \
  -d '{"input": "中国移动2024年1月有多少基站？", "stream": false}'
```

**成功响应:**
```json
{
  "content": "# 运营商站点信息\n\n## 中国移动\n\n### 数据月份: 202401\n\n**LTE 频段:**\n- LTE 700M: 120 站点, 350 小区\n- LTE 800M: 280 站点, 820 小区\n...\n- **LTE 合计**: 15000 站点, 45000 小区\n\n**NR 频段:**\n- NR 700M: 80 站点, 240 小区\n...\n"
}
```

**错误响应 (E1001):**
```json
{
  "code": "E1001",
  "message": "意图检测失败",
  "detail": "Invalid query format"
}
```

---

### 示例 2: 指标数据查询

**请求:**
```bash
curl -X POST http://localhost:8080/api/operator/indicators/latest \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key-123" \
  -H "X-Locale: zh" \
  -d '{"operatorName": "中国移动", "limit": 5}'
```

**成功响应:**
```json
{
  "data": [
    {
      "dataMonth": "202401",
      "operatorName": "中国移动",
      "lteAvgDlRate": 45.6,
      "lteAvgUlRate": 8.2,
      "nrAvgDlRate": 128.5,
      "nrAvgUlRate": 18.3,
      "splitRatio": 35.2,
      "totalUsers": 985600
    },
    {
      "dataMonth": "202312",
      "operatorName": "中国移动",
      "lteAvgDlRate": 44.8,
      "lteAvgUlRate": 8.0,
      "nrAvgDlRate": 125.2,
      "nrAvgUlRate": 17.9,
      "splitRatio": 34.8,
      "totalUsers": 968200
    }
  ]
}
```

---

### 示例 3: 站点小区查询

**请求:**
```bash
curl -X POST http://localhost:8080/api/operator/site-cells \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key-123" \
  -H "X-Locale: zh" \
  -d '{"operatorId": 1, "band": "LTE"}'
```

**成功响应:**
```json
{
  "data": [
    {
      "dataMonth": "202401",
      "operatorId": 1,
      "operatorName": "中国移动",
      "lte700MSite": 120,
      "lte700MCell": 350,
      "lte800MSite": 280,
      "lte800MCell": 820,
      "lte900MSite": 1500,
      "lte900MCell": 4500,
      "lte1800MSite": 3200,
      "lte1800MCell": 9600,
      "lte2100MSite": 2100,
      "lte2100MCell": 6300,
      "lte2600MSite": 1800,
      "lte2600MCell": 5400,
      "lteTotalSite": 15000,
      "lteTotalCell": 45000,
      "nr700MSite": 80,
      "nr700MCell": 240,
      "nr3500MSite": 1200,
      "nr3500MCell": 3600,
      "nrTotalSite": 5000,
      "nrTotalCell": 15000
    }
  ]
}
```

---

### 示例 4: NL2SQL 自然语言查询

**请求:**
```bash
curl -X POST http://localhost:8080/api/operator/nl2sql/query \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key-123" \
  -H "X-Locale: zh" \
  -d '{"question": "2024年1月三大运营商的LTE基站数量对比"}'
```

**成功响应:**
```json
{
  "data": [
    {
      "operatorName": "中国移动",
      "lteTotalSite": 15000
    },
    {
      "operatorName": "中国电信",
      "lteTotalSite": 12000
    },
    {
      "operatorName": "中国联通",
      "lteTotalSite": 9800
    }
  ]
}
```

---

### 示例 5: SSE 流式响应

**请求:**
```bash
curl -X POST http://localhost:8080/api/agent/stream \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key-123" \
  -H "X-Locale: zh" \
  -d '{"input": "生成2024年1月的运营报告"}' \
  --no-buffer
```

**SSE 响应流:**
```
data: {"type": "start"}

data: {"type": "content", "content": "# 2024年1月运营报告\n\n"}

data: {"type": "content", "content": "## 一、总体概况\n\n"}

data: {"type": "content", "content": "本月全国基站总数: 36,800 个"}

data: {"type": "content", "content": "\n\n## 二、分运营商数据\n\n"}

data: {"type": "content", "content": "| 运营商 | 基站数 | 小区数 |"}

data: {"type": "content", "content": "| 中国移动 | 15,000 | 45,000 |"}

data: {"type": "content", "content": "| 中国电信 | 12,000 | 36,000 |"}

data: {"type": "content", "content": "| 中国联通 | 9,800 | 29,400 |"}

data: [DONE]
```

---

### 示例 6: 认证错误

**请求 (缺少 API Key):**
```bash
curl -X GET http://localhost:8080/api/capabilities
```

**响应 (HTTP 401):**
```json
{
  "code": "E4001",
  "message": "缺少API密钥",
  "detail": "Provide X-API-Key header"
}
```

**请求 (无效 API Key):**
```bash
curl -X GET http://localhost:8080/api/capabilities \
  -H "X-API-Key: invalid-key"
```

**响应 (HTTP 403):**
```json
{
  "code": "E4002",
  "message": "无效的API密钥",
  "detail": null
}
```

---

### 示例 7: 国际化支持

**中文响应 (默认):**
```bash
curl -X POST http://localhost:8080/api/operator/site-cells \
  -H "X-API-Key: test-key-123" \
  -H "X-Locale: zh"
```
```json
{
  "code": "E2001",
  "message": "获取站点数据失败",
  "detail": "Connection refused"
}
```

**英文响应:**
```bash
curl -X POST http://localhost:8080/api/operator/site-cells \
  -H "X-API-Key: test-key-123" \
  -H "X-Locale: en"
```
```json
{
  "code": "E2001",
  "message": "Failed to get site data",
  "detail": "Connection refused"
}
```

## 快速启动

### 前端
```bash
cd src/agent-app
npm install
npm run dev          # 开发模式 (端口 3000)
npm run server       # 启动 API 代理 (端口 8000)
```

### Python Agent
```bash
pip install -e ./src/agent-framework
pip install -e ./src/operator-agent
python -m operator_agent.api.server
```

### Java Service
```bash
cd src/operator-service
mvn spring-boot:run
```

### 数据库
```bash
mysql -u root -p < src/main/resources/schema.sql
```

## 环境变量

- `DB_USERNAME`, `DB_PASSWORD`: 数据库凭证
- `NL2SQL_SERVICE_URL`: NL2SQL 服务地址 (默认 http://localhost:8081)
- `OPERATOR_AGENT_URL`: Agent 服务地址 (默认 http://localhost:8080)
- `OPERATOR_AGENT_API_KEYS`: API 密钥列表 (逗号分隔)
- `ALLOWED_ORIGINS`: CORS 允许的源地址

---

## API 文档

Base URL: `http://localhost:8080`

### 认证

所有 API 端点 (除 `/health`) 需要 API 密钥认证。

**请求头:**
```
X-API-Key: your-api-key
```

**环境变量配置:**
```bash
export OPERATOR_AGENT_API_KEYS="key1,key2,key3"
```

---

### 健康检查

**GET** `/health`

健康检查端点，无需认证。

**响应:**
```json
{
  "status": "healthy",
  "service": "operator-agent"
}
```

---

### Agent 能力

**GET** `/api/capabilities`

获取 Agent 支持的能力列表。

**请求:**
```bash
curl -X GET http://localhost:8080/api/capabilities \
  -H "X-API-Key: your-api-key"
```

**响应:**
```json
{
  "capabilities": [
    "natural_language_query",
    "site_data",
    "indicator_data",
    "operator_list",
    "trend_analysis"
  ]
}
```

---

### Agent 执行

**POST** `/api/agent/run`

使用自然语言查询执行 Agent (同步响应)。

**请求:**
```bash
curl -X POST http://localhost:8080/api/agent/run \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -H "X-Locale: zh" \
  -d '{"input": "查询2024年1月的数据", "stream": false, "confirmed": false}'
```

**参数:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| input | string | 是 | 自然语言查询 |
| stream | boolean | 否 | 是否使用流式响应 (默认 false) |
| confirmed | boolean | 否 | 是否确认执行 (默认 false) |

**响应:**
```json
{
  "content": "# 查询结果\n\n共找到 10 条记录\n\n| column1 | column2 | ... |"
}
```

**错误响应:**
```json
{
  "code": "E1001",
  "message": "意图检测失败",
  "detail": "No API key"
}
```

---

### Agent 流式执行

**POST** `/api/agent/stream`

使用自然语言查询执行 Agent (SSE 流式响应)。

**请求:**
```bash
curl -X POST http://localhost:8080/api/agent/stream \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -H "X-Locale: zh" \
  -d '{"input": "查询2024年1月的数据"}'
```

**SSE 响应格式:**
```
data: {"type": "start"}

data: {"type": "content", "content": "# 查询结果"}

data: {"type": "content", "content": "\n\n共找到"}

data: {"type": "content", "content": " 10 条记录"}

data: [DONE]
```

**错误响应:**
```
data: {"type": "error", "code": "E1001", "message": "意图检测失败", "detail": "No API key"}

data: [DONE]
```

---

### 最新指标

**POST** `/api/operator/indicators/latest`

获取最新的运营商指标数据。

**请求:**
```bash
curl -X POST http://localhost:8080/api/operator/indicators/latest \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -H "X-Locale: zh" \
  -d '{"operatorName": "中国移动", "limit": 100}'
```

**参数:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operatorName | string | 否 | 运营商名称 |
| limit | integer | 否 | 返回记录数 (默认 100) |

**响应:**
```json
{
  "data": [
    {
      "dataMonth": "202401",
      "lteAvgDlRate": 45.6,
      "nrAvgDlRate": 128.5,
      "splitRatio": 35.2
    }
  ]
}
```

---

### 指标对比

**POST** `/api/operator/indicators/compare`

对比两个月份的指标数据。

**请求:**
```bash
curl -X POST http://localhost:8080/api/operator/indicators/compare \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -H "X-Locale: zh" \
  -d '{"operatorName": "中国移动", "currentMonth": "202401", "compareMonth": "202312"}'
```

**参数:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operatorName | string | 是 | 运营商名称 |
| currentMonth | string | 是 | 当前月份 (YYYYMM) |
| compareMonth | string | 是 | 对比月份 (YYYYMM) |
| siteCode | string | 否 | 站点编码 |

---

### 指标趋势

**POST** `/api/operator/indicators/trend`

获取指标趋势数据。

**请求:**
```bash
curl -X POST http://localhost:8080/api/operator/indicators/trend \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -H "X-Locale: zh" \
  -d '{"operatorName": "中国移动", "startTime": "202401", "endTime": "202403"}'
```

**参数:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operatorName | string | 是 | 运营商名称 |
| startTime | string | 是 | 开始时间 (YYYYMM) |
| endTime | string | 是 | 结束时间 (YYYYMM) |
| cellId | string | 否 | 小区 ID |
| siteCode | string | 否 | 站点编码 |
| limit | integer | 否 | 返回记录数 (默认 1000) |

---

### 可用时间

**POST** `/api/operator/times`

获取数据库中可用时间点。

**请求:**
```bash
curl -X POST http://localhost:8080/api/operator/times \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -H "X-Locale: zh" \
  -d '{"operatorName": "中国移动"}'
```

**参数:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operatorName | string | 否 | 运营商名称 |
| siteCode | string | 否 | 站点编码 |

---

### 站点小区

**POST** `/api/operator/site-cells`

获取站点小区汇总数据。

**请求:**
```bash
curl -X POST http://localhost:8080/api/operator/site-cells \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -H "X-Locale: zh" \
  -d '{"operatorId": 1, "band": "LTE"}'
```

**参数:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| operatorId | integer | 否 | 运营商 ID |
| band | string | 否 | 频段 (LTE/NR) |

---

### NL2SQL 查询

**POST** `/api/operator/nl2sql/query`

直接执行自然语言 SQL 查询。

**请求:**
```bash
curl -X POST http://localhost:8080/api/operator/nl2sql/query \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -H "X-Locale: zh" \
  -d '{"question": "2024年1月各运营商的用户数"}'
```

---

## 错误代码

所有 API 错误响应采用统一格式:

```json
{
  "code": "E2001",
  "message": "获取站点数据失败",
  "detail": "Connection timeout"
}
```

### 错误代码定义

| 代码 | 名称 | 中文 | 说明 |
|------|------|------|------|
| E1001 | INTENT_DETECTION_FAILED | 意图检测失败 | Agent 无法理解用户查询 |
| E2001 | GET_SITE_CELLS_FAILED | 获取站点数据失败 | 站点小区数据获取失败 |
| E2002 | GET_INDICATORS_FAILED | 获取指标数据失败 | 指标数据获取失败 |
| E2003 | GET_OPERATORS_FAILED | 获取运营商列表失败 | 运营商列表获取失败 |
| E2004 | GET_AVAILABLE_TIMES_FAILED | 获取可用时间失败 | 可用时间获取失败 |
| E3001 | NL2SQL_QUERY_FAILED | NL2SQL查询失败 | 自然语言转 SQL 失败 |
| E3002 | SQL_EXECUTION_FAILED | SQL执行失败 | SQL 执行错误 |
| E4001 | MISSING_API_KEY | 缺少API密钥 | 未提供 API 密钥 |
| E4002 | INVALID_API_KEY | 无效的API密钥 | API 密钥不合法 |
| E5001 | INTERNAL_SERVER_ERROR | 内部服务器错误 | 服务器内部错误 |

### 国际化

错误消息支持中文/英文切换，通过 `X-Locale` 请求头控制:

- `X-Locale: zh` - 中文 (默认)
- `X-Locale: en` - English

**示例:**
```bash
# 中文错误消息 (默认)
curl -X POST http://localhost:8080/api/operator/site-cells \
  -H "X-API-Key: your-api-key" \
  -H "X-Locale: zh"
# 响应: {"code": "E2001", "message": "获取站点数据失败", "detail": "..."}

# 英文错误消息
curl -X POST http://localhost:8080/api/operator/site-cells \
  -H "X-API-Key: your-api-key" \
  -H "X-Locale: en"
# 响应: {"code": "E2001", "message": "Failed to get site data", "detail": "..."}
```

---

## 响应格式

### 成功响应

```json
{
  "data": [...],
  "status": "success"
}
```

### 错误响应 (HTTP 500)

```json
{
  "code": "Exxxx",
  "message": "错误消息",
  "detail": "详细错误信息"
}
```

### 错误响应 (HTTP 401/403)

```json
{
  "code": "E4001",
  "message": "缺少API密钥",
  "detail": "Provide X-API-Key header"
}
```

