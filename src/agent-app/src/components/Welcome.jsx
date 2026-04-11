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

  // 18 key query functions for operator network data
  const examples = locale === 'zh' ? [
    // 站点数据查询
    '北京联通有多少站点和小区？',
    '显示中国移动的站点分布',
    '查询所有运营商的最新站点数据',
    '中国电信各频段站点数量统计',
    // 最新数据查询
    '最新月份各运营商站点汇总',
    '显示最新的网络指标',
    '获取所有运营商最新指标数据',
    // 历史数据查询
    '查询中国联通站点历史变化',
    '北京移动近6个月指标趋势',
    '显示运营商站点随时间变化',
    // 指标对比分析
    '对比两家运营商的覆盖效果',
    '比较不同时期的网络质量',
    '各运营商流量占比分析',
    // 频段专项查询
    'NR 2600M频段站点分布',
    'LTE 1800M小区数量统计',
    '各运营商5G频段覆盖对比',
    // 自然语言查询
    '哪些运营商在2100M频段有部署？',
    '查询各运营商站点总数排名',
  ] : [
    // Site data queries
    'How many sites and cells does China Unicom have?',
    'Show site distribution for China Mobile',
    'Get latest sites data for all operators',
    'Statistics of China Telecom sites by band',
    // Latest data queries
    'Latest month sites summary for all operators',
    'Show latest network indicators',
    'Get all operators latest indicators',
    // History data queries
    'Query China Unicom site history',
    'Beijing Mobile indicators trend for 6 months',
    'Show operator sites over time',
    // Indicator comparison
    'Compare coverage of two operators',
    'Compare network quality across periods',
    'Traffic ratio analysis by operator',
    // Band-specific queries
    'NR 2600M band site distribution',
    'LTE 1800M cell count statistics',
    'Compare 5G band coverage across operators',
    // Natural language queries
    'Which operators have 2100M deployment?',
    'Query operator site totals ranking',
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
