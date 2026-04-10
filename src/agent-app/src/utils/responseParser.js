// Advanced response parser for structured data and thinking chain
import { BANDS, CHART_COLORS } from './dataTransformers';

/**
 * Parse thinking chain from response
 * Format: <!-- thinking_start --> ... <!-- thinking_end -->
 */
export function parseThinkingChain(content) {
  const startMarker = '<!-- thinking_start -->';
  const endMarker = '<!-- thinking_end -->';

  const startIdx = content.indexOf(startMarker);
  const endIdx = content.indexOf(endMarker);

  if (startIdx !== -1 && endIdx !== -1) {
    const thinking = content.slice(startIdx + startMarker.length, endIdx).trim();
    const mainContent = content.slice(0, startIdx) + content.slice(endIdx + endMarker.length);
    return { thinking, mainContent: mainContent.trim() };
  }

  return { thinking: null, mainContent: content };
}

/**
 * Parse structured data blocks from content
 * Supports: :::table, :::chart[type], :::metrics, :::steps
 */
export function parseStructuredBlocks(content) {
  const blocks = [];
  let remaining = content;
  let currentIdx = 0;

  // Match special block patterns
  const blockPatterns = [
    { regex: /:::table\s*\n([\s\S]*?)\n:::/, type: 'table', parse: parseTableBlock },
    { regex: /:::chart\[?(\w+)?\]?\s*\n([\s\S]*?)\n:::/, type: 'chart', parse: parseChartBlock },
    { regex: /:::metrics\s*\n([\s\S]*?)\n:::/, type: 'metrics', parse: parseMetricsBlock },
    { regex: /:::steps\s*\n([\s\S]*?)\n:::/, type: 'steps', parse: parseStepsBlock },
    { regex: /:::sql\s*\n([\s\S]*?)\n:::/, type: 'sql', parse: parseSqlBlock },
  ];

  // Process thinking chain first
  const { thinking, mainContent } = parseThinkingChain(remaining);
  if (thinking) {
    blocks.push({ type: 'thinking', content: thinking });
  }

  // Find and extract special blocks
  let textContent = mainContent;
  for (const { regex, type, parse } of blockPatterns) {
    const match = textContent.match(regex);
    if (match) {
      const before = textContent.slice(0, match.index);
      if (before.trim()) {
        blocks.push({ type: 'text', content: before.trim() });
      }
      const parsed = parse(match);
      blocks.push({ type, ...parsed });
      textContent = textContent.slice(match.index + match[0].length);
    }
  }

  if (textContent.trim()) {
    blocks.push({ type: 'text', content: textContent.trim() });
  }

  return blocks;
}

function parseTableBlock(match) {
  const content = match[1];
  const lines = content.trim().split('\n').filter(l => l.trim());

  if (lines.length < 2) return { data: [], columns: [] };

  // Parse header
  const headers = lines[0].split('|').filter(c => c.trim()).map(h => h.trim());

  // Parse rows
  const data = [];
  for (let i = 2; i < lines.length; i++) {
    const values = lines[i].split('|').filter(c => c.trim()).map(v => v.trim());
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((h, idx) => { row[h] = values[idx]; });
      data.push(row);
    }
  }

  return { data, columns: headers };
}

function parseChartBlock(match) {
  const chartType = match[1] || 'bar';
  const content = match[2];
  const lines = content.trim().split('\n').filter(l => l.trim());

  // Parse chart data from markdown list
  // Format: "- Band: value" or "- Band 站点: X" or "- Band 小区: Y"
  const data = [];
  const bandData = {};

  for (const line of lines) {
    const itemMatch = line.match(/^\s*[-*]\s*(.+?):\s*([\d.]+)/);
    if (itemMatch) {
      const fullMatch = itemMatch[1].trim(); // e.g., "LTE 700M 站点" or just "LTE 700M"
      const value = parseFloat(itemMatch[2]);

      // Extract band name and metric type
      let bandName = fullMatch;
      let metricName = 'value';

      // Check if it has a metric suffix like "站点" or "小区"
      const parts = fullMatch.split(/\s+/);
      if (parts.length >= 2) {
        const lastPart = parts[parts.length - 1];
        if (['站点', '小区', '下行', '上行', 'PRB'].includes(lastPart)) {
          bandName = parts.slice(0, -1).join(' ');
          metricName = lastPart;
        }
      }

      if (!bandData[bandName]) {
        bandData[bandName] = { name: bandName };
      }
      bandData[bandName][metricName] = value;
    }
  }

  // Convert to array and extract keys
  for (const band of Object.keys(bandData).slice(0, 20)) {
    data.push(bandData[band]);
  }

  const keys = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'name') : [];

  return { chartType, data, keys, column: 'name' };
}

function parseMetricsBlock(match) {
  const content = match[1];
  const lines = content.trim().split('\n').filter(l => l.trim());
  const items = [];

  for (const line of lines) {
    const itemMatch = line.match(/^\s*[-*]\s*(.+?):\s*([\d.]+)/);
    if (itemMatch) {
      items.push({
        label: itemMatch[1].trim(),
        value: itemMatch[2].trim(),
        numeric: parseFloat(itemMatch[2]),
      });
    }
  }

  return { items };
}

function parseStepsBlock(match) {
  const content = match[1];
  const lines = content.trim().split('\n').filter(l => l.trim());
  const steps = [];

  for (const line of lines) {
    const stepMatch = line.match(/^\d+\.\s+(.+)/);
    if (stepMatch) {
      steps.push(stepMatch[1].trim());
    }
  }

  return { steps };
}

function parseSqlBlock(match) {
  return { sql: match[1].trim() };
}

/**
 * Auto-detect and convert plain data text to structured blocks
 * e.g., "站点数据: 700M: 42, 800M: 28..." → chart block
 */
export function autoDetectStructure(content) {
  // Check for structured data patterns
  const bandPattern = /(700M|800M|900M|1400M|1800M|2100M|2600M|3500M|4900M)/g;
  const hasBandData = bandPattern.test(content);

  if (hasBandData && content.length < 2000) {
    // Try to extract structured data
    const lines = content.split('\n');
    const dataLines = lines.filter(l => /[:-]?\s*\d+/.test(l));

    if (dataLines.length > 3) {
      // Likely contains structured data - convert to enhanced format
      return {
        needsStructured: true,
        suggestion: 'chart',
        confidence: 0.8,
      };
    }
  }

  return { needsStructured: false };
}

/**
 * Format thinking chain for display
 */
export function formatThinkingChain(thinking) {
  if (!thinking) return [];

  const steps = thinking.split('\n').filter(l => l.trim());
  const formatted = [];

  for (const step of steps) {
    // Detect step type
    if (step.match(/^\d+[\.)]\s*/)) {
      formatted.push({ type: 'step', content: step.replace(/^\d+[\.)]\s*/, ''), index: formatted.length + 1 });
    } else if (step.match(/^(分析|查询|处理|生成|理解)/)) {
      formatted.push({ type: 'action', content: step, index: formatted.length + 1 });
    } else {
      formatted.push({ type: 'info', content: step, index: formatted.length + 1 });
    }
  }

  return formatted;
}
