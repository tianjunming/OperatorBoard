# 开发视图 (Development View)

## 1. 概述

开发视图描述代码组织、依赖管理和开发流程。

## 2. 代码组织

### 2.1 仓库结构

```
D--claude-OperatorBoard/
├── agent-framework/           # 核心框架仓库
│   ├── pyproject.toml
│   ├── configs/              # YAML 配置
│   ├── src/
│   │   └── agent_framework/
│   │       ├── core/         # 核心抽象
│   │       ├── tools/        # 工具系统
│   │       ├── skills/        # Skills 系统
│   │       ├── mcp/          # MCP 协议
│   │       ├── rag/          # RAG 系统
│   │       ├── config/        # 配置加载
│   │       └── utils/        # 工具函数
│   └── tests/                # 单元测试
│
├── operator-agent/           # 业务实现仓库
│   ├── pyproject.toml
│   ├── src/
│   │   └── operator_agent/
│   │       ├── operator_agent.py
│   │       └── capabilities/  # 能力模块
│   │           ├── tools/    # Java 服务调用
│   │           ├── rag/      # 电信 RAG
│   │           ├── mcp/      # Agent 数据获取
│   │           └── skills/   # 数据处理
│   └── tests/
│
└── docs/                     # 文档
    └── views/                # 4+1 架构视图
```

### 2.2 模块职责

| 模块 | 职责 | 依赖 |
|------|------|------|
| core | BaseAgent, Types, Exceptions | 无 |
| tools | 工具注册、调用管理 | core |
| skills | Skill 注册、执行 | core |
| mcp | MCP 协议、客户端 | core |
| rag | 向量存储、检索 | core |
| config | 配置加载、Schema | core |
| capabilities | 业务扩展 | agent_framework |

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

### 3.3 依赖关系图

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
```

## 4. 开发环境

### 4.1 环境配置

```bash
# .env.development
export AGENT_NAME="OperatorAgent-Dev"
export AGENT_REGISTRY_URL="http://localhost:8001"
export JAVA_SERVICE_BASE_URL="http://localhost:8080"
export VECTOR_STORE_PATH="./data/vectorstore"

# .env.production
export AGENT_NAME="OperatorAgent-Prod"
export AGENT_REGISTRY_URL="http://agent-registry:8001"
export JAVA_SERVICE_BASE_URL="http://java-service:8080"
export VECTOR_STORE_PATH="/data/vectorstore"
```

### 4.2 IDE 配置

```json
// .vscode/settings.json
{
    "python.analysis.typeCheckingMode": "strict",
    "python.linting.enabled": true,
    "python.formatting.provider": "black",
    "python.testing.pytestEnabled": true,
    "python.testing.pytestArgs": ["tests/"]
}
```

## 5. 构建与测试

### 5.1 构建命令

```bash
# 安装开发依赖
cd agent-framework
pip install -e ".[dev]"

cd operator-agent
pip install -e ".[dev]"

# 运行测试
pytest tests/

# 代码检查
black src/
ruff check src/
mypy src/
```

### 5.2 CI/CD 流程

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
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

  lint:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Run ruff
      run: pip install ruff && ruff check src/
```

## 6. 代码规范

### 6.1 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 类 | PascalCase | `BaseAgent`, `ToolRegistry` |
| 方法/函数 | snake_case | `add_tool()`, `invoke_tool()` |
| 常量 | UPPER_SNAKE | `MAX_RETRIES`, `DEFAULT_TIMEOUT` |
| 模块 | snake_case | `async_utils.py`, `java_service_tool.py` |
| 类型 | PascalCase | `AgentConfig`, `ToolResult` |

### 6.2 文档字符串

```python
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
□ 代码遵循命名约定
□ 添加/更新了文档字符串
□ 新功能有对应的测试
□ 所有测试通过
□ 没有引入安全问题
□ 更新了相关配置文件
□ 添加了必要的依赖说明
```
