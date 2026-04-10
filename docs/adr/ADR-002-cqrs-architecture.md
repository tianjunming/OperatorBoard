# ADR-002: 在NL2SQL服务中采用CQRS模式

## 状态
Accepted

## 日期
2026-04-10

## 上下文
- 查询类型多样（站点数据、指标数据、NL2SQL查询）
- 需要分离读写职责，优化不同类型请求的处理
- Java Spring Boot项目中需要清晰的分层架构
- NL2SQL命令侧需要调用LLM生成SQL，查询侧需要优化数据库访问

## 决策
在Java层采用CQRS (Command Query Responsibility Separation)模式：

### Command侧 (Nl2SqlController)
- 处理NL2SQL查询的转换逻辑
- 调用SQLCoder LLM生成SQL
- 执行SQL安全检查
- 返回查询结果

### Query侧 (OperatorQueryController, IndicatorQueryController)
- 处理数据查询请求
- 优化数据库访问模式
- 支持分页、筛选、排序
- 返回格式化数据

## 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     Operator Service                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐    ┌────────────────────────────┐ │
│  │   Command Side       │    │     Query Side             │ │
│  │   (Nl2SqlController) │    │  (OperatorQueryController)│ │
│  │                      │    │  (IndicatorQueryController)│ │
│  └──────────┬───────────┘    └──────────┬─────────────────┘ │
│             │                            │                    │
│             ▼                            ▼                    │
│  ┌──────────────────────┐    ┌────────────────────────────┐ │
│  │  Nl2SqlCommandService│    │    QueryService            │ │
│  │  - SQL生成           │    │  - 站点汇总查询            │ │
│  │  - SQL安全检查        │    │  - 指标查询                │ │
│  │  - LLM调用           │    │  - 分页优化                │ │
│  └──────────┬───────────┘    └──────────┬─────────────────┘ │
│             │                            │                    │
└─────────────┼────────────────────────────┼────────────────────┘
              │                            │
              ▼                            ▼
       ┌─────────────────────────────────────────────┐
       │              SQLCoder LLM                    │
       │          (Self-hosted, localhost)            │
       └─────────────────────────────────────────────┘
              │
              ▼
       ┌─────────────────────────────────────────────┐
       │              MySQL Database                 │
       └─────────────────────────────────────────────┘
```

## 后果

### 正面
- 职责清晰，代码维护性提升
- 便于针对不同类型请求进行优化
- 可以独立扩展读/写能力
- 便于添加缓存策略

### 负面
- 架构复杂度增加
- 需要维护两套查询逻辑
- 事件源和一致性处理更复杂

### 中性
- 需要额外的文档和培训
- CQRS更适合复杂业务场景

## 替代方案考虑

### 1. 传统分层架构
- **优点**: 简单直接，易于理解
- **缺点**: 读写混合，难以针对性优化

### 2. 事件溯源
- **优点**: 完整的审计跟踪
- **缺点**: 复杂度高，需要额外存储

## 参考
- [CQRS Pattern - Microsoft](https://learn.microsoft.com/en-us/azure/architecture/microservices/microservice-domain-model)
- [Stripe API Design](https://stripe.com/blog/radar-design)
