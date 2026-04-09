import React, { useState } from 'react';
import { Menu, Settings, Sun, Moon, ChevronDown, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../i18n';
import SettingsModal from './SettingsModal';
import './Header.css';

const MODELS = [
  { id: 'default', name: 'M2-her', description: '默认模型' },
  { id: 'gpt4', name: 'GPT-4', description: '更强大的理解能力' },
  { id: 'claude', name: 'Claude', description: '擅长分析推理' },
];

function Header({ sidebarCollapsed, onToggleSidebar }) {
  const { user, logout, isSuperuser } = useAuth();
  const { locale, toggleLocale, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
  };

  return (
    <header className="header">
      <div className="header-left">
        <button
          className="header-btn sidebar-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>

        <div className="header-brand">
          <h1 className="brand-title">{t('appTitle')}</h1>
        </div>
      </div>

      <div className="header-center">
        <div className="model-selector">
          <button
            className="model-selector-btn"
            onClick={() => setShowModelMenu(!showModelMenu)}
          >
            <span className="model-name">{selectedModel.name}</span>
            <ChevronDown size={14} />
          </button>

          {showModelMenu && (
            <>
              <div className="model-menu-backdrop" onClick={() => setShowModelMenu(false)} />
              <div className="model-menu">
                {MODELS.map((model) => (
                  <button
                    key={model.id}
                    className={`model-menu-item ${selectedModel.id === model.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedModel(model);
                      setShowModelMenu(false);
                    }}
                  >
                    <div className="model-info">
                      <span className="model-item-name">{model.name}</span>
                      <span className="model-item-desc">{model.description}</span>
                    </div>
                    {selectedModel.id === model.id && (
                      <span className="model-check">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="header-right">
        <button
          className="header-btn"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <button
          className="header-btn"
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
        >
          <Settings size={18} />
        </button>

        <div className="user-menu-container">
          <button
            className="user-avatar-btn"
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <div className="user-avatar">
              <User size={16} />
            </div>
            <span className="user-name">{user?.username || 'User'}</span>
            <ChevronDown size={14} />
          </button>

          {showUserMenu && (
            <>
              <div className="user-menu-backdrop" onClick={() => setShowUserMenu(false)} />
              <div className="user-menu">
                <div className="user-menu-header">
                  <span className="user-menu-name">{user?.username}</span>
                  <span className="user-menu-role">{isSuperuser ? '管理员' : '用户'}</span>
                </div>
                <div className="user-menu-divider" />
                <button className="user-menu-item" onClick={() => { setShowUserMenu(false); setShowSettings(true); }}>
                  <Settings size={16} />
                  <span>设置</span>
                </button>
                <button className="user-menu-item logout" onClick={handleLogout}>
                  <LogOut size={16} />
                  <span>退出登录</span>
                </button>
              </div>
            </>
          )}
        </div>

        <button className="lang-toggle" onClick={toggleLocale}>
          {locale === 'zh' ? 'EN' : '中'}
        </button>
      </div>

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </header>
  );
}

export default Header;
