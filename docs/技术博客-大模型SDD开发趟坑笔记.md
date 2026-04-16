# 大模型SDD开发趟坑笔记：从0到1打造电信运营商NL2SQL平台

> "Talk is cheap, show me the code" —— 但如果代码里全是坑，那就是另一回事了。

## 前言

大家好，我是一名 telecom 数据开发者。过去三个月，我和团队从零打造了一个基于多Agent架构的电信运营商数据管理平台——**OperatorBoard**。这个系统集成了 NL2SQL 能力，让用户可以用自然语言查询运营商的站点、小区、频段分布和性能指标。

今天来聊聊我们在「大模型应用开发」这个领域的实战经验，特别是 **LLM-Based Software Design & Development (SDD)** 过程中踩过的那些坑，以及如何爬出来的。

---

## 一、项目起点：数据安全与LLM的博弈

### 1.1 背景：为什么选择自托管？

传统的 NL2SQL 方案很简单——调用 OpenAI GPT-4 或 Claude API，传入 Schema 和问题，坐等 SQL 出来。

但现实很骨感：

```
电信运营商数据 = 核心商业机密
↓
监管要求：数据不能出网
↓
外部LLM API = 直接 pass
```

所以我们选择了**自托管 SQLCoder**。这是一个在 MySQL 上专门微调过的开源模型，可以在内网部署。

### 1.2 第一个坑：LLM 的「幻觉」问题

我们兴奋地部署好 SQLCoder，测试了一句「北京联通有多少站点」：

```sql
-- 模型生成的 SQL
SELECT * FROM site_info
```

**问题在哪？**
- 没有 LIMIT，可能返回百万条数据
- 没有 WHERE 条件，全表扫描
- 可能返回不该返回的数据

**解决方案：多层安全护栏**

```java
private boolean isSqlSafe(String sql) {
    // 规则1: 必须以 SELECT 开头
    if (!sql.trim().toUpperCase().startsWith("SELECT")) {
        return false;
    }

    // 规则2: 禁止危险关键词
    String[] dangerous = {"DROP", "DELETE", "INSERT", "UPDATE",
                          "TRUNCATE", "ALTER", "CREATE", "GRANT"};
    for (String keyword : dangerous) {
        if (sql.toUpperCase().contains(keyword)) {
            return false;
        }
    }

    // 规则3: 禁止注释
    if (sql.contains("--") || sql.contains("/*")) {
        return false;
    }

    // 规则4: 必须有 LIMIT
    if (!sql.toUpperCase().contains("LIMIT")) {
        return false;
    }

    return true;
}
```

> **经验总结**：对于 LLM 生成的任何内容，永远假设它可能是错的。安全护栏不是可选项，而是必选项。

---

## 二、意图识别：LLM 不是万能的

### 2.1 MiniMax 中文乱码事件

我们使用 MiniMax M2-her 做意图识别，检测用户是想查「站点数据」还是「指标数据」。

第一次部署后，API 返回：

```
"intent": "site_data\u0001operator_name": "\u5e02\u573a"
```

嗯，用户明明说的是「北京联通」，模型返回了乱码的 `\u5e02\u573a`。

**排查过程：**
1. 检查编码配置 → UTF-8 ✓
2. 检查 MiniMax API 文档 → 没发现问题
3. 本地测试 prompt → 正常
4. **最终发现**：MiniMax 对中文的结构化输出有编码问题

**解决方案：英文 Prompt**

```python
# 原来的中文 Prompt（有问题）
prompt = f"用户问：{query}，请判断意图"

# 改为英文 Prompt（完美解决）
prompt = f"""You are an intent detection system.
Given user query: "{query}"
Return JSON format...
"""
```

> **经验总结**：当 LLM API 出现奇怪问题时，尝试用英文 Prompt。很多中文编码问题是模型/服务商侧的处理问题，不是你的代码问题。

### 2.2 Prompt.format() 的变量冲突

我们定义了这样的 Prompt 模板：

```python
prompt_template = """
Given user query: "{query}"
The format is: {format}
"""
```

调用时：

```python
prompt = prompt_template.format(query=query, format="{json}")
```

**结果**：Python 报了 `KeyError: 'json'`

**问题根源**：第一次 `.format()` 把 `{json}` 当成了变量占位符去解析，但 `json` 变量不存在。

**解决方案：用 `.replace()` 代替 `.format()`**

```python
# 使用 replace 避免占位符冲突
prompt = prompt_template.replace("{query}", query).replace("{format}", "json")
```

> **经验总结**：Prompt 模板中有 JSON 结构时，`{}` 会和 Python 的 `str.format()` 冲突。统一用 `replace()` 或者用 Jinja2 模板引擎。

---

## 三、CQRS 架构：读写分离的代价

### 3.1 为什么需要 CQRS？

我们的查询场景很复杂：
- **Command（写）**：NL2SQL 查询，用户输入自然语言，模型生成 SQL
- **Query（读）**：预定义查询，如 `/api/query/site-summary`、`/api/query/indicators`

两种模式泾渭分明，所以拆分：

```
┌─────────────────────────────────┐
│     Nl2SqlController (Command)   │
│     - 调用 SQLCoder LLM          │
│     - 生成并执行 SQL              │
└─────────────────────────────────┘
                ↓
┌─────────────────────────────────┐
│ OperatorQueryController (Query)   │
│ IndicatorQueryController (Query) │
│     - 预定义 SQL 查询             │
│     - 固定返回格式                │
└─────────────────────────────────┘
```

### 3.2 坑：流式响应与结构化数据的撕裂

**问题**：我们想给用户好的体验，使用 SSE 流式返回。但 JSON 结构化数据和 SSE 流式格式有冲突。

SSE 格式要求每条消息是独立的事件，但结构化数据（表格、图表）需要完整上下文。

**解决方案：定义清晰的事件类型**

```javascript
const SSE_EVENTS = {
  START: 'start',           // 流开始
  CONTENT: 'content',       // 文本内容片段
  CHART: 'chart',          // 图表数据
  TABLE: 'table',          // 表格数据
  CONFIRMATION: 'confirmation',  // 确认请求
  ERROR: 'error',          // 错误
  DONE: 'done'            // 流结束
};

// 前端处理逻辑
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  switch(data.type) {
    case 'content': renderText(data.content); break;
    case 'chart': renderChart(data.chart); break;
    case 'confirmation': showDialog(data.options); break;
  }
};
```

---

## 四、意图检测：路由的艺术

### 4.1 五种意图的路由设计

用户的问题看似简单，比如「联通有多少站点」，但背后可能涉及：

| 用户说 | 识别为 | 路由到 |
|--------|--------|--------|
| "联通有多少站点" | site_data | get_site_cells() |
| "移动5G速率如何" | indicator_data | get_latest_indicators() |
| "有哪些运营商" | operator_list | /api/operators |
| "最新月份数据" | latest_data | 加上时间过滤 |
| "帮我查复杂SQL" | nl2sql | SQLCoder 生成 |

### 4.2 运营商名称的「方言」问题

中国运营商在不同场景下有不同叫法：

```
"北京联通" → "China Unicom"
"上海移动" → "China Mobile"
"广州电信" → "China Telecom"
```

我们维护了一个映射表，但用户可能输入：
- "联通"（没有城市）
- "China Unicom"
- "中国联通"

**解决方案：多级模糊匹配**

```python
OPERATOR_MAPPING = {
    "北京联通": "China Unicom",
    "上海联通": "China Unicom",
    "联通": "China Unicom",  # 无城市前缀
    "china unicom": "China Unicom",  # 大小写
}

def normalize_operator(name: str) -> str:
    name = name.strip().title()
    return OPERATOR_MAPPING.get(name, name)
```

---

## 五、前端交互：用户体验是奢侈品

### 5.1 流式加载的「闪烁」问题

SSE 流式返回时，数据是一片一片到的。如果直接渲染，会出现「闪烁」——骨架屏突然消失，内容闪一下又没了。

**解决方案：渐进式骨架屏**

```jsx
const [skeletonType, setSkeletonType] = useState('chart');

// 流开始，显示骨架
{!data && <SkeletonLoader type={skeletonType} />}

// 流结束，渲染真实内容
{data && <ChartBlock data={data} />}
```

### 5.2 智能图表推荐：让数据自己说话

用户查了一堆数据，但该用什么图表展示？

**我们训练了模型（实际上是规则）来推荐**：

```javascript
function recommendChartType(data, keys) {
  // 时间序列 + 单指标 → line
  if (hasTimeDimension(data) && keys.length === 1) {
    return { type: 'line', reason: '展示趋势变化' };
  }

  // 3+ 类别 + 单指标 → bar
  if (keys.length === 1 && data.length >= 3) {
    return { type: 'bar', reason: '分类对比' };
  }

  // 2-8 类占比 → pie
  if (isPartToWhole(data, keys) && data.length >= 2) {
    return { type: 'pie', reason: '展示分布' };
  }
}
```

---

## 六、架构演进：从混乱到秩序

### 6.1 项目结构演进史

**Week 1（草稿期）**：
```
src/
├── server.py  # 2000行的瑞士军刀
├── utils.py
└── db.py
```

**Week 4（重构期）**：
```
src/
├── agent-framework/    # 提取框架代码
│   ├── api/
│   ├── core/
│   ├── tools/
│   └── llm/
├── operator-agent/     # 业务逻辑
└── operator-service/   # Java微服务
```

**关键重构**：把 `agent-framework` 抽取为独立模块，可以在多个 Agent 间复用。

### 6.2 设计模式的应用

| 模式 | 应用场景 |
|------|----------|
| 单例模式 | BaseAgentServer，Agent 实例管理 |
| 工厂模式 | LLM Client 创建、SQL Builder |
| 注册模式 | Tools/Skills 注册 |
| 策略模式 | 不同 SQL 构建策略 |
| CQRS | 读查询 vs 写命令分离 |

---

## 七、经验总结：大模型SDD开发的避坑指南

### 7.1 关于 LLM 调用

| 坑 | 解决方案 |
|----|----------|
| 中文乱码 | 用英文 Prompt |
| JSON 输出不稳定 | 强化 Prompt + 后处理校验 |
| 响应延迟高 | 添加缓存 (TTL 5min) |
| 幻觉生成 | 多层安全护栏 |

### 7.2 关于架构设计

| 坑 | 解决方案 |
|----|----------|
| 单体膨胀 | 拆分为 Agent Framework + 业务 Agent |
| 配置散落 | 统一 YAML 配置管理 |
| 错误处理混乱 | ErrorCode 体系 + 本地化支持 |
| 流式与结构冲突 | 定义清晰的事件类型协议 |

### 7.3 关于测试

```
单元测试 (60%)  →  pytest + pytest-cov
    ↓
集成测试 (30%)  →  httpx 异步测试
    ↓
E2E 测试 (10%)  →  Playwright + 数据库一致性验证
```

**E2E 测试中最重要的**：UI 返回的数据必须和数据库直查一致。

```javascript
// E2E 测试中验证
const uiCount = await page.locator('.kpi-value').textContent();
const dbCount = await mysql.query('SELECT COUNT(*) FROM site_info');
expect(uiCount).to.equal(dbCount);
```

---

## 结语

大模型 SDD 开发，本质上是在「不确定性」和「确定性」之间找平衡。LLM 的输出天然带有不确定性（幻觉、格式漂移、延迟波动），而生产系统需要确定性（安全、稳定、可预期）。

我们的经验是：

> **把 LLM 当作「实习生」—— 可以帮你做事，但必须复核，必须设定边界，必须有安全护栏。**

最后送上一句在项目中流传的玩笑话：

> "如果你觉得 LLM 表现很稳定，那一定是你的测试用例不够多。"

祝各位在大模型开发的路上少踩坑，多出成果！

---

**相关资源**：
- [SQLCoder - DefogAI](https://github.com/defog-ai/sqlcoder)
- [MiniMax API](https://api.minimaxi.com/)
- [OperatorBoard GitHub](https://github.com/tianjunming/OperatorBoard)
