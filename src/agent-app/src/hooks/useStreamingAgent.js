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
  const [followupQuestions, setFollowupQuestions] = useState([]);
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
                } else if (parsed.type === 'followup' && parsed.questions) {
                  setFollowupQuestions(parsed.questions);
                } else if (parsed.type === 'structured' && parsed.data) {
                  // Handle structured response with title, summary, table, chart
                  const structured = parsed.data;
                  const title = structured.title || '数据统计';

                  // Build thinking chain
                  fullContent += `<!-- thinking_start -->
1. 分析用户查询：${title}
2. 意图检测：站点数据查询
3. 识别运营商：${structured.summary?.运营商 || '全部'}
4. 数据类型：站点统计数据
5. 调用NL2SQL服务获取数据
6. 格式化返回结果
<!-- thinking_end -->

`;

                  // Build summary section
                  if (structured.summary && Object.keys(structured.summary).length > 0) {
                    fullContent += ':::metrics\n';
                    for (const [key, value] of Object.entries(structured.summary)) {
                      fullContent += `- ${key}: ${value}\n`;
                    }
                    fullContent += ':::\n\n';
                  }

                  // Build toggle block with table and chart data
                  if (structured.table_data && structured.table_data.length > 0) {
                    const cols = structured.table_columns || Object.keys(structured.table_data[0]);
                    const tableRows = structured.table_data.map(row =>
                      cols.map(c => row[c] ?? '').join('|')
                    ).join(';');

                    // Build chart data for toggle block
                    let chartDataStr = '';
                    if (structured.chart_data && structured.chart_data.length > 0) {
                      const chartKeys = structured.chart_keys || [];
                      // First key is the label column (运营商), rest are numeric values
                      const labelKey = chartKeys[0] || '运营商';
                      const numericKeys = chartKeys.slice(1);
                      const allKeys = [labelKey, ...numericKeys];

                      chartDataStr = `\n[chart_keys::${allKeys.join(',')}]`;
                      chartDataStr += `\n[chart_data::${structured.chart_data.map(d =>
                        allKeys.map(k => d[k] ?? (d[k.replace(/.*站点|.*小区/, '')] || 0)).join(',')
                      ).join(';')}]`;
                    }

                    fullContent += `[toggle]
[title::${title}]
[subtitle::数据月份: ${structured.summary?.数据月份 || '最新'}]
[table_columns::${cols.join(',')}]
[table_data::${tableRows}]${chartDataStr}
[/toggle]

`;
                  }

                  setStreamingContent(fullContent);
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

  // Clear followup questions when starting new message
  const clearFollowupQuestions = useCallback(() => {
    setFollowupQuestions([]);
  }, []);

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
    followupQuestions,
    sendMessage,
    abort,
    handleConfirmationConfirm,
    handleConfirmationCancel,
    clearFollowupQuestions,
  };
}

export default useStreamingAgent;
