import React from 'react';
import {
  Sparkles,
  Database,
  BarChart2,
  Radio,
  TrendingUp,
  Globe,
  Antenna,
} from 'lucide-react';
import { useI18n } from '../i18n';
import './Welcome.css';

// 核心能力 - 4个关键功能
const CAPABILITIES = [
  { icon: Database, title: 'NL2SQL', desc: '自然语言查询数据库' },
  { icon: BarChart2, title: '智能可视化', desc: '自动生成数据图表' },
  { icon: Radio, title: '站点分析', desc: '运营商站点分布统计' },
  { icon: TrendingUp, title: '指标监控', desc: '网络KPI实时追踪' },
];

// 分类推荐问题 - 6个精选示例
const EXAMPLE_CATEGORIES = [
  {
    label: '站点查询',
    icon: Globe,
    examples: [
      '中国联通有多少站点？',
      '各运营商5G站点排名',
    ],
  },
  {
    label: '小区查询',
    icon: Antenna,
    examples: [
      '各运营商小区数量统计',
      'NR 2600M频段小区分布',
    ],
  },
  {
    label: '指标分析',
    icon: TrendingUp,
    examples: [
      '最新月各运营商指标',
      '对比两家运营商覆盖',
    ],
  },
];

function Welcome({ onExampleClick }) {
  const { locale } = useI18n();

  return (
    <div className="welcome">
      {/* 标题区 */}
      <div className="welcome-header">
        <div className="welcome-logo">
          <Sparkles size={32} />
        </div>
        <h1 className="welcome-title">
          {locale === 'zh' ? '运营商智能助手' : 'Operator Agent'}
        </h1>
        <p className="welcome-subtitle">
          {locale === 'zh'
            ? 'AI 驱动的电信数据查询与分析'
            : 'AI-Powered Telecom Data Analysis'}
        </p>
      </div>

      {/* 核心能力 - 2x2网格 */}
      <div className="welcome-features">
        {CAPABILITIES.map((cap, i) => (
          <div key={i} className="feature-card">
            <div className="feature-icon">
              <cap.icon size={20} />
            </div>
            <div className="feature-info">
              <h3>{cap.title}</h3>
              <p>{cap.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* 分类推荐问题 */}
      <div className="welcome-examples">
        <h3 className="examples-title">
          {locale === 'zh' ? '试试这样问' : 'Try Asking'}
        </h3>
        <div className="examples-categories">
          {EXAMPLE_CATEGORIES.map((cat, i) => (
            <div key={i} className="example-category">
              <div className="category-header">
                <cat.icon size={14} />
                <span>{cat.label}</span>
              </div>
              <div className="category-examples">
                {cat.examples.map((ex, j) => (
                  <button
                    key={j}
                    className="example-item"
                    onClick={() => onExampleClick?.(ex)}
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 快捷键提示 */}
      <div className="welcome-hint">
        <span className="hint-key">Enter</span>
        <span>{locale === 'zh' ? '发送' : 'Send'}</span>
        <span className="hint-sep">|</span>
        <span className="hint-key">Shift+Enter</span>
        <span>{locale === 'zh' ? '换行' : 'New line'}</span>
      </div>
    </div>
  );
}

export default Welcome;
