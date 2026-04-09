import React, { useState, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';
import { useI18n } from '../i18n';
import './CodeBlock.css';

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);
  const { t } = useI18n();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [code]);

  return (
    <div className="code-block">
      <div className="code-header">
        <span className="code-lang">{language}</span>
        <button className="code-copy-btn" onClick={handleCopy}>
          {copied ? (
            <>
              <Check size={12} />
              <span>{t('copied') || '已复制'}</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>{t('copy') || '复制'}</span>
            </>
          )}
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: '13px',
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

export default React.memo(CodeBlock);
