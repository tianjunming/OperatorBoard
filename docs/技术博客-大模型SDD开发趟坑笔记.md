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

那时候说的 Semantic-Driven Development，更多是 DDD（Domain-Driven Design）的延续——通过统一语言（Ubiquitous Language）来桥接业务语义和技术实现。我曾在电信计费系统里实践这套方法，效果不错，但代价是漫长的领域建模过程。每次和业务方开会，都是一场「这个术语到底指什么」的拉锯战。

**第二次认知（2022年）：SDD 是接口契约驱动**

微服务时代，我开始把 SDD 理解为 API-First Design——先定义接口契约（OpenAPI/Swagger），然后让前后端并行开发。效率提升了，但「契约」的本质仍然是人工编写的静态文档。前端抱怨接口不好用，后端吐槽需求变太多，这些烂熟于心的戏码每天都在上演。

**第三次认知（2024年）：LLM 重新定义了什么**

当 Prompt 可以直接转化为可执行逻辑时，我意识到问题的核心变了：

以前我们说「软件工程」，核心是「工程」——一堆标准流程、最佳实践、 design patterns。LLM 进来之后，我发现「软件」和「工程」的边界在模糊：你用自然语言描述需求，LLM 直接给你代码，这到底算「写软件」还是「做工程」？

| 维度 | 传统软件工程 | LLM-Based SDD |
|------|-------------|----------------|
| **意图表达** | 文档 → 代码（人） | 自然语言 → Prompt → 代码（人+LLM） |
| **设计载体** | UML / 接口文档 | Prompt 模板 + 迭代反馈 |
| **验证方式** | 编译 + 测试 | 单元测试 + LLM 输出评估 |
| **设计周期** | 设计→实现→验证（周级） | 快速原型→问题发现→迭代收敛（日级） |
| **不确定性** | 低（确定技术栈） | 高（LLM 输出有概率性） |

**关键洞察**：LLM 并没有降低软件工程的复杂度，而是将复杂度从「编码实现」转移到了「Prompt 工程」和「输出验证」。说人话就是：以前是「码农」，现在是「prompt 仔」，本质都是在搬砖，只是工具不一样了。

### 1.2 一个老工程师的困惑：Prompt 到底是什么？

坦白说，我在这个问题上困惑了很久。

一开始，我把 Prompt 当作「告诉 LLM 要做什么」的指令。这是把 LLM 当编译器用——输入 Prompt，输出代码。听起来很美好，现实很骨感——LLM 生成的代码，十次有三次会跑出莫名其妙的结果。

后来我发现，Prompt 更像是「和 LLM 谈判」——你在不断调整表述方式，试图让 LLM 的输出稳定地符合你的预期。这本质上是**设计活动**，因为你在定义系统的边界和行为。但谈判这事儿吧，有时候谈着谈着就变成了「玄学」。

再后来，我意识到一个更根本的问题：**LLM 输出的是「概率性正确」的结果**。传统代码里，`if (a > b)` 的语义是确定的；但 LLM 生成的 SQL，可能每次都不一样。这就像你养了一只猫，你给它指令「去抓老鼠」，结果它可能去抓了老鼠，也可能去睡了觉。

这意味着，**LLM-Based SDD 的核心挑战不是「如何写好 Prompt」，而是「如何构建一个系统，使得即使 Prompt 输出不稳定，系统仍然能可靠运行」**。换句话说，你要把 LLM 当成一个「能力很强但不太靠谱」的同事来用——授权要谨慎，复核是必须的。

### 1.3 新认知：Multi-Agent 与 MCP 协作者范式（2025）

到了 2025 年，Multi-Agent 架构和 MCP（Model Context Protocol）开始火起来。说实话，一开始我是抵触的——一个 LLM 都不一定搞定，再来一堆 LLM 协作，这不是给自己找麻烦吗？

但当我真正用 OperatorBoard 搭了一套 Multi-Agent 系统后，我的看法变了。

简单说 Multi-Agent 就是：**让专业的 Agent 做专业的事**。

```
┌─────────────────────────────────────────────────────────────────┐
│  你的问题：「北京联通 NR 频段 4月份的峰值速率是多少？」              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Planner Agent（拆解问题）                                       │
│   ├── 「这是指标查询，需要调用指标专家」                           │
│   ├── 「频段是 NR，时间是 4 月」                                 │
│   └── 「需要先查频段知识库确认字段映射」                           │
│                                                                  │
│   Specialist Agent（并行执行）                                     │
│   ├── 指标专家：生成查询 SQL                                      │
│   ├── 知识库专家：确认 NR 频段对应的指标字段                       │
│   └── SQL 专家：校验生成的 SQL                                    │
│                                                                  │
│   Verifier Agent（汇总验证）                                      │
│   └── 校验结果，生成自然语言回复                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

MCP 呢，更像是给 Agent 们定了一套「沟通规范」——就像企业内部有 SOP 一样。以前 LLM 调用工具是「硬编码」的，换个 LLM 提供商可能就要改一堆代码。有了 MCP，工具调用变成了标准接口，改动成本低多了。

---

## 二、技术选型的深度复盘

### 2.1 NL2SQL 方案：我为什么选择了最难的路

在 OperatorBoard 项目中，NL2SQL 是核心技术能力。市面上有成熟的方案——直接调用 GPT-4 或 Claude API，传入 Schema 和问题，坐等 SQL 出来。听起来很美好。

**我最终选择了自托管 SQLCoder，这是个被嘲笑为「重复造轮子」的选择。**

让我解释一下这个「不明智」的决定：

```
项目背景：
- 运营商数据是核心商业机密（想象一下竞争对手拿到你的基站分布数据）
- 监管要求：数据不能出网（合规部门会找你喝茶的那种）
- 用户规模：数百个内网用户（不是那种能忽悠说「数据都安全」的互联网场景）

方案对比：
- GPT-4 API：效果好，但数据出境 ✗
- Claude API：同上 ✗
- SQLCoder 自托管：效果略逊，但数据安全 ✓
```

领导问我：「为什么要自己部署？直接用 GPT-4 不就行了？」

我说：「数据安全是底线，不能妥协。」

他没再说什么，但我知道他心里可能在想：「这人有病吧，放着现成的不用。」

**但困难远比我预想的复杂**。

第一，SQLCoder 7B 的准确率（约 78%）比 GPT-4（约 85%）低了约 7 个百分点。在千万级数据量面前，这意味着每天可能有数千条错误的查询结果。业务方开始质疑：「你这系统查出来的数对不对啊？」

第二，自托管方案的工程成本远超预期——GPU 部署、模型更新、Prompt 调优，每一项都是坑。我光是在服务器上装驱动就折腾了三天。

**我学到的教训**：技术选型没有「完美方案」，只有「最合适当前场景的妥协」。关键是提前识别方案的短板，并准备好工程化补偿措施。比如我们后来加了「SQL 校验层」和「结果合理性检查」，硬生生把准确率抬到了可以接受的范围。

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

**这是 LLM 做意图识别的根本问题：不可解释、不可控**。当业务方问「为什么这句被识别错了」时，我没法给出技术上的合理解释。总不能说「因为 LLM 觉得这样更合理」吧？

**最终方案**：多级级联——先用规则引擎处理明确的、高频的查询模式（如「有多少」「查一下」），剩余的模糊查询走 LLM 意图检测。

```
查询 → 规则引擎匹配 ─┬─ 匹配成功 → 直接路由
                    │
                    └─ 匹配失败 → LLM 意图检测 → 路由
```

这样做的好处是：明确的 query 有解释，模糊的 query 有兜底。代价是维护两套系统，但至少系统出问题时我知道去哪看日志。

### 2.3 RAG 与知识增强：解决「LLM 记性不好」的问题

在做 NL2SQL 的过程中，我遇到了一个灵魂拷问：**LLM 怎么知道数据库里有哪些表、哪些字段？**

Schema 简单的时候可以往 Prompt 里塞。Schema 复杂的时候呢？运营商的数据库可能有几十张表、上百个字段，LLM 的上下文窗口塞不下，就算塞得下，LLM 也会「遗忘」中间的部分。

**RAG（检索增强生成）给出了答案**：

```
用户查询：「北京联通的 NR 频段峰值速率是多少？」

    │
    ▼

Query Analysis：提取实体 [北京联通, NR, 峰值速率]
    │
    ▼

Vector Search：在知识库中检索相关 Schema 信息
    │
    │ 比如检索到：
    │ - "峰值速率" 对应指标表 indicator_info 的 peak_rate 字段
    │ - "NR" 是 5G 频段，对应 band='NR' 的记录
    │
    ▼

Context Enrichment：将检索结果注入 Prompt
    │
    ▼

LLM Generation：生成 SQL
```

说白了就是：**不要让 LLM 死记硬背，按需检索，按需注入**。

OperatorBoard 的实践：
- 构建了「指标知识库」：包含指标定义、计算公式、频段分类等
- 当用户查询「峰值速率」时，自动检索相关指标定义
- LLM 生成的 SQL 准确率从 78% 提升到 89%

这让我想起以前学编译原理的时候，编译器也不是一次性把整个程序加载到内存，而是按需加载、按需解析。LLM 也是程序，道理是相通的。

---

## 三、实战复盘：那些让我夜不能寐的问题

### 3.1 中文乱码：凌晨两点的 debug

那是我记忆最深刻的一次 bug。

系统上线后，用户反馈：「为什么查询结果里出现了奇怪的字符？」

```
预期输出：{"intent": "site_data", "operator_name": "北京联通"}
实际输出：{"intent": "site_data", "operator_name": "\u5e02\u573a"}
```

作为一个老工程师，看到 `\u5e02\u573a` 这种东西，第一反应是「编码问题」。经典套路：

1. 检查 API 日志——编码配置正确 ✓
2. 检查数据库编码——UTF-8 ✓
3. 本地测试 Prompt——正常 ✓
4. 检查 MiniMax API 文档——没发现问题 ✓

debug 到凌晨两点，整个人都快放弃了。

突然灵光一闪——**也许问题不在我的代码，而在 LLM 的输出生成逻辑本身**？

我把中文 Prompt 换成英文试试：

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

结果好了。

**根本原因**（推测）：MiniMax 对中文的结构化输出存在 Unicode 编码问题，但在英文场景下表现正常。我后来在 MiniMax 的 issue 区看到有人提过类似问题，官方回复是「已知问题，优化中」。嗯，「优化中」。

**这个经历教会我**：LLM 的问题有时候不是代码问题，而是 LLM 本身的问题。当你在代码层面找不到问题时，换个思路和 LLM 交互，可能就豁然开朗了。

### 3.2 Prompt.format()：一个低级错误的教训

看这段代码，你觉得会报什么错？

```python
prompt_template = """
Given user query: "{query}"
The output format is: {format}
"""

# 这是我写的
prompt = prompt_template.format(query=query, format="{json}")

# 报错：KeyError: 'json'
```

看到 `{json}` 的时候，Python 的 `str.format()` 把它当成变量占位符了——「我要找变量 `json`」，但没定义这个变量，所以报了 KeyError。

说出来你可能不信，我写 Python 将近十年了，第一次看到 `KeyError: 'json'` 的时候愣了好几秒。心想「我也没用 json 这个变量啊？」

**解决方案**：

```python
# 方案1：使用 replace()（简单粗暴）
prompt = prompt_template.replace("{query}", query).replace("{format}", "json")

# 方案2：双重大括号转义
prompt = prompt_template.replace("{format}", "{{json}}").format(query=query)

# 方案3：使用 Jinja2 模板引擎（推荐）
from jinja2 import Template
template = Template("""
Given user query: {{ query }}
The output format is: {{ format }}
""")
prompt = template.render(query=query, format="json")
```

后来我统一用 Jinja2，因为模板语法清晰，也不容易和 Python 占位符冲突。但说实话，这件事对我的冲击挺大的——**我开始意识到 Prompt 模板中的 `{}` 和编程语言中的占位符语法存在天然的冲突**，这是个结构性问题，不是简单换个写法就能根治的。

### 3.3 SQL 安全：全表扫描事件的复盘

那次事件让我彻底改变了对待 LLM 输出的态度。

**事件经过**：
1. 用户查询：「给我看看站点数据」
2. LLM 生成的 SQL：`SELECT * FROM site_info`（没有 WHERE、没有 LIMIT）
3. 数据库有 800 万条记录
4. 全表扫描持续 30 秒，数据库 CPU 飙升至 100%
5. 其他用户的查询全部超时

故障群里炸了锅：「系统又挂了？」「是不是被攻击了？」

我一看日志，乖乖，800 万条记录全表扫描，这 LLM 下手是真狠。

**根因分析**：
- 我天真地以为「LLM 会自动生成合理的 SQL」
- 我没有对 LLM 输出施加任何安全约束
- 我假设 LLM 理解了我的 Prompt = LLM 会遵守约束（这是错的）

这个事件之后，我给所有 LLM 生成的 SQL 加了「强制安全校验」：

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

        // 规则5: 禁止子查询嵌套过深
        if (countOccurrences(sql, "SELECT") > 3) {
            return false;
        }

        return true;
    }
}
```

**核心认知**：**LLM 的 Prompt 约束是不可靠的，必须用代码层面的护栏来强制约束**。就像 Docker 的 capability 限制——内核级的安全控制比容器内的配置更可信。你永远不要相信一个「能力很强但不太靠谱」的同事会自觉遵守规则，要用制度来约束。

---

## 四、架构设计：CQRS 不是银弹

### 4.1 为什么选择 CQRS

OperatorBoard 的查询场景泾渭分明：

| 类型 | 特点 | 路由 |
|------|------|------|
| Command（NL2SQL） | LLM 生成 SQL，动态 | Nl2SqlController |
| Query（预定义查询） | 固定 SQL，参数化 | OperatorQueryController |

CQRS 的核心思想是「读写分离」——Command 管写，Query 管读。但在我们的场景里，没有真正的写操作，只有「生成 SQL」和「执行 SQL」的区别。

**CQRS 的优势**：
- Command 和 Query 独立演进（两套代码，两套优化策略）
- 可以针对不同场景独立优化（NL2SQL 要快，预定义查询要稳）
- 边界清晰，便于团队分工

**CQRS 的代价**：
- 概念复杂度增加（每次有新同事入职都要解释一遍）
- 某些场景需要跨越 Command 和 Query（如元数据查询）
- 增加了架构决策的沟通成本

**我的反思**：CQRS 是手段，不是目的。如果系统规模不够大、查询复杂度不够高，引入 CQRS 可能是过度设计。后来来了个新同事，看到代码结构问：「为什么要搞两套？」我解释了十分钟，他似懂非懂地点点头。后来想想，与其花时间解释架构，不如让代码自己说话。

### 4.2 流式响应：SSE 协议的设计陷阱

我们在设计 SSE 流式响应时，踩了一个经典陷阱。

**最初的设计**：

```javascript
// 把表格数据分行传输
data: {"type": "row", "row": {"id": 1, "name": "站点A"}}
data: {"type": "row", "row": {"id": 2, "name": "站点B"}}
data: {"type": "row", "row": {"id": 3, "name": "站点C"}}
```

看起来很美，前端可以逐行渲染，用户能看到数据一条条出来。

**问题来了**：用户在所有行到达之前点击了「导出」，得到一个不完整的 CSV。投诉来了：「导出的数据不对！」

我排查了一下，发现是 SSE 的「流式传输」和「完整性要求」产生了冲突。

**解决方案**：引入状态机 + 双重发送。

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
                this.emit('done', { rows: this.buffer }); // 完整数据单独发一次
                break;

            case 'error':
                this.state = 'error';
                this.emit('error', data.error);
                break;
        }
    }
}
```

这样前端可以「边收边渲染」，用户想导出时，调用 `done` 事件的完整数据。

**架构反思**：**SSE 的简单性是假象**。看起来是「服务器推送数据」，但真正用起来，状态管理、错误处理、重试机制，一个都不能少。没有银弹，只有坑。

---

## 五、LLM-Based SDD 的五条核心认知

### 5.1 认知一：Prompt 即设计契约

我曾经把 Prompt 看作是「告诉 LLM 怎么工作的说明书」。后来我意识到，**Prompt 更准确的定位是「系统行为的设计契约」**。

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

# 当业务变化时，更新契约
INTENT_DETECTION_PROMPT_V2 = """..."""  # 改版本号，留变更记录
```

**契约和代码的区别**：
- 代码：违反了就报错
- Prompt：违反了你可能都不知道

所以 Prompt 契约需要像 API 契约一样管理——版本控制、回归测试、变更通知。**每次改 Prompt 之前，先问自己：这个改动会影响已有功能吗？**

### 5.2 认知二：LLM 是不可靠的合作伙伴

这句话可能会让很多 LLM 布道者不舒服，但我必须诚实地说——**在生产级系统中，LLM 输出必须被当作「可能错误」的半成品来处理**。

这不是对 LLM 的否定，而是**务实的工程态度**。

```python
async def detect_intent(query: str) -> IntentResult:
    # 1. 调用 LLM
    raw_result = await llm_client.generate(prompt)

    # 2. 解析 + 验证
    try:
        result = safe_parse(raw_result)
    except JSONDecodeError:
        # 降级：走规则引擎
        return fallback_to_rule_based_detection(query)

    # 3. 业务规则校验
    if not is_valid_intent(result.intent):
        # 降级：走 NL2SQL
        return fallback_to_nl2sql()

    # 4. 合理性校验（新加的，防止 LLM 幻觉）
    if not is_reasonable_result(result, query):
        return fallback_to_suggestion("抱歉，我不太理解您的问题")

    return result
```

**核心原则**：任何 LLM 输出在被系统信任之前，必须经过验证。信任 but verify。

### 5.3 认知三：架构决策需要「可逆性」设计

在 LLM 领域，技术选型的风险比传统软件工程更高——因为很多方案刚诞生一两年，没有足够的时间验证其稳定性。

**我的策略是「可逆性架构」**：

```
LLM Provider 抽象层
       │
       ├── SQLCoderProvider (当前生产环境)
       ├── OpenAIProvider (备选，等 GPT-5)
       ├── ClaudeProvider (备选，等新版本)
       └── MiniMaxProvider (成本敏感时用)

切换策略：
- SQLCoder 效果不佳时 → OpenAI
- OpenAI 数据安全问题时 → SQLCoder
- 成本敏感时 → MiniMax
```

**关键实践**：
- 核心业务逻辑不直接依赖 LLM Provider
- 通过接口抽象 LLM 调用
- 保留降级路径

说白了就是：**不要 把鸡蛋放在一个篮子里**。这个道理我们都懂，但真正做的时候很容易被「效果好」蒙蔽双眼。

### 5.4 认知四：系统可靠性 > 单点能力

这是我在 2025 年最深的感悟。

**LLM 的单点能力（如生成 SQL 的准确率）固然重要，但系统的可靠性才是生产级应用的核心**。

给你算笔账：

```
一个准确率 85% 但有完整降级机制的系统：
可用率 = 1 - (LLM失败率 × 降级失败率)
       = 1 - (15% × 5%)
       = 99.25%

一个准确率 95% 但没有任何降级机制的系统：
可用率 = 1 - LLM失败率
       = 1 - 5%
       = 95%
```

看起来前者准确率低，但实际可用率反而更高。

**OperatorBoard 的可靠性实践**：
- 多级降级：LLM → 规则引擎 → 预设查询 → 友好错误
- 熔断机制：连续失败 N 次后自动切换策略
- 监控告警：实时追踪 LLM 成功率、响应延迟、错误类型

这让我想起小时候看的战争片，指挥官说的「要有预备队」。LLM 是主力，但预备队是必须的。

### 5.5 认知五：知识管理是新核心竞争力

在 LLM-Based SDD 中，**知识管理的质量直接决定了系统的智能程度**。

拿 OperatorBoard 来说，用户问「NR 频段的峰值速率」，LLM 怎么知道：
- NR 是什么？（5G 频段）
- 峰值速率对应哪个字段？（peak_rate）
- 要 JOIN 哪些表？（indicator_info）

这些不是 LLM「天生知道」的，而是**知识库告诉它的**。

```
知识管理金字塔

                    ▲
                   /│\        文档知识（Schema、API 文档）
                  / │ \       ——LLM 知道有什么
                 /  │  \
                /───┼---\     领域知识（业务规则、计算公式）
               /    │    \    ——LLM 知道怎么算
              /     │     \
             /──────┼──────\   系统知识（接口契约、调用模式）
            /       │       \  ——LLM 知道怎么用
           /        │        \
          /─────────┼─────────\ 专业知识（运营商特定知识）
         /          │          \ ——LLM 知道边界在哪
        /           │           \
```

**OperatorBoard 的知识管理实践**：
- **指标知识库**：标准化指标名称、定义、计算公式、单位
- **频段知识库**：LTE/NR 频段分类、对应频率范围、典型带宽
- **运营商知识库**：运营商名称标准化、地域分布、站点规模

---

## 六、工程化避坑清单：这些年踩过的那些坑

这一章我换个写法，不像前面那样分那么细的层级，想到哪写到哪。

**LLM 调用层的坑**：

中文 Prompt 在某些 LLM 上有编码问题。凌晨两点那个故事不是段子，是真实经历。换英文 Prompt 是最省事的解法，虽然听起来不太优雅。

JSON 解析需要健壮的异常处理。别假设 LLM 每次都返回合法的 JSON，它有时候会给你返回一个「我觉得应该是这样」的结构化输出。

temperature=0.1 是稳定性与创造性的平衡点。设太高，输出像开盲盒；设太低，输出像复读机。我一般从 0.1 开始调。

API Key 必须通过环境变量注入。有一次差点泄露到 GitHub，还好 pre-commit hook 拦住了。血的教训。

**Prompt 工程的坑**：

`{}` 占位符和 Python format() 冲突。这个我在第三章讲过，这是个结构性问题，建议直接上 Jinja2。

示例不是越多越好，3-5 个精选。我试过塞十几个示例，结果 LLM 反而困惑了，不知道该学哪个。

角色设定需要在 Prompt 开头重复。LLM 在长 Prompt 中会「遗忘」自己是谁，就像人开会开久了会走神一样。

**架构设计的坑**：

SQL 安全护栏必须用代码强制执行。Prompt 里说「不要全表扫描」没用，LLM 可能当耳旁风。

SSE 流式需要状态机管理。流式传输和完整性要求是两回事，要分开处理。

CQRS 适合复杂系统，小系统是过度设计。不要为了架构而架构。

**工程化的坑**：

Prompt 需要版本管理。改出问题的时候，你就知道版本管理有多重要了。

日志需要包含请求 ID 和版本。不写日志是等死，写太多日志是找死，适中很重要。

---

## 七、反思：LLM 没有改变软件工程的本质

### 7.1 一个老工程师的「冷思考」

在经历了一年多的 LLM-Based SDD 实践后，我对媒体上那些「LLM 颠覆软件工程」的论调越来越持保留态度。

**LLM 确实改变的**：
- 快速原型的时间周期（从周到天）
- 某些重复性编码工作的效率（CRUD 生成）
- 非结构化文档的处理方式（代码生成、注释生成）
- 知识封装的粒度（从代码到语义）

**LLM 没有改变的**：
- 架构决策的重要性（反而增加了，因为要处理 LLM 的不确定性）
- 安全设计的必要性（反而更重要了，因为 LLM 可能被注入恶意 Prompt）
- 可维护性的要求（Prompt 也需要维护、测试、版本管理）
- 测试的重要性（Prompt 输出仍需验证）
- 软件工程的本质：将人类意图转化为可靠系统

说到底，LLM 只是个工具。工具再强大，也需要人来用。筷子再好用，你也得自己动手夹菜。

### 7.2 我对「AI 取代程序员」论调的回应

每当有人问我「程序员会不会被 AI 取代」，我都会反问：

**「你能信任 AI 写的代码在生产环境中不出问题吗？」**

如果答案是「不能」，那说明还需要人来验证、审核、把关。**软件工程的本质不是「写代码」，而是「构建可靠系统」**。LLM 是工具，不是替代者。

更进一步，LLM 实际上在**提升工程师的价值**：
- 重复性工作被自动化后，工程师可以聚焦于架构设计和系统可靠性
- 「Prompt 即设计」意味着工程师的核心能力变成了「定义问题和验证解决方案」
- Multi-Agent 协作要求工程师具备「编排和治理」的新能力

当然，这个判断可能是错的。技术的发展往往超出我们的想象。保持谦逊，保持学习，保持批判性思考——这才是老工程师应有的态度。

### 7.3 未来展望：我们在哪，要往哪去

展望未来，我画了个演进路线图：

```
Level 1: LLM as Copilot
人类工程师 + AI 辅助编码（GitHub Copilot 模式）
你现在可能正在用

Level 2: LLM as Implementer
人类设计师（定义 Prompt/契约） + AI 生成代码
OperatorBoard 的 NL2SQL 模块在这个层级

Level 3: LLM as Agent
Multi-Agent 协作完成复杂任务
人类扮演 Orchestrator/Governer 角色
这是我们正在探索的方向

Level 4: LLM as Architect (未来？)
AI 自主完成需求分析 → 架构设计 → 代码生成 → 测试
人类仅负责目标定义和结果审核
听起来像科幻，但谁知道呢
```

目前 OperatorBoard 处于 **Level 2 向 Level 3 演进**的阶段。Multi-Agent 改造刚刚开始，能不能成功，还要看后续的实践。

---

## 结语

写这篇博客的时候，我一直在问自己：**我希望读者从中获得什么？**

如果你是有经验的工程师，我建议你看个热闹就行，别被那些「AI 颠覆一切」的论调带偏了。技术一直在变，但工程思维不会过时。

如果你正在探索 LLM 开发，我建议你记住五条：
1. Prompt 是契约，需要版本管理
2. LLM 输出不可靠，需要验证护栏
3. 架构决策要保留可逆性
4. 系统可靠性 > 单点能力
5. 知识管理是新核心竞争力

最后，用一句话总结我这三年多的探索：

> **LLM 让软件工程多了一个变量，但软件工程的核心——把人类意图转化为可靠系统——没有改变。唯一改变的是：我们有了更强大的工具，需要更高的系统思维。**

欢迎交流拍砖。

---

**项目地址**：[OperatorBoard](https://github.com/tianjunming/OperatorBoard)

**参考资料**：
- [SQLCoder - DefogAI](https://github.com/defog-ai/sqlcoder)
- [LangChain Documentation](https://docs.langchain.com/)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [CQRS Pattern - Microsoft](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
- [LangFuse - LLM Observability](https://langfuse.com/)
- [MCP Protocol - Model Context Protocol](https://modelcontextprotocol.io/)
- [LangGraph - Multi-Agent Orchestration](https://langchain-ai.github.io/langgraph/)
