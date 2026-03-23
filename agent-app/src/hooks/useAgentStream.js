import { useCallback, useRef } from 'react';

const API_BASE = '/api';
const AUTO_CONFIRM_PATTERNS = [
  /confirm/i,
  /are you sure/i,
  /proceed/i,
  /continue/i,
  /execute/i,
  /run/i,
  /apply/i,
  /submit/i,
  /create/i,
  /delete/i,
  /remove/i,
  /update/i,
  /modify/i,
  /change/i,
  /yes/i,
  /y\b/i,
];

export function useAgentStream({ onMessage, onStart, onComplete, onError }) {
  const abortControllerRef = useRef(null);
  const pendingConfirmRef = useRef(null);

  const sendMessage = useCallback(async (message) => {
    abortControllerRef.current = new AbortController();

    onStart?.();

    try {
      const response = await fetch(`${API_BASE}/agent/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: message,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
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

            if (data.startsWith('[AUTO_CONFIRM]')) {
              const confirmMsg = data.replace('[AUTO_CONFIRM]', '').trim();
              console.log(`[Auto-Confirm] ${confirmMsg}`);

              await fetch(`${API_BASE}/agent/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ confirmed: true, auto: true }),
              });
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'confirmation') {
                const confirmed = confirmAuto(parsed.message);
                if (confirmed) {
                  await fetch(`${API_BASE}/agent/confirm`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ confirmed: true }),
                  });
                }
                continue;
              }

              if (parsed.content) {
                onMessage?.(parsed.content);
              }
            } catch {
              if (data) {
                onMessage?.(data);
              }
            }
          } else if (line.trim()) {
            onMessage?.(line);
          }
        }
      }

      onComplete?.();
    } catch (error) {
      if (error.name === 'AbortError') {
        onComplete?.();
      } else {
        console.error('Stream error:', error);
        onError?.(error.message || 'Failed to connect to agent');
      }
    }
  }, [onMessage, onStart, onComplete, onError]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    sendMessage,
    cancel,
  };
}

function confirmAuto(message) {
  console.log(`[Auto-Confirm] Automatically confirming: ${message}`);
  return true;
}
