# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OperatorBoard is a multi-agent telecom operator data management system with NL2SQL capabilities. It consists of 4 main components:

- **agent-framework**: Python core framework with tools, skills, RAG, and MCP
- **operator-agent**: Python agent that integrates with Java NL2SQL service
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

### Python Projects (agent-framework, operator-agent)
```bash
# Install in development mode
pip install -e ./agent-framework
pip install -e ./operator-agent

# Run operator-agent API server
python -m operator_agent.api.server

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
agent-app (React) → operator-agent (Python FastAPI) → operator-service (Java Spring Boot) → MySQL
                                                      ↓
                                                  SQLCoder (LLM)
```

### Key Technologies
- **Frontend**: React 18, Recharts, Vite, Lucide Icons
- **Python**: LangChain, FastAPI, httpx, Pydantic
- **Java**: Spring Boot 3.2, MyBatis, HikariCP
- **Database**: MySQL 8.0
- **NL2SQL**: Self-hosted SQLCoder model

### Configuration
- Python config: `configs/*.yaml`
- Java config: `src/main/resources/application.yml`
- Environment variables: `DB_USERNAME`, `DB_PASSWORD`, `NL2SQL_SERVICE_URL`

## Key Files
- `operator-agent/src/operator_agent/api/server.py` - FastAPI endpoints for NL2SQL
- `operator-service/src/main/java/com/operator/nl2sql/` - Java NL2SQL implementation
- `operator-service/src/main/resources/schema.sql` - Database schema with sample data
- `docs/views/` - Architecture documentation
