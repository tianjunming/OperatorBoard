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

## 配置说明

### 环境变量配置

#### operator-agent (Python FastAPI)

| 环境变量 | 必填 | 默认值 | 说明 |
|---------|------|--------|------|
| `AGENT_CONFIG_DIR` | 否 | `./configs` | Agent 配置目录 |
| `NL2SQL_SERVICE_URL` | 否 | `http://localhost:8081` | Java NL2SQL 服务地址 |
| `OPERATOR_AGENT_API_KEYS` | 否 | (空) | API 密钥列表，逗号分隔 |
| `ALLOWED_ORIGINS` | 否 | `localhost:3000,localhost:5173` | CORS 允许的源地址 |

**示例:**
```bash
# Linux/macOS
export OPERATOR_AGENT_API_KEYS="key1,key2,key3"
export ALLOWED_ORIGINS="http://localhost:3000,http://example.com"
export NL2SQL_SERVICE_URL="http://localhost:8081"

# Windows (PowerShell)
$env:OPERATOR_AGENT_API_KEYS="key1,key2,key3"
$env:ALLOWED_ORIGINS="http://localhost:3000"
$env:NL2SQL_SERVICE_URL="http://localhost:8081"
```

#### operator-agent 配置文件

**`src/operator-agent/configs/tools.yaml`** - 工具配置

```yaml
tools:
  nl2sql:
    name: "nl2sql"
    description: "NL2SQL service for operator data querying"
    enabled: true
    config:
      service_name: "nl2sql-service"
      base_url: "http://localhost:8081"
      api_prefix: "/api/v1/nl2sql"
      timeout: 60
      api_key: "${NL2SQL_API_KEY:}"    # 可选 API 密钥
```

**`src/operator-agent/configs/intent_detection.yaml`** - 意图检测配置

```yaml
intent_detection:
  enabled: true
  llm_endpoint: "https://api.minimaxi.com/v1/text/chatcompletion_v2"
  llm_model: "M2-her"
  api_key: "${INTENT_API_KEY}"        # 必填 - Intent Detection API 密钥
  timeout: 30
  max_tokens: 200
  temperature: 0.1
```

#### agent-framework 配置

**`src/agent-framework/configs/agent.yaml`** - Agent 基础配置

```yaml
agent:
  name: "OperatorAgent"
  description: "A modular agent with tool, skill, and RAG capabilities"
  model_name: "claude-3-sonnet-20240229"  # 或其他 Claude 模型
  temperature: 0.7
  max_tokens: 4096
  system_prompt: |
    You are a helpful AI assistant...

  tools:
    enabled: true
    auto_load: true

  skills:
    enabled: true
    auto_load: true

  rag:
    enabled: true
    top_k: 5
```

**`src/agent-framework/configs/tools.yaml`** - 通用工具配置

```yaml
tools:
  search:
    name: "web_search"
    description: "Search the web for information"
    enabled: true
    config:
      max_results: 10
      timeout: 30

  calculator:
    name: "calculator"
    description: "Perform mathematical calculations"
    enabled: true
    config:
      precision: 10

  weather:
    name: "weather"
    description: "Get weather information"
    enabled: true
    config:
      api_key: "${WEATHER_API_KEY}"    # 可选
      unit: "celsius"
```

**`src/agent-framework/configs/mcp.yaml`** - MCP 服务器配置

```yaml
mcp:
  servers:
    filesystem:
      name: "filesystem"
      description: "File system operations"
      command: "npx"
      args:
        - "-y"
        - "@modelcontextprotocol/server-filesystem"
        - "${MCP_FS_PATH:/tmp}"
      enabled: true

    github:
      name: "github"
      description: "GitHub API integration"
      command: "npx"
      args:
        - "-y"
        - "@modelcontextprotocol/server-github"
      enabled: true
      env:
        GITHUB_TOKEN: "${GITHUB_TOKEN}"  # 可选

  client:
    timeout: 30
    retry_attempts: 3
    retry_delay: 1
```

#### operator-service (Java Spring Boot)

**`src/operator-service/src/main/resources/application.yml`**

```yaml
server:
  port: 8081

spring:
  application:
    name: nl2sql-service

  datasource:
    url: jdbc:mysql://localhost:3306/operator_db?useSSL=false&serverTimezone=UTC
    username: ${DB_USERNAME}           # 必填 - 数据库用户名
    password: ${DB_PASSWORD}           # 必填 - 数据库密码
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 30000

nl2sql:
  sqlcoder:
    url: http://localhost:8081         # SQLCoder 服务地址
    timeout: 60
  security:
    enabled: false
    api-keys: ${NL2SQL_API_KEYS:}      # 可选 - API 密钥列表
    allow-destructive-queries: false   # 是否允许危险操作 (DROP, DELETE)
    max-result-rows: 1000              # 最大返回行数
  schema:
    refresh-cron: "0 0 * * * *"        # Schema 刷新 cron 表达式
```

### 数据库配置

```bash
# MySQL 数据库初始化
mysql -u root -p < src/operator-service/src/main/resources/schema.sql
```

**环境变量:**
| 环境变量 | 必填 | 说明 |
|---------|------|------|
| `DB_USERNAME` | 是 | MySQL 用户名 |
| `DB_PASSWORD` | 是 | MySQL 密码 |

### 前端配置 (agent-app)

**`src/agent-app/.env`** (可选)

```bash
VITE_API_BASE_URL=http://localhost:8000
```

### 配置优先级

配置来源优先级 (从高到低):

1. **环境变量** - 最高优先级
2. **命令行参数**
3. **配置文件** - `configs/*.yaml`, `application.yml`
4. **默认配置** - 代码中的默认值

### 完整启动配置示例

```bash
# 1. 设置环境变量
export DB_USERNAME="root"
export DB_PASSWORD="your_password"
export INTENT_API_KEY="your_intent_detection_key"
export OPERATOR_AGENT_API_KEYS="your-api-key"
export NL2SQL_SERVICE_URL="http://localhost:8081"

# 2. 启动 MySQL (确保数据库已初始化)
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS operator_db"
mysql -u root -p operator_db < src/operator-service/src/main/resources/schema.sql

# 3. 启动 Java NL2SQL 服务
cd src/operator-service
mvn spring-boot:run

# 4. 启动 Python Agent
cd src/operator-agent
pip install -e ./src/agent-framework
pip install -e .
python -m operator_agent.api.server

# 5. 启动前端
cd src/agent-app
npm install
npm run dev
```

## 测试

### E2E 测试 (Playwright)

```bash
cd src/agent-app

# 安装依赖和浏览器
npm install
npx playwright install chromium

# 运行所有E2E测试
npx playwright test --project=chromium --reporter=line

# 运行特定测试文件
npx playwright test tests/18-functions-e2e.spec.js --project=chromium --reporter=line

# UI模式运行
npx playwright test --ui

# 查看测试报告
npx playwright show-report
```

### 测试文件

| 文件 | 描述 | 测试数 |
|------|------|--------|
| `tests/18-functions-e2e.spec.js` | 18个核心功能E2E测试 + 数据库一致性验证 | 29 |
| `tests/ui-optimizations-e2e.spec.js` | UI优化功能测试套件 | 20 |

### 测试配置

`playwright.config.js`:
- timeout: 180000ms (3分钟)
- expect timeout: 30000ms
- screenshot: always (开发) / only-on-failure (CI)
- video: retain-on-failure (开发) / off (CI)
- trace: retain-on-failure (开发) / on-first-retry (CI)

### 数据库一致性验证

测试通过以下方式验证UI结果与数据库数据一致性：
- 通过 mysql2/promise 直接查询数据库
- 使用正则表达式提取UI内容中的数值
- 对比UI结果与数据库预期值

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

