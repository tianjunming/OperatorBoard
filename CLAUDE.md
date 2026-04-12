# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OperatorBoard is a multi-agent telecom operator data management system with NL2SQL capabilities. It consists of 5 main components:

- **agent-framework**: Python core framework with tools, skills, RAG, MCP, and API server base classes
- **operator-agent**: Python agent that integrates with Java NL2SQL service (port 8080)
- **predict-agent**: Python agent for coverage prediction Q&A and simulation tuning (port 8083)
- **operator-service**: Java Spring Boot NL2SQL microservice
- **agent-app**: React frontend with data dashboard
- **docs**: 4+1 architecture documentation

## Development Commands

### Frontend (agent-app)
```bash
cd agent-app
npm install
npm run dev          # Start frontend dev server
npm run server       # Start API proxy server
npm run start:all    # Start both
```

### Python Projects
```bash
# Install in development mode
pip install -e ./src/agent-framework
pip install -e ./src/operator-agent
pip install -e ./src/predict-agent

# Run API servers
python -m operator_agent.api.server  # port 8080
python -m predict_agent.api.server   # port 8083

# Run tests
pytest
```

### Java Service (operator-service)
```bash
cd operator-service
mvn compile          # Compile
mvn spring-boot:run # Run
```

### Database Setup
```bash
# Initialize MySQL database
mysql -u root -p < src/main/resources/schema.sql
```

## Architecture

```
agent-app (React) → API Proxy → operator-agent (8080) → operator-service (8081) → MySQL
                                              ↓                      ↓
                                          SQLCoder LLM         SQLCoder LLM

predict-agent (8083) → Coverage Prediction Q&A + Simulation Tuning
```

### Key Technologies
- **Frontend**: React 18, Recharts, Vite, Lucide Icons
- **Python**: LangChain, FastAPI, httpx, Pydantic
- **Java**: Spring Boot 3.2, MyBatis, HikariCP
- **Database**: MySQL 8.0
- **NL2SQL**: Self-hosted SQLCoder model

### Agent Framework API Module
- `agent_framework.api.BaseAgentServer` - FastAPI server base class with singleton agent management
- `agent_framework.api.ErrorCode` - Immutable error code object with i18n support
- `agent_framework.api.AgentAPIError` - API exception class with error code and detail
- `agent_framework.api.get_error_response()` - Standard error response builder

### ErrorCode System
```python
# ErrorCode is a frozen dataclass with:
# - code: str (e.g., "E1101")
# - message_en/message_zh: localized messages
# - category: ErrorCategory enum
# - status_code: HTTP status

# Usage
raise AgentAPIError(INTENT_DETECTION_FAILED, detail="API timeout")
get_error_response(GET_SITE_CELLS_FAILED, locale="zh", detail="timeout")
```

### Configuration
- Python config: `configs/*.yaml`
  - `defaults.yaml` - 公共默认配置 (LLM 模型等)
  - `intent_detection.yaml` - Intent Detection LLM 配置
  - `tools.yaml` - Java 服务工具配置
  - `coverage_prediction.yaml` - 覆盖预测 LLM 配置
  - `simulation.yaml` - 仿真参数配置
  - `rag_loaders.yaml` - RAG 语料加载器配置
- Java config: `src/main/resources/application.yml`
- Environment variables: `DB_USERNAME`, `DB_PASSWORD`, `NL2SQL_SERVICE_URL`, `INTENT_API_KEY`, `INTENT_LLM_ENDPOINT`, `INTENT_LLM_MODEL`

### RAG Module (语料加载器)
- `agent_framework.rag.loaders.BaseLoader` - 语料加载器抽象基类
- `agent_framework.rag.loaders.DirectoryLoader` - 目录扫描加载器 (txt/md/json/csv/pdf/docx)
- `agent_framework.rag.loaders.DatabaseLoader` - MySQL 数据库加载器
- `agent_framework.rag.loaders.HybridLoader` - 混合加载器 (多数据源组合)
- `agent_framework.rag.loaders.DocumentLoaderManager` - 统一加载器管理器
- `agent_framework.rag.VectorStoreManager` - 向量存储管理器 (扩展支持加载器)
- **配置**: `configs/rag_loaders.yaml` - 目录/数据库/混合加载器配置

### Intent Detection (LLM-based)
- **Model**: MiniMax M2-her (intent_detection.yaml 配置)
- **Endpoint**: https://api.minimaxi.com/v1/text/chatcompletion_v2
- **Supported Intents**: site_data, indicator_data, operator_list, latest_data, nl2sql
- **Operator Mapping**: 北京联通/上海联通 → China Unicom, etc.
- **Note**: 使用英文 prompt 避免 MiniMax 中文编码问题

## Key Files
- `operator-agent/src/operator_agent/api/server.py` - FastAPI endpoints for NL2SQL
- `predict-agent/src/predict_agent/api/server.py` - FastAPI endpoints for coverage prediction
- `operator-service/src/main/java/com/operator/nl2sql/` - Java NL2SQL implementation
- `operator-service/src/main/resources/schema.sql` - Database schema with sample data
- `agent-framework/src/agent_framework/api/` - Framework API base classes
- `docs/views/` - Architecture documentation

## Testing

### E2E Testing (Playwright)
```bash
cd agent-app

# Install dependencies and browsers
npm install
npx playwright install chromium

# Run all E2E tests
npx playwright test --project=chromium --reporter=line

# Run specific test file
npx playwright test tests/18-functions-e2e.spec.js --project=chromium --reporter=line

# Run with UI
npx playwright test --ui

# View test report
npx playwright show-report
```

### E2E Test Files
- `tests/18-functions-e2e.spec.js` - 18个核心功能E2E测试 + 数据库一致性验证 (29 tests, 28+ passing)
- `tests/ui-optimizations-e2e.spec.js` - UI优化功能测试套件 (20 tests)

### Test Configuration
- `playwright.config.js` - Playwright全局配置
  - timeout: 180000ms (3分钟)
  - expect timeout: 30000ms
  - screenshot: always (开发) / only-on-failure (CI)
  - video: retain-on-failure (开发) / off (CI)
  - trace: retain-on-failure (开发) / on-first-retry (CI)

### Database Consistency Validation
Tests validate UI results match database data by:
- Direct MySQL queries via mysql2/promise
- Comparing extracted values with UI content
- Using regex patterns for numeric extraction
