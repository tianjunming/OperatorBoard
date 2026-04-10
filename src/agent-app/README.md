# Agent App

Frontend application for Operator Agent with streaming chat interface.

## Quick Start

```bash
# Install dependencies
npm install

# Start frontend (development)
npm run dev

# Start backend proxy server (in another terminal)
npm run server

# Or start both together
npm run start:all
```

## Architecture

```
agent-app/
├── public/              # Static assets
├── server/
│   └── index.js         # Backend proxy server
├── src/
│   ├── components/      # React components
│   │   ├── ChatContainer.jsx
│   │   ├── ChatMessage.jsx
│   │   ├── ChatInput.jsx
│   │   ├── MessageItem.jsx     # 消息渲染（支持Chart/Table/Toggle块）
│   │   ├── AuthLogin.jsx      # 用户登录（默认: admin/admin123）
│   │   ├── UserManagement.jsx  # 用户管理
│   │   └── RoleManagement.jsx  # 角色管理
│   ├── context/
│   │   └── AuthContext.jsx    # 认证状态管理
│   ├── hooks/
│   │   └── useAgentStream.js  # Streaming hook
│   ├── utils/
│   │   └── api.js       # API utilities
│   ├── styles/
│   │   └── index.css    # Global styles
│   ├── App.jsx
│   └── main.jsx
├── tests/               # Playwright E2E测试
│   ├── pages/
│   └── *.spec.js
├── index.html
├── package.json
└── vite.config.js
```

## Features

- Streaming chat interface with real-time responses
- Markdown rendering with syntax highlighting
- Structured data rendering (Chart, Table, Toggle blocks)
- User authentication and role-based access control
- Responsive design
- Dark gradient UI

## Environment Variables

```bash
OPERATOR_AGENT_URL=http://localhost:8080  # Operator Agent backend URL
PORT=8000                                # API server port
```

## API Endpoints

### Agent API (Backend Proxy)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agent/stream` | POST | Send message and stream response |
| `/api/agent/confirm` | POST | Confirm a pending action |
| `/api/agent/status` | GET | Get agent status |
| `/api/agent/capabilities` | GET | Get agent capabilities |

### Auth API (via auth-agent:8084)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/refresh` | POST | Refresh token |
| `/api/users` | GET/POST | User management |
| `/api/roles` | GET/POST | Role management |
| `/api/permissions` | GET | Permission management |

### Operator Data API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/operator/indicators/latest` | GET | Latest indicators |
| `/api/operator/site-cells` | GET | Site cell summary |
