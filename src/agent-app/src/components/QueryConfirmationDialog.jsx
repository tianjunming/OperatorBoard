/**
 * QueryConfirmationDialog - 模糊查询确认对话框
 * 当用户查询模糊时，弹出对话框让用户确认查询条件
 */
import React, { useState, useMemo } from 'react';
import { AlertCircle, Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import './QueryConfirmationDialog.css';

/**
 * @param {Object} props
 * @param {boolean} props.isOpen - 对话框是否显示
 * @param {string} props.title - 对话框标题
 * @param {string} props.message - 提示消息
 * @param {Object} props.options - 可选配置
 * @param {Array<{id: string|number, name: string}>} props.options.operators - 运营商列表
 * @param {Array<string>} props.options.bands - 频段列表
 * @param {Array<string>} props.options.months - 月份列表
 * @param {Object} props.selectedOptions - 当前选中的选项
 * @param {string|number} props.selectedOptions.operator - 选中的运营商
 * @param {string} props.selectedOptions.band - 选中的频段
 * @param {string} props.selectedOptions.month - 选中的月份
 * @param {Function} props.onConfirm - 确认回调
 * @param {Function} props.onCancel - 取消回调
 */
function QueryConfirmationDialog({
  isOpen,
  title = '确认您的查询',
  message = '您的查询比较模糊，请确认以下选项：',
  options = {},
  selectedOptions = {},
  onConfirm,
  onCancel
}) {
  const [expandedSection, setExpandedSection] = useState(null);
  const [localSelected, setLocalSelected] = useState({
    operator: selectedOptions.operator || '',
    band: selectedOptions.band || '',
    month: selectedOptions.month || ''
  });

  // 格式化月份选项
  const formattedMonths = useMemo(() => {
    if (!options.months) return [];
    return options.months.map(m => {
      // 如果是 YYYY-MM 格式，转换为可读格式
      if (/^\d{4}-\d{2}$/.test(m)) {
        const [year, month] = m.split('-');
        return { id: m, name: `${year}年${parseInt(month)}月` };
      }
      return { id: m, name: m };
    });
  }, [options.months]);

  const toggleSection = (section) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleSelect = (type, value) => {
    setLocalSelected(prev => ({ ...prev, [type]: value }));
  };

  const handleConfirm = () => {
    onConfirm?.(localSelected);
  };

  const handleCancel = () => {
    onCancel?.();
    setLocalSelected({
      operator: '',
      band: '',
      month: ''
    });
  };

  if (!isOpen) return null;

  return (
    <div className="confirmation-dialog-overlay">
      <div className="confirmation-dialog">
        {/* Header */}
        <div className="confirmation-header">
          <div className="confirmation-title">
            <AlertCircle size={18} />
            <span>{title}</span>
          </div>
          <button className="confirmation-close" onClick={handleCancel}>
            <X size={18} />
          </button>
        </div>

        {/* Message */}
        <div className="confirmation-message">
          <p>{message}</p>
        </div>

        {/* Selection Options */}
        <div className="confirmation-options">
          {/* Operators Section */}
          {options.operators && options.operators.length > 0 && (
            <div className="option-section">
              <button
                className={`option-section-header ${expandedSection === 'operator' ? 'expanded' : ''}`}
                onClick={() => toggleSection('operator')}
              >
                <span className="option-section-title">运营商</span>
                <span className="option-section-value">
                  {localSelected.operator
                    ? options.operators.find(o => o.id === localSelected.operator)?.name || localSelected.operator
                    : '请选择'}
                </span>
                {expandedSection === 'operator' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {expandedSection === 'operator' && (
                <div className="option-section-content">
                  {options.operators.map(op => (
                    <button
                      key={op.id}
                      className={`option-item ${localSelected.operator === op.id ? 'selected' : ''}`}
                      onClick={() => handleSelect('operator', op.id)}
                    >
                      {localSelected.operator === op.id && <Check size={14} />}
                      <span>{op.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Bands Section */}
          {options.bands && options.bands.length > 0 && (
            <div className="option-section">
              <button
                className={`option-section-header ${expandedSection === 'band' ? 'expanded' : ''}`}
                onClick={() => toggleSection('band')}
              >
                <span className="option-section-title">频段</span>
                <span className="option-section-value">
                  {localSelected.band || '请选择'}
                </span>
                {expandedSection === 'band' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {expandedSection === 'band' && (
                <div className="option-section-content">
                  {options.bands.map(band => (
                    <button
                      key={band}
                      className={`option-item ${localSelected.band === band ? 'selected' : ''}`}
                      onClick={() => handleSelect('band', band)}
                    >
                      {localSelected.band === band && <Check size={14} />}
                      <span>{band}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Months Section */}
          {formattedMonths.length > 0 && (
            <div className="option-section">
              <button
                className={`option-section-header ${expandedSection === 'month' ? 'expanded' : ''}`}
                onClick={() => toggleSection('month')}
              >
                <span className="option-section-title">月份</span>
                <span className="option-section-value">
                  {localSelected.month
                    ? formattedMonths.find(m => m.id === localSelected.month)?.name || localSelected.month
                    : '请选择'}
                </span>
                {expandedSection === 'month' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {expandedSection === 'month' && (
                <div className="option-section-content">
                  {formattedMonths.map(m => (
                    <button
                      key={m.id}
                      className={`option-item ${localSelected.month === m.id ? 'selected' : ''}`}
                      onClick={() => handleSelect('month', m.id)}
                    >
                      {localSelected.month === m.id && <Check size={14} />}
                      <span>{m.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="confirmation-footer">
          <button className="confirmation-btn cancel" onClick={handleCancel}>
            取消
          </button>
          <button className="confirmation-btn confirm" onClick={handleConfirm}>
            <Check size={14} />
            <span>确认查询</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(QueryConfirmationDialog);
