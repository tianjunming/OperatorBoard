import React, { useMemo } from 'react';
import { MessageSquare, User } from 'lucide-react';
import './MentionPicker.css';

function MentionPicker({ messages, selectedIndex, onSelect }) {
  // Filter to only show user and assistant messages with content
  const selectableMessages = useMemo(() => {
    return messages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .filter(msg => msg.content && msg.content.trim())
      .slice(-20) // Last 20 messages
      .reverse(); // Most recent first
  }, [messages]);

  if (selectableMessages.length === 0) {
    return (
      <div className="mention-picker">
        <div className="mention-empty">暂无历史消息</div>
      </div>
    );
  }

  const formatPreview = (content) => {
    const text = content.replace(/[#*`\[\]]/g, '').trim();
    return text.length > 50 ? text.slice(0, 50) + '...' : text;
  };

  return (
    <div className="mention-picker">
      <div className="mention-header">
        <span>引用历史消息</span>
        <span className="mention-hint">选择要引用的消息</span>
      </div>
      <div className="mention-list">
        {selectableMessages.map((msg, idx) => (
          <div
            key={msg.id || idx}
            className={`mention-item ${selectedIndex === idx ? 'selected' : ''}`}
            onClick={() => onSelect(msg)}
          >
            <div className="mention-icon">
              {msg.role === 'user' ? <User size={14} /> : <MessageSquare size={14} />}
            </div>
            <div className="mention-content">
              <span className="mention-role">{msg.role === 'user' ? '你' : 'AI'}</span>
              <span className="mention-preview">{formatPreview(msg.content)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default React.memo(MentionPicker);
