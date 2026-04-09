import http from 'http';
import { URL } from 'url';

const PORT = process.env.PORT || 8000;
const OPERATOR_AGENT_URL = process.env.OPERATOR_AGENT_URL || 'http://localhost:8080';
const NL2SQL_SERVICE_URL = process.env.NL2SQL_SERVICE_URL || 'http://localhost:8081';
const AUTH_AGENT_URL = process.env.AUTH_AGENT_URL || 'http://localhost:8084';
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
    const chunks = [];
    req.on('data', chunk => { chunks.push(chunk); });
    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const body = buffer.toString('utf8');
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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(JSON.stringify(data));
}

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n`);
}

function sendSSEText(res, text) {
  res.write(`data: ${text}\n`);
}

async function proxyToAgentStream(agentInput, onChunk, onChart) {
  const response = await fetch(`${OPERATOR_AGENT_URL}/api/agent/stream`, {
    method: 'POST',
    headers: getAgentHeaders(),
    body: JSON.stringify(agentInput),
  });

  if (!response.ok) {
    throw new Error(`Agent error: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          return { done: true };
        }
        if (data.startsWith('{') && data.endsWith('}')) {
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content' && parsed.content) {
              onChunk?.(parsed.content);
            } else if (parsed.type === 'chart' && parsed.chart) {
              onChart?.(parsed.chart);
            } else if (parsed.type === 'error') {
              throw new Error(parsed.content);
            }
          } catch (e) {
            // Ignore JSON parse errors (expected with streaming partial data)
            // Re-throw other errors
            if (!(e instanceof SyntaxError)) {
              throw e;
            }
          }
        }
      }
    }
  }

  return { done: true };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      await proxyToAgentStream(
        { input: userInput, stream: true },
        (chunk) => {
          res.write(`data: ${JSON.stringify({ content: chunk })}\n`);
        },
        (chart) => {
          res.write(`data: ${JSON.stringify({ type: 'chart', chart })}\n`);
        }
      );

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

  // Auth Agent API - proxy to auth-agent (8084)
  if (url.pathname.startsWith('/api/auth/') && ['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    const authPath = url.pathname.replace('/api/auth/', '');
    try {
      const response = await fetch(`${AUTH_AGENT_URL}/auth/${authPath}${url.search}`, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {}),
        },
        body: ['POST', 'PUT'].includes(req.method) ? JSON.stringify(await parseBody(req)) : undefined,
      });
      const data = await response.json();
      sendJSON(res, response.status, data);
    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
    return;
  }

  // User Management API - proxy to auth-agent (8084)
  if (url.pathname.startsWith('/api/users') && ['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    const userPath = url.pathname.replace('/api/', '');
    try {
      const response = await fetch(`${AUTH_AGENT_URL}/${userPath}${url.search}`, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {}),
        },
        body: ['POST', 'PUT'].includes(req.method) ? JSON.stringify(await parseBody(req)) : undefined,
      });
      const data = await response.json();
      sendJSON(res, response.status, data);
    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
    return;
  }

  // Role Management API - proxy to auth-agent (8084)
  if (url.pathname.startsWith('/api/roles') && ['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    const rolePath = url.pathname.replace('/api/', '');
    try {
      const response = await fetch(`${AUTH_AGENT_URL}/${rolePath}${url.search}`, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {}),
        },
        body: ['POST', 'PUT'].includes(req.method) ? JSON.stringify(await parseBody(req)) : undefined,
      });
      const data = await response.json();
      sendJSON(res, response.status, data);
    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
    return;
  }

  // Permission Management API - proxy to auth-agent (8084)
  if (url.pathname.startsWith('/api/permissions') && ['GET', 'POST', 'PUT', 'DELETE'].includes(req.method)) {
    const permPath = url.pathname.replace('/api/', '');
    try {
      const response = await fetch(`${AUTH_AGENT_URL}/${permPath}${url.search}`, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {}),
        },
        body: ['POST', 'PUT'].includes(req.method) ? JSON.stringify(await parseBody(req)) : undefined,
      });
      const data = await response.json();
      sendJSON(res, response.status, data);
    } catch (error) {
      sendJSON(res, 500, { error: error.message });
    }
    return;
  }

  // Chat API - proxy to auth-agent (8084)
  if (url.pathname.startsWith('/api/chat/') && ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const chatPath = url.pathname.replace('/api/', '');
    const authHeader = req.headers.authorization || req.headers.Authorization;
    console.log(`[Proxy] Chat API: ${req.method} ${url.pathname}`);
    console.log(`[Proxy] Auth header: ${authHeader ? authHeader.substring(0, 50) + '...' : 'none'}`);
    try {
      const rawBody = await parseBody(req);
      console.log(`[Proxy] Parsed body:`, JSON.stringify(rawBody));
      const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(rawBody) : undefined;
      console.log(`[Proxy] Forwarding to auth-agent:`, `${AUTH_AGENT_URL}/${chatPath}`);
      console.log(`[Proxy] Body:`, body);

      const response = await fetch(`${AUTH_AGENT_URL}/${chatPath}${url.search}`, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { 'Authorization': authHeader } : {}),
        },
        body,
      });

      // Get raw response text first
      const responseText = await response.text();
      console.log(`[Proxy] Raw response status: ${response.status}, body:`, responseText.substring(0, 300));

      // Try to parse response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch {
        // If not JSON, use the text as error
        console.error(`[Proxy] Non-JSON response, forwarding as error`);
        sendJSON(res, response.status, { error: responseText || `HTTP ${response.status}` });
        return;
      }

      console.log(`[Proxy] Response data:`, JSON.stringify(data).substring(0, 100));
      sendJSON(res, response.status, data);
    } catch (error) {
      console.error(`[Proxy] Chat API error:`, error);
      sendJSON(res, 500, { error: error.message });
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
      const response = await fetch(`${NL2SQL_SERVICE_URL}/api/v1/nl2sql/operators${queryStr ? '?' + queryStr : ''}`);
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
      const response = await fetch(`${NL2SQL_SERVICE_URL}/api/v1/nl2sql/operators/${id}`);
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
      const response = await fetch(`${NL2SQL_SERVICE_URL}/api/v1/nl2sql/site-summary${queryStr ? '?' + queryStr : ''}`);
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
      const response = await fetch(`${NL2SQL_SERVICE_URL}/api/v1/nl2sql/indicators/latest${queryStr ? '?' + queryStr : ''}`);
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
      const response = await fetch(`${NL2SQL_SERVICE_URL}/api/v1/nl2sql/indicators/history${queryStr ? '?' + queryStr : ''}`);
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
      const response = await fetch(`${NL2SQL_SERVICE_URL}/api/v1/nl2sql/indicators/trend${queryStr ? '?' + queryStr : ''}`);
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
  console.log(`Proxying to Auth Agent at ${AUTH_AGENT_URL}`);
});

export default server;
