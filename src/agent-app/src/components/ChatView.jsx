import React, { useCallback, useEffect } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import Welcome from './Welcome';
import QueryConfirmationDialog from './QueryConfirmationDialog';
import FollowupQuestions from './FollowupQuestions';
import { useChat } from '../context/ChatContext';
import { useI18n } from '../i18n';
import { useStreamingAgent } from '../hooks/useStreamingAgent';
import './ChatView.css';

function ChatView() {
  const { messages, currentSession, saveMessage, clearCurrentSession } = useChat();
  const { locale, t } = useI18n();

  const {
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
  } = useStreamingAgent({});

  // Handle send message
  const handleSendMessage = useCallback(async (text, isResend = false) => {
    if (!text.trim()) return;

    // Clear followup questions when starting new message
    clearFollowupQuestions();

    let userMessageId = null;
    if (!isResend) {
      try {
        const savedMsg = await saveMessage('user', text, { intent: 'chat' });
        userMessageId = savedMsg?.id;
      } catch (err) {
        console.error('Failed to save user message:', err);
        // 继续尝试发送，即使用户消息保存失败
      }
    }

    try {
      await sendMessage(text, saveMessage);
    } catch (error) {
      // 保存错误消息
      const errorMessage = error.message || '抱歉，服务暂时不可用，请稍后重试。';
      try {
        await saveMessage('assistant', `⚠️ ${errorMessage}`, { intent: 'chat', is_error: true });
      } catch (saveErr) {
        console.error('Failed to save error message:', saveErr);
      }
      console.error('Agent error:', error);
    }
  }, [saveMessage, sendMessage, clearFollowupQuestions]);

  // Handle resend
  const handleResend = useCallback((content) => {
    handleSendMessage(content, true);
  }, [handleSendMessage]);

  // Handle followup question click
  const handleFollowupClick = useCallback((question) => {
    handleSendMessage(question);
  }, [handleSendMessage]);

  // Handle clear conversation
  const handleClear = useCallback(() => {
    abort();
    clearCurrentSession();
    clearFollowupQuestions();
  }, [abort, clearCurrentSession, clearFollowupQuestions]);

  // Handle example click
  const handleExampleClick = useCallback((text) => {
    handleSendMessage(text);
  }, [handleSendMessage]);

  return (
    <div className="chat-view">
      <div className="chat-messages-container">
        {messages.length === 0 && !isStreaming ? (
          <Welcome onExampleClick={handleExampleClick} />
        ) : (
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            streamingChart={streamingChart}
            onResend={handleResend}
            followupQuestions={followupQuestions}
            onFollowupClick={handleFollowupClick}
          />
        )}
      </div>

      <div className="chat-input-container">
        <ChatInput
          onSend={handleSendMessage}
          onClear={handleClear}
          disabled={isStreaming}
          messages={messages}
          placeholder={locale === 'zh'
            ? t('placeholder') || '输入您的查询...'
            : 'Enter your query...'}
        />
      </div>

      {/* 查询确认对话框 */}
      <QueryConfirmationDialog
        isOpen={showConfirmation}
        options={clarificationOptions}
        selectedOptions={{}}
        onConfirm={handleConfirmationConfirm}
        onCancel={handleConfirmationCancel}
      />
    </div>
  );
}

export default React.memo(ChatView);
