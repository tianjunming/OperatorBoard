import React, { useState, useEffect, useCallback } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';
import Layout from './components/Layout';
import ChatView from './components/ChatView';
import CommandPalette from './components/CommandPalette';
import OperatorDashboard from './components/OperatorDashboard';
import AdminDashboard from './components/AdminDashboard';
import AuthLogin from './components/AuthLogin';
import AuthRegister from './components/AuthRegister';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider, useChat } from './context/ChatContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { I18nProvider, useI18n } from './i18n';
import './styles/global.css';

function AppContent() {
  const { isAuthenticated, isSuperuser } = useAuth();
  const [view, setView] = useState('chat');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const { locale, toggleLocale, t } = useI18n();
  const { toggleTheme } = useTheme();
  const { clearCurrentSession } = useChat();

  // Handle registration route
  const isRegisterPage = window.location.pathname === '/register';

  const handleNavigate = (newView) => {
    if (newView === 'admin' && !isSuperuser) {
      alert('您没有权限访问管理面板。');
      return;
    }
    setView(newView);
  };

  const handleNewChat = useCallback(() => {
    clearCurrentSession();
    setView('chat');
  }, [clearCurrentSession]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check for Cmd/Ctrl key
      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      } else if (isMod && e.key === 'n') {
        e.preventDefault();
        handleNewChat();
        setIsPaletteOpen(false);
      } else if (isMod && e.key === 't') {
        e.preventDefault();
        toggleTheme();
      } else if (isMod && e.key === 'b') {
        e.preventDefault();
        // Toggle sidebar - dispatch custom event
        window.dispatchEvent(new CustomEvent('toggle-sidebar'));
      } else if (isMod && e.key === 'l') {
        e.preventDefault();
        // Focus input - dispatch custom event
        window.dispatchEvent(new CustomEvent('focus-input'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewChat, toggleTheme]);

  if (isRegisterPage) {
    return <AuthRegister />;
  }

  if (!isAuthenticated) {
    return <AuthLogin />;
  }

  return (
    <Layout>
      <div className="app-content">
        {view === 'chat' && (
          <ErrorBoundary name="Chat">
            <ChatView />
          </ErrorBoundary>
        )}
        {view === 'dashboard' && (
          <ErrorBoundary name="Dashboard">
            <OperatorDashboard />
          </ErrorBoundary>
        )}
        {view === 'admin' && isSuperuser && (
          <ErrorBoundary name="Admin">
            <AdminDashboard />
          </ErrorBoundary>
        )}
      </div>

      <nav className="app-nav">
        <button
          className={`nav-btn ${view === 'chat' ? 'active' : ''}`}
          onClick={() => handleNavigate('chat')}
        >
          {t('chat')}
        </button>
        <button
          className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`}
          onClick={() => handleNavigate('dashboard')}
        >
          {t('dashboard')}
        </button>
        {isSuperuser && (
          <button
            className={`nav-btn ${view === 'admin' ? 'active' : ''}`}
            onClick={() => handleNavigate('admin')}
          >
            {t('admin')}
          </button>
        )}
      </nav>

      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onNewChat={handleNewChat}
      />
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <AuthProvider>
            <ChatProvider>
              <AppContent />
            </ChatProvider>
          </AuthProvider>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
