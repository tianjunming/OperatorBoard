# 部署视图 (Deployment View)

## 1. 概述

部署视图描述系统的物理部署架构和基础设施配置。

**PlantUML Diagram:** [04-deployment-view.puml](../diagrams/04-deployment-view.puml)

![Deployment View](../diagrams/04-deployment-view.png)

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
│  MVC+CQRS   │      │  MVC+CQRS   │      │  MVC+CQRS   │
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
      context: ./src/operator-agent
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

  java-service:
    build:
      context: ./src/operator-service
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - DB_USERNAME=root
      - DB_PASSWORD=password
      - DB_URL=jdbc:mysql://mysql:3306/operator_db
      - NL2SQL_SERVICE_URL=http://sqlcoder:8081
    depends_on:
      - mysql
      - sqlcoder
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

  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      - MYSQL_ROOT_PASSWORD=password
      - MYSQL_DATABASE=operator_db
    volumes:
      - ./mysql_data:/var/lib/mysql
    networks:
      - agent-network

  sqlcoder:
    image: sqlcoder:latest
    ports:
      - "8081:8081"
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
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nl2sql-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nl2sql-service
  template:
    metadata:
      labels:
        app: nl2sql-service
    spec:
      containers:
      - name: nl2sql-service
        image: nl2sql-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: DB_USERNAME
          value: "root"
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: password
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
  name: nl2sql-service-svc
spec:
  selector:
    app: nl2sql-service
  ports:
  - port: 80
    targetPort: 8080
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
| Data | 10.0.3.0/24 | Java Services (NL2SQL), DB | App → Data |
| Storage | 10.0.4.0/24 | Vector Store | App → Storage |

### 5.2 防火墙规则

```bash
# 允许 Agent 到 Java NL2SQL 服务
iptables -A FORWARD -s 10.0.2.0/24 -d 10.0.3.0/24 -p tcp --dport 8080 -j ACCEPT

# 允许 Agent 到 Vector Store
iptables -A FORWARD -s 10.0.2.0/24 -d 10.0.4.0/24 -p tcp --dport 8000 -j ACCEPT
```

## 6. 配置管理

### 6.1 环境变量 (Java NL2SQL Service)

```bash
# NL2SQL Service 配置
export DB_USERNAME="root"
export DB_PASSWORD="password"
export DB_URL="jdbc:mysql://localhost:3306/operator_db"
export NL2SQL_SERVICE_URL="http://localhost:8081"
export SQLCODER_TIMEOUT=60
export MAX_RESULT_ROWS=1000
```

### 6.2 配置文件 (Java NL2SQL Service)

```yaml
# application.yml
server:
  port: 8080

spring:
  application:
    name: nl2sql-service
  datasource:
    url: jdbc:mysql://${DB_URL}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 30000

mybatis:
  mapper-locations: classpath:mapper/**/*.xml
  type-aliases-package: com.operator.nl2sql.entity
  configuration:
    map-underscore-to-camel-case: true

nl2sql:
  sqlcoder:
    url: ${NL2SQL_SERVICE_URL}
    timeout: ${SQLCODER_TIMEOUT:-60}
  security:
    allow-destructive-queries: false
    max-result-rows: ${MAX_RESULT_ROWS:-1000}
```

### 6.3 Agent 配置

```bash
# Agent 配置
export AGENT_NAME="OperatorAgent"
export AGENT_MODEL="claude-3-sonnet-20240229"
export AGENT_REGISTRY_URL="http://agent-registry:8001"

# Java NL2SQL 服务配置
export JAVA_SERVICE_BASE_URL="http://java-service:8080"
export JAVA_SERVICE_TIMEOUT=60

# 向量存储配置
export VECTOR_STORE_TYPE="chroma"
export VECTOR_STORE_PATH="/data/vectorstore"

# MCP 配置
export MCP_SERVER_URL="http://mcp-server:9000"
export MCP_TIMEOUT=30
```

### 6.4 配置文件挂载

```yaml
# Kubernetes ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: nl2sql-config
data:
  application.yml: |
    spring:
      datasource:
        url: jdbc:mysql://mysql:3306/operator_db
    nl2sql:
      sqlcoder:
        url: http://sqlcoder:8081
      security:
        max-result-rows: 1000
```

## 7. 监控与日志

### 7.1 监控配置

```yaml
# Prometheus metrics
- name: nl2sql_requests_total
  type: counter
  help: Total number of NL2SQL requests

- name: nl2sql_query_duration_seconds
  type: histogram
  help: NL2SQL query duration

- name: operator_query_requests_total
  type: counter
  help: Total number of operator query requests

- name: indicator_query_requests_total
  type: counter
  help: Total number of indicator query requests
```

### 7.2 日志收集

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Operator   │────>│    Fluentd  │────>│Elasticsearch│
│   Agent     │     │   (Logs)    │     │  + Kibana   │
└─────────────┘     └─────────────┘     └─────────────┘
        │
        ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  NL2SQL     │────>│    Fluentd  │────>│Elasticsearch│
│  Service    │     │   (Logs)    │     │  + Kibana   │
└─────────────┘     └─────────────┘     └─────────────┘
```

## 8. 灾难恢复

| 组件 | RPO | RTO | 备份策略 |
|------|-----|-----|----------|
| Agent 配置 | 1h | 15min | ConfigMap + etcd |
| 向量存储 | 24h | 1h | S3 跨区域复制 |
| MySQL 数据 | 1h | 15min | 主从复制 + 定期备份 |
| NL2SQL 配置 | 1h | 15min | ConfigMap |
