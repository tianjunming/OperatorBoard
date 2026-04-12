# ADR-005: 采用Markdown扩展块实现结构化消息渲染

## 状态
Accepted

## 日期
2026-04-11

## 上下文
- Agent响应需要包含表格、图表、SQL代码等多种格式
- 需要支持流式输出（SSE）
- 前端需要可靠地解析和渲染不同类型的内容
- 需要与Markdown语法兼容，不破坏纯文本显示

## 决策
采用Markdown扩展块语法（参考Reveal.js幻灯片格式）实现结构化消息：

### 块类型定义

| 块类型 | 语法 | 用途 |
|--------|------|------|
| thinking | `<!-- thinking_start -->...<!-- thinking_end -->` | 思考链 |
| table | `:::table...:::` | 表格渲染 |
| chart | `:::chart[type]...:::` | 图表渲染 |
| toggle | `:::toggle[name]...[table]...[chart]...:::` | 可折叠内容 |
| steps | `:::steps...:::` | 步骤列表 |
| sql | `:::sql...:::` | SQL代码高亮 |

### 语法规范

#### 1. 表格块
```
:::table
| 列1 | 列2 | 列3 |
|------|------|------|
| 数据1 | 数据2 | 数据3 |
:::
```

#### 2. 图表块
```
:::chart[bar]
{"type": "bar", "column": "band", "data": [{"name": "LTE 700M", "value": 120}]}
:::
```

#### 3. 可折叠块
```
:::toggle[站点详情]
:::table
| 频段 | 站点数 |
| LTE 700M | 120 |
| LTE 3500M | 80 |
:::
:::chart[bar]
{"type": "bar", "data": [...]}
:::
:::
```

#### 4. SQL代码块
```
:::sql
SELECT o.operator_name, ss.band_name, ss.site_num, ss.cell_num
FROM site_info ss
JOIN operator_info o ON ss.operator_id = o.id
JOIN band_info b ON ss.band_id = b.id
WHERE ss.data_month = '2026-03'
LIMIT 10
:::
```

#### 5. 思考链（HTML注释）
```
<!-- thinking_start -->
分析用户查询：首先识别意图为site_data，然后提取运营商名称...
<!-- thinking_end -->
```

## 前端解析器实现

```typescript
// 解析器伪代码
function parseBlocks(content: string) {
    const blocks = [];

    // 1. 提取思考链
    const thinkingMatch = content.match(/<!-- thinking_start -->([\s\S]*?)<!-- thinking_end -->/);
    if (thinkingMatch) {
        blocks.push({ type: 'thinking', content: thinkingMatch[1] });
    }

    // 2. 提取表格块
    const tableRegex = /:::table\n([\s\S]*?)\n:::/g;
    let tableMatch;
    while ((tableMatch = tableRegex.exec(content)) !== null) {
        blocks.push({ type: 'table', content: tableMatch[1] });
    }

    // 3. 提取图表块
    const chartRegex = /:::chart\[(\w+)\]\n([\s\S]*?)\n:::/g;
    let chartMatch;
    while ((chartMatch = chartRegex.exec(content)) !== null) {
        blocks.push({
            type: 'chart',
            chartType: chartMatch[1],
            content: JSON.parse(chartMatch[2])
        });
    }

    // 4. 提取其他块...
    return blocks;
}
```

## 后果

### 正面
- 格式扩展性强，支持多种内容类型
- 与Markdown兼容，纯文本查看不受影响
- 便于前端解析和渲染
- 支持流式输出

### 负面
- 需要前端解析器（复杂度增加）
- 存在注入风险，需要严格过滤用户输入
- 块语法需要文档说明

### 中性
- 语法不够简洁（相比JSON）
- 需要处理块嵌套情况

## 安全考虑
- 用户输入必须经过XSS过滤
- 块内容使用textContent而非innerHTML
- 图表数据JSON必须经过解析验证

## 替代方案考虑

### 1. JSON消息协议
- **优点**: 结构化程度高，解析简单
- **缺点**: 纯文本查看不友好，需要特殊工具

### 2. Markdown + 自定义标签
```markdown
<chart type="bar">
{"data": [...]}
</chart>
```
- **优点**: 类似HTML，易于理解
- **缺点**: 可能与实际HTML冲突

### 3. 分隔符协议
```
---TABLE---
| 表1 | 表2 |
---CHART---
{"type": "bar", ...}
```
- **优点**: 简单直观
- **缺点**: 分隔符可能与内容冲突

## 参考
- [Reveal.js Slides Markdown](https://revealjs.com/markdown/)
- [GitHub Flavored Markdown](https://docs.github.com/en/get-started/writing-on-github)
- [Stripe API Response Format](https://stripe.com/docs/formatting)
