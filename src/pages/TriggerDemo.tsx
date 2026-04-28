import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db, type TransactionStep } from '@/lib/database';
import TransactionVisualizer from '@/components/TransactionVisualizer';
import SqlDisplay from '@/components/SqlDisplay';
import { AlertTriangle } from 'lucide-react';

const TriggerDemo: React.FC = () => {
  const queryClient = useQueryClient();
  const [steps, setSteps] = useState<TransactionStep[]>([]);
  const [txnStatus, setTxnStatus] = useState<'COMMITTED' | 'ROLLED BACK' | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: medicines = [] } = useQuery({
    queryKey: ['medicines'],
    queryFn: () => db.getMedicines(),
  });

  // Find the expired medicine from query data
  const expiredMed = medicines.find(
    m => m.expiry_date < new Date().toISOString().split('T')[0]
  );

  const handleTriggerDemo = useCallback(async () => {
    if (!expiredMed) return;
    setSteps([]);
    setTxnStatus(null);
    setError(null);
    setRunning(true);

    try {
      const result = await db.placeOrder(expiredMed.id, 1, (step) => {
        setSteps(prev => {
          const existing = prev.findIndex(s => s.sql === step.sql);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = step;
            return updated;
          }
          return [...prev, step];
        });
      });
      setTxnStatus(result.status);
      if (result.error) setError(result.error);
      // Refresh logs panel
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    } catch (e: any) {
      setError(e.message);
    }
    setRunning(false);
  }, [expiredMed, queryClient]);

  const triggerSql = `DELIMITER //
CREATE TRIGGER before_order_insert
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    DECLARE med_expiry DATE;
    SELECT expiry_date INTO med_expiry
    FROM medicines WHERE id = NEW.medicine_id;

    IF med_expiry < CURDATE() THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot order expired medicine';
    END IF;
END //
DELIMITER ;`;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
        <h1 className="font-sans text-2xl font-bold flex items-center gap-3 text-foreground">
          <AlertTriangle className="w-7 h-7 text-accent" /> Trigger Demonstration
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          A <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">BEFORE INSERT</code> trigger blocks orders for expired medicines.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-md p-5">
            <h2 className="font-sans font-semibold text-sm text-foreground mb-3">Trigger Definition</h2>
            <SqlDisplay sql={triggerSql} />
          </div>

          {expiredMed && (
            <div className="bg-card border border-border rounded-md p-5 space-y-3">
              <h2 className="font-sans font-semibold text-sm text-foreground">Test Expired Medicine</h2>
              <div className="bg-destructive/10 border border-destructive/20 rounded p-3 text-sm">
                <div className="flex items-center gap-2 status-rolled-back font-semibold mb-1">
                  <AlertTriangle className="w-4 h-4" /> {expiredMed.name}
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <div>Expired: <span className="status-rolled-back">{expiredMed.expiry_date}</span></div>
                  <div>Stock: {expiredMed.stock} | Price: ₹{expiredMed.price.toFixed(2)}</div>
                </div>
              </div>
              <button
                onClick={handleTriggerDemo}
                disabled={running}
                className="w-full bg-accent text-accent-foreground font-sans font-semibold text-sm py-2.5 rounded hover:bg-accent/90 transition-colors disabled:opacity-40"
              >
                {running ? 'Executing...' : 'Attempt Order (Trigger Will Fire)'}
              </button>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-md p-5 space-y-3">
          <h2 className="font-sans font-semibold text-sm text-foreground">Trigger Execution</h2>
          {steps.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Click the button to fire the trigger
              <span className="pulse-cursor ml-1 text-primary">▌</span>
            </div>
          ) : (
            <TransactionVisualizer steps={steps} status={txnStatus} />
          )}
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded p-3 text-xs status-rolled-back animate-fade-in-up">
              <strong>⚡ TRIGGER SIGNAL:</strong> {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TriggerDemo;
