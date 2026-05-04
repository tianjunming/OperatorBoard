import React from 'react';
import {
  Sparkles,
  Building2,
  BarChart3,
  TrendingUp,
  Search,
  Clock,
} from 'lucide-react';
import { useI18n } from '../i18n';
import './Welcome.css';

// 核心能力 - 5个关键功能
const CAPABILITIES = [
  { icon: Building2, title: '站点分析', desc: '站点数量与分布统计' },
  { icon: BarChart3, title: '小区分布', desc: '频段与小区分布' },
  { icon: TrendingUp, title: '指标分析', desc: 'KPI与性能指标' },
  { icon: Clock, title: '历史趋势', desc: '数据变化趋势' },
  { icon: Search, title: '智能查询', desc: '自然语言数据分析' },
];

// 分类推荐问题 - 7类核心功能（对应20个核心查询）
const EXAMPLE_CATEGORIES = [
  {
    label: '运营商总览',
    icon: Building2,
    examples: [
      '查看所有运营商',
      '各运营商站点数量',
      '各运营商小区数量',
    ],
  },
  {
    label: '站点统计',
    icon: BarChart3,
    examples: [
      '中国联通有多少站点',
      '中国联通各频段站点',
      '中国联通历史站点',
    ],
  },
  {
    label: '小区统计',
    icon: Building2,
    examples: [
      '中国联通有多少小区',
      '中国联通各频段小区',
      '中国联通历史小区',
    ],
  },
  {
    label: '负载分析',
    icon: TrendingUp,
    examples: [
      '中国联通小区上行负载',
      '中国联通小区下行负载',
      '中国联通历史负载',
    ],
  },
  {
    label: '速率分析',
    icon: TrendingUp,
    examples: [
      '中国联通小区上行速率',
      '中国联通小区下行速率',
      '中国联通历史速率',
    ],
  },
  {
    label: '分流指标',
    icon: BarChart3,
    examples: [
      '中国联通小区分流指标',
      '中国联通历史分流指标',
    ],
  },
  {
    label: '多维对比',
    icon: Search,
    examples: [
      '所有运营商下行速率',
      '所有运营商小区下行负载',
      '所有运营商小区上行负载',
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
        <div className="examples-row examples-row-1">
          {EXAMPLE_CATEGORIES.slice(0, 3).map((cat, i) => (
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
        <div className="examples-row examples-row-2">
          {EXAMPLE_CATEGORIES.slice(3).map((cat, i) => (
            <div key={i + 3} className="example-category">
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
