import React, { useState } from 'react';
import ChatContainer from './components/ChatContainer.jsx';
import OperatorDashboard from './components/OperatorDashboard';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { useI18n } from './i18n';
import './styles/Dashboard.css';

function App() {
  const [view, setView] = useState('chat');
  const { locale, toggleLocale, t } = useI18n();

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
            onClick={() => setView('chat')}
          >
            {t('chat')}
          </button>
          <button
            className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            {t('dashboard')}
          </button>
        </nav>
      </header>
      <main className="app-main">
        <ErrorBoundary name="Dashboard">
          {view === 'chat' ? (
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

export default App;
