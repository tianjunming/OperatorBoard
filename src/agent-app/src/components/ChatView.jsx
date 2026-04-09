import React, { useCallback, useEffect } from 'react';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import Welcome from './Welcome';
import { useChat } from '../context/ChatContext';
import { useI18n } from '../i18n';
import { useStreamingAgent } from '../hooks/useStreamingAgent';
import './ChatView.css';

function ChatView() {
  const { messages, currentSession, saveMessage, clearCurrentSession } = useChat();
  const { locale, t } = useI18n();

  const { streamingContent, streamingChart, isStreaming, sendMessage, abort } = useStreamingAgent({
    onStreamStart: () => console.log('[ChatView] Streaming started'),
    onStreamEnd: () => console.log('[ChatView] Streaming ended'),
  });

  // Handle send message
  const handleSendMessage = useCallback(async (text, isResend = false) => {
    if (!text.trim()) return;

    console.log('[ChatView] handleSendMessage called:', text, 'isResend:', isResend);

    if (!isResend) {
      console.log('[ChatView] Saving user message...');
      const savedUserMsg = await saveMessage('user', text, { intent: 'chat' });
      console.log('[ChatView] User message saved:', savedUserMsg);
    }

    await sendMessage(text, saveMessage);
  }, [saveMessage, sendMessage]);

  // Handle resend
  const handleResend = useCallback((content) => {
    handleSendMessage(content, true);
  }, [handleSendMessage]);

  // Handle clear conversation
  const handleClear = useCallback(() => {
    abort();
    clearCurrentSession();
  }, [abort, clearCurrentSession]);

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
          />
        )}
      </div>

      <div className="chat-input-container">
        <ChatInput
          onSend={handleSendMessage}
          disabled={isStreaming}
          placeholder={locale === 'zh'
            ? t('placeholder') || '输入您的查询...'
            : 'Enter your query...'}
        />
      </div>
    </div>
  );
}

export default ChatView;
