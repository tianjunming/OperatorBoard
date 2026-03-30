import React, { useState } from 'react';
import ChatContainer from './components/ChatContainer.jsx';
import OperatorDashboard from './components/OperatorDashboard';
import AdminDashboard from './components/AdminDashboard';
import AuthLogin from './components/AuthLogin';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import { I18nProvider, useI18n } from './i18n';
import './styles/Dashboard.css';

function AppContent() {
  const { isAuthenticated, isSuperuser } = useAuth();
  const [view, setView] = useState('chat');
  const { locale, toggleLocale, t } = useI18n();

  const handleNavigate = (newView) => {
    // Check permissions for admin view
    if (newView === 'admin' && !isSuperuser) {
      alert('You do not have permission to access the admin panel.');
      return;
    }
    setView(newView);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div className="header-title">
            <h1>{t('appTitle')}</h1>
            <p className="subtitle">{t('appSubtitle')}</p>
          </div>
          <button className="lang-toggle" onClick={toggleLocale}>
            {locale === 'zh' ? 'EN' : '中'}
          </button>
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
      </header>
      <main className="app-main">
        <ErrorBoundary name="Dashboard">
          {view === 'login' ? (
            <AuthLogin />
          ) : view === 'admin' ? (
            <AdminDashboard />
          ) : view === 'chat' ? (
            <ErrorBoundary name="Chat">
              <ChatContainer />
            </ErrorBoundary>
          ) : (
            <OperatorDashboard />
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <ChatProvider>
          <AppContent />
        </ChatProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
