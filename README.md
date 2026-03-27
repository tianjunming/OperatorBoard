# OperatorBoard

运营商数据管理平台，基于多Agent架构和NL2SQL能力。

## 系统架构

```
agent-app (React) → operator-agent (Python) → operator-service (Java) → MySQL
                                                      ↓
                                                  SQLCoder (LLM)
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
