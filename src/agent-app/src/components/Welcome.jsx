import React from 'react';
import { Sparkles, BarChart3, MessageSquare, Database, Zap } from 'lucide-react';
import { useI18n } from '../i18n';
import './Welcome.css';

const FEATURES = [
  {
    icon: Database,
    title: 'NL2SQL 智能查询',
    desc: '用自然语言查询数据库，无需编写 SQL',
  },
  {
    icon: BarChart3,
    title: '数据可视化',
    desc: '自动生成图表，直观展示运营数据',
  },
  {
    icon: Zap,
    title: '实时响应',
    desc: '流式输出，即时获得查询结果',
  },
];

function Welcome({ onExampleClick }) {
  const { locale } = useI18n();

  const examples = locale === 'zh' ? [
    '北京联通的站点数量是多少？',
    '显示最新的网络指标数据',
    '有哪些运营商客户？',
  ] : [
    'How many sites does China Unicom have?',
    'Show the latest network indicator data',
    'What operators do we have?',
  ];

  return (
    <div className="welcome">
      <div className="welcome-header">
        <div className="welcome-logo">
          <Sparkles size={32} />
        </div>
        <h1 className="welcome-title">
          {locale === 'zh' ? '运营商智能助手' : 'Operator Agent'}
        </h1>
        <p className="welcome-subtitle">
          {locale === 'zh'
            ? 'AI 驱动的电信运营数据查询与分析平台'
            : 'AI-Powered Telecom Operations Data Query & Analysis Platform'}
        </p>
      </div>

      <div className="welcome-features">
        {FEATURES.map((feature, i) => (
          <div key={i} className="feature-card">
            <div className="feature-icon">
              <feature.icon size={20} />
            </div>
            <div className="feature-info">
              <h3>{feature.title}</h3>
              <p>{feature.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="welcome-examples">
        <h3 className="examples-title">
          {locale === 'zh' ? '可以尝试询问' : 'Try asking'}
        </h3>
        <div className="examples-list">
          {examples.map((example, i) => (
            <button
              key={i}
              className="example-item"
              onClick={() => onExampleClick?.(example)}
            >
              <MessageSquare size={14} />
              <span>{example}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="welcome-hint">
        <span className="hint-key">Enter</span>
        <span>{locale === 'zh' ? '发送消息' : 'to send'}</span>
        <span className="hint-sep">|</span>
        <span className="hint-key">Shift + Enter</span>
        <span>{locale === 'zh' ? '换行' : 'for new line'}</span>
      </div>
    </div>
  );
}

export default Welcome;
