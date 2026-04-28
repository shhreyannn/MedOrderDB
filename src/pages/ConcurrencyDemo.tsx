import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db, type ConcurrencyResult } from '@/lib/database';
import { Layers } from 'lucide-react';

const ConcurrencyDemo: React.FC = () => {
  const queryClient = useQueryClient();
  const [results, setResults] = useState<ConcurrencyResult[] | null>(null);
  const [running, setRunning] = useState(false);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);

  const { data: medicines = [] } = useQuery({
    queryKey: ['medicines'],
    queryFn: () => db.getMedicines(),
  });

  const availableMedicines = medicines.filter(
    m => m.stock > 0 && m.expiry_date >= new Date().toISOString().split('T')[0]
  );

  const handleSimulate = useCallback(async () => {
    if (!selectedId) return;
    setResults(null);
    setError(null);
    setRunning(true);

    try {
      const res = await db.simulateConcurrency(Number(selectedId), (updated) => {
        setResults([...updated]);
      });
      setResults(res);
      // Refresh stock across all pages after simulation mutates it
      queryClient.invalidateQueries({ queryKey: ['medicines'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['logs'] });
    } catch (e: any) {
      setError(e.message);
    }
    setRunning(false);
  }, [selectedId, queryClient]);

  const statusBadge = (status: ConcurrencyResult['final_status']) => {
    const cls = status === 'COMMITTED'   ? 'status-committed bg-primary/10 border-primary/30'
      : status === 'ROLLED BACK'         ? 'status-rolled-back bg-destructive/10 border-destructive/30'
      : 'status-waiting bg-status-waiting/10 border-status-waiting/30';
    return <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${cls}`}>{status}</span>;
  };

  const stepStatusColor = (s: string) => {
    if (s === 'SUCCESS') return 'status-committed';
    if (s === 'ERROR')   return 'status-rolled-back';
    if (s === 'PENDING') return 'status-pending';
    return 'status-waiting';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
        <h1 className="font-sans text-2xl font-bold flex items-center gap-3 text-foreground">
          <Layers className="w-7 h-7 text-status-waiting" /> Concurrency Demonstration
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Two transactions compete for the same row — <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">SELECT ... FOR UPDATE</code> creates a row-level lock
        </p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-muted-foreground mb-1">Medicine to order concurrently</label>
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value ? Number(e.target.value) : '')}
              className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={running}
            >
              <option value="">-- Select --</option>
              {availableMedicines.map(m => (
                <option key={m.id} value={m.id}>{m.name} (stock: {m.stock})</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleSimulate}
            disabled={running || !selectedId}
            className="bg-status-waiting text-primary-foreground font-sans font-semibold text-sm px-6 py-2.5 rounded hover:opacity-90 transition-colors disabled:opacity-40"
          >
            {running ? 'Simulating...' : 'Simulate Concurrent Orders'}
          </button>
        </div>
        {error && <div className="text-xs status-rolled-back">{error}</div>}
      </div>

      {results && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {results.map((r) => (
            <div key={r.txn_id} className="bg-card border border-border rounded-md p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-sans font-semibold text-sm text-foreground">{r.txn_id}</h2>
                {statusBadge(r.final_status)}
              </div>
              {r.wait_time_ms > 0 && (
                <div className="text-xs status-pending">⏳ Waited {r.wait_time_ms}ms for lock</div>
              )}
              <div className="space-y-1.5">
                {r.steps.map((step, i) => (
                  <div key={i} className={`animate-slide-in text-xs border-l-2 pl-2 py-1 ${
                    step.status === 'ERROR'   ? 'border-destructive' :
                    step.status === 'SUCCESS' ? 'border-primary' :
                    step.status === 'PENDING' ? 'border-accent' : 'border-border'
                  }`}>
                    <pre className="whitespace-pre-wrap text-foreground/80">{step.sql}</pre>
                    {step.result && (
                      <div className={`mt-0.5 ${stepStatusColor(step.status)}`}>→ {step.result}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border border-border rounded-md p-5">
        <h3 className="font-sans font-semibold text-sm text-foreground mb-2">How It Works</h3>
        <div className="text-xs text-muted-foreground space-y-1">
          <p>1. Both transactions start with <code className="text-primary">START TRANSACTION</code></p>
          <p>2. TXN-A executes <code className="text-primary">SELECT ... FOR UPDATE</code> first → acquires <strong>exclusive row lock</strong></p>
          <p>3. TXN-B tries the same → <span className="status-pending">BLOCKED</span>, waits for lock release</p>
          <p>4. TXN-A completes its INSERT + UPDATE → <code className="text-primary">COMMIT</code> → lock released</p>
          <p>5. TXN-B acquires lock → reads <em>updated</em> stock → proceeds or rolls back if insufficient</p>
        </div>
      </div>
    </div>
  );
};

export default ConcurrencyDemo;
