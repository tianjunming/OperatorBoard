# 部署视图 (Deployment View)

## 1. 概述

部署视图描述系统的物理部署架构和基础设施配置。

## 2. 系统拓扑

```
┌─────────────────────────────────────────────────────────────────┐
│                        End Users                                 │
│                    (REST Clients)                                │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway / Load Balancer                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ OperatorAgent │  │ OperatorAgent │  │ OperatorAgent │
│   Instance 1  │  │   Instance 2  │  │   Instance N  │
│  (Python/AIO) │  │  (Python/AIO) │  │  (Python/AIO) │
└───────┬───────┘  └───────┬───────┘  └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
     ┌─────────────────────┼─────────────────────┐
     │                     │                     │
     ▼                     ▼                     ▼
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│ Java Micros │      │ Java Micros │      │ Java Micros │
│  Service A  │      │  Service B  │      │  Service C  │
│  (Spring)   │      │  (Spring)   │      │  (Spring)   │
└─────────────┘      └─────────────┘      └─────────────┘

     ┌─────────────────────────────────────────────────┐
     │                                                 │
     ▼                     ▼                          ▼
┌─────────────┐      ┌─────────────┐           ┌─────────────┐
│Agent Registry│      │Vector Store │           │   Message   │
│  (MCP Hub)  │      │  (Chroma)   │           │    Queue    │
└─────────────┘      └─────────────┘           └─────────────┘
```

## 3. 部署配置

### 3.1 Docker Compose 配置

```yaml
version: '3.8'

services:
  operator-agent:
    build:
      context: ./operator-agent
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - AGENT_REGISTRY_URL=http://agent-registry:8001
      - JAVA_SERVICE_BASE_URL=http://java-service:8080
      - VECTOR_STORE_PATH=/data/vectorstore
    volumes:
      - ./data:/data
    depends_on:
      - agent-registry
      - vector-store
    networks:
      - agent-network

  agent-registry:
    image: agent-registry:latest
    ports:
      - "8001:8001"
    networks:
      - agent-network

  vector-store:
    image: chromadb/chroma:latest
    ports:
      - "8002:8000"
    volumes:
      - ./chroma_data:/data
    networks:
      - agent-network

  java-service:
    image: java-microservice:latest
    ports:
      - "8080:8080"
    networks:
      - agent-network

networks:
  agent-network:
    driver: bridge
```

### 3.2 Kubernetes 部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: operator-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: operator-agent
  template:
    metadata:
      labels:
        app: operator-agent
    spec:
      containers:
      - name: operator-agent
        image: operator-agent:latest
        ports:
        - containerPort: 8000
        env:
        - name: AGENT_REGISTRY_URL
          value: "http://agent-registry:8001"
        resources:
          limits:
            memory: "2Gi"
            cpu: "1000m"
          requests:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: operator-agent-svc
spec:
  selector:
    app: operator-agent
  ports:
  - port: 80
    targetPort: 8000
  type: LoadBalancer
```

## 4. 基础设施组件

### 4.1 向量存储部署

```
┌─────────────────────────────────────────────────────┐
│              ChromaDB Cluster                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Primary    │  │  Replica 1  │  │  Replica 2  │ │
│  │  (Writer)   │──│  (Reader)   │  │  (Reader)   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘ │
│         │                                             │
└─────────┼─────────────────────────────────────────────┘
          │
          ▼
    ┌───────────┐
    │ S3 / NFS  │
    │ (持久化)   │
    └───────────┘
```

### 4.2 MCP 服务器部署

```
┌──────────────────────────────────────────────────────┐
│              MCP Server Infrastructure                │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │         Agent Registry (MCP Hub)              │   │
│  │  - Agent Discovery                            │   │
│  │  - Capability Catalog                         │   │
│  │  - Request Routing                            │   │
│  └──────────────────────────────────────────────┘   │
│                    │                                 │
│    ┌───────────────┼───────────────┐                │
│    ▼               ▼               ▼                │
│ ┌──────┐        ┌──────┐       ┌──────┐            │
│ │Agent │        │Agent │       │Agent │            │
│ │  A   │        │  B   │       │  C   │            │
│ └──────┘        └──────┘       └──────┘            │
└──────────────────────────────────────────────────────┘
```

## 5. 网络配置

### 5.1 安全区域

| 区域 | CIDR | 服务 | 访问控制 |
|------|------|------|----------|
| DMZ | 10.0.1.0/24 | API Gateway | 外部 |
| App | 10.0.2.0/24 | Operator Agent | DMZ → App |
| Data | 10.0.3.0/24 | Java Services, DB | App → Data |
| Storage | 10.0.4.0/24 | Vector Store | App → Storage |

### 5.2 防火墙规则

```bash
# 允许 Agent 到 Java 服务
iptables -A FORWARD -s 10.0.2.0/24 -d 10.0.3.0/24 -p tcp --dport 8080 -j ACCEPT

# 允许 Agent 到 Vector Store
iptables -A FORWARD -s 10.0.2.0/24 -d 10.0.4.0/24 -p tcp --dport 8000 -j ACCEPT
```

## 6. 配置管理

### 6.1 环境变量

```bash
# Agent 配置
export AGENT_NAME="OperatorAgent"
export AGENT_MODEL="claude-3-sonnet-20240229"
export AGENT_REGISTRY_URL="http://agent-registry:8001"

# Java 服务配置
export JAVA_SERVICE_BASE_URL="http://java-service:8080"
export JAVA_SERVICE_TIMEOUT=60

# 向量存储配置
export VECTOR_STORE_TYPE="chroma"
export VECTOR_STORE_PATH="/data/vectorstore"

# MCP 配置
export MCP_SERVER_URL="http://mcp-server:9000"
export MCP_TIMEOUT=30
```

### 6.2 配置文件挂载

```yaml
# Kubernetes ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: agent-config
data:
  agent.yaml: |
    agent:
      name: "OperatorAgent"
      model_name: "claude-3-sonnet-20240229"
      temperature: 0.7

  tools.yaml: |
    tools:
      java_service:
        base_url: "http://java-service:8080"
        timeout: 60
```

## 7. 监控与日志

### 7.1 监控配置

```yaml
# Prometheus metrics
- name: agent_requests_total
  type: counter
  help: Total number of agent requests

- name: tool_execution_duration_seconds
  type: histogram
  help: Tool execution duration
```

### 7.2 日志收集

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Operator   │────>│    Fluentd  │────>│ Elasticsearch│
│   Agent     │     │   (Logs)    │     │   + Kibana   │
└─────────────┘     └─────────────┘     └─────────────┘
```

## 8. 灾难恢复

| 组件 | RPO | RTO | 备份策略 |
|------|-----|-----|----------|
| Agent 配置 | 1h | 15min | ConfigMap + etcd |
| 向量存储 | 24h | 1h | S3 跨区域复制 |
| 执行历史 | 7d | 30min | 数据库备份 |
| MCP 状态 | 1h | 15min | Redis 集群 |
