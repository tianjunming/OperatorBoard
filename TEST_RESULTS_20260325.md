# OperatorBoard 测试执行报告

**执行日期:** 2026-03-25

## 测试结果汇总

| 测试类型 | 文件 | 结果 | 通过/总数 |
|----------|------|------|----------|
| System Tests (ST) | `tests/test_system.py` | ✅ 通过 | 16/16 |
| Integration Tests (IT) | `tests/test_integration.py` | ✅ 通过 | 10/10 |
| MCP Tests | `tests/test_mcp.py` | ⚠️ 依赖缺失 | 0/9 (需要 langchain_openai) |

## System Tests (ST) 详细结果

| 测试用例 | 状态 | 说明 |
|----------|------|------|
| test_protocol_models | ✅ | MCP 协议模型实例化验证 |
| test_error_boundary_component_exists | ✅ | ErrorBoundary.jsx 文件存在 |
| test_error_boundary_renders | ✅ | ErrorBoundary 渲染逻辑正确 |
| test_dashboard_css_structure | ✅ | Dashboard.css 不包含 nav 样式 |
| test_index_css_has_nav_styles | ✅ | index.css 包含共享 nav 样式 |
| test_retry_config_exists | ✅ | useAgentStream 重试配置存在 |
| test_on_retry_callback | ✅ | onRetry 回调支持 |
| test_loading_keys_pattern | ✅ | useOperatorData loadingKeys 模式 |
| test_security_config_exists | ✅ | SecurityConfig.java 存在 |
| test_security_config_structure | ✅ | API Key 认证结构正确 |
| test_scheduled_refresh_exists | ✅ | SchemaCache @Scheduled 刷新 |
| test_mono_return_type | ✅ | SqlCoderService Mono 返回类型 |
| test_intent_detection_yaml_exists | ✅ | intent_detection.yaml 存在 |
| test_intent_detection_config_structure | ✅ | 意图检测配置结构正确 |
| test_single_definition_location | ✅ | MCPServerDefinition 单一定义 |
| test_architecture_analysis_updated | ✅ | 文档已更新 MCP 传输层 |

## Integration Tests (IT) 详细结果

| 测试用例 | 状态 | 说明 |
|----------|------|------|
| test_mcp_protocol_request_response_cycle | ✅ | JSON-RPC 请求/响应循环 |
| test_mcp_protocol_notification_cycle | ✅ | JSON-RPC 通知循环 |
| test_mcp_protocol_error_handling | ✅ | 错误响应处理 |
| test_server_definition_http_transport | ✅ | HTTP 传输定义 |
| test_server_definition_websocket_transport | ✅ | WebSocket 传输定义 |
| test_server_definition_stdio_transport | ✅ | Stdio 传输定义 |
| test_intent_detection_config_structure | ✅ | 意图检测配置结构 |
| test_java_service_config_with_api_key | ✅ | Java 服务 API Key 配置 |
| test_tools_config_api_key_support | ✅ | 工具配置 API Key 支持 |
| test_mono_creation_pattern | ✅ | 响应式 Mono 创建模式 |

## MCP Tests 结果

**状态:** ⚠️ 需要依赖安装

需要执行以下命令安装依赖后重新运行:
```bash
pip install langchain-openai
cd src/agent-framework && PYTHONPATH=src python -m pytest tests/test_mcp.py -v
```

## 验证清单

### 前端重构验证
- [x] ErrorBoundary.jsx 已创建
- [x] App.jsx 集成 ErrorBoundary
- [x] useAgentStream.js 添加重试机制
- [x] useOperatorData.js 使用 loadingKeys Set
- [x] Dashboard.css 移除共享样式
- [x] index.css 包含 nav 样式

### Java 重构验证
- [x] SecurityConfig.java 已创建
- [x] SchemaCache.java 添加 @Scheduled
- [x] SqlCoderService.java 返回 Mono

### Python 重构验证
- [x] intent_detection.yaml 已创建
- [x] MCPServerDefinition 统一
- [x] MCP 传输层实现 (HTTP/WebSocket/Stdio)

### 文档验证
- [x] 07-architecture-analysis.md 已更新
- [x] MCP 传输层实现已记录
- [x] 重构完成状态已更新

## 待处理项

1. **MCP Tests 依赖**: 安装 `langchain-openai` 后重新运行
2. **UI 验证**: 执行 `npm run build` 验证前端构建

---

# 深度架构分析报告

**分析日期:** 2026-03-25

## 1. 架构概览

```
agent-app (React) --> operator-agent (Python FastAPI) --> operator-service (Java Spring Boot) --> MySQL
                                                                          |
                                                                      SQLCoder (LLM)
```

### 技术栈

| 组件 | 技术 | 用途 |
|------|------|------|
| agent-framework | Python 3.10+, LangChain | 核心框架: Tools, Skills, RAG, MCP |
| operator-agent | Python 3.10+, FastAPI, httpx | 业务 Agent + REST API |
| operator-service | Java 17, Spring Boot 3.2, MyBatis | NL2SQL 微服务 |
| agent-app | React 18, Vite, Recharts, Node.js | 前端 + API 代理 |
| Database | MySQL 8.0, HikariCP | 关系型数据存储 |
| LLM | SQLCoder (自托管) | 自然语言转 SQL |

## 2. 架构优势

### 2.1 清晰的关注点分离
- **分层架构**: UI/Business/Data 分离清晰
- **CQRS 模式**: Java 服务中命令(NL2SQL)与查询操作分离
- **模块边界**: 每个组件职责明确

### 2.2 MCP 协议实现
JSON-RPC 2.0 实现结构良好:
- **三种传输机制**: HTTP, WebSocket, Stdio
- **协议模型**: MCPRequest, MCPResponse, MCPNotification, MCPTool
- **异步支持**: WebSocket 传输正确使用 asyncio 和 ping/pong

### 2.3 安全措施
- **提示注入防护**: `PromptSanitizer` 正则模式 + 白名单
- **SQL 注入防御**: `isSqlReadOnly()` 检查 + MyBatis 参数化查询
- **API Key 认证**: Java 服务可选 `ApiKeyAuthFilter`(默认禁用)
- **CORS 配置**: 允许特定来源(非通配符)

### 2.4 配置管理
- **外部化提示词**: `intent_detection.yaml` 模板化意图检测
- **工具配置**: `tools.yaml` 外部化服务定义
- **环境变量支持**: `${NL2SQL_SERVICE_URL:default}` 模式

### 2.5 全面文档
- **4+1 架构视图**: 场景、逻辑、进程、部署、开发视图
- **PlantUML 图表**: 组件交互可视化
- **测试结果文档**: `TEST_RESULTS_20260325.md`

### 2.6 可靠性特性
- **Error Boundary**: React `ErrorBoundary.jsx` 优雅错误处理
- **重试机制**: `useAgentStream.js` 指数退避(3次重试, 1s-10s 延迟)
- **加载状态跟踪**: `loadingKeys: Set<string>` 独立请求状态

## 3. 架构弱点和技术债务

### 3.1 关键问题

#### 响应式栈中的阻塞 I/O
**文件**: `SqlCoderService.java:55`
```java
@Deprecated
private String generateSql(String nlQuery, Nl2SqlRequest request) {
    return generateSqlAsync(nlQuery, request).block();  // 阻塞!
}
```
废弃的同步方法在响应式 `Mono` 上调用 `.block()`，这:
- 阻塞响应式线程池
- 消除非阻塞优势
- 高负载下可能死锁

#### 硬编码数据库凭证
**文件**: `application.yml:10-11`
```yaml
username: test
password: test
```
生产配置包含明文测试凭证，应仅使用环境变量。

#### 静态 Schema 缓存
**文件**: `SchemaCache.java:46-135`

Schema 作为字符串硬编码而非动态从数据库自省:
```java
sb.append("# Database Schema\n\n");
sb.append("## operator_info (运营商信息表)\n");
```
Schema 变更需修改代码。

#### 意图检测依赖外部 LLM
**文件**: `server.py:340-344`
```python
intent_result = await agent.process_natural_language_query(request.input)
```
意图检测完全依赖 `localhost:8081` 的 SQLCoder LLM，LLM 不可用时无回退。

### 3.2 高优先级问题

#### 缺少 API 限流
所有端点无限流保护:
- 拒绝服务攻击风险
- LLM token 耗尽
- 数据库连接耗尽

#### CORS 配置不一致
**文件**: `http.py:55-60`
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  // HTTP 传输中通配符!
    ...
)
```
而 `server.py` 使用 `get_allowed_origins()`。

#### 单例 Agent 实例
**文件**: `server.py:31`
```python
_agent: Optional[OperatorAgent] = None
```
全局单例阻止水平扩展，应使用依赖注入和作用域生命周期。

#### 无熔断器模式
LLM 调用(`SqlCoderService`)无熔断器，LLM 卡住会导致级联故障。

### 3.3 中优先级问题

#### 错误响应不一致
**文件**: `server.py:343-344, 366-367`
```python
if "error" in intent_result:
    return {"content": f"Intent detection failed: {intent_result['error']}"}
```
有些错误返回 `{"content": "..."}` 其他返回 `{"error": "..."}`，无标准化错误响应格式。

#### 过宽的异常捕获
**文件**: `server.py:510`
```python
except Exception as e:
    return {"content": f"处理查询时出错: {str(e)}"}
```
捕获所有异常包括编程错误，隐藏 bug。

#### 缺少请求验证
**文件**: `server.py:215`
```python
async def nl2sql_query(request: Dict[str, Any], _: bool = Depends(verify_api_key)):
```
使用 `Dict[str, Any]` 无 Pydantic 验证，畸形请求直接传递到服务。

#### MCP 客户端外部 httpx 依赖
**文件**: `agent_mcp_client.py:4`
```python
import httpx
```
在 `list_agents()`, `get_agent()` 等方法中每次请求创建新 `httpx.AsyncClient`，应复用客户端实例。

#### 测试覆盖有限
**文件**: `TEST_RESULTS_20260325.md`
- MCP Tests: 0/9 (缺少 `langchain-openai` 依赖)
- Python 和 Java 服务间无集成测试
- 无 E2E 测试

### 3.4 低优先级问题

#### 硬编码运营商名称映射
**文件**: `server.py:373-381`
```python
# 精确或部分匹配
if op_name == operator_name or operator_name in op_name or op_name in operator_name:
```
运营商名称的模糊字符串匹配脆弱，应使用正确的映射字典。

#### Schema 刷新默认禁用
**文件**: `application.yml:35`
```yaml
nl2sql:
  schema:
    refresh-cron: "0 0 * * * *"
```
定时刷新默认禁用(`refresh-enabled: false`)，依赖重启更新。

#### WebSocket 连接潜在内存泄漏
**文件**: `http.py:111-127`
WebSocket 连接存储在 `_websocket_connections` 字典但仅在断开时清理，若断开异常则陈旧条目可能残留。

#### MCP 协议错误处理不完整
**文件**: `http.py:85-104`
```python
except ValueError as e:
    return Response(...)
except Exception as e:
    return Response(...)
```
过宽的异常捕获隐藏 bug，裸 `except` 子句危险。

#### 消息解析静默失败
**文件**: `websocket.py:122-125`
```python
except json.JSONDecodeError:
    pass  // 静默失败
except Exception:
    pass  // 静默失败
```
解析错误被静默忽略，使调试困难。

## 4. 安全问题

### 4.1 已识别漏洞

| 问题 | 严重性 | 位置 |
|------|--------|------|
| 硬编码凭证 | 高 | `application.yml:10-11` |
| CORS 通配符 | 中 | `http.py:55-60` |
| 无限流 | 中 | 所有端点 |
| SQL 验证绕过 | 中 | `SqlExecutorService:47` |
| 提示注入检测缺口 | 中 | `PromptSanitizer` 模式 |

### 4.2 SQL 注入防御深度
`isSqlReadOnly()` 检查可被绕过:
```java
String[] dangerous = {"DROP", "DELETE", "INSERT", "UPDATE", ...};
// 可绕过: SELECT * FROM (DROP TABLE users) ...
```
虽然 MyBatis 对实际执行使用参数化查询，但生成的 SQL 字符串可能包含绕过尝试。

### 4.3 缺少安全头
未配置安全头:
- 无 `X-Content-Type-Options`
- 无 `X-Frame-Options`
- 无 `Content-Security-Policy`
- 无 `X-XSS-Protection`

## 5. 性能瓶颈

### 5.1 响应式调用中的阻塞
**问题**: `SqlCoderService.block()` 阻塞响应式线程
**影响**: 高负载下响应式线程池耗尽

### 5.2 连接池配置
**文件**: `application.yml:13-16`
```yaml
hikari:
  maximum-pool-size: 10
  minimum-idle: 5
```
Hikari 池最大 10 连接可能不足以应对高并发。

### 5.3 无查询结果缓存
每个 NL2SQL 查询:
1. 调用 LLM 生成 SQL
2. 对数据库执行 SQL

无频繁查询或 schema 元数据的缓存层。

### 5.4 MCP 传输效率问题
- HTTP 传输每次请求创建新客户端
- WebSocket 需要手动重连逻辑
- 无连接池

## 6. 缺失组件和缺口

### 6.1 可观测性
- **无指标收集**: 无 Micrometer/Prometheus 集成
- **无分布式追踪**: 无 OpenTelemetry
- **无结构化日志**: 使用 `System.out` 和裸 `print()`
- **健康检查无深度**: `/health` 返回静态响应

### 6.2 弹性
- **无熔断器**: LLM 失败级联
- **无隔板隔离**: 共享线程池
- **无重试队列**: 失败消息丢失
- **无死信队列**: 失败操作不重试

### 6.3 数据管理
- **无数据库迁移**: 手动 schema 管理
- **无数据版本控制**: 无时间查询
- **无审计日志**: 谁在何时查询了什么

### 6.4 API 管理
- **无 API 文档**: Python FastAPI 无 OpenAPI/Swagger
- **无版本策略**: API 缺乏版本前缀(Java 服务 `/api/v1/` 除外)
- **无客户端 SDK**: 无外部消费者的生成客户端

### 6.5 测试基础设施
- **无 MCP 集成测试**: 9/9 测试被依赖阻塞
- **无 E2E 测试**: 无完整系统验证
- **无性能测试**: 无负载测试
- **无混沌测试**: 无故障注入

## 7. 建议

### 7.1 立即行动 (关键)

1. **移除硬编码凭证**: 仅使用环境变量
2. **修复响应式调用阻塞**: 用正确的异步链替换 `.block()`
3. **添加限流**: 实现令牌桶或漏桶
4. **修复 CORS 配置**: 移除通配符来源

### 7.2 短期行动 (高优先级)

1. **添加熔断器**: 对 LLM 调用使用 Resilience4j
2. **实现动态 schema 自省**: 查询 `INFORMATION_SCHEMA` 而非硬编码
3. **添加 API 验证**: 对所有请求/响应使用 Pydantic 模型
4. **实现连接池**: 复用 httpx AsyncClient 实例
5. **添加安全头**: 配置 Spring Security 头

### 7.3 中期行动

1. **添加可观测性**: Micrometer 指标、结构化日志、分布式追踪
2. **添加数据库迁移**: 使用 Flyway 或 Liquibase
3. **实现缓存**: Redis 缓存频繁查询和 schema
4. **添加 MCP 集成测试**: 完成 9/9 测试
5. **API 文档**: 所有服务的 OpenAPI 规范

### 7.4 长期行动

1. **服务网格**: 考虑 Istio/Linkerd 做流量管理
2. **事件溯源**: 用于审计跟踪
3. **GraphQL API**: 灵活查询
4. **多租户**: 如果服务多个客户

## 8. 总结

OperatorBoard 架构展示了一个结构良好的多服务系统，关注点分离适当，模式使用正确(CQRS, MCP)。代码库显示近期重构工作解决了先前识别的技术债务。

**优势**:
- 清晰的组件边界
- 全面的安全措施(提示词清理、SQL 验证)
- 完善的架构文档
- 良好的错误处理(前端 ErrorBoundary、重试逻辑)

**关键债务**:
- 响应式栈中的阻塞 I/O
- 硬编码凭证
- 静态 schema 缓存
- 无限流或熔断器

**优先修复**:
1. 移除 `SqlCoderService` 中的 `.block()`
2. 将所有凭证外部化为环境变量
3. 对所有 API 端点添加限流
4. 实现动态 schema 自省
5. 为 LLM 调用添加熔断器

## 9. 关键实现文件

- `SqlCoderService.java` - 阻塞响应式调用问题 (第55行)
- `application.yml` - 硬编码凭证 (第10-11行)
- `http.py` - CORS 通配符 (第57行)
- `SchemaCache.java` - 静态 schema 定义
- `server.py` - 错误处理和验证缺口
