# ADR-003: 采用MiniMax M2-her LLM进行意图识别与路由

## 状态
Accepted

## 日期
2026-04-10

## 上下文
- 用户查询类型多样（站点数据、指标数据、运营商列表、NL2SQL）
- 需要智能路由到不同处理模块
- 运营商名称需要中英文映射（如"北京联通" → "China Unicom"）
- 需要处理模糊/多意图查询

## 决策
采用MiniMax M2-her LLM进行意图识别：

### 支持的意图类型
| 意图 | 路由目标 | 数据类型 |
|------|----------|----------|
| site_data | get_site_cells() | 站点小区汇总 |
| indicator_data | get_latest_indicators() | 性能指标 |
| operator_list | /operators | 运营商列表 |
| latest_data | 最新月份过滤 | 最新数据 |
| nl2sql | query_nl2sql() | 自然语言SQL |

### 实现策略
1. **英文Prompt**: 使用英文Prompt避免MiniMax中文编码问题
2. **结构化输出**: 要求LLM返回JSON格式的意图解析结果
3. **动态运营商映射**: 支持模糊匹配运营商名称
4. **降级策略**: LLM不可用时使用关键词匹配降级

### Prompt模板
```
You are an intent detection system for a telecom operator data platform.

Given the user query: "{user_query}"

Detect the intent and extract parameters. Return JSON:
{
    "intent": "site_data|indicator_data|operator_list|latest_data|nl2sql",
    "operator_name": "运营商名称(中文)",
    "data_month": "YYYY-MM格式月份",
    "band": "频段(如3500M)",
    "limit": 数字
}

Rules:
- If operator name is mentioned (e.g. "北京联通", "上海移动"), map to English name
- data_month should be in YYYY-MM format, use "latest" if not specified
- band should be in format like "3500M", "700M"
```

## 意图解析结果示例
```json
{
    "intent": "site_data",
    "operator_name": "中国联通",
    "data_month": "latest",
    "band": "3500M",
    "limit": 10
}
```

## 运营商映射规则
```python
OPERATOR_MAPPING = {
    "北京联通": "China Unicom",
    "上海联通": "China Unicom",
    "北京移动": "China Mobile",
    "上海移动": "China Mobile",
    "北京电信": "China Telecom",
    "上海电信": "China Telecom",
}
```

## 后果

### 正面
- 支持复杂自然语言理解
- 扩展性强，新增意图只需修改Prompt
- 可以处理模糊/多意图查询
- 统一的意图解析逻辑

### 负面
- 额外API调用延迟（通常100-500ms）
- 依赖外部LLM服务可用性
- 需要维护Prompt模板

### 中性
- 意图识别准确率依赖LLM能力
- 需要持续优化Prompt

## 替代方案考虑

### 1. 关键词匹配
- **优点**: 性能好，无额外延迟
- **缺点**: 无法处理复杂查询，扩展性差

### 2. 规则引擎（如Drools）
- **优点**: 性能好，可解释性强
- **缺点**: 维护成本高，难以处理模糊匹配

### 3. 微调专用模型
- **优点**: 准确率高，定制化强
- **缺点**: 训练成本高，需要数据标注

## 参考
- [LangChain Intent Detection](https://python.langchain.com/docs/modules/agents/)
- [MiniMax API Documentation](https://api.minimaxi.com/)
