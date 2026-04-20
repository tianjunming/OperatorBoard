import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ThemeContext = createContext(null);

// Available themes
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
  MIDNIGHT: 'midnight',
  SYSTEM: 'system',
};

export const THEME_LABELS = {
  [THEMES.LIGHT]: '浅色',
  [THEMES.DARK]: '深色',
  [THEMES.MIDNIGHT]: '午夜',
  [THEMES.SYSTEM]: '跟随系统',
};

function getSystemTheme() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return THEMES.DARK;
  }
  return THEMES.LIGHT;
}

function resolveTheme(theme) {
  if (theme === THEMES.SYSTEM) {
    return getSystemTheme();
  }
  return theme;
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved && Object.values(THEMES).includes(saved)) {
      return saved;
    }
    return THEMES.SYSTEM;
  });

  // Update document theme attribute
  const updateDocumentTheme = useCallback((resolvedTheme) => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, []);

  // Apply theme on change
  useEffect(() => {
    const resolved = resolveTheme(theme);
    localStorage.setItem('theme', theme);
    updateDocumentTheme(resolved);
  }, [theme, updateDocumentTheme]);

  // Listen for system theme changes when in system mode
  useEffect(() => {
    if (theme !== THEMES.SYSTEM) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      updateDocumentTheme(getSystemTheme());
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme, updateDocumentTheme]);

  // Toggle between light and dark
  const toggleTheme = useCallback(() => {
    const current = resolveTheme(theme);
    setTheme(current === THEMES.LIGHT ? THEMES.DARK : THEMES.LIGHT);
  }, [theme]);

  // Set specific theme mode
  const setThemeMode = useCallback((mode) => {
    if (Object.values(THEMES).includes(mode)) {
      setTheme(mode);
    }
  }, []);

  // Get the resolved theme (actual theme being applied)
  const resolvedTheme = resolveTheme(theme);

  return (
    <ThemeContext.Provider value={{
      theme,
      resolvedTheme,
      toggleTheme,
      setThemeMode,
      isDark: resolvedTheme === THEMES.DARK || resolvedTheme === THEMES.MIDNIGHT,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
