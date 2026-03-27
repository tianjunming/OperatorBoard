import http from 'http';
import { URL } from 'url';

const PORT = process.env.PORT || 8000;
const OPERATOR_AGENT_URL = process.env.OPERATOR_AGENT_URL || 'http://localhost:8080';
const NL2SQL_SERVICE_URL = process.env.NL2SQL_SERVICE_URL || 'http://localhost:8081';
const OPERATOR_AGENT_API_KEY = process.env.OPERATOR_AGENT_API_KEYS || '';

let pendingConfirmation = null;
let confirmationResolver = null;

function getAgentHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (OPERATOR_AGENT_API_KEY) {
    headers['X-API-Key'] = OPERATOR_AGENT_API_KEY;
  }
  return headers;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n`);
}

function sendSSEText(res, text) {
  res.write(`data: ${text}\n`);
}

async function proxyToAgent(agentInput) {
  const response = await fetch(`${OPERATOR_AGENT_URL}/api/agent/run`, {
    method: 'POST',
    headers: getAgentHeaders(),
    body: JSON.stringify(agentInput),
  });

  if (!response.ok) {
    throw new Error(`Agent error: ${response.status}`);
  }

  return response.json();
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (url.pathname === '/api/agent/stream' && req.method === 'POST') {
    const body = await parseBody(req);
    const userInput = body.input || '';

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    try {
      const result = await proxyToAgent({
        input: userInput,
        stream: true,
      });

      if (result.type === 'confirmation') {
        res.write(`data: ${JSON.stringify({ type: 'confirmation', message: result.message })}\n`);
        res.write(`data: [AUTO_CONFIRM] ${result.message}\n`);

        pendingConfirmation = result;
        const confirmed = await new Promise((resolve) => {
          confirmationResolver = resolve;

          setTimeout(() => {
            if (confirmationResolver) {
              confirmationResolver(true);
              confirmationResolver = null;
            }
          }, 100);
        });

        if (confirmed) {
          const confirmResult = await proxyToAgent({
            input: userInput,
            confirmed: true,
          });

          if (confirmResult.content) {
            res.write(`data: ${JSON.stringify({ content: confirmResult.content })}\n`);
          }
        }
      } else if (result.content) {
        res.write(`data: ${JSON.stringify({ content: result.content })}\n`);
      } else if (result.result) {
        res.write(`data: ${JSON.stringify({ content: result.result })}\n`);
      }

      res.write('data: [DONE]\n');
    } catch (error) {
      console.error('Agent proxy error:', error);
      res.write(`data: ${JSON.stringify({ content: `Error: ${error.message}` })}\n`);
      res.write('data: [DONE]\n');
    }

    res.end();
    return;
  }

  if (url.pathname === '/api/agent/confirm' && req.method === 'POST') {
    const body = await parseBody(req);

    if (confirmationResolver) {
      confirmationResolver(body.confirmed !== false);
      confirmationResolver = null;
    }

    sendJSON(res, 200, { confirmed: true });
    return;
  }

  if (url.pathname === '/api/agent/status' && req.method === 'GET') {
    sendJSON(res, 200, {
      status: 'ready',
      agentUrl: OPERATOR_AGENT_URL,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (url.pathname === '/api/agent/capabilities' && req.method === 'GET') {
    try {
      const response = await fetch(`${OPERATOR_AGENT_URL}/api/capabilities`, { headers: getAgentHeaders() });
      const capabilities = await response.json();
      sendJSON(res, 200, capabilities);
    } catch {
      sendJSON(res, 200, {
        tools: ['http_service', 'java_microservice'],
        skills: ['operator_data_fetcher', 'data_aggregator', 'report_generator'],
        mcp: true,
        rag: true,
      });
    }
    return;
  }

  // Operator Data API - proxy to Java NL2SQL service via operator-agent
  if (url.pathname === '/api/operator/indicators/latest' && req.method === 'GET') {
    const params = url.searchParams;
    const query = {};
    if (params.get('operatorName')) query.operatorName = params.get('operatorName');
    if (params.get('limit')) query.limit = parseInt(params.get('limit'));

    try {
      const response = await fetch(`${OPERATOR_AGENT_URL}/api/operator/indicators/latest`, {
        method: 'POST',
        headers: getAgentHeaders(),
        body: JSON.stringify(query),
      });
      const data = await response.json();
      sendJSON(res, 200, data);
    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
    return;
  }

  if (url.pathname === '/api/operator/indicators/compare' && req.method === 'GET') {
    const params = url.searchParams;
    const query = {
      operatorName: params.get('operatorName'),
      currentMonth: params.get('currentMonth'),
      compareMonth: params.get('compareMonth'),
    };
    if (params.get('siteCode')) query.siteCode = params.get('siteCode');

    try {
      const response = await fetch(`${OPERATOR_AGENT_URL}/api/operator/indicators/compare`, {
        method: 'POST',
        headers: getAgentHeaders(),
        body: JSON.stringify(query),
      });
      const data = await response.json();
      sendJSON(res, 200, data);
    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
    return;
  }

  if (url.pathname === '/api/operator/indicators/trend' && req.method === 'GET') {
    const params = url.searchParams;
    const query = {
      operatorName: params.get('operatorName'),
      startTime: params.get('startTime'),
      endTime: params.get('endTime'),
      limit: parseInt(params.get('limit') || '1000'),
    };
    if (params.get('cellId')) query.cellId = params.get('cellId');
    if (params.get('siteCode')) query.siteCode = params.get('siteCode');

    try {
      const response = await fetch(`${OPERATOR_AGENT_URL}/api/operator/indicators/trend`, {
        method: 'POST',
        headers: getAgentHeaders(),
        body: JSON.stringify(query),
      });
      const data = await response.json();
      sendJSON(res, 200, data);
    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
    return;
  }

  if (url.pathname === '/api/operator/times' && req.method === 'GET') {
    const params = url.searchParams;
    const query = {};
    if (params.get('operatorName')) query.operatorName = params.get('operatorName');

    try {
      const response = await fetch(`${OPERATOR_AGENT_URL}/api/operator/times`, {
        method: 'POST',
        headers: getAgentHeaders(),
        body: JSON.stringify(query),
      });
      const data = await response.json();
      sendJSON(res, 200, data);
    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
    return;
  }

  // NL2SQL Service Query Endpoints (CQRS Query Side)
  if (url.pathname.startsWith('/api/nl2sql/') && req.method === 'GET') {
    const nl2sqlPath = url.pathname.replace('/api/nl2sql/', '');
    try {
      const response = await fetch(`${NL2SQL_SERVICE_URL}/api/v1/nl2sql/${nl2sqlPath}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      sendJSON(res, 200, data);
    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
    return;
  }

  if (url.pathname === '/api/nl2sql/query' && req.method === 'POST') {
    const body = await parseBody(req);
    try {
      const response = await fetch(`${NL2SQL_SERVICE_URL}/api/v1/nl2sql/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      sendJSON(res, 200, data);
    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
    return;
  }

  // Query Controller Endpoints (CQRS)
  if (url.pathname === '/api/query/operators' && req.method === 'GET') {
    const params = url.searchParams;
    const query = {};
    if (params.get('country')) query.country = params.get('country');
    if (params.get('operatorName')) query.operatorName = params.get('operatorName');

    try {
      const queryStr = new URLSearchParams(query).toString();
      const response = await fetch(`${NL2SQL_SERVICE_URL}/api/v1/query/operators${queryStr ? '?' + queryStr : ''}`);
      const data = await response.json();
      sendJSON(res, 200, data);
    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
    return;
  }

  if (url.pathname.startsWith('/api/query/operators/') && req.method === 'GET') {
    const id = url.pathname.split('/').pop();
    try {
      const response = await fetch(`${NL2SQL_SERVICE_URL}/api/v1/query/operators/${id}`);
      const data = await response.json();
      sendJSON(res, 200, data);
    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
    return;
  }

  if (url.pathname === '/api/query/site-cells' && req.method === 'GET') {
    const params = url.searchParams;
    const query = {};
    if (params.get('band')) query.band = params.get('band');
    if (params.get('operatorId')) query.operatorId = params.get('operatorId');

    try {
      const queryStr = new URLSearchParams(query).toString();
      const response = await fetch(`${NL2SQL_SERVICE_URL}/api/v1/query/site-summary${queryStr ? '?' + queryStr : ''}`);
      const data = await response.json();
      sendJSON(res, 200, data);
    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
    return;
  }

  if (url.pathname === '/api/query/indicators/latest' && req.method === 'GET') {
    const params = url.searchParams;
    const query = {};
    if (params.get('operatorId')) query.operatorId = params.get('operatorId');
    if (params.get('band')) query.band = params.get('band');

    try {
      const queryStr = new URLSearchParams(query).toString();
      const response = await fetch(`${NL2SQL_SERVICE_URL}/api/v1/query/indicators/latest${queryStr ? '?' + queryStr : ''}`);
      const data = await response.json();
      sendJSON(res, 200, data);
    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
    return;
  }

  if (url.pathname === '/api/query/indicators/history' && req.method === 'GET') {
    const params = url.searchParams;
    const query = {};
    if (params.get('operatorId')) query.operatorId = params.get('operatorId');
    if (params.get('band')) query.band = params.get('band');
    if (params.get('dataMonth')) query.dataMonth = params.get('dataMonth');

    try {
      const queryStr = new URLSearchParams(query).toString();
      const response = await fetch(`${NL2SQL_SERVICE_URL}/api/v1/query/indicators/history${queryStr ? '?' + queryStr : ''}`);
      const data = await response.json();
      sendJSON(res, 200, data);
    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
    return;
  }

  if (url.pathname === '/api/query/indicators/trend' && req.method === 'GET') {
    const params = url.searchParams;
    const query = {};
    if (params.get('operatorId')) query.operatorId = params.get('operatorId');
    if (params.get('band')) query.band = params.get('band');
    if (params.get('start')) query.start = params.get('start');
    if (params.get('end')) query.end = params.get('end');

    try {
      const queryStr = new URLSearchParams(query).toString();
      const response = await fetch(`${NL2SQL_SERVICE_URL}/api/v1/query/indicators/trend${queryStr ? '?' + queryStr : ''}`);
      const data = await response.json();
      sendJSON(res, 200, data);
    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
    return;
  }

  sendJSON(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Agent API Server running on port ${PORT}`);
  console.log(`Proxying to Operator Agent at ${OPERATOR_AGENT_URL}`);
});

export default server;
