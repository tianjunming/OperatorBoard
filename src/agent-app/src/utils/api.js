const API_BASE = '/api';

export async function sendMessage(message, options = {}) {
  const { onChunk, onComplete, onError, locale = 'zh' } = options;

  try {
    const response = await fetch(`${API_BASE}/agent/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Locale': locale,
      },
      body: JSON.stringify({
        input: message,
        stream: true,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        onComplete?.();
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();

          if (data === '[DONE]') {
            onComplete?.();
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              onChunk?.(parsed.content);
            }
          } catch {
            if (data) {
              onChunk?.(data);
            }
          }
        } else if (line.trim()) {
          onChunk?.(line);
        }
      }
    }
  } catch (error) {
    onError?.(error.message || 'Failed to connect to agent');
  }
}

export async function fetchAgentStatus() {
  try {
    const response = await fetch(`${API_BASE}/agent/status`);
    if (!response.ok) {
      throw new Error('Failed to fetch status');
    }
    return await response.json();
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

export async function fetchCapabilities() {
  try {
    const response = await fetch(`${API_BASE}/agent/capabilities`);
    if (!response.ok) {
      throw new Error('Failed to fetch capabilities');
    }
    return await response.json();
  } catch (error) {
    return { error: error.message };
  }
}
