import React, { useState, useCallback } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useChat } from '../context/ChatContext';
import { useTheme } from '../context/ThemeContext';
import './Layout.css';

function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { sidebarOpen } = useChat();
  const { theme } = useTheme();

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  return (
    <div className="layout" data-theme={theme}>
      <Header
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />

      <div className="layout-body">
        <Sidebar collapsed={sidebarCollapsed} />

        <main className={`layout-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
