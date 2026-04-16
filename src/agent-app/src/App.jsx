import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import ChatView from './components/ChatView';
import OperatorDashboard from './components/OperatorDashboard';
import AdminDashboard from './components/AdminDashboard';
import AuthLogin from './components/AuthLogin';
import AuthRegister from './components/AuthRegister';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { ThemeProvider } from './context/ThemeContext';
import { I18nProvider, useI18n } from './i18n';
import './styles/global.css';

function AppContent() {
  const { isAuthenticated, isSuperuser } = useAuth();
  const [view, setView] = useState('chat');
  const { locale, toggleLocale, t } = useI18n();

  // Handle registration route
  const isRegisterPage = window.location.pathname === '/register';

  const handleNavigate = (newView) => {
    if (newView === 'admin' && !isSuperuser) {
      alert('您没有权限访问管理面板。');
      return;
    }
    setView(newView);
  };

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
    </Layout>
  );
}

function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <AuthProvider>
          <ChatProvider>
            <AppContent />
          </ChatProvider>
        </AuthProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}

export default App;
