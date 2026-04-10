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
    thinkingProcess: '正在思考...',
    error: '错误',
    retry: '重试',
    noData: '暂无数据',
    loading: '加载中...',
    // Action buttons
    copy: '复制',
    copied: '已复制',
    regenerate: '重新生成',
    resend: '重新发送',
    helpful: '有帮助',
    notHelpful: '没帮助',
    // Chat blocks
    analysisSteps: '分析步骤',
    dataVisualization: '数据可视化',
    jsonData: 'JSON 数据',
    expand: '展开',
    collapse: '收起',
    // Validation
    responseComplete: '响应完成',
    responseError: '响应异常',
    emptyResponse: '空响应',
    // Dashboard
    operator: '运营商',
    siteCount: '站点数',
    cellCount: '小区数',
    lteBand: 'LTE频段',
    nrBand: 'NR频段',
    dataMonth: '数据月份',
    admin: '系统管理',
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
    thinkingProcess: 'Thinking...',
    error: 'Error',
    retry: 'Retry',
    noData: 'No data',
    loading: 'Loading...',
    // Action buttons
    copy: 'Copy',
    copied: 'Copied',
    regenerate: 'Regenerate',
    resend: 'Resend',
    helpful: 'Helpful',
    notHelpful: 'Not helpful',
    // Chat blocks
    analysisSteps: 'Analysis Steps',
    dataVisualization: 'Data Visualization',
    jsonData: 'JSON Data',
    expand: 'Expand',
    collapse: 'Collapse',
    // Validation
    responseComplete: 'Response complete',
    responseError: 'Response error',
    emptyResponse: 'Empty response',
    // Dashboard
    operator: 'Operator',
    siteCount: 'Sites',
    cellCount: 'Cells',
    lteBand: 'LTE Band',
    nrBand: 'NR Band',
    dataMonth: 'Data Month',
    admin: 'Admin',
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
