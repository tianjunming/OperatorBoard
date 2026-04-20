import React, { useState, useCallback, useEffect } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useTheme } from '../context/ThemeContext';
import './Layout.css';

function Layout({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { theme } = useTheme();

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  // Listen for toggle-sidebar event from keyboard shortcuts
  useEffect(() => {
    const handler = () => {
      setSidebarCollapsed((prev) => !prev);
    };
    window.addEventListener('toggle-sidebar', handler);
    return () => window.removeEventListener('toggle-sidebar', handler);
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
