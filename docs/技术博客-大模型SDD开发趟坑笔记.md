# 大模型时代，软件开发者的第三次思考

> 一位十余年软件工程实践者的 LLM-Based SDD 探索手记

---

## 写在前面

2024 年，当 ChatGPT 掀起大模型浪潮时，我听到最多的论调是：「程序员要被取代了」。

作为一个从 Java Swing 写到 React、从 ERwin 画到 PlantUML的老兵，我既兴奋又警觉。兴奋的是技术变革的机遇，警觉的是——每一波新技术浪潮，都会埋葬一批盲目追风的「先烈」。

三年过去，浪潮退去，我开始能看清楚一些东西了。这篇博客不是大模型开发的「入门指南」，而是一位老工程师在 LLM-Based SDD（Semantic-Driven Development）道路上的真实探索记录。有成功，也有失败；有顿悟，也有困惑。我尽可能忠实地呈现这个过程，而不只是在吹嘘成果。

---

## 一、重新理解软件开发：LLM 改变了什么？

### 1.1 我对 SDD 的三次认知迭代

**第一次认知（2019年）：SDD 就是领域驱动设计**

那时候说的 Semantic-Driven Development，更多是 DDD（Domain-Driven Design）的延续——通过统一语言（Ubiquitous Language）来桥接业务语义和技术实现。我曾在电信计费系统里实践这套方法，效果不错，但代价是漫长的领域建模过程。

**第二次认知（2022年）：SDD 是接口契约驱动**

微服务时代，我开始把 SDD 理解为 API-First Design——先定义接口契约（OpenAPI/Swagger），然后让前后端并行开发。效率提升了，但「契约」的本质仍然是人工编写的静态文档。

**第三次认知（2024年）：LLM 重新定义了什么**

当 Prompt 可以直接转化为可执行逻辑时，我意识到问题的核心变了：

| 维度 | 传统软件工程 | LLM-Based SDD |
|------|-------------|----------------|
| **意图表达** | 文档 → 代码（人） | 自然语言 → Prompt → 代码（人+LLM） |
| **设计载体** | UML / 接口文档 | Prompt 模板 + 迭代反馈 |
| **验证方式** | 编译 + 测试 | 单元测试 + LLM 输出评估 |
| **设计周期** | 设计→实现→验证（周级） | 快速原型→问题发现→迭代收敛（日级） |
| **不确定性** | 低（确定技术栈） | 高（LLM 输出有概率性） |

**关键洞察**：LLM 并没有降低软件工程的复杂度，而是将复杂度从「编码实现」转移到了「Prompt 工程」和「输出验证」。

### 1.2 一个老工程师的困惑：Prompt 到底是什么？

坦白说，我在这个问题上困惑了很久。

一开始，我把 Prompt 当作「告诉 LLM 要做什么」的指令。这是把 LLM 当编译器用——输入 Prompt，输出代码。

后来我发现，Prompt 更像是「和 LLM 谈判」——你在不断调整表述方式，试图让 LLM 的输出稳定地符合你的预期。这本质上是**设计活动**，因为你在定义系统的边界和行为。

再后来，我意识到一个更根本的问题：**LLM 输出的是「概率性正确」的结果**。传统代码里，`if (a > b)` 的语义是确定的；但 LLM 生成的 SQL，可能每次都不一样。

这意味着，**LLM-Based SDD 的核心挑战不是「如何写好 Prompt」，而是「如何构建一个系统，使得即使 Prompt 输出不稳定，系统仍然能可靠运行」**。

---

## 二、技术选型的深度复盘

### 2.1 NL2SQL 方案：我为什么选择了最难的路

在 OperatorBoard 项目中，NL2SQL 是核心技术能力。市面上有成熟的方案——直接调用 GPT-4 或 Claude API，传入 Schema 和问题，坐等 SQL 出来。

**我最终选择了自托管 SQLCoder，这是一个被嘲笑为「重复造轮子」的选择。**

让我解释为什么：

```
项目背景：
- 运营商数据是核心商业机密
- 监管要求：数据不能出网
- 用户规模：数百个内网用户

方案对比：
- GPT-4 API：效果好，但数据出境 ✗
- Claude API：同上 ✗
- SQLCoder 自托管：效果略逊，但数据安全 ✓
```

**但困难远比我预想的复杂**。

第一，SQLCoder 7B 的准确率（约 78%）比 GPT-4（约 85%）低了约 7 个百分点。在千万级数据量面前，这意味着每天可能有数千条错误的查询结果。

第二，自托管方案的工程成本远超预期——GPU 部署、模型更新、Prompt 调优，每一项都是坑。

**我学到的教训**：技术选型没有「完美方案」，只有「最合适当前场景的妥协」。关键是提前识别方案的短板，并准备好工程化补偿措施。

### 2.2 意图识别：LLM 真的比规则引擎强吗？

在开发 OperatorBoard 的意图识别模块时，我陷入了典型的技术选型困境：

| 方案 | 实现成本 | 准确率 | 维护成本 | 可解释性 |
|------|----------|--------|----------|----------|
| 关键词匹配 | 低 | ~50% | 中 | 高 |
| 正则 + 规则引擎 | 中 | ~65% | 高 | 高 |
| LLM 意图检测 | 中 | ~85% | 低 | 低 |
| 多级级联 | 高 | ~90% | 中 | 中 |

**我的第一反应是用 LLM**，毕竟团队已经在用 MiniMax M2-her，集成成本低。但同事问了我一个问题：「你能解释为什么『联通有多少站点』被识别为 site_data 吗？」

我说：「因为 LLM 学到了语义关联。」

他追问：「那为什么『我想看看联通的站』被识别为 operator_list 而不是 site_data？」

我哑口无言。

**这是 LLM 做意图识别的根本问题：不可解释、不可控**。当业务方问「为什么这句被识别错了」时，我没法给出技术上的合理解释。

**最终方案**：多级级联——先用规则引擎处理明确的、高频的查询模式（如「有多少」「查一下」），剩余的模糊查询走 LLM 意图检测。

```
查询 → 规则引擎匹配 ─┬─ 匹配成功 → 直接路由
                    │
                    └─ 匹配失败 → LLM 意图检测 → 路由
```

**经验总结**：LLM 不是银弹。在高频、明确的场景下，规则引擎的性价比更高；在低频、复杂的场景下，LLM 的泛化能力更有价值。

---

## 三、实战复盘：那些让我夜不能寐的问题

### 3.1 中文乱码：凌晨两点的 debug

那是我记忆最深刻的一次 bug。

系统上线后，用户反馈：「为什么查询结果里出现了奇怪的字符？」

```
预期输出：{"intent": "site_data", "operator_name": "北京联通"}
实际输出：{"intent": "site_data", "operator_name": "\u5e02\u573a"}
```

**排查过程**：
1. 检查 API 日志——编码配置正确 ✓
2. 检查数据库编码——UTF-8 ✓
3. 本地测试 Prompt——正常 ✓
4. 检查 MiniMax API 文档——没发现问题 ✓

我几乎要放弃了，突然想到——**也许问题不在我的代码，而在 LLM 的输出生成逻辑本身**。

我试着把中文 Prompt 换成英文：

```python
# 原来的版本（有问题）
prompt = f"""
给定用户查询：{query}
请判断意图并返回 JSON
"""

# 修改后的版本（解决问题）
prompt = f"""
You are an intent detection system.
Given user query: "{query}"
Return JSON format: ...
"""
```

**根本原因**（推测）：MiniMax 对中文的结构化输出存在 Unicode 编码问题，但在英文场景下表现正常。

**这个经历教会我**：LLM 的问题有时候不是代码问题，而是 LLM 本身的问题。当你确信代码没问题时，尝试改变和 LLM 交互的方式。

### 3.2 Prompt.format()：一个 Python 初学者都不会犯的错

看这段代码：

```python
prompt_template = """
Given user query: "{query}"
The output format is: {format}
"""

# 这是我写的
prompt = prompt_template.format(query=query, format="{json}")

# 报错：KeyError: 'json'
```

**问题根源**：Python 的 `str.format()` 会先把 `{json}` 当作变量占位符解析，但变量 `json` 不存在。

**解决方案**：

```python
# 方案1：使用 replace()
prompt = prompt_template.replace("{query}", query).replace("{format}", "json")

# 方案2：双重大括号转义
prompt = prompt_template.replace("{format}", "{{json}}").format(query=query)

# 方案3：使用 Jinja2 模板引擎
```

**反思**：这是一个低级错误，但暴露了一个更深层的问题——**Prompt 模板中的 `{}` 和编程语言中的占位符语法存在天然的冲突**。在后续项目中，我统一使用 Jinja2 模板引擎来处理 Prompt 渲染，避免这类问题。

### 3.3 SQL 安全：全表扫描事件的复盘

那次事件让我彻底改变了对待 LLM 输出的态度。

**事件经过**：
1. 用户查询：「给我看看站点数据」
2. LLM 生成的 SQL：`SELECT * FROM site_info`（没有 WHERE、没有 LIMIT）
3. 数据库有 800 万条记录
4. 全表扫描持续 30 秒，数据库 CPU 飙升至 100%
5. 其他用户的查询全部超时

**根因分析**：
- 我天真地以为「LLM 会自动生成合理的 SQL」
- 我没有对 LLM 输出施加任何安全约束
- 我假设 LLM 理解了我的 Prompt = LLM 会遵守约束（这是错的）

**改进方案**：

```java
public class SqlSafetyValidator {

    public boolean validate(String sql) {
        // 规则1: 必须以 SELECT 开头
        if (!sql.trim().toUpperCase().startsWith("SELECT")) {
            return false;
        }

        // 规则2: 禁止危险关键词
        String[] dangerous = {
            "DROP", "DELETE", "INSERT", "UPDATE",
            "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE"
        };
        for (String keyword : dangerous) {
            if (sql.toUpperCase().contains(keyword)) {
                return false;
            }
        }

        // 规则3: 必须有 LIMIT
        if (!sql.toUpperCase().contains("LIMIT")) {
            return false;
        }

        // 规则4: 禁止注释
        if (sql.contains("--") || sql.contains("/*")) {
            return false;
        }

        return true;
    }
}
```

**核心认知**：**LLM 的 Prompt 约束是不可靠的，必须用代码层面的护栏来强制约束**。就像 Docker 的 capability 限制——内核级的安全控制比容器内的配置更可信。

---

## 四、架构设计：CQRS 不是银弹

### 4.1 为什么选择 CQRS

OperatorBoard 的查询场景泾渭分明：

| 类型 | 特点 | 路由 |
|------|------|------|
| Command（NL2SQL） | LLM 生成 SQL，动态 | Nl2SqlController |
| Query（预定义查询） | 固定 SQL，参数化 | OperatorQueryController |

**CQRS 的优势**：
- Command 和 Query 独立演进
- 可以针对不同场景独立优化
- 边界清晰，便于团队分工

**CQRS 的代价**：
- 概念复杂度增加（需要向团队解释 CQRS 是什么）
- 某些场景需要跨越 Command 和 Query（如元数据查询）
- 增加了架构决策的沟通成本

**我的反思**：CQRS 是手段，不是目的。如果系统规模不够大、查询复杂度不够高，引入 CQRS 可能是过度设计。

### 4.2 流式响应：SSE 协议的设计陷阱

我们在设计 SSE 流式响应时，踩了一个经典陷阱：

**最初的设计**：

```javascript
// 前端期望：分片传输表格数据
// 服务端做法：把表格分成多行，每行一个 SSE 消息

data: {"type": "row", "row": {"id": 1, "name": "站点A"}}
data: {"type": "row", "row": {"id": 2, "name": "站点B"}}
data: {"type": "row", "row": {"id": 3, "name": "站点C"}}
```

**问题**：前端收到这些消息时，表格状态是「不完整」的。如果用户在所有行到达之前就点击了「导出」，会得到不完整的 CSV。

**解决方案**：引入状态机 + 完整数据集。

```javascript
class SSEProcessor {
    constructor() {
        this.state = 'idle';
        this.buffer = [];
    }

    process(event) {
        const data = JSON.parse(event.data);

        switch(data.type) {
            case 'start':
                this.state = 'streaming';
                this.buffer = [];
                this.emit('start');
                break;

            case 'row':
                this.buffer.push(data.row);
                this.emit('row', data.row); // 流式更新 UI
                break;

            case 'done':
                this.state = 'complete';
                this.emit('done', { rows: this.buffer }); // 发送完整数据
                break;

            case 'error':
                this.state = 'error';
                this.emit('error', data.error);
                break;
        }
    }
}
```

**架构反思**：**SSE 的简单性是假象。当你需要支持复杂的交互（如中断、重试、完整性验证）时，你需要构建配套的状态管理和消息协议**。

---

## 五、LLM-Based SDD 的三条核心认知

### 5.1 认知一：Prompt 即设计契约

我曾经把 Prompt 看作是「告诉 LLM 怎么工作」的说明书。后来我意识到，**Prompt 更准确的定位是「系统行为的设计契约」**。

```python
# 这不是代码，是契约
INTENT_DETECTION_PROMPT = """
You are an intent detection system for telecom operator data.

Given user query: "{query}"

Detect intent:
- site_data: Query site/cell counts
- indicator_data: Query network performance
- operator_list: List operators
- nl2sql: Complex SQL query

Return JSON with:
- intent: one of the above
- operator_name: normalized name
- band: frequency band
- data_month: YYYY-MM format
"""

# 契约的版本化
INTENT_DETECTION_PROMPT_V2 = """..."""  # 当业务变化时，更新版本
```

**认知升级**：当 Prompt 是契约时，它的变更需要像 API 变更一样管理——版本控制、回归测试、变更通知。

### 5.2 认知二：LLM 是不可靠的合作伙伴

这句话可能会让很多 LLM 布道者不舒服，但我必须诚实地说——**在生产级系统中，LLM 输出必须被当作「可能错误」的半成品来处理**。

这不是对 LLM 的否定，而是**务实的工程态度**。

```python
# 不可靠的合作伙伴需要「复核」
async def detect_intent(query: str) -> IntentResult:
    # 1. 调用 LLM
    raw_result = await llm_client.generate(prompt)

    # 2. 解析 + 验证
    try:
        result = safe_parse(raw_result)
    except JSONDecodeError:
        # 降级策略
        return fallback_to_rule_based_detection(query)

    # 3. 业务规则校验
    if not is_valid_intent(result.intent):
        # 降级策略
        return fallback_to_nl2sql()

    return result
```

**核心原则**：任何 LLM 输出在被系统信任之前，必须经过验证。

### 5.3 认知三：架构决策需要「可逆性」设计

在 LLM 领域，技术选型的风险比传统软件工程更高——因为很多方案刚诞生一两年，没有足够的时间验证其稳定性。

**我的策略是「可逆性设计」**：

```
┌─────────────────────────────────────────────────────────────┐
│                      可逆性架构设计                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LLM Provider 抽象                                          │
│       │                                                     │
│       ├── SQLCoderProvider (当前)                          │
│       ├── OpenAIProvider (备选)                            │
│       └── ClaudeProvider (备选)                            │
│                                                              │
│  当 SQLCoder 效果不佳时，可以切换到 OpenAI                   │
│  当 OpenAI 数据安全问题时，可以切换回 SQLCoder               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**关键实践**：
- 核心业务逻辑不直接依赖 LLM Provider
- 通过接口抽象 LLM 调用
- 保留降级路径

---

## 六、避坑清单：一个老工程师的 27 条血泪经验

### 6.1 LLM 调用层

| # | 教训 | 代价 |
|---|------|------|
| 1 | 中文 Prompt 在某些 LLM 上有编码问题 | 2 小时的 debug + 换成英文 |
| 2 | JSON 解析需要健壮的异常处理 | 全表扫描事件 |
| 3 | temperature=0.1 是稳定性与创造性的平衡点 | 输出不稳定投诉 |
| 4 | API Key 必须通过环境变量注入 | 差点泄露到 GitHub |
| 5 | 必须有服务不可用的降级策略 | 用户无法查询的 P0 故障 |

### 6.2 Prompt 工程层

| # | 教训 | 代价 |
|---|------|------|
| 6 | `{}` 占位符和 Python format() 冲突 | 1 小时的 KeyError |
| 7 | 示例不是越多越好，3-5 个精选 | Prompt 膨胀，LLM 困惑 |
| 8 | 角色设定需要在 Prompt 开头重复 | LLM 在长 Prompt 中「遗忘」 |
| 9 | JSON Schema 比「返回 JSON」更可靠 | 输出格式漂移 |

### 6.3 架构设计层

| # | 教训 | 代价 |
|---|------|------|
| 10 | SQL 安全护栏必须用代码强制执行 | 全表扫描事件 |
| 11 | SSE 流式需要状态机管理 | UI 状态不一致 |
| 12 | CQRS 适合复杂系统，小系统是过度设计 | 团队沟通成本 |
| 13 | 统一 ErrorCode 体系比随意的异常好 | 问题诊断困难 |
| 14 | LLM Provider 需要抽象接口 | 切换成本高 |

### 6.4 工程化层

| # | 教训 | 代价 |
|---|------|------|
| 15 | Prompt 需要版本管理 | 无法回溯问题来源 |
| 16 | Prompt 需要单元测试 | 回归问题未及时发现 |
| 17 | 调用链路需要追踪 | 问题定位困难 |
| 18 | 缓存 TTL 设置需要考虑 LLM 特性 | 脏数据 + 过期数据 |
| 19 | 日志需要包含请求 ID 和版本 | 问题复现困难 |
| 20 | YAML 配置优于硬编码 | 维护成本高 |

---

## 七、反思：LLM 没有改变软件工程的本质

### 7.1 一个老工程师的「冷思考」

在经历了一年多的 LLM-Based SDD 实践后，我对媒体上那些「LLM 颠覆软件工程」的论调越来越持保留态度。

**LLM 确实改变的**：
- 快速原型的时间周期（从周到天）
- 某些重复性编码工作的效率（CRUD 生成）
- 非结构化文档的处理方式（代码生成、注释生成）

**LLM 没有改变的**：
- 架构决策的重要性（反而增加了，因为要处理 LLM 的不确定性）
- 安全设计的必要性（反而更重要了）
- 可维护性的要求（Prompt 也需要维护）
- 测试的重要性（Prompt 输出仍需验证）

### 7.2 我对「AI 取代程序员」论调的回应

每当有人问我「程序员会不会被 AI 取代」，我都会反问：

**「你能信任 AI 写的代码在生产环境中不出问题吗？」**

如果答案是「不能」，那说明还需要人来验证、审核、把关。**软件工程的本质不是「写代码」，而是「构建可靠系统」**。LLM 是工具，不是替代者。

当然，这个判断可能是错的。技术的发展往往超出我们的想象。保持谦逊，保持学习，保持批判性思考——这才是老工程师应有的态度。

---

## 结语

写这篇博客的时候，我一直在问自己：**我希望读者从中获得什么？**

如果你是 LLM 开发的新手，我建议你记住三条：
1. Prompt 是契约，需要版本管理
2. LLM 输出不可靠，需要验证护栏
3. 架构决策要保留可逆性

如果你是有经验的工程师，我建议你保持警惕：
- 不要被 LLM 的「智能」迷惑，它仍然是工具
- 不要忽视传统的软件工程原则，它们仍然有效
- 不要停止思考，技术会变，原则不会

最后，用一句话总结我这三年多的探索：

> **LLM 让软件工程多了一个变量，但软件工程的核心——把人类意图转化为可靠系统——没有改变。**

---

**项目地址**：[OperatorBoard](https://github.com/tianjunming/OperatorBoard)

**参考资料**：
- [SQLCoder - DefogAI](https://github.com/defog-ai/sqlcoder)
- [LangChain Documentation](https://docs.langchain.com/)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [CQRS Pattern - Microsoft](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [LangFuse - LLM Observability](https://langfuse.com/)
