// Content parsing utilities for chat messages
import { BANDS, CHART_COLORS } from './dataTransformers';

/**
 * Parse message content into structured blocks
 * Supports: markdown, code blocks, tables, charts, metrics, json, steps
 */
export function parseMessageContent(content, metadata = {}) {
  if (!content) return [];

  const blocks = [];
  const lines = content.split('\n');
  let currentBlock = null;
  let inCodeBlock = false;
  let codeLanguage = '';
  let codeContent = [];
  let inSteps = false;
  let steps = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block handling
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        blocks.push({
          type: 'code',
          language: codeLanguage || 'text',
          content: codeContent.join('\n'),
        });
        codeContent = [];
        codeLanguage = '';
        inCodeBlock = false;
      } else {
        // Start code block
        if (currentBlock && currentBlock.content.trim()) {
          blocks.push({ type: 'text', content: currentBlock.content.trim() });
        }
        currentBlock = null;
        codeLanguage = line.slice(3).trim();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Check for special block markers
    if (line.startsWith(':::callout')) {
      if (currentBlock && currentBlock.content.trim()) {
        blocks.push({ type: 'text', content: currentBlock.content.trim() });
      }
      currentBlock = null;
      const match = line.match(/:::callout\[?(\w+)?\]?/);
      const variant = match?.[1] || 'info';
      currentBlock = { type: 'callout', variant, content: '' };
      continue;
    }

    if (line.startsWith(':::metrics')) {
      if (currentBlock && currentBlock.content.trim()) {
        blocks.push({ type: 'text', content: currentBlock.content.trim() });
      }
      currentBlock = null;
      currentBlock = { type: 'metrics', items: [] };
      continue;
    }

    if (line.startsWith(':::json')) {
      if (currentBlock && currentBlock.content.trim()) {
        blocks.push({ type: 'text', content: currentBlock.content.trim() });
      }
      currentBlock = null;
      currentBlock = { type: 'json', content: '' };
      continue;
    }

    if (line.startsWith(':::chart')) {
      if (currentBlock && currentBlock.content.trim()) {
        blocks.push({ type: 'text', content: currentBlock.content.trim() });
      }
      currentBlock = null;
      const chartMatch = line.match(/:::chart\[?(\w+)?\]?/);
      const chartType = chartMatch?.[1] || 'bar';
      currentBlock = { type: 'chart', chartType, data: [] };
      continue;
    }

    if (line.startsWith(':::steps')) {
      if (currentBlock && currentBlock.content.trim()) {
        blocks.push({ type: 'text', content: currentBlock.content.trim() });
      }
      currentBlock = null;
      inSteps = true;
      steps = [];
      continue;
    }

    if (line.startsWith(':::')) {
      // End special block
      if (currentBlock) {
        if (currentBlock.type === 'callout' && currentBlock.content.trim()) {
          blocks.push({ type: 'callout', variant: currentBlock.variant, content: currentBlock.content.trim() });
        } else if (currentBlock.type === 'metrics' && currentBlock.items.length) {
          blocks.push({ type: 'metrics', items: currentBlock.items });
        } else if (currentBlock.type === 'json' && currentBlock.content.trim()) {
          try {
            const jsonData = JSON.parse(currentBlock.content);
            blocks.push({ type: 'json', data: jsonData });
          } catch {
            blocks.push({ type: 'text', content: currentBlock.content.trim() });
          }
        } else if (currentBlock.type === 'chart') {
          blocks.push(currentBlock);
        }
      }
      currentBlock = null;
      inSteps = false;
      continue;
    }

    // Metrics item
    if (currentBlock?.type === 'metrics' && line.match(/^\s*[-*]\s*/)) {
      const itemMatch = line.match(/^\s*[-*]\s*(.+?):\s*([\d.]+)/);
      if (itemMatch) {
        currentBlock.items.push({ label: itemMatch[1], value: itemMatch[2] });
      }
      continue;
    }

    // Chart data
    if (currentBlock?.type === 'chart') {
      const chartDataMatch = line.match(/^\s*[-*]\s*(.+?),\s*([\d.]+)/);
      if (chartDataMatch) {
        currentBlock.data.push({ name: chartDataMatch[1], value: parseFloat(chartDataMatch[2]) });
      }
      continue;
    }

    // JSON lines
    if (currentBlock?.type === 'json') {
      currentBlock.content += line + '\n';
      continue;
    }

    // Step handling
    if (inSteps) {
      const stepMatch = line.match(/^\d+\.\s+(.+)/);
      if (stepMatch) {
        steps.push(stepMatch[1]);
      }
      continue;
    }

    // Regular content
    if (!currentBlock) {
      currentBlock = { type: 'text', content: '' };
    }
    currentBlock.content += line + '\n';
  }

  // Handle remaining content
  if (currentBlock) {
    if (currentBlock.type === 'text' && currentBlock.content.trim()) {
      blocks.push({ type: 'text', content: currentBlock.content.trim() });
    } else if (currentBlock.type === 'callout' && currentBlock.content.trim()) {
      blocks.push(currentBlock);
    } else if (currentBlock.type === 'metrics' && currentBlock.items.length) {
      blocks.push(currentBlock);
    } else if (currentBlock.type === 'json' && currentBlock.content.trim()) {
      try {
        const jsonData = JSON.parse(currentBlock.content);
        blocks.push({ type: 'json', data: jsonData });
      } catch {
        blocks.push({ type: 'text', content: currentBlock.content.trim() });
      }
    } else if (currentBlock.type === 'chart' && currentBlock.data.length) {
      blocks.push(currentBlock);
    }
  }

  if (steps.length) {
    blocks.push({ type: 'steps', items: steps });
  }

  // If no blocks, treat entire content as text
  if (blocks.length === 0 && content.trim()) {
    blocks.push({ type: 'text', content: content.trim() });
  }

  return blocks;
}

/**
 * Extract chart data from metadata if present
 */
export function extractChartFromMetadata(metadata) {
  if (metadata?.chart) {
    return {
      type: metadata.chart.type || 'bar',
      data: metadata.chart.data || [],
      keys: metadata.chart.keys || [],
      colors: metadata.chart.colors || CHART_COLORS,
      column: metadata.chart.column || 'name',
    };
  }
  return null;
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text, maxLength = 100) {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
