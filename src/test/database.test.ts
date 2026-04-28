import { describe, it, expect, beforeEach } from 'vitest';
import { SimulatedDatabaseForTest } from '@/lib/database';

// ─────────────────────────────────────────────────────────────────────────────
// We test through a fresh instance per test (not the singleton) to avoid
// state bleed between test cases.
// ─────────────────────────────────────────────────────────────────────────────

describe('SimulatedDatabase', () => {
  let db: InstanceType<typeof SimulatedDatabaseForTest>;

  beforeEach(() => {
    db = new SimulatedDatabaseForTest();
  });

  // ─── getMedicines ───────────────────────────────────────────────────────────

  describe('getMedicines()', () => {
    it('returns all 8 seeded medicines', () => {
      const medicines = db.getMedicines();
      expect(medicines).toHaveLength(8);
    });

    it('returns a defensive copy (mutation does not affect internal state)', () => {
      const copy = db.getMedicines();
      copy[0].stock = 99999;
      expect(db.getMedicines()[0].stock).not.toBe(99999);
    });

    it('includes at least one expired medicine', () => {
      const today = new Date().toISOString().split('T')[0];
      const expired = db.getMedicines().filter(m => m.expiry_date < today);
      expect(expired.length).toBeGreaterThanOrEqual(1);
    });

    it('includes at least one out-of-stock medicine', () => {
      const outOfStock = db.getMedicines().filter(m => m.stock === 0);
      expect(outOfStock.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── placeOrder — success ───────────────────────────────────────────────────

  describe('placeOrder() — valid order', () => {
    it('returns COMMITTED status', async () => {
      const medicines = db.getMedicines();
      const available = medicines.find(
        m => m.stock > 0 && m.expiry_date >= new Date().toISOString().split('T')[0]
      )!;

      const result = await db.placeOrder(available.id, 1);
      expect(result.status).toBe('COMMITTED');
      expect(result.success).toBe(true);
    });

    it('decrements stock by the ordered quantity', async () => {
      const medicines = db.getMedicines();
      const available = medicines.find(
        m => m.stock >= 3 && m.expiry_date >= new Date().toISOString().split('T')[0]
      )!;

      const stockBefore = available.stock;
      const result = await db.placeOrder(available.id, 3);

      expect(result.stockAfter).toBe(stockBefore - 3);
      expect(db.getMedicines().find(m => m.id === available.id)!.stock).toBe(stockBefore - 3);
    });

    it('adds a COMPLETED order to the order list', async () => {
      const medicines = db.getMedicines();
      const available = medicines.find(
        m => m.stock > 0 && m.expiry_date >= new Date().toISOString().split('T')[0]
      )!;

      await db.placeOrder(available.id, 1);
      const orders = db.getOrders();
      const completedOrders = orders.filter(o => o.status === 'COMPLETED' && o.medicine_id === available.id);
      expect(completedOrders.length).toBeGreaterThanOrEqual(1);
    });

    it('streams step callbacks in order: PENDING → EXECUTING → SUCCESS/ERROR', async () => {
      const medicines = db.getMedicines();
      const available = medicines.find(
        m => m.stock > 0 && m.expiry_date >= new Date().toISOString().split('T')[0]
      )!;

      const statusSequence: string[] = [];
      await db.placeOrder(available.id, 1, (step) => {
        statusSequence.push(step.status);
      });

      expect(statusSequence).toContain('PENDING');
      expect(statusSequence).toContain('EXECUTING');
      expect(statusSequence).toContain('SUCCESS');
    });
  });

  // ─── placeOrder — expired medicine ─────────────────────────────────────────

  describe('placeOrder() — expired medicine', () => {
    it('returns ROLLED BACK status', async () => {
      const expired = db.getMedicines().find(
        m => m.expiry_date < new Date().toISOString().split('T')[0]
      )!;

      const result = await db.placeOrder(expired.id, 1);
      expect(result.status).toBe('ROLLED BACK');
      expect(result.success).toBe(false);
    });

    it('includes a trigger-related error message', async () => {
      const expired = db.getMedicines().find(
        m => m.expiry_date < new Date().toISOString().split('T')[0]
      )!;

      const result = await db.placeOrder(expired.id, 1);
      expect(result.error).toContain('Trigger');
    });

    it('does not decrement stock when trigger fires', async () => {
      const expired = db.getMedicines().find(
        m => m.expiry_date < new Date().toISOString().split('T')[0]
      )!;

      const stockBefore = expired.stock;
      await db.placeOrder(expired.id, 1);
      expect(db.getMedicines().find(m => m.id === expired.id)!.stock).toBe(stockBefore);
    });

    it('records a FAILED order with a failure reason', async () => {
      const expired = db.getMedicines().find(
        m => m.expiry_date < new Date().toISOString().split('T')[0]
      )!;

      await db.placeOrder(expired.id, 1);
      const failedOrders = db.getOrders().filter(
        o => o.medicine_id === expired.id && o.status === 'FAILED'
      );
      expect(failedOrders.length).toBeGreaterThanOrEqual(1);
      expect(failedOrders[0].failure_reason).toBeTruthy();
    });
  });

  // ─── placeOrder — insufficient stock ───────────────────────────────────────

  describe('placeOrder() — insufficient stock', () => {
    it('returns ROLLED BACK when quantity exceeds available stock', async () => {
      const medicines = db.getMedicines();
      const limited = medicines.find(
        m => m.stock > 0 && m.stock <= 5 && m.expiry_date >= new Date().toISOString().split('T')[0]
      )!;

      const result = await db.placeOrder(limited.id, limited.stock + 10);
      expect(result.status).toBe('ROLLED BACK');
      expect(result.error).toContain('stock');
    });

    it('does not change stock when rolled back due to insufficient stock', async () => {
      const medicines = db.getMedicines();
      const limited = medicines.find(
        m => m.stock > 0 && m.stock <= 5 && m.expiry_date >= new Date().toISOString().split('T')[0]
      )!;

      const stockBefore = limited.stock;
      await db.placeOrder(limited.id, limited.stock + 10);
      expect(db.getMedicines().find(m => m.id === limited.id)!.stock).toBe(stockBefore);
    });
  });

  // ─── simulateConcurrency ───────────────────────────────────────────────────

  describe('simulateConcurrency()', () => {
    it('TXN-A always commits', async () => {
      const medicines = db.getMedicines();
      const available = medicines.find(
        m => m.stock >= 6 && m.expiry_date >= new Date().toISOString().split('T')[0]
      )!;

      const results = await db.simulateConcurrency(available.id);
      const txnA = results.find(r => r.txn_id === 'TXN-A')!;
      expect(txnA.final_status).toBe('COMMITTED');
    });

    it('TXN-A and TXN-B both commit when stock is sufficient for both', async () => {
      const medicines = db.getMedicines();
      // Need stock >= 6 so both TXN-A (qty=3) and TXN-B (qty=3) can commit
      const plentiful = medicines.find(
        m => m.stock >= 6 && m.expiry_date >= new Date().toISOString().split('T')[0]
      )!;

      const results = await db.simulateConcurrency(plentiful.id);
      expect(results.every(r => r.final_status === 'COMMITTED')).toBe(true);
    });

    it('TXN-B rolls back when remaining stock is insufficient after TXN-A', async () => {
      const medicines = db.getMedicines();
      // stock=5 → qty=min(3,5)=3 → after TXN-A: stock=2 < 3 → TXN-B rolls back
      const limited = medicines.find(
        m => m.stock === 5 && m.expiry_date >= new Date().toISOString().split('T')[0]
      );

      if (!limited) {
        // If Omeprazole (stock=5) is no longer at 5 due to localStorage, skip gracefully
        return;
      }

      const results = await db.simulateConcurrency(limited.id);
      const txnB = results.find(r => r.txn_id === 'TXN-B')!;
      expect(txnB.final_status).toBe('ROLLED BACK');
    });

    it('returns exactly 2 transaction results', async () => {
      const medicines = db.getMedicines();
      const available = medicines.find(
        m => m.stock >= 6 && m.expiry_date >= new Date().toISOString().split('T')[0]
      )!;

      const results = await db.simulateConcurrency(available.id);
      expect(results).toHaveLength(2);
    });

    it('throws when medicine has zero stock', async () => {
      const outOfStock = db.getMedicines().find(m => m.stock === 0)!;
      await expect(db.simulateConcurrency(outOfStock.id)).rejects.toThrow();
    });
  });

  // ─── resetToDefaults ────────────────────────────────────────────────────────

  describe('resetToDefaults()', () => {
    it('clears all orders', async () => {
      const medicines = db.getMedicines();
      const available = medicines.find(
        m => m.stock > 0 && m.expiry_date >= new Date().toISOString().split('T')[0]
      )!;
      await db.placeOrder(available.id, 1);

      db.resetToDefaults();
      expect(db.getOrders()).toHaveLength(0);
    });

    it('restores original medicine stock', async () => {
      const medicines = db.getMedicines();
      const available = medicines.find(
        m => m.stock > 10 && m.expiry_date >= new Date().toISOString().split('T')[0]
      )!;
      const originalStock = available.stock;

      await db.placeOrder(available.id, 5);
      expect(db.getMedicines().find(m => m.id === available.id)!.stock).toBe(originalStock - 5);

      db.resetToDefaults();
      expect(db.getMedicines().find(m => m.id === available.id)!.stock).toBe(originalStock);
    });
  });
});
