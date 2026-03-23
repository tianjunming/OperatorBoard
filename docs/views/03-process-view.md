# 进程视图 (Process View)

## 1. 概述

进程视图关注系统的并发处理、异步执行和进程间通信。

## 2. 异步架构

### 2.1 异步执行模型

```
┌──────────────────────────────────────────────────────────────┐
│                      Event Loop                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Main Task                           │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐            │ │
│  │  │ Coroutine│  │ Coroutine│  │ Coroutine│            │ │
│  │  │  (Tool)  │  │  (Skill) │  │   (RAG)  │            │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘            │ │
│  │       │              │              │                  │ │
│  │       ▼              ▼              ▼                  │ │
│  │  ┌─────────────────────────────────────────┐           │ │
│  │  │           Async I/O Operations          │           │ │
│  │  │  (HTTP, File, Database, Vector Store)   │           │ │
│  │  └─────────────────────────────────────────┘           │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 并发控制

```python
# 使用 Semaphore 控制并发
async def gather_with_concurrency(n, *tasks):
    semaphore = asyncio.Semaphore(n)
    async def sem_task(task):
        async with semaphore:
            return await task
    return await asyncio.gather(*(sem_task(t) for t in tasks))
```

## 3. 关键流程

### 3.1 工具调用流程

```
User Request
     │
     ▼
┌─────────────────┐
│  OperatorAgent  │
│    .run()       │
└────────┬────────┘
         │ async
         ▼
┌─────────────────┐     ┌─────────────────┐
│  ToolManager    │     │   HTTP Client   │
│ .invoke_tool()  │────>│  (httpx)        │
└────────┬────────┘     └────────┬────────┘
         │                        │
         │                        │ async request
         ▼                        ▼
    ┌─────────┐           ┌─────────────────┐
    │ ToolResult│<────────│ Java Microservice│
    └─────────┘           └─────────────────┘
         │
         ▼
    Return to User
```

### 3.2 Skill 链式执行流程

```
┌─────────────────────────────────────────────────────────────┐
│                    SkillExecutor                             │
│                                                             │
│  Input ──> Skill1 ──> Result1 ──> Skill2 ──> Result2 ──>  │
│           │                          │                      │
│           └──────────────────────────┘                      │
│                    (Optional Chain)                          │
└─────────────────────────────────────────────────────────────┘

execute_chain():
  results = []
  for skill in chain:
      result = await execute(skill)
      results.append(result)
      if not result.success:
          break
  return results
```

### 3.3 MCP 客户端请求流程

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ OperatorAgent │────>│  MCPClient   │────>│ Agent Registry│
│              │<────│              │<────│              │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  │ async
                                                  ▼
                                          ┌──────────────┐
                                          │ Target Agent │
                                          └──────────────┘
```

## 4. 线程模型

### 4.1 线程使用

| 组件 | 线程模型 | 说明 |
|------|----------|------|
| Agent 主逻辑 | asyncio 单线程 | 事件循环驱动 |
| HTTP 请求 | asyncio 线程池 | 内部使用 event loop |
| 向量操作 | asyncio 线程池 | 避免阻塞 |
| 同步工具 | run_in_executor | 线程池执行 |

### 4.2 线程安全

```python
# Singleton 使用线程锁
class ToolRegistry:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance
```

## 5. 资源管理

### 5.1 连接池

```python
# HTTP 客户端连接复用
async with httpx.AsyncClient(timeout=30.0) as client:
    response = await client.request(method, url, ...)

# MCP 服务器连接
class MCPServerConnection:
    async def start(self):
        self._client = MCPClient(url)
        await self._client.connect()

    async def cleanup(self):
        await self._client.disconnect()
```

### 5.2 批量处理

```python
class AsyncBatch:
    """批量处理器"""

    def __init__(self, batch_size=10, delay=0.1):
        self._batch_size = batch_size
        self._pending = []

    async def add(self, item):
        self._pending.append(item)
        if len(self._pending) >= self._batch_size:
            await self._process_batch()
```

## 6. 错误处理与重试

### 6.1 重试机制

```python
@async_retry(max_attempts=3, delay=1.0, backoff=2.0)
async def send_request_with_retry():
    ...

# MCP 客户端重试
for attempt in range(retry_attempts):
    try:
        return await client.send_request(method, params)
    except HTTPError:
        if attempt == max_attempts - 1:
            raise
        await asyncio.sleep(retry_delay * (backoff ** attempt))
```

### 6.2 超时控制

```python
# MCP 客户端超时
MCPClient(server_url, timeout=30.0)

# Skill 执行超时
async def wait_for(coro, timeout=60.0, default=None):
    try:
        return await asyncio.wait_for(coro, timeout=timeout)
    except asyncio.TimeoutError:
        return default
```

## 7. 性能考虑

| 优化点 | 策略 | 位置 |
|--------|------|------|
| 并发工具调用 | gather_with_concurrency | async_utils.py |
| 连接复用 | httpx AsyncClient | java_service_tool.py |
| 批量文档添加 | AsyncBatch | async_utils.py |
| 向量查询并行 | asyncio.gather | retriever.py |
| Skill 链式执行 | 短路评估 | executor.py |
