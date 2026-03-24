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
│   │   └── ChatInput.jsx
│   ├── hooks/
│   │   └── useAgentStream.js  # Streaming hook
│   ├── utils/
│   │   └── api.js       # API utilities
│   ├── styles/
│   │   └── index.css    # Global styles
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
└── vite.config.js
```

## Features

- Streaming chat interface with real-time responses
- Markdown rendering with syntax highlighting
- Auto-confirmation for all prompts (selects "yes")
- Responsive design
- Dark gradient UI

## Environment Variables

```bash
OPERATOR_AGENT_URL=http://localhost:8080  # Operator Agent backend URL
PORT=8000                                # API server port
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agent/stream` | POST | Send message and stream response |
| `/api/agent/confirm` | POST | Confirm a pending action |
| `/api/agent/status` | GET | Get agent status |
| `/api/agent/capabilities` | GET | Get agent capabilities |
