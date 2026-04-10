# ADR-001: 采用FastAPI作为Agent API框架

## 状态
Accepted

## 日期
2026-04-10

## 上下文
- 需要快速构建高性能API服务
- 需要支持同步/异步调用
- 需要与现有LangChain框架集成
- 需要自动生成OpenAPI文档

## 决策
采用FastAPI作为API框架，主要考虑：
- 使用Pydantic进行请求/响应数据验证
- 使用httpx进行HTTP调用（支持异步）
- 使用BackgroundTasks处理异步任务
- 自动生成符合OpenAPI 3.0规范的文档

## 后果

### 正面
- 开发效率提升，类型安全
- 自动文档生成（Swagger UI / ReDoc）
- 原生支持异步（async/await）
- 性能优于Flask/Django

### 负面
- 学习曲线（需要理解Pydantic、依赖注入）
- 额外依赖（fastapi, uvicorn, pydantic, httpx）

### 中性
- 与Flask相比功能更少但性能更好
- 需要额外的ASGI服务器部署

## 替代方案考虑

### 1. Flask
- **优点**: 简单灵活，广泛使用
- **缺点**: 缺少原生Pydantic集成，需要手动验证

### 2. Django
- **优点**: 功能完整，生态成熟
- **缺点**: 过于重量级，不适合轻量级Agent服务

### 3. gRPC
- **优点**: 高性能，支持双向流
- **缺点**: 前端集成复杂，需要额外HTTP网关

## 参考
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Google API Design Guide - Resource Oriented Design](https://cloud.google.com/apis/design)
