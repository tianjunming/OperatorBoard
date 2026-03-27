# 开发视图 (Development View)

## 1. 概述

开发视图描述代码组织、依赖管理和开发流程。

**PlantUML Diagram:** [05-development-view.puml](../diagrams/05-development-view.puml)

![Development View](../diagrams/05-development-view.png)

## 2. 代码组织

### 2.1 仓库结构

```
D--claude-OperatorBoard/
├── src/
│   ├── agent-framework/     # 核心框架
│   │   ├── pyproject.toml
│   │   ├── configs/        # YAML 配置
│   │   └── agent_framework/
│   │       ├── core/       # 核心抽象
│   │       ├── tools/      # 工具系统
│   │       ├── skills/     # Skills 系统
│   │       ├── mcp/        # MCP 协议
│   │       ├── rag/        # RAG 系统
│   │       ├── config/     # 配置加载
│   │       └── utils/      # 工具函数
│   │
│   ├── operator-agent/      # 业务实现
│   │   ├── pyproject.toml
│   │   ├── configs/         # YAML 配置
│   │   │   ├── defaults.yaml         # 公共默认配置
│   │   │   ├── intent_detection.yaml  # Intent Detection LLM 配置
│   │   │   └── tools.yaml            # Java 服务工具配置
│   │   └── operator_agent/
│   │       ├── operator_agent.py
│   │       ├── config/               # 配置加载器
│   │       └── capabilities/  # 能力模块
│   │           ├── tools/    # Java 服务调用
│   │           ├── rag/      # 电信 RAG
│   │           ├── mcp/      # Agent 数据获取
│   │           └── skills/   # 数据处理
│   │
│   ├── operator-service/   # Java NL2SQL 服务 (MVC+CQRS)
│   │   ├── pom.xml
│   │   └── src/main/
│   │       ├── java/com/operator/nl2sql/
│   │       │   ├── config/          # 配置类
│   │       │   ├── controller/      # Controller 层
│   │       │   │   ├── Nl2SqlController.java
│   │       │   │   └── query/       # CQRS Query Controllers
│   │       │   │       ├── OperatorQueryController.java
│   │       │   │       └── IndicatorQueryController.java
│   │       │   ├── service/         # Service 层
│   │       │   │   ├── command/     # CQRS Command
│   │       │   │   │   └── Nl2SqlCommandService.java
│   │       │   │   └── query/       # CQRS Query
│   │       │   │       ├── OperatorQueryService.java
│   │       │   │       └── IndicatorQueryService.java
│   │       │   ├── repository/      # Repository 层
│   │       │   ├── entity/          # 实体类
│   │       │   │   ├── OperatorInfo.java
│   │       │   │   └── IndicatorInfo.java
│   │       │   ├── dto/             # DTO 类
│   │       │   └── mapper/          # MyBatis Mapper XML
│   │       │       ├── OperatorMapper.xml
│   │       │       └── IndicatorMapper.xml
│   │       └── resources/
│   │           ├── application.yml
│   │           └── mapper/
│   │
│   └── agent-app/          # React 前端
│       ├── package.json
│       ├── vite.config.ts
│       └── src/
│
└── docs/                   # 文档
    └── views/              # 4+1 架构视图
```

### 2.2 模块职责

| 模块 | 职责 | 依赖 |
|------|------|------|
| agent-framework/core | BaseAgent, Types, Exceptions | 无 |
| agent-framework/tools | 工具注册、调用管理 | core |
| agent-framework/skills | Skill 注册、执行 | core |
| agent-framework/mcp | MCP 协议、客户端 | core |
| agent-framework/rag | 向量存储、检索 | core |
| agent-framework/config | 配置加载、Schema | core |
| operator-agent/capabilities | 业务扩展 | agent_framework |
| operator-service/controller | REST API 路由 | service |
| operator-service/service/command | NL2SQL 命令处理 | repository |
| operator-service/service/query | 数据查询服务 | repository |
| operator-service/repository | MyBatis Mapper 接口 | entity |

## 3. 依赖管理

### 3.1 Agent Framework 依赖

```toml
# pyproject.toml (agent-framework)
[project]
dependencies = [
    "langchain>=0.3.0",
    "langchain-core>=0.3.0",
    "langchain-community>=0.3.0",
    "pydantic>=2.0.0",
    "pyyaml>=6.0",
    "chromadb>=0.4.0",
    "httpx>=0.25.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "pytest-asyncio>=0.21.0",
    "pytest-cov>=4.0.0",
]
```

### 3.2 Operator Agent 依赖

```toml
# pyproject.toml (operator-agent)
[project]
dependencies = [
    "agent-framework @ file:///${PROJECT_ROOT}/agent-framework",
    "langchain>=0.3.0",
    "langchain-core>=0.3.0",
    "langchain-community>=0.3.0",
    "pydantic>=2.0.0",
    "httpx>=0.25.0",
]
```

### 3.3 Operator Service 依赖 (pom.xml)

```xml
<!-- operator-service/pom.xml -->
<dependencies>
    <!-- Spring Boot -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>

    <!-- MyBatis -->
    <dependency>
        <groupId>org.mybatis.spring.boot</groupId>
        <artifactId>mybatis-spring-boot-starter</artifactId>
        <version>3.0.3</version>
    </dependency>

    <!-- MySQL -->
    <dependency>
        <groupId>com.mysql</groupId>
        <artifactId>mysql-connector-j</artifactId>
    </dependency>

    <!-- Lombok -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
    </dependency>

    <!-- Validation -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-validation</artifactId>
    </dependency>
</dependencies>
```

### 3.4 依赖关系图

```
operator-agent
    │
    └── agent-framework
            │
            ├── langchain-core
            ├── pydantic
            ├── pyyaml
            ├── chromadb
            └── httpx

operator-service (Java)
    │
    ├── Spring Boot
    │     ├── spring-boot-starter-web
    │     └── spring-boot-starter-validation
    ├── MyBatis
    └── MySQL Connector
```

## 4. 开发环境

### 4.1 环境配置

```bash
# .env.development
export AGENT_NAME="OperatorAgent-Dev"
export AGENT_REGISTRY_URL="http://localhost:8001"
export JAVA_SERVICE_BASE_URL="http://localhost:8080"
export VECTOR_STORE_PATH="./data/vectorstore"

# Java NL2SQL Service
export DB_USERNAME="root"
export DB_PASSWORD="root"
export DB_URL="jdbc:mysql://localhost:3306/operator_db"
export NL2SQL_SERVICE_URL="http://localhost:8081"

# .env.production
export AGENT_NAME="OperatorAgent-Prod"
export AGENT_REGISTRY_URL="http://agent-registry:8001"
export JAVA_SERVICE_BASE_URL="http://nl2sql-service:8080"
export VECTOR_STORE_PATH="/data/vectorstore"
```

### 4.2 IDE 配置

```json
// .vscode/settings.json (Python)
{
    "python.analysis.typeCheckingMode": "strict",
    "python.linting.enabled": true,
    "python.formatting.provider": "black",
    "python.testing.pytestEnabled": true,
    "python.testing.pytestArgs": ["tests/"]
}
```

```json
// .vscode/settings.json (Java)
{
    "java.configuration.updateBuildConfiguration": "automatic",
    "java.compile.nullAnalysis.mode": "automatic"
}
```

## 5. 构建与测试

### 5.1 构建命令

```bash
# Python 项目
cd src/agent-framework
pip install -e ".[dev]"

cd src/operator-agent
pip install -e ".[dev]"

# Java 项目 (NL2SQL Service)
cd src/operator-service
mvn compile          # 编译
mvn spring-boot:run   # 运行
mvn test             # 测试

# 前端项目
cd src/agent-app
npm install
npm run dev          # 开发服务器
npm run build        # 生产构建
```

### 5.2 CI/CD 流程

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test-python:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Set up Python
      uses: actions/setup-python@v5
      with:
        python-version: '3.11'
    - name: Install dependencies
      run: |
        pip install -e agent-framework[dev]
        pip install -e operator-agent[dev]
    - name: Run tests
      run: pytest tests/ --cov=src
    - name: Type check
      run: mypy src/

  test-java:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Set up JDK
      uses: actions/setup-java@v4
      with:
        java-version: '17'
    - name: Build with Maven
      run: mvn compile
    - name: Run tests
      run: mvn test

  lint:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Run ruff
      run: pip install ruff && ruff check src/
```

## 6. 代码规范

### 6.1 命名约定

**Python (agent-framework, operator-agent)**

| 类型 | 约定 | 示例 |
|------|------|------|
| 类 | PascalCase | `BaseAgent`, `ToolRegistry` |
| 方法/函数 | snake_case | `add_tool()`, `invoke_tool()` |
| 常量 | UPPER_SNAKE | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| 模块 | snake_case | `async_utils.py`, `java_service_tool.py` |
| 类型 | PascalCase | `AgentConfig`, `ToolResult` |

**Java (operator-service)**

| 类型 | 约定 | 示例 |
|------|------|------|
| 类 | PascalCase | `Nl2SqlController`, `OperatorQueryService` |
| 方法 | camelCase | `findByCountry()`, `executeQuery()` |
| 常量 | UPPER_SNAKE | `MAX_RESULT_ROWS` |
| 包 | lowercase | `com.operator.nl2sql.controller.query` |
| 字段 | camelCase | `operatorName`, `frequencyBand` |

### 6.2 文档字符串

```python
# Python
class BaseTool:
    """Base class for tools in the agent framework.

    Extends langchain_core.tools.BaseTool with async support
    and additional metadata.

    Example:
        ```python
        class MyTool(BaseTool):
            name = "my_tool"
            description = "A custom tool"

            async def run(self, tool_input):
                return f"Received: {tool_input}"
        ```
    """

    async def ainvoke(self, tool_input: Dict[str, Any]) -> str:
        """Async invoke the tool.

        Args:
            tool_input: Input to the tool

        Returns:
            Tool output as string

        Raises:
            ToolExecutionError: If tool execution fails
        """
        ...
```

```java
// Java
/**
 * NL2SQL Command Service (CQRS Command Side)
 *
 * <p>Responsible for:
 * <ul>
 *   <li>Generating SQL from natural language queries via SQLCoder</li>
 *   <li>Executing generated SQL safely</li>
 *   <li>Validating SQL for security</li>
 * </ul>
 *
 * @since 2.0
 */
@Service
public class Nl2SqlCommandService {

    /**
     * Execute a natural language query and return results.
     *
     * @param request the NL2SQL request containing the natural language query
     * @return list of result maps
     */
    public List<Map<String, Object>> executeQuery(String sql, Integer maxResults) {
        // implementation
    }
}
```

## 7. 版本管理

### 7.1 发布流程

```
feature branch → develop → release → main
     │            │         │        │
     └────────────┴─────────┴────────┘
              (merge + tag)
```

### 7.2 版本号

```
agent-framework: 0.1.0, 0.2.0, ...
operator-agent: 0.1.0, 0.2.0, ...
operator-service: 1.0.0, 1.1.0, ... (MVC+CQRS)

语义化版本:
- MAJOR: 不兼容的 API 变更
- MINOR: 向后兼容的功能添加
- PATCH: 向后兼容的问题修复
```

## 8. 贡献指南

### 8.1 Pull Request 流程

1. Fork 仓库并创建 feature 分支
2. 遵循代码规范并添加测试
3. 提交 PR 并描述变更
4. 等待代码审查
5. 合并到目标分支

### 8.2 代码审查清单

```
□ Python/Java 代码遵循命名约定
□ 添加/更新了文档字符串
□ 新功能有对应的测试
□ 所有测试通过
□ 没有引入安全问题
□ 更新了相关配置文件
□ 添加了必要的依赖说明
□ 更新了架构文档 (如有必要)
```

## 9. 数据库迁移

### 9.1 Schema 更新

数据库 Schema 文件位于 `src/operator-service/src/main/resources/schema.sql`

```bash
# 初始化数据库
mysql -u root -p < src/operator-service/src/main/resources/schema.sql
```

### 9.2 Schema 变更流程

1. 修改 `schema.sql` 文件
2. 更新 `SchemaCache.java` 的 schema 描述
3. 更新对应的 Entity 类
4. 更新 MyBatis Mapper XML
5. 更新 Repository 接口
6. 更新 Query Service
7. 更新前端 Dashboard
