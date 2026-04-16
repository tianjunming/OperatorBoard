# 大模型时代的新型软件开发范式：LLM-Based SDD 实战指南

> "软件工程的核心挑战是什么？是把人类的意图准确无误地转化为机器可执行的指令。而今，LLM正在重新定义这条转化路径。"

## 一、重新理解软件开发：什么是 LLM-Based SDD？

### 1.1 传统 SDD vs LLM-Based SDD

在展开讨论前，我们需要厘清一个概念：**SDD (Semantic-Driven Development/Design)** 在大模型时代被赋予了全新的内涵。

| 维度 | 传统 SDD | LLM-Based SDD |
|------|----------|----------------|
| **设计载体** | UML图表、架构文档 | Prompt + 代码 + 迭代反馈 |
| **设计工具** | Visio、Draw.io | LLM对话、代码生成 |
| **设计产出** | 静态文档 | 动态可执行规范 |
| **设计周期** | 设计→实现→验证（长周期） | 设计即实现，实现即测试（短周期） |
| **需求转化** | 需求文档→技术方案→代码 | 自然语言→Prompt→原型→精化 |
| **不确定性** | 低（确定性技术栈） | 高（LLM输出有概率性） |

### 1.2 核心概念辨析

**Prompt 即设计 (Prompt as Design)**

在传统开发中，我们用 UML 图来描述系统结构，用接口文档来定义组件契约。在 LLM-Based SDD 中，这些设计文档的形态发生了变化：

```python
# 传统设计：定义接口契约
interface IntentDetector:
    def detect(query: str) -> IntentResult

# LLM-Based 设计：用 Prompt 定义语义
INTENT_DETECTION_PROMPT = """
You are an intent detection system for telecom operator data.

Given user query: "{query}"

Detect intent and extract parameters:
- site_data: Query site/cell counts
- indicator_data: Query network performance
- operator_list: List operators
- nl2sql: Complex SQL query

Return JSON with: intent, operator_name, band, network_type, data_month
"""
```

**Prompt 不是在「写代码」，而是在「定义系统行为边界」。** 这本质上是一种设计活动。

**LLM as Design Reviewer**

传统开发中，设计评审需要召集专家会议。LLM 可以充当实时的设计评审者：

```
开发者：我想用意图识别来判断用户是想查站点还是查指标。
LLM：   好的方案。但请考虑：
        1. 如果用户说「联通站点和移动站点对比」——这是多意图
        2. 如果用户说「帮我查个数据」——意图模糊该如何处理？
        3. 建议增加降级策略：意图检测失败时默认走 nl2sql 路由
```

**迭代式设计 (Iterative Design)**

LLM 的交互模式天然支持迭代：

```
Phase 1: 快速原型
    ↓ "这个 Prompt 返回的 JSON 格式不稳定"
Phase 2: Prompt 优化
    ↓ "中文 Prompt 在某些 LLM 上有乱码"
Phase 3: 工程化落地
    ↓ "需要加入缓存、重试、降级"
Phase 4: 安全护栏
```

---

## 二、业界技术对比：LLM 开发方法论

### 2.1 主流 LLM 开发模式

| 模式 | 代表实践 | 适用场景 | 优势 | 劣势 |
|------|----------|----------|------|------|
| **Prompt Engineering Only** | 调优 Prompt 调用 GPT-4 | 简单任务、API 集成 | 快速、无工程成本 | 依赖外部 API、延迟高、数据安全 |
| **Fine-tuning** | LoRA/QLoRA 微调 | 特定领域任务 | 效果稳定、领域适配 | 训练成本高、需要数据 |
| **RAG + Fine-tuning** | 检索增强+微调 | 知识密集型任务 | 知识新鲜、领域精准 | 架构复杂 |
| **Self-hosted LLM** | SQLCoder/CodeLlama 自托管 | 数据敏感、隐私要求 | 数据安全、成本可控 | 硬件要求高、效果受限 |
| **Agent + Tools** | LangChain/AutoGPT | 复杂多步骤任务 | 灵活性高、扩展性强 | 编排复杂、调试困难 |

### 2.2 NL2SQL 方案对比

这是我们项目最关键的技术选型之一，也是最容易踩坑的地方。

| 方案 | 准确率 | 延迟 | 成本 | 数据安全 | 适用规模 |
|------|--------|------|------|----------|----------|
| **GPT-4 + Text-to-SQL** | ~85% | 2-5s | $0.03/query | 低（数据出境） | 中小规模 |
| **Claude + Text-to-SQL** | ~83% | 2-4s | $0.015/query | 低 | 中小规模 |
| **SQLCoder-7B (自托管)** | ~78% | 0.5-2s | 硬件成本 | **高** | 大规模 |
| **DuckDB-NSQL** | ~75% | 0.3-1s | 硬件成本 | **高** | 中等规模 |
| **规则 + 模板** | ~60% | <0.1s | 极低 | **高** | 简单查询 |

**我们的选择理由**：运营商数据是核心商业机密，数据不能出网。因此选择 **SQLCoder 自托管**。

但自托管方案带来了新问题：模型效果不如 GPT-4，需要更多的工程化补偿。

### 2.3 意图识别方案对比

| 方案 | 实现复杂度 | 准确率 | 维护成本 | 适用场景 |
|------|------------|--------|----------|----------|
| **关键词匹配** | 低 | 低 | 低 | 简单、固定查询 |
| **正则规则引擎** | 中 | 中 | 中 | 半结构化查询 |
| **LLM 意图检测** | 中 | 高 | 中 | 复杂、自然语言 |
| **多级级联** | 高 | 高 | 中 | 混合场景 |

我们选择 **MiniMax M2-her LLM 意图检测**，但加入降级策略应对 LLM 不可用的情况。

---

## 三、项目实战：OperatorBoard 的 LLM-Based SDD 旅程

### 3.1 项目起点：问题定义

我们的起点是一个真实的业务痛点：

```
运营商内部人员需要频繁查询：
- 站点数量、小区数量
- 频段分布、覆盖率
- 网络性能指标

传统方案：
- 写 SQL → 等待 DBA 审核 → 执行 → 导出 Excel
- 周期：小时级

期望方案：
- 说人话 → 系统理解 → 返回结果
- 周期：秒级
```

**LLM-Based SDD 的第一个原则**：从真实痛点出发，而非从技术可能性出发。

### 3.2 Phase 1：语义层设计（用 Prompt 定义系统）

我们没有直接写代码，而是先设计了系统的「语义边界」：

```python
# 第一版语义设计：Intent Detection
"""
系统需要理解的用户意图：

1. site_data（站点数据）
   - "联通有多少站点"
   - "移动 3500M 小区数"
   - 运营商 + 频段 → 返回汇总数据

2. indicator_data（指标数据）
   - "联通 5G 速率"
   - "最新月份覆盖率"
   - 运营商 + 频段 + 月份 → 返回指标

3. operator_list（运营商列表）
   - "有哪些运营商"
   - 无需参数 → 返回列表

4. latest_data（最新数据过滤）
   - "最新的数据"
   - 作为其他意图的修饰符

5. nl2sql（复杂查询）
   - 不适合预定义的查询
   - 走 LLM 生成 SQL
"""

# 这个 Prompt 模板本身 就是系统的设计规范
INTENT_PROMPT_TEMPLATE = """..."""
```

**学到的教训**：最初的 Prompt 存在中文乱码问题。

```python
# 有问题的版本
prompt = f"用户问：{query}，请判断意图"

# 修复后的版本（使用英文 Prompt）
prompt = f"""You are an intent detection system.
Given user query: "{query}"
Return JSON format: ..."""
```

**原因分析**：MiniMax 对中文结构化输出的编码处理不稳定。解决方案：英文 Prompt + 后处理映射。

### 3.3 Phase 2：架构设计（多层抽象）

有了语义层定义后，我们设计了系统架构。这里体现了 **LLM-Based SDD 的第二个原则**：用代码验证设计，而非用文档验证设计。

```
设计产出：架构图（略）
验证方式：写代码实现，记录遇到的问题，反推设计缺陷
```

**核心架构决策 1：CQRS 读写分离**

| 设计预期 | 实际发现的问题 |
|----------|----------------|
| Command (NL2SQL) 和 Query 独立扩展 | 流式响应与结构化数据格式冲突 |
| Query 端直接映射实体，性能好 | 某些查询需要跨多个聚合表 |
| 独立优化 Command 或 Query | 发现共用的 Schema 需要共享 |

**解决方案**：引入事件驱动接口。

```javascript
// SSE 事件类型定义（架构设计的核心产出）
const SSE_EVENTS = {
  START: 'start',           // 流开始
  CONTENT: 'content',       // 文本片段
  CHART: 'chart',          // 图表数据
  TABLE: 'table',          // 表格数据
  CONFIRMATION: 'confirmation',  // 模糊查询确认
  ERROR: 'error',          // 错误
  DONE: 'done'            // 流结束
};

// 这不是代码，是架构契约
// 所有 Agent 和前端必须遵守这个契约
```

**核心架构决策 2：多层安全护栏**

这是 LLM-Based 开发最独特的工程化需求：**永远不要相信 LLM 的输出**。

```java
// SQL 安全护栏（这是 SDD 的安全语义）
public class SqlSafetyValidator {
    public boolean validate(String sql) {
        // 规则1: 必须 SELECT 开头
        // 规则2: 禁止危险关键词
        // 规则3: 必须有 LIMIT
        // 规则4: 禁止注释
        // 规则5: 禁止分号终结
    }
}
```

**学到的教训**：最初只检查了 `SELECT`，但 LLM 生成了没有 LIMIT 的全表扫描 SQL，导致数据库负载飙升。

### 3.4 Phase 3：Prompt 工程化（从实验到生产）

**LLM-Based SDD 的第三个原则**：Prompt 是代码，需要版本管理、测试、监控。

```yaml
# 配置即代码（Prompt 版本化）
# configs/intent_detection.yaml
model:
  name: minimax
  endpoint: ${INTENT_LLM_ENDPOINT}
  api_key: ${INTENT_API_KEY}
  timeout: 10000
  retries: 3

prompt:
  template: "intent_detection_prompt_v2"
  temperature: 0.1  # 低温度保证稳定性
  max_tokens: 500

cache:
  enabled: true
  ttl: 300  # 5分钟缓存
```

**Prompt 测试策略**：

```python
# Prompt 的单元测试
def test_intent_detection_prompt():
    cases = [
        ("联通有多少站点", "site_data"),
        ("移动5G速率", "indicator_data"),
        ("有哪些运营商", "operator_list"),
    ]
    for query, expected_intent in cases:
        result = detect_intent(query)
        assert result["intent"] == expected_intent
```

### 3.5 Phase 4：工程化挑战（踩坑大全）

#### 坑 1：Prompt.format() 的变量冲突

```python
# 有问题的代码
prompt_template = """
Given user query: "{query}"
Return format: {format}
"""
prompt = prompt_template.format(query=query, format="{json}")
# KeyError: 'json'  ← Python 把 {format} 当成变量了
```

```python
# 解决方案：使用 replace() 避免占位符冲突
prompt = prompt_template.replace("{query}", query).replace("{format}", "json")
```

#### 坑 2：LLM 输出的 JSON 不稳定

```python
# LLM 有时返回：
# {"intent": "site_data"}  ✓ 正确
# {"intent": "site_data", }  ✗ 尾部逗号
# {"intent": "site_data", "operator": null}  ✗ null vs "null"
# "{\"intent\": \"site_data\"}"  ✗ 双重序列化

# 解决方案：健壮 JSON 解析
import json
import re

def safe_parse(response: str) -> dict:
    # 清理常见问题
    cleaned = response.strip()
    # 移除可能的 markdown 代码块
    cleaned = re.sub(r'^```json\s*', '', cleaned)
    cleaned = re.sub(r'\s*```$', '', cleaned)
    # 处理双重编码
    if cleaned.startswith('"') and cleaned.endswith('"'):
        cleaned = json.loads(cleaned)
    return json.loads(cleaned)
```

#### 坑 3：流式输出与结构化数据撕裂

用户期望：看到数据一片一片地流出来。
现实：SSE 协议要求每条消息独立完整。

```
设计：分片传输 → 现实：消息边界问题
```

**解决方案**：定义清晰的消息协议和聚合策略。

```javascript
// 前端消息聚合
class SSEProcessor {
    process(event) {
        const data = JSON.parse(event.data);

        switch(data.type) {
            case 'content':
                this.appendContent(data.content);
                break;
            case 'chart':
                this.setChart(data.chart);
                break;
            case 'done':
                this.finalize();
                break;
        }
    }
}
```

---

## 四、SDD 开发模式总结：如何在项目中用 LLM 做 SDD

### 4.1 SDD 流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    LLM-Based SDD 流程                         │
└─────────────────────────────────────────────────────────────┘

     ┌─────────────────┐
     │  业务问题定义     │  ← 真实痛点，非技术幻想
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │  语义层设计      │  ← 用 Prompt 定义系统边界
     │  (Prompt as     │     不是写接口，是写语义契约
     │   Design)       │
     └────────┬────────┘
              │
              ▼
     ┌─────────────────┐
     │  快速原型验证    │  ← 用代码验证设计，而非文档
     └────────┬────────┘
              │
         ┌────┴────┐
         │ 验证通过？ │
         └────┬────┘
           │    │
          Yes   No
           │    └──┌─────────────────┐
           │       │  问题分析与归类  │
           │       └────────┬────────┘
           │                │
           ▼                ▼
     ┌───────────┐   ┌───────────┐
     │  工程化    │   │  Prompt   │
     │  落地      │   │  优化     │
     └─────┬─────┘   └─────┬─────┘
           │               │
           └───────┬───────┘
                   │
                   ▼
          ┌─────────────────┐
          │  安全护栏 + 监控 │
          └─────────────────┘
```

### 4.2 三条核心原则

**原则 1：Prompt 即设计 (Prompt as Design)**

- Prompt 模板是系统行为的契约
- 需要版本化管理
- 需要像代码一样测试

**原则 2：永远假设 LLM 是不可靠的**

- 输出必须验证
- 必须有安全护栏
- 必须有降级策略

**原则 3：用代码验证设计，而非文档**

- 快速原型 → 暴露设计问题
- 迭代优化 → 收敛到可用方案
- 文档是事后的，代码是诚实的

### 4.3 项目中的 SDD 应用清单

| 开发阶段 | SDD 活动 | LLM 参与方式 |
|----------|----------|--------------|
| 需求分析 | 定义系统意图类型 | 对话式探索业务边界 |
| 架构设计 | 设计 CQRS 分离 | LLM 建议架构模式 |
| 接口设计 | 定义 SSE 事件协议 | Prompt 模板即契约 |
| 安全设计 | SQL 安全规则 | 多层护栏设计 |
| 单元测试 | Prompt 测试用例生成 | 生成边界测试 |
| 集成测试 | 端到端场景验证 | 协助调试复杂流程 |

---

## 五、实战避坑指南：35 个血泪经验

### 5.1 LLM 调用避坑

| # | 坑 | 解决方案 | 严重度 |
|---|-----|----------|--------|
| 1 | 中文乱码 | 英文 Prompt + 后处理映射 | 🔴 高 |
| 2 | JSON 格式不稳定 | 健壮解析 + 正则清理 | 🔴 高 |
| 3 | 输出截断 | 增加 max_tokens + 流式处理 | 🟡 中 |
| 4 | 响应延迟高 | 缓存 + 异步处理 | 🟡 中 |
| 5 | 幻觉生成 | 多层安全护栏 | 🔴 高 |
| 6 | 温度过高结果不稳定 | temperature=0.1 | 🟢 低 |
| 7 | API Key 泄露 | 环境变量管理 | 🔴 高 |
| 8 | Prompt 注入 | 输入清理 + 白名单 | 🔴 高 |
| 9 | 并发超限 | 限流 + 队列 | 🟡 中 |
| 10 | 服务不可用 | 降级策略 + 监控 | 🟡 中 |

### 5.2 Prompt 工程避坑

| # | 坑 | 解决方案 | 严重度 |
|---|-----|----------|--------|
| 11 | `{}` 占位符冲突 | 使用 `replace()` 而非 `format()` | 🟡 中 |
| 12 | 示例数量过多 | 3-5 个精选示例 | 🟢 低 |
| 13 | 指令与示例冲突 | 示例必须符合指令 | 🟡 中 |
| 14 | 角色设定被忽略 | 在 Prompt 开头强调 | 🟡 中 |
| 15 | 输出格式不一致 | 明确指定 JSON Schema | 🟡 中 |

### 5.3 架构设计避坑

| # | 坑 | 解决方案 | 严重度 |
|---|-----|----------|--------|
| 16 | 流式与结构冲突 | 定义清晰事件协议 | 🟡 中 |
| 17 | SQL 无 LIMIT | 安全护栏强制检查 | 🔴 高 |
| 18 | 全表扫描 | 必填 WHERE + 索引优化 | 🔴 高 |
| 19 | 多意图未处理 | 降级到 nl2sql | 🟡 中 |
| 20 | 状态丢失 | SSE 聚合 + 状态机 | 🟡 中 |
| 21 | 错误处理混乱 | 统一 ErrorCode 体系 | 🟢 低 |

### 5.4 工程化避坑

| # | 坑 | 解决方案 | 严重度 |
|---|-----|----------|--------|
| 22 | 配置散落 | YAML 统一管理 | 🟢 低 |
| 23 | Prompt 无版本 | 文件名 + Git 管理 | 🟡 中 |
| 24 | 测试缺失 | Prompt 单元测试 | 🟡 中 |
| 25 | 监控缺失 | 调用链路追踪 | 🟡 中 |
| 26 | 缓存失效 | TTL + 手动刷新 | 🟢 低 |
| 27 | 日志不足 | 结构化日志 + 请求 ID | 🟢 低 |

---

## 六、工具链推荐

| 环节 | 推荐工具 |
|------|----------|
| Prompt 管理 | Promptify、LangSmith |
| LLM 测试 | Mintlify、OpenRouter |
| 安全检测 | SQLiCo、Semantic Kernel |
| 监控告警 | LangFuse、Helicone |
| 版本控制 | Git + Prompt 文件 |

---

## 结语：LLM 是实习生，不是专家

在项目的整个开发过程中，我们最大的收获不是某个具体技术的掌握，而是一个认知转变：

> **把 LLM 当作「实习生」而不是「专家」。**
>
> - 实习生可以帮你完成明确的任务 ✓
> - 实习生的输出必须复核 ✗
> - 实习生需要明确的边界和规则 ✗
> - 实习生无法处理模糊需求 ✗
> - 实习生可能「拍脑袋」给出错误答案 ✗

所以，**LLM-Based SDD 的核心不是「用 LLM 写代码」，而是「用设计思维 + 工程护栏 + 迭代优化」来构建可靠系统**。

LLM 降低了某些工作的门槛（快速原型、代码生成、文档撰写），但没有降低软件工程的复杂度。架构设计、安全考虑、可维护性——这些仍然是人类工程师的核心价值所在。

---

**参考资料**：
- [SQLCoder - DefogAI](https://github.com/defog-ai/sqlcoder)
- [LangChain Documentation](https://docs.langchain.com/)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)
- [CQRS Pattern - Microsoft](https://learn.microsoft.com/en-us/azure/architecture/patterns/cqrs)
