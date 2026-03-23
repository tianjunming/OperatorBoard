import React, { useState } from 'react';
import ChatContainer from './components/ChatContainer';
import OperatorDashboard from './components/OperatorDashboard';
import './styles/Dashboard.css';

function App() {
  const [view, setView] = useState('chat');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Operator Agent</h1>
        <p className="subtitle">AI-Powered Telecom Operations Assistant</p>
        <nav className="app-nav">
          <button
            className={`nav-btn ${view === 'chat' ? 'active' : ''}`}
            onClick={() => setView('chat')}
          >
            对话
          </button>
          <button
            className={`nav-btn ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            数据看板
          </button>
        </nav>
      </header>
      <main className="app-main">
        {view === 'chat' ? <ChatContainer /> : <OperatorDashboard />}
      </main>
    </div>
  );
}

export default App;
