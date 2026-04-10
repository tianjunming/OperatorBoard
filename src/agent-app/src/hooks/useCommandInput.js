import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

/**
 * Slash command definitions
 */
export const COMMANDS = [
  {
    id: 'site',
    label: '📍 站点查询',
    hint: '/site [区域] [运营商]',
    description: '查询指定区域的站点数据',
  },
  {
    id: 'indicator',
    label: '📊 指标查询',
    hint: '/indicator [指标名]',
    description: '查询特定指标的详细数据',
  },
  {
    id: 'compare',
    label: '📈 数据对比',
    hint: '/compare <对象1> <对象2>',
    description: '对比两个对象的数据',
  },
  {
    id: 'export',
    label: '📥 导出数据',
    hint: '/export [csv/excel]',
    description: '导出当前查询结果',
  },
  {
    id: 'clear',
    label: '🗑️ 清空对话',
    hint: '/clear',
    description: '清空当前对话历史',
  },
  {
    id: 'help',
    label: '❓ 帮助',
    hint: '/help',
    description: '显示所有可用命令',
  },
];

/**
 * Hook for command input handling with slash commands and @ mentions
 */
export function useCommandInput(onCommand, onClear) {
  const [input, setInput] = useState('');
  const [showCommandPanel, setShowCommandPanel] = useState(false);
  const [showMentionPanel, setShowMentionPanel] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.startsWith('/')) return [];
    const search = query.slice(1).toLowerCase();
    if (!search) return COMMANDS;
    return COMMANDS.filter(cmd =>
      cmd.id.includes(search) ||
      cmd.label.includes(search) ||
      cmd.hint.includes(search)
    );
  }, [query]);

  // Handle input change
  const handleChange = useCallback((value) => {
    setInput(value);

    // Check for slash command trigger
    if (value.endsWith('/') && !value.includes(' ')) {
      setQuery('/');
      setShowCommandPanel(true);
      setShowMentionPanel(false);
      setSelectedIndex(0);
    } else if (showCommandPanel) {
      setQuery(value);
      setSelectedIndex(0);
      if (!value.startsWith('/')) {
        setShowCommandPanel(false);
      }
    }

    // Check for @ mention trigger
    const atIndex = value.lastIndexOf('@');
    if (atIndex !== -1 && atIndex === value.length - 1) {
      setShowMentionPanel(true);
      setShowCommandPanel(false);
      setSelectedIndex(0);
    } else if (atIndex !== -1 && showMentionPanel) {
      const mentionQuery = value.slice(atIndex + 1);
      if (mentionQuery.includes(' ')) {
        setShowMentionPanel(false);
      }
    }
  }, [showCommandPanel, showMentionPanel]);

  // Handle command selection
  const selectCommand = useCallback((cmd) => {
    if (cmd.id === 'clear') {
      onClear?.();
      setInput('');
    } else {
      setInput(cmd.hint + ' ');
    }
    setShowCommandPanel(false);
    setQuery('');
    inputRef.current?.focus();
  }, [onClear]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e, messages) => {
    const activePanel = showCommandPanel ? filteredCommands : (showMentionPanel ? messages : null);

    if (!activePanel || activePanel.length === 0) return false;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, activePanel.length - 1));
      return true;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
      return true;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (showCommandPanel && filteredCommands[selectedIndex]) {
        selectCommand(filteredCommands[selectedIndex]);
        return true;
      }
      if (showMentionPanel && messages[selectedIndex]) {
        insertMention(messages[selectedIndex]);
        return true;
      }
    }

    if (e.key === 'Escape') {
      setShowCommandPanel(false);
      setShowMentionPanel(false);
      setQuery('');
      return true;
    }

    return false;
  }, [showCommandPanel, showMentionPanel, filteredCommands, selectedIndex, selectCommand]);

  // Insert @ mention reference
  const insertMention = useCallback((message) => {
    const atIndex = input.lastIndexOf('@');
    const newInput = input.slice(0, atIndex) + `[ref:${message.id}] `;
    setInput(newInput);
    setShowMentionPanel(false);
    inputRef.current?.focus();
  }, [input]);

  // Close panels on outside click
  const closePanels = useCallback(() => {
    setShowCommandPanel(false);
    setShowMentionPanel(false);
    setQuery('');
  }, []);

  return {
    input,
    setInput: handleChange,
    inputRef,
    showCommandPanel,
    showMentionPanel,
    filteredCommands,
    selectedIndex,
    handleKeyDown,
    selectCommand,
    insertMention,
    closePanels,
    query,
  };
}

export default useCommandInput;
