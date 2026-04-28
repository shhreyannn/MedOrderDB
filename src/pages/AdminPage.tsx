import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db } from '@/lib/database';
import SqlDisplay from '@/components/SqlDisplay';
import { Terminal, RefreshCw } from 'lucide-react';

const AdminPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'logs' | 'orders' | 'stock' | 'schema'>('logs');

  const { data: logs = [] } = useQuery({
    queryKey: ['logs'],
    queryFn: () => db.getLogs(),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['orders'],
    queryFn: () => db.getOrders(),
  });

  const { data: medicines = [] } = useQuery({
    queryKey: ['medicines'],
    queryFn: () => db.getMedicines(),
  });

  const schema = db.getSchema();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['logs'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
    queryClient.invalidateQueries({ queryKey: ['medicines'] });
  };

  const tabs = [
    { id: 'logs'   as const, label: 'SQL Log', count: logs.length },
    { id: 'orders' as const, label: 'Orders',  count: orders.length },
    { id: 'stock'  as const, label: 'Stock',   count: medicines.length },
    { id: 'schema' as const, label: 'Schema' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-border">
        <h1 className="font-sans text-2xl font-bold flex items-center gap-3 text-foreground">
          <Terminal className="w-7 h-7 text-primary" /> Admin & SQL Console
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Internal database state, raw operation history, and schema management.
        </p>
      </div>

      <div className="flex items-center justify-between border-b border-border w-full">
        {/* Tabs */}
        <div className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.label}
              {t.count !== undefined && <span className="ml-1.5 bg-secondary rounded px-1.5 py-0.5 text-[10px]">{t.count}</span>}
            </button>
          ))}
        </div>
        
        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-secondary px-3 py-1.5 rounded mb-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* SQL Log */}
      {tab === 'logs' && (
        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No SQL operations yet</p>
          ) : (
            [...logs].reverse().map(log => (
              <div key={log.id} className={`flex items-start gap-3 text-xs py-2 px-3 border-b border-border/30 ${log.status === 'ERROR' ? 'bg-destructive/5' : ''}`}>
                <span className="text-muted-foreground shrink-0 w-[140px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className={`shrink-0 w-[90px] font-semibold uppercase ${
                  log.type === 'TRANSACTION' ? 'text-primary' :
                  log.type === 'TRIGGER'     ? 'text-accent' :
                  log.type === 'LOCK'        ? 'status-waiting' : 'text-foreground/60'
                }`}>{log.type}</span>
                <span className={`flex-1 font-mono ${log.status === 'ERROR' ? 'status-rolled-back' : 'text-foreground/80'}`}>{log.query}</span>
                <span className="text-muted-foreground shrink-0">{log.duration_ms}ms</span>
                <span className={`shrink-0 ${log.status === 'SUCCESS' ? 'status-committed' : 'status-rolled-back'}`}>
                  {log.status === 'SUCCESS' ? '✓' : '✗'}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Orders */}
      {tab === 'orders' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['ID', 'Medicine', 'Qty', 'Total (₹)', 'Date', 'Status', 'Failure Reason'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-muted-foreground text-sm">No orders yet</td></tr>
              ) : (
                orders.map(o => (
                  <tr key={o.id} className="border-b border-border/50">
                    <td className="py-2 px-3 text-muted-foreground">{o.id}</td>
                    <td className="py-2 px-3 text-foreground">{o.medicine_name}</td>
                    <td className="py-2 px-3 text-sql-number">{o.quantity}</td>
                    <td className="py-2 px-3 text-sql-number">{o.total_price.toFixed(2)}</td>
                    <td className="py-2 px-3 text-foreground/70">{new Date(o.order_date).toLocaleString()}</td>
                    <td className={`py-2 px-3 font-semibold ${o.status === 'COMPLETED' ? 'status-committed' : 'status-rolled-back'}`}>{o.status}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{o.failure_reason || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Stock */}
      {tab === 'stock' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['ID', 'Name', 'Stock', 'Price (₹)', 'Expiry'].map(h => (
                  <th key={h} className="text-left py-2 px-3 text-xs text-muted-foreground font-medium uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {medicines.map(m => (
                <tr key={m.id} className="border-b border-border/50">
                  <td className="py-2 px-3 text-muted-foreground">{m.id}</td>
                  <td className="py-2 px-3 text-foreground">{m.name}</td>
                  <td className={`py-2 px-3 font-mono font-bold ${m.stock === 0 ? 'status-rolled-back' : m.stock <= 10 ? 'status-pending' : 'status-committed'}`}>{m.stock}</td>
                  <td className="py-2 px-3 text-sql-number">{m.price.toFixed(2)}</td>
                  <td className="py-2 px-3 text-foreground/70">{m.expiry_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Schema */}
      {tab === 'schema' && <SqlDisplay sql={schema} />}
    </div>
  );
};

export default AdminPage;
