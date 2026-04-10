# ADR-004: 采用SQLCoder自托管模型实现NL2SQL

## 状态
Accepted

## 日期
2026-04-10

## 上下文
- 需要将自然语言转换为SQL查询
- 数据安全要求高，不能使用外部API（数据不能出网）
- 需要严格的SQL安全检查
- 需要支持MySQL方言

## 决策
采用自托管SQLCoder模型实现NL2SQL：

### 部署架构
```
┌─────────────────────────────────────────────────────────────┐
│                    Operator Service                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Nl2SqlController                          │  │
│  │  1. 接收自然语言查询                                   │  │
│  │  2. 构建Prompt（包含Schema）                          │  │
│  │  3. 调用SQLCoder生成SQL                               │  │
│  │  4. 执行SQL安全检查                                   │  │
│  │  5. 执行SQL并返回结果                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
       ┌─────────────────────────────────────────────┐
       │         SQLCoder LLM                       │
       │    (Self-hosted, localhost:8081)           │
       │    - DefogAI/sqlcoder-7b                   │
       │    - GPU required (RTX 3090+)              │
       └─────────────────────────────────────────────┘
                              │
                              ▼
       ┌─────────────────────────────────────────────┐
       │              MySQL Database                  │
       └─────────────────────────────────────────────┘
```

### SQL安全检查规则
```java
private boolean isSqlSafe(String sql) {
    // 1. 必须以SELECT开头（忽略前后空白）
    // 2. 禁止关键词: DROP, DELETE, INSERT, UPDATE, TRUNCATE, ALTER, CREATE, GRANT, REVOKE
    // 3. 禁止注释: --, /*, */
    // 4. 禁止分号结尾
    // 5. 必须包含LIMIT子句
}
```

### Prompt构建
```
You are a MySQL expert. Convert the following natural language query to SQL.

Database Schema:
{tables_and_columns}

Natural Language Query: {user_query}

Requirements:
- Only generate SELECT statements
- Use proper MySQL syntax
- Add LIMIT clause (default 1000)
- Do not include comments or explanations
```

## 后果

### 正面
- 数据安全完全可控（数据不出网）
- 无外部API依赖
- 可定制化程度高
- 长期运营成本可控

### 负面
- 模型效果依赖SQLCoder版本
- 需要GPU资源部署
- 模型更新需要重新训练/微调
- 推理速度慢于商业API

### 中性
- 需要额外的运维成本
- 模型量化可能影响准确率

## 替代方案考虑

### 1. OpenAI GPT-4
- **优点**: 效果好，支持多语言
- **缺点**: 数据出境安全隐患

### 2. Claude API
- **优点**: 效果好，安全性相对较好
- **缺点**: 数据出境，API成本高

### 3. 自训练NL2SQL模型
- **优点**: 效果最好，完全定制化
- **缺点**: 训练成本极高，需要大量标注数据

### 4. 规则+模板引擎
- **优点**: 性能好，无额外依赖
- **缺点**: 覆盖场景有限，难以处理复杂查询

## 安全考虑
- 数据库账号使用最小权限（只读用户）
- SQLCoder服务仅监听localhost
- 执行SQL前再次验证
- 限制单次查询返回行数

## 参考
- [SQLCoder - DefogAI](https://github.com/defog-ai/sqlcoder)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/gpt-best-practices)
