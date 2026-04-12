import { useState, useCallback, useRef } from 'react';

/**
 * Hook for streaming agent messages with chart support
 * @param {Object} options - Configuration options
 * @param {Function} options.onStreamStart - Callback when streaming starts
 * @param {Function} options.onStreamEnd - Callback when streaming ends
 * @param {Function} options.onConfirmation - Callback when confirmation is needed
 * @returns {Object} Streaming state and controls
 */
export function useStreamingAgent({ onStreamStart, onStreamEnd, onConfirmation } = {}) {
  const [streamingContent, setStreamingContent] = useState('');
  const [streamingChart, setStreamingChart] = useState(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [clarificationOptions, setClarificationOptions] = useState({});
  const abortControllerRef = useRef(null);
  const pendingMessageRef = useRef(null);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const sendMessage = useCallback(async (text, saveMessage) => {
    if (!text?.trim()) return;

    abort();

    setIsStreaming(true);
    setStreamingContent('');
    setStreamingChart(null);
    onStreamStart?.();

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch('/api/agent/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text, stream: true }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Agent error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let chartData = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') break;
            if (data.startsWith('{') && data.endsWith('}')) {
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'confirmation' && parsed.options) {
                  // 收到确认请求，暂停流式输出
                  setClarificationOptions(parsed.options);
                  setShowConfirmation(true);
                  setIsStreaming(false);
                  pendingMessageRef.current = { text, saveMessage };
                  onConfirmation?.(parsed.options);
                  return; // 等待用户确认
                } else if (parsed.type === 'chart' && parsed.chart) {
                  chartData = parsed.chart;
                  setStreamingChart(parsed.chart);
                } else if (parsed.content) {
                  fullContent += parsed.content;
                  setStreamingContent(fullContent);
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }
      }

      if (fullContent && saveMessage) {
        await saveMessage('assistant', fullContent, { intent: 'chat', chart: chartData });
      }

    } catch (err) {
      if (err.name === 'AbortError') return;
      throw err;
    } finally {
      setIsStreaming(false);
      setStreamingContent('');
      setStreamingChart(null);
      abortControllerRef.current = null;
      onStreamEnd?.();
    }
  }, [abort, onStreamStart, onStreamEnd, onConfirmation]);

  // 处理确认对话框确认
  const handleConfirmationConfirm = useCallback(async (options) => {
    setShowConfirmation(false);
    if (pendingMessageRef.current) {
      const { text, saveMessage } = pendingMessageRef.current;
      // 将用户选择的选项添加到消息中
      const enhancedText = `${text} [用户确认: ${JSON.stringify(options)}]`;
      pendingMessageRef.current = null;
      // 重新发送消息
      setClarificationOptions({});
      await sendMessage(enhancedText, saveMessage);
    }
  }, [sendMessage]);

  // 处理确认对话框取消
  const handleConfirmationCancel = useCallback(() => {
    setShowConfirmation(false);
    setClarificationOptions({});
    pendingMessageRef.current = null;
  }, []);

  return {
    streamingContent,
    streamingChart,
    isStreaming,
    showConfirmation,
    clarificationOptions,
    sendMessage,
    abort,
    handleConfirmationConfirm,
    handleConfirmationCancel,
  };
}

export default useStreamingAgent;
