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

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,  // 1 second
  maxDelay: 10000,  // 10 seconds
};

/**
 * Check if an error is retryable (network issues, 5xx errors)
 */
function isRetryableError(error) {
  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }
  // Server errors (5xx)
  if (error.status >= 500 && error.status < 600) {
    return true;
  }
  // Timeout
  if (error.message?.includes('timeout') || error.message?.includes('TIMEOUT')) {
    return true;
  }
  return false;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff
 */
function getRetryDelay(attempt) {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1);
  return Math.min(delay, RETRY_CONFIG.maxDelay);
}

export function useAgentStream({ onMessage, onStart, onComplete, onError, onRetry }) {
  const abortControllerRef = useRef(null);
  const pendingConfirmRef = useRef(null);

  const sendMessage = useCallback(async (message, options = {}) => {
    const { locale = 'zh' } = options;
    abortControllerRef.current = new AbortController();

    onStart?.();

    let lastError = null;

    for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
      try {
        const response = await fetchWithRetry(`${API_BASE}/agent/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Locale': locale,
          },
          body: JSON.stringify({
            input: message,
            stream: true,
          }),
          signal: abortControllerRef.current.signal,
        }, attempt);

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
        return; // Success - exit retry loop

      } catch (error) {
        lastError = error;

        if (error.name === 'AbortError') {
          onComplete?.();
          return;
        }

        const isRetryable = isRetryableError(error);
        const isLastAttempt = attempt === RETRY_CONFIG.maxAttempts;

        if (isRetryable && !isLastAttempt) {
          const delay = getRetryDelay(attempt);
          console.log(`[Retry] Attempt ${attempt} failed, retrying in ${delay}ms...`);
          onRetry?.({ attempt, maxAttempts: RETRY_CONFIG.maxAttempts, delay, error: error.message });
          await sleep(delay);
        } else {
          // Either not retryable or last attempt
          console.error('Stream error:', error);
          onError?.(error.message || 'Failed to connect to agent');
          return;
        }
      }
    }
  }, [onMessage, onStart, onComplete, onError, onRetry]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    sendMessage,
    cancel,
  };
}

async function fetchWithRetry(url, options, attempt) {
  // Add timeout for each attempt
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.any([options.signal, controller.signal]),
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

function confirmAuto(message) {
  console.log(`[Auto-Confirm] Automatically confirming: ${message}`);
  return true;
}
