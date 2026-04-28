import React from 'react';

interface SqlDisplayProps {
  sql: string;
  compact?: boolean;
}

const keywords = ['SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'CREATE', 'TABLE', 'DATABASE', 'DROP', 'ALTER', 'INDEX', 'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'NOT', 'NULL', 'DEFAULT', 'AUTO_INCREMENT', 'CHECK', 'UNIQUE', 'IF', 'EXISTS', 'USE', 'START', 'TRANSACTION', 'COMMIT', 'ROLLBACK', 'FOR', 'ORDER', 'BY', 'ASC', 'DESC', 'AND', 'OR', 'ON', 'IN', 'AS', 'INT', 'VARCHAR', 'DECIMAL', 'DATE', 'TIMESTAMP', 'ENUM', 'TEXT', 'COMMENT', 'TRIGGER', 'BEFORE', 'AFTER', 'EACH', 'ROW', 'BEGIN', 'END', 'DECLARE', 'SIGNAL', 'SQLSTATE', 'MESSAGE_TEXT', 'DELIMITER', 'RESTRICT', 'CASCADE', 'CURDATE', 'NOW'];

export const SqlDisplay: React.FC<SqlDisplayProps> = ({ sql, compact = false }) => {
  const highlightSql = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // Comment lines
      if (line.trim().startsWith('--')) {
        return <div key={i} className="sql-comment">{line}</div>;
      }
      // Tokenize
      const tokens = line.split(/(\b|\s+|[(),;='"])/g).filter(Boolean);
      return (
        <div key={i}>
          {tokens.map((token, j) => {
            if (keywords.includes(token.toUpperCase())) {
              return <span key={j} className="sql-keyword">{token}</span>;
            }
            if (/^\d+(\.\d+)?$/.test(token)) {
              return <span key={j} className="sql-number">{token}</span>;
            }
            if (/^'[^']*'$/.test(token)) {
              return <span key={j} className="sql-string">{token}</span>;
            }
            return <span key={j}>{token}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <pre className={`terminal-block ${compact ? 'text-xs p-2' : 'text-sm'} whitespace-pre-wrap`}>
      <code>{highlightSql(sql)}</code>
    </pre>
  );
};

export default SqlDisplay;
