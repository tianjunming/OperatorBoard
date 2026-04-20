import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Search, Command, Plus, Moon, Sun, Keyboard, Download, RefreshCw, HelpCircle, X } from 'lucide-react';
import { useTheme, THEMES, THEME_LABELS } from '../context/ThemeContext';
import { useChat } from '../context/ChatContext';
import './CommandPalette.css';

export const SHORTCUTS = [
  { id: 'new-chat', name: '新建对话', shortcut: 'Cmd+N', category: '对话' },
  { id: 'toggle-theme', name: '切换主题', shortcut: 'Cmd+T', category: '视图' },
  { id: 'toggle-sidebar', name: '切换侧边栏', shortcut: 'Cmd+B', category: '视图' },
  { id: 'focus-input', name: '聚焦输入框', shortcut: 'Cmd+L', category: '导航' },
  { id: 'open-help', name: '打开帮助', shortcut: 'Cmd+/', category: '帮助' },
];

function CommandPalette({ isOpen, onClose, onNewChat }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const { theme, setThemeMode, toggleTheme } = useTheme();
  const { clearCurrentSession } = useChat();

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    const allCommands = [
      { id: 'new-chat', name: '新建对话', shortcut: 'Cmd+N', category: '对话', action: () => { onNewChat?.(); onClose(); } },
      { id: 'toggle-theme', name: '切换主题', shortcut: 'Cmd+T', category: '视图', action: () => { toggleTheme(); onClose(); } },
      { id: 'set-theme-light', name: '浅色主题', shortcut: '', category: '视图', action: () => { setThemeMode('light'); onClose(); } },
      { id: 'set-theme-dark', name: '深色主题', shortcut: '', category: '视图', action: () => { setThemeMode('dark'); onClose(); } },
      { id: 'set-theme-midnight', name: '午夜主题', shortcut: '', category: '视图', action: () => { setThemeMode('midnight'); onClose(); } },
      { id: 'set-theme-system', name: '跟随系统', shortcut: '', category: '视图', action: () => { setThemeMode('system'); onClose(); } },
      { id: 'clear-chat', name: '清除当前对话', shortcut: '', category: '对话', action: () => { clearCurrentSession(); onClose(); } },
    ];

    if (!query.trim()) return allCommands;

    const lowerQuery = query.toLowerCase();
    return allCommands.filter(cmd =>
      cmd.name.toLowerCase().includes(lowerQuery) ||
      cmd.category.toLowerCase().includes(lowerQuery)
    );
  }, [query, theme, toggleTheme, setThemeMode, clearCurrentSession, onNewChat, onClose]);

  // Reset selection when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredCommands]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [filteredCommands, selectedIndex, onClose]);

  // Handle click outside
  const handleBackdropClick = useCallback((e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="command-palette-overlay" onClick={handleBackdropClick}>
      <div className="command-palette">
        <div className="command-palette-header">
          <Search size={16} className="command-palette-icon" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            placeholder="输入命令或搜索..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="command-palette-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="command-palette-results">
          {filteredCommands.length === 0 ? (
            <div className="command-palette-empty">没有找到匹配的命令</div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <div
                key={cmd.id}
                className={`command-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => cmd.action()}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="command-item-content">
                  <span className="command-item-name">{cmd.name}</span>
                  {cmd.shortcut && (
                    <span className="command-item-shortcut">{cmd.shortcut}</span>
                  )}
                </div>
                <span className="command-item-category">{cmd.category}</span>
              </div>
            ))
          )}
        </div>

        <div className="command-palette-footer">
          <span className="footer-hint">
            <Keyboard size={12} />
            <span>↑↓ 导航</span>
          </span>
          <span className="footer-hint">
            <span>↵ 执行</span>
          </span>
          <span className="footer-hint">
            <span>Esc 关闭</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
