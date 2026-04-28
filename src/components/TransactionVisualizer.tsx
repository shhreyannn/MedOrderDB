import React from 'react';
import type { TransactionStep } from '@/lib/database';

interface TransactionVisualizerProps {
  steps: TransactionStep[];
  status?: 'COMMITTED' | 'ROLLED BACK' | null;
}

const statusIcon = (s: TransactionStep['status']) => {
  switch (s) {
    case 'PENDING': return '○';
    case 'EXECUTING': return '◉';
    case 'SUCCESS': return '✓';
    case 'ERROR': return '✗';
  }
};

const statusColor = (s: TransactionStep['status']) => {
  switch (s) {
    case 'PENDING': return 'text-muted-foreground';
    case 'EXECUTING': return 'status-pending';
    case 'SUCCESS': return 'status-committed';
    case 'ERROR': return 'status-rolled-back';
  }
};

export const TransactionVisualizer: React.FC<TransactionVisualizerProps> = ({ steps, status }) => {
  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div key={i} className={`animate-fade-in-up border-l-2 pl-3 py-1 ${
          step.status === 'ERROR' ? 'border-destructive' :
          step.status === 'SUCCESS' ? 'border-primary' :
          step.status === 'EXECUTING' ? 'border-accent' : 'border-border'
        }`}>
          <div className="flex items-start gap-2">
            <span className={`${statusColor(step.status)} font-bold text-sm mt-0.5`}>
              {statusIcon(step.status)}
              {step.status === 'EXECUTING' && <span className="pulse-cursor ml-1">▌</span>}
            </span>
            <div className="flex-1 min-w-0">
              <pre className="text-xs whitespace-pre-wrap font-mono text-foreground/80">{step.sql}</pre>
              {step.result && (
                <p className={`text-xs mt-1 ${step.status === 'ERROR' ? 'status-rolled-back' : 'text-muted-foreground'}`}>
                  → {step.result}
                </p>
              )}
            </div>
            <span className="text-xs text-muted-foreground shrink-0">{step.delay_ms}ms</span>
          </div>
        </div>
      ))}
      {status && (
        <div className={`mt-3 p-3 rounded-md border text-center font-sans font-semibold text-sm ${
          status === 'COMMITTED'
            ? 'bg-primary/10 border-primary/30 status-committed glow-green'
            : 'bg-destructive/10 border-destructive/30 status-rolled-back'
        }`}>
          Transaction {status}
        </div>
      )}
    </div>
  );
};

export default TransactionVisualizer;
