import React, { useState, useCallback } from 'react';
import { Copy, Check, Code2 } from 'lucide-react';

function SqlBlock({ sql }) {
  const [sqlCopied, setSqlCopied] = useState(false);

  const handleSqlCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(sql);
      setSqlCopied(true);
      setTimeout(() => setSqlCopied(false), 2000);
    } catch (err) {
      // Silently fail - clipboard may not be available
    }
  }, [sql]);

  return (
    <div className="structured-sql">
      <div className="sql-header">
        <Code2 size={14} />
        <span>SQL 查询</span>
        <button
          className="sql-copy-btn"
          onClick={handleSqlCopy}
          aria-label={sqlCopied ? '已复制' : '复制SQL'}
          title={sqlCopied ? '已复制' : '复制SQL'}
        >
          {sqlCopied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
      <pre className="sql-content">{sql}</pre>
    </div>
  );
}

export default SqlBlock;
