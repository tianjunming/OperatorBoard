import React, { useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import './FollowupQuestions.css';

function FollowupQuestions({ questions, onQuestionClick, visible }) {
  const handleClick = useCallback((question) => {
    onQuestionClick?.(question);
  }, [onQuestionClick]);

  if (!visible || !questions || questions.length === 0) {
    return null;
  }

  return (
    <div className="followup-questions">
      <div className="followup-header">
        <MessageSquare size={14} />
        <span>您可能还想问：</span>
      </div>
      <div className="followup-list">
        {questions.map((question, index) => (
          <button
            key={index}
            className="followup-item"
            onClick={() => handleClick(question)}
          >
            {question}
          </button>
        ))}
      </div>
    </div>
  );
}

export default React.memo(FollowupQuestions);