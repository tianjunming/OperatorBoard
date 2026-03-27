import React, { createContext, useContext, useState, useCallback } from 'react';

const translations = {
  zh: {
    appTitle: '运营商智能助手',
    appSubtitle: 'AI驱动的电信运营助手',
    chat: '对话',
    dashboard: '数据看板',
    placeholder: '输入您的查询...',
    send: '发送',
    thinking: '思考中...',
    error: '错误',
    retry: '重试',
    noData: '暂无数据',
    loading: '加载中...',
    // Dashboard
    operator: '运营商',
    siteCount: '站点数',
    cellCount: '小区数',
    lteBand: 'LTE频段',
    nrBand: 'NR频段',
    dataMonth: '数据月份',
    // Error messages
    connectionError: '连接失败，请检查网络',
    serverError: '服务器错误',
  },
  en: {
    appTitle: 'Operator Agent',
    appSubtitle: 'AI-Powered Telecom Operations Assistant',
    chat: 'Chat',
    dashboard: 'Dashboard',
    placeholder: 'Enter your query...',
    send: 'Send',
    thinking: 'Thinking...',
    error: 'Error',
    retry: 'Retry',
    noData: 'No data',
    loading: 'Loading...',
    // Dashboard
    operator: 'Operator',
    siteCount: 'Sites',
    cellCount: 'Cells',
    lteBand: 'LTE Band',
    nrBand: 'NR Band',
    dataMonth: 'Data Month',
    // Error messages
    connectionError: 'Connection failed',
    serverError: 'Server error',
  },
};

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem('locale') || 'zh';
  });

  const toggleLocale = useCallback(() => {
    setLocale((prev) => {
      const newLocale = prev === 'zh' ? 'en' : 'zh';
      localStorage.setItem('locale', newLocale);
      return newLocale;
    });
  }, []);

  const t = useCallback(
    (key) => {
      return translations[locale][key] || key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, toggleLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

export { translations };
