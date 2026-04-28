import React, { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { db, type TransactionStep } from '@/lib/database';
import TransactionVisualizer from '@/components/TransactionVisualizer';
import { ShoppingCart, Plus, Minus, Trash2, ShieldCheck, ArrowRight, Activity, Info, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart, CartItem } from '@/contexts/CartContext';
import { toast } from 'sonner';

import imgParacetamol from '@/assets/medicine-paracetamol.jpg';
import imgAntibiotic from '@/assets/medicine-antibiotic.jpg';
import imgAntihistamine from '@/assets/medicine-antihistamine.jpg';
import imgAntacid from '@/assets/medicine-antacid.jpg';
import imgCough from '@/assets/medicine-cough.jpg';
import imgIbuprofen from '@/assets/medicine-ibuprofen.jpg';
import imgMetformin from '@/assets/medicine-metformin.jpg';
import imgAzithromycin from '@/assets/medicine-azithromycin.jpg';

const medicineImages: Record<number, string> = {
  1: imgParacetamol, 2: imgAntibiotic, 3: imgAntihistamine, 4: imgAntacid,
  5: imgCough, 6: imgIbuprofen, 7: imgMetformin, 8: imgAzithromycin,
};

interface TxnBlock {
  itemName: string; steps: TransactionStep[]; status: 'COMMITTED' | 'ROLLED BACK' | null; error: string | null;
}

const PlaceOrder: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { cart, addToCart, updateQuantity, removeFromCart, clearCart } = useCart();

  const { data: allMedicinesRaw = [] } = useQuery({
    queryKey: ['medicines'],
    queryFn: () => db.getMedicines(),
  });

  const allMedicines = allMedicinesRaw.filter(
    m => m.stock > 0 && new Date(m.expiry_date) >= new Date()
  );

  const [txnLog, setTxnLog] = useState<TxnBlock[]>([]);
  const [running, setRunning] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredMedicines = allMedicines.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddToCart = (m: any) => {
    addToCart(m);
    toast.success(`${m.name} added to cart`);
  };

  const cartSubtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const deliveryFee = cartSubtotal > 500 || cartSubtotal === 0 ? 0 : 40;
  const cartTotal = cartSubtotal + deliveryFee;

  const handlePlaceOrder = useCallback(async () => {
    if (cart.length === 0) return;
    setTxnLog([]); setRunning(true); setOrderComplete(false);

    const initialBlocks: TxnBlock[] = cart.map(item => ({
      itemName: item.name, steps: [], status: null, error: null,
    }));
    setTxnLog(initialBlocks);

    for (let i = 0; i < cart.length; i++) {
      const item = cart[i];
      try {
        const result = await db.placeOrder(item.medicineId, item.quantity, (step) => {
          setTxnLog(prev => {
            const updated = [...prev];
            const block = { ...updated[i], steps: [...updated[i].steps] };
            const existingIdx = block.steps.findIndex(s => s.sql === step.sql);
            if (existingIdx >= 0) block.steps[existingIdx] = step;
            else block.steps = [...block.steps, step];
            updated[i] = block;
            return updated;
          });
        });

        setTxnLog(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: result.status, error: result.error ?? null };
          return updated;
        });
      } catch (e: any) {
        setTxnLog(prev => {
          const updated = [...prev];
          updated[i] = { ...updated[i], status: 'ROLLED BACK', error: e.message };
          return updated;
        });
      }
    }

    queryClient.invalidateQueries({ queryKey: ['medicines'] });
    setRunning(false); setOrderComplete(true); clearCart();
  }, [cart, queryClient]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="flex items-center gap-2 mb-8">
        <button onClick={() => navigate('/')} className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors">
          Home
        </button>
        <span className="text-muted-foreground text-sm">/</span>
        <span className="text-sm font-semibold text-foreground">Secure Checkout</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: CART & ADD ITEMS */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Cart Section */}
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2 mb-6">
              <ShoppingCart className="w-5 h-5 text-primary" /> Your Cart
            </h2>

            {cart.length === 0 && !orderComplete && (
              <div className="text-center py-12 bg-secondary/30 rounded-xl border border-dashed border-border">
                <ShoppingCart className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-foreground font-semibold">Your cart is empty</p>
                <p className="text-sm text-muted-foreground mt-1">Search below to add medicines to your cart.</p>
              </div>
            )}

            {cart.length > 0 && (
              <div className="space-y-4">
                {cart.map(item => (
                  <div key={item.medicineId} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-background border border-border rounded-xl">
                    <div className="w-16 h-16 bg-white border border-border rounded-lg overflow-hidden shrink-0 p-1">
                      <img src={medicineImages[item.medicineId] || imgParacetamol} alt={item.name} className="w-full h-full object-contain" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground text-sm">{item.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">₹{item.price.toFixed(2)} / unit</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center bg-white border border-border rounded-lg">
                        <button onClick={() => updateQuantity(item.medicineId, -1)} disabled={running} className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-secondary rounded-l-lg transition-colors disabled:opacity-50">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.medicineId, 1)} disabled={running || item.quantity >= item.stock} className="w-8 h-8 flex items-center justify-center text-foreground hover:bg-secondary rounded-r-lg transition-colors disabled:opacity-50">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="w-20 text-right font-bold text-foreground">
                        ₹{(item.quantity * item.price).toFixed(2)}
                      </div>
                      <button onClick={() => removeFromCart(item.medicineId)} disabled={running} className="text-muted-foreground hover:text-destructive transition-colors p-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Add Section */}
          {!running && !orderComplete && (
            <div className="bg-white border border-border rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h3 className="font-bold text-foreground">Frequently Bought Together</h3>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Search medicines..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2">
                {filteredMedicines.slice(0, 8).map(m => {
                  const qty = cart.find(c => c.medicineId === m.id)?.quantity || 0;
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-3 border border-border rounded-xl hover:border-primary/50 transition-colors">
                      <img src={medicineImages[m.id] || imgParacetamol} className="w-10 h-10 object-contain rounded border border-border p-0.5" alt={m.name} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground">₹{m.price.toFixed(2)}</p>
                      </div>
                      <button 
                        onClick={() => handleAddToCart(m)}
                        disabled={qty >= m.stock}
                        className="text-[10px] font-bold bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                      >
                        ADD
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: SUMMARY & TERMINAL */}
        <div className="space-y-6">
          
          {/* Order Summary */}
          <div className="bg-white border border-border rounded-2xl p-6 shadow-sm sticky top-24">
            <h2 className="text-lg font-bold text-foreground mb-4">Order Summary</h2>
            
            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between text-muted-foreground">
                <span>Item Total</span>
                <span className="text-foreground font-medium">₹{cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span className="flex items-center gap-1">Delivery Fee <Info className="w-3 h-3"/></span>
                <span className="text-foreground font-medium">
                  {deliveryFee === 0 ? <span className="text-primary font-bold">FREE</span> : `₹${deliveryFee.toFixed(2)}`}
                </span>
              </div>
              <div className="border-t border-border pt-3 flex justify-between font-bold text-lg">
                <span>To Pay</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="bg-secondary/50 rounded-xl p-3 mb-6 flex items-start gap-2 border border-border text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p>Safe and secure payments. 100% Authentic products.</p>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={running || cart.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-foreground text-background font-bold py-3.5 rounded-xl hover:bg-primary hover:text-primary-foreground transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {running ? 'Processing...' : 'Proceed to Checkout'} <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Secure Transaction Terminal */}
          {txnLog.length > 0 && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-border relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary opacity-50"></div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Processing Gateway
              </h3>
              
              <div className="space-y-4">
                {txnLog.map((block, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-foreground">
                      <span>[{idx + 1}] {block.itemName}</span>
                      {block.status && (
                        <span className={`ml-auto px-1.5 py-0.5 rounded border ${
                          block.status === 'COMMITTED' ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-destructive/10 border-destructive/30 text-destructive'
                        }`}>
                          {block.status}
                        </span>
                      )}
                    </div>
                    <div className="bg-secondary/30 rounded-lg p-2 border border-border/50">
                      <TransactionVisualizer steps={block.steps} status={block.status} />
                    </div>
                    {block.error && block.status === 'ROLLED BACK' && (
                      <div className="text-[10px] text-destructive bg-destructive/10 p-2 rounded border border-destructive/20 font-mono mt-1">
                        FAIL: {block.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {orderComplete && (
                <div className={`mt-5 p-3 rounded-lg text-xs font-bold text-center border ${
                  txnLog.every(b => b.status === 'COMMITTED')
                    ? 'bg-primary/10 border-primary/20 text-primary'
                    : 'bg-amber-50 border-amber-200 text-amber-700'
                }`}>
                  {txnLog.every(b => b.status === 'COMMITTED')
                    ? '✓ Checkout Completed Successfully'
                    : '⚠ Order Partially Completed. Please review.'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaceOrder;
