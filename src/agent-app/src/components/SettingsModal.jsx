import React, { useState } from 'react';
import { X, Moon, Sun, Monitor, Keyboard, Bell, Shield, Palette } from 'lucide-react';
import './SettingsModal.css';

const THEMES = [
  { id: 'light', name: '浅色', icon: Sun },
  { id: 'dark', name: '深色', icon: Moon },
  { id: 'system', name: '跟随系统', icon: Monitor },
];

const SHORTCUTS = [
  { keys: ['Ctrl', 'Alt', 'N'], action: '新建对话' },
  { keys: ['Ctrl', 'Enter'], action: '发送消息' },
  { keys: ['/', '?'], action: '显示快捷键' },
  { keys: ['Esc'], action: '关闭弹窗' },
  { keys: ['Ctrl', 'Shift', 'O'], action: '切换侧边栏' },
];

function SettingsModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('appearance');
  const [theme, setTheme] = useState('light');
  const [notifications, setNotifications] = useState(true);
  const [soundEffects, setSoundEffects] = useState(false);

  const handleThemeChange = (themeId) => {
    setTheme(themeId);
    if (themeId === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', themeId);
    }
  };

  const tabs = [
    { id: 'appearance', name: '外观', icon: Palette },
    { id: 'shortcuts', name: '快捷键', icon: Keyboard },
    { id: 'notifications', name: '通知', icon: Bell },
    { id: 'security', name: '安全', icon: Shield },
  ];

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="settings-modal">
        <div className="settings-header">
          <h2>设置</h2>
          <button className="settings-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="settings-body">
          <nav className="settings-nav">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <tab.icon size={18} />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>

          <div className="settings-content">
            {activeTab === 'appearance' && (
              <div className="settings-section">
                <h3>主题</h3>
                <p className="settings-description">选择您喜欢的界面主题</p>
                <div className="theme-options">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      className={`theme-option ${theme === t.id ? 'active' : ''}`}
                      onClick={() => handleThemeChange(t.id)}
                    >
                      <div className="theme-icon">
                        <t.icon size={20} />
                      </div>
                      <span>{t.name}</span>
                    </button>
                  ))}
                </div>

                <h3 style={{ marginTop: 'var(--space-2xl)' }}>字体大小</h3>
                <p className="settings-description">调整界面文字大小</p>
                <div className="font-size-options">
                  {['小', '中', '大'].map((size, i) => (
                    <button
                      key={size}
                      className={`font-size-option ${i === 1 ? 'active' : ''}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'shortcuts' && (
              <div className="settings-section">
                <h3>键盘快捷键</h3>
                <p className="settings-description">使用快捷键提高效率</p>
                <div className="shortcuts-list">
                  {SHORTCUTS.map((shortcut, i) => (
                    <div key={i} className="shortcut-item">
                      <span className="shortcut-action">{shortcut.action}</span>
                      <div className="shortcut-keys">
                        {shortcut.keys.map((key) => (
                          <kbd key={key} className="shortcut-key">
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="settings-section">
                <h3>通知设置</h3>
                <p className="settings-description">管理消息通知</p>
                <div className="toggle-list">
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <span className="toggle-label">桌面通知</span>
                      <span className="toggle-desc">收到新消息时显示通知</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={notifications}
                        onChange={(e) => setNotifications(e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                  <div className="toggle-item">
                    <div className="toggle-info">
                      <span className="toggle-label">声音提示</span>
                      <span className="toggle-desc">播放提示音</span>
                    </div>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={soundEffects}
                        onChange={(e) => setSoundEffects(e.target.checked)}
                      />
                      <span className="toggle-slider" />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="settings-section">
                <h3>安全设置</h3>
                <p className="settings-description">保护您的账户安全</p>
                <div className="security-options">
                  <button className="security-btn">
                    <Shield size={18} />
                    <span>修改密码</span>
                  </button>
                  <button className="security-btn">
                    <Shield size={18} />
                    <span>两步验证</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default SettingsModal;
