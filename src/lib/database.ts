// Simulated MySQL Database Engine
// Simulates a real MySQL database with transactions, triggers, locks, and logging.
// State (orders, SQL logs, stock levels) is persisted to localStorage.
// Export SimulatedDatabaseForTest to allow isolated instances in unit tests.

export interface Medicine {
  id: number;
  name: string;
  manufacturer: string;
  price: number;
  stock: number;
  expiry_date: string; // YYYY-MM-DD
  category: string;
}

export interface Order {
  id: number;
  medicine_id: number;
  medicine_name: string;
  quantity: number;
  total_price: number;
  order_date: string;
  status: 'COMPLETED' | 'FAILED';
  failure_reason?: string;
}

export interface SqlLog {
  id: number;
  timestamp: string;
  query: string;
  type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'TRANSACTION' | 'TRIGGER' | 'LOCK';
  duration_ms: number;
  affected_rows?: number;
  status: 'SUCCESS' | 'ERROR';
  error_message?: string;
}

export interface TransactionStep {
  sql: string;
  type: SqlLog['type'];
  status: 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'ERROR';
  result?: string;
  delay_ms: number;
}

export interface ConcurrencyResult {
  txn_id: string;
  steps: TransactionStep[];
  final_status: 'COMMITTED' | 'ROLLED BACK' | 'WAITING';
  lock_acquired: boolean;
  wait_time_ms: number;
}

type Listener = () => void;

const STORAGE_KEY = 'medorderdb_state';

interface PersistedState {
  orders: Order[];
  sqlLogs: SqlLog[];
  nextOrderId: number;
  nextLogId: number;
  /** Map of medicine_id -> current stock (overrides seeded data) */
  stockOverrides: Record<number, number>;
}

class SimulatedDatabase {
  private medicines: Medicine[] = [];
  private orders: Order[] = [];
  private sqlLogs: SqlLog[] = [];
  private nextOrderId = 1;
  private nextLogId = 1;
  private locks: Map<number, string> = new Map();
  private listeners: Set<Listener> = new Set();

  constructor() {
    this.initSampleData();
    this.loadFromStorage();
  }

  // ─── Pub/Sub ──────────────────────────────────────────────────────────────

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify() {
    this.persist();
    this.listeners.forEach(fn => fn());
  }

  // ─── Persistence ─────────────────────────────────────────────────────────

  private persist() {
    try {
      const stockOverrides: Record<number, number> = {};
      this.medicines.forEach(m => { stockOverrides[m.id] = m.stock; });
      const state: PersistedState = {
        orders: this.orders,
        sqlLogs: this.sqlLogs,
        nextOrderId: this.nextOrderId,
        nextLogId: this.nextLogId,
        stockOverrides,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage may be unavailable in some environments — fail silently
    }
  }

  private loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const state: PersistedState = JSON.parse(raw);
      this.orders = state.orders ?? [];
      this.sqlLogs = state.sqlLogs ?? [];
      this.nextOrderId = state.nextOrderId ?? 1;
      this.nextLogId = state.nextLogId ?? 1;
      // Apply stock overrides on top of seeded medicines
      if (state.stockOverrides) {
        this.medicines = this.medicines.map(m =>
          state.stockOverrides[m.id] !== undefined
            ? { ...m, stock: state.stockOverrides[m.id] }
            : m
        );
      }
    } catch {
      // Corrupted storage — start fresh
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /** Wipe all persisted state and re-seed. Useful for testing / manual reset. */
  resetToDefaults() {
    localStorage.removeItem(STORAGE_KEY);
    this.orders = [];
    this.sqlLogs = [];
    this.nextOrderId = 1;
    this.nextLogId = 1;
    this.locks.clear();
    this.initSampleData();
    this.notify();
  }

  // ─── Seed Data ────────────────────────────────────────────────────────────

  private initSampleData() {
    const today = new Date();
    const pastDate = new Date(today);
    pastDate.setMonth(pastDate.getMonth() - 2);
    const futureDate1 = new Date(today);
    futureDate1.setFullYear(futureDate1.getFullYear() + 1);
    const futureDate2 = new Date(today);
    futureDate2.setMonth(futureDate2.getMonth() + 6);
    const futureDate3 = new Date(today);
    futureDate3.setFullYear(futureDate3.getFullYear() + 2);

    this.medicines = [
      { id: 1, name: 'Paracetamol 500mg',  manufacturer: 'Sun Pharma',  price: 25.00, stock: 150, expiry_date: futureDate1.toISOString().split('T')[0], category: 'Analgesic' },
      { id: 2, name: 'Amoxicillin 250mg',  manufacturer: 'Cipla',       price: 85.50, stock: 75,  expiry_date: futureDate2.toISOString().split('T')[0], category: 'Antibiotic' },
      { id: 3, name: 'Cetirizine 10mg',    manufacturer: "Dr. Reddy's", price: 15.00, stock: 200, expiry_date: futureDate3.toISOString().split('T')[0], category: 'Antihistamine' },
      { id: 4, name: 'Omeprazole 20mg',    manufacturer: 'Lupin',       price: 42.00, stock: 5,   expiry_date: futureDate1.toISOString().split('T')[0], category: 'Antacid' },
      { id: 5, name: 'Cough Syrup',        manufacturer: 'PharmaCorp',  price: 60.00, stock: 30,  expiry_date: pastDate.toISOString().split('T')[0],    category: 'Cough' },
      { id: 6, name: 'Ibuprofen 400mg',    manufacturer: 'Mankind',     price: 18.00, stock: 0,   expiry_date: futureDate2.toISOString().split('T')[0], category: 'Analgesic' },
      { id: 7, name: 'Metformin 500mg',    manufacturer: 'USV',         price: 35.00, stock: 120, expiry_date: futureDate1.toISOString().split('T')[0], category: 'Antidiabetic' },
      { id: 8, name: 'Azithromycin 500mg', manufacturer: 'Alkem',       price: 95.00, stock: 45,  expiry_date: futureDate3.toISOString().split('T')[0], category: 'Antibiotic' },
    ];
  }

  // ─── Internal Logging ─────────────────────────────────────────────────────

  private log(
    type: SqlLog['type'],
    query: string,
    affectedRows?: number,
    status: SqlLog['status'] = 'SUCCESS',
    errorMessage?: string
  ): SqlLog {
    const entry: SqlLog = {
      id: this.nextLogId++,
      timestamp: new Date().toISOString(),
      query,
      type,
      duration_ms: Math.floor(Math.random() * 15) + 1,
      affected_rows: affectedRows,
      status,
      error_message: errorMessage,
    };
    this.sqlLogs.push(entry);
    return entry;
  }

  // ─── Public Read API ──────────────────────────────────────────────────────

  /**
   * Silent read — for UI rendering. Does NOT append to the SQL log.
   * Use this in React components to avoid log noise.
   */
  getMedicines(): Medicine[] {
    return JSON.parse(JSON.stringify(this.medicines));
  }

  /**
   * Logged read — appends a SELECT entry to the SQL log.
   * Use this only when triggered by an explicit user action.
   */
  queryMedicines(): Medicine[] {
    this.log('SELECT', 'SELECT id, name, manufacturer, price, stock, expiry_date, category FROM medicines ORDER BY id;', this.medicines.length);
    this.notify();
    return [...this.medicines];
  }

  getMedicine(id: number): Medicine | undefined {
    return this.medicines.find(m => m.id === id);
  }

  getOrders(): Order[] {
    return [...this.orders];
  }

  getLogs(): SqlLog[] {
    return [...this.sqlLogs];
  }

  getStockForMedicine(id: number): number {
    const m = this.medicines.find(m => m.id === id);
    return m ? m.stock : 0;
  }

  // ─── Immutable Stock Updater ──────────────────────────────────────────────

  private updateStock(medicineId: number, newStock: number) {
    this.medicines = this.medicines.map(m =>
      m.id === medicineId ? { ...m, stock: newStock } : m
    );
  }

  // ─── Transaction: Place Order ─────────────────────────────────────────────

  async placeOrder(
    medicineId: number,
    quantity: number,
    onStep?: (step: TransactionStep) => void
  ): Promise<{
    success: boolean;
    stockBefore: number;
    stockAfter: number;
    steps: TransactionStep[];
    status: 'COMMITTED' | 'ROLLED BACK';
    error?: string;
  }> {
    const medicine = this.medicines.find(m => m.id === medicineId);
    if (!medicine) throw new Error('Medicine not found');

    const stockBefore = medicine.stock;
    const steps: TransactionStep[] = [];

    const addStep = async (
      sql: string,
      type: SqlLog['type'],
      delay: number,
      execute: () => { success: boolean; result?: string; error?: string }
    ) => {
      const step: TransactionStep = { sql, type, status: 'PENDING', delay_ms: delay };
      steps.push(step);
      onStep?.({ ...step });

      await new Promise(r => setTimeout(r, 200));
      step.status = 'EXECUTING';
      onStep?.({ ...step });

      await new Promise(r => setTimeout(r, delay));
      const res = execute();
      step.status = res.success ? 'SUCCESS' : 'ERROR';
      step.result = res.result || res.error;
      onStep?.({ ...step });
      return res;
    };

    // START TRANSACTION
    await addStep('START TRANSACTION;', 'TRANSACTION', 300, () => {
      this.log('TRANSACTION', 'START TRANSACTION;');
      return { success: true, result: 'Transaction started' };
    });

    // SELECT FOR UPDATE (row-level lock)
    await addStep(
      `SELECT stock, expiry_date FROM medicines WHERE id = ${medicineId} FOR UPDATE;`,
      'LOCK', 500,
      () => {
        // Re-read medicine for current values after lock
        const m = this.medicines.find(m => m.id === medicineId)!;
        this.log('LOCK', `SELECT stock, expiry_date FROM medicines WHERE id = ${medicineId} FOR UPDATE;`, 1);
        this.locks.set(medicineId, 'txn_main');
        return { success: true, result: `Row locked. stock = ${m.stock}, expiry_date = '${m.expiry_date}'` };
      }
    );

    // TRIGGER CHECK — expired medicine
    const currentMed = this.medicines.find(m => m.id === medicineId)!;
    const today = new Date().toISOString().split('T')[0];

    if (currentMed.expiry_date < today) {
      await addStep(
        `-- TRIGGER: before_order_insert\n-- CHECK: medicine.expiry_date < CURDATE()`,
        'TRIGGER', 400,
        () => {
          const msg = `TRIGGER ERROR: Cannot order expired medicine '${currentMed.name}' (expired: ${currentMed.expiry_date})`;
          this.log('TRIGGER', `TRIGGER before_order_insert FIRED — BLOCKED expired medicine id=${medicineId}`, 0, 'ERROR', msg);
          return { success: false, error: msg };
        }
      );

      await addStep('ROLLBACK;', 'TRANSACTION', 300, () => {
        this.log('TRANSACTION', 'ROLLBACK; -- trigger violation');
        this.locks.delete(medicineId);
        return { success: true, result: 'Transaction rolled back due to trigger' };
      });

      this.orders = [
        ...this.orders,
        {
          id: this.nextOrderId++,
          medicine_id: medicineId,
          medicine_name: currentMed.name,
          quantity,
          total_price: currentMed.price * quantity,
          order_date: new Date().toISOString(),
          status: 'FAILED',
          failure_reason: 'Expired medicine — blocked by trigger',
        },
      ];
      this.notify();

      return { success: false, stockBefore, stockAfter: currentMed.stock, steps, status: 'ROLLED BACK', error: 'Trigger blocked: expired medicine' };
    }

    // CHECK STOCK
    if (currentMed.stock < quantity) {
      await addStep(
        `-- Stock check: ${currentMed.stock} < ${quantity}`,
        'SELECT', 200,
        () => {
          const msg = `Insufficient stock: available=${currentMed.stock}, requested=${quantity}`;
          this.log('SELECT', `-- Insufficient stock check failed`, 0, 'ERROR', msg);
          return { success: false, error: msg };
        }
      );

      await addStep('ROLLBACK;', 'TRANSACTION', 300, () => {
        this.log('TRANSACTION', 'ROLLBACK; -- insufficient stock');
        this.locks.delete(medicineId);
        return { success: true, result: 'Transaction rolled back' };
      });

      this.orders = [
        ...this.orders,
        {
          id: this.nextOrderId++,
          medicine_id: medicineId,
          medicine_name: currentMed.name,
          quantity,
          total_price: currentMed.price * quantity,
          order_date: new Date().toISOString(),
          status: 'FAILED',
          failure_reason: 'Insufficient stock',
        },
      ];
      this.notify();

      return { success: false, stockBefore, stockAfter: currentMed.stock, steps, status: 'ROLLED BACK', error: 'Insufficient stock' };
    }

    // INSERT ORDER
    const orderId = this.nextOrderId++;
    await addStep(
      `INSERT INTO orders (medicine_id, quantity, total_price, order_date, status)\nVALUES (${medicineId}, ${quantity}, ${(currentMed.price * quantity).toFixed(2)}, NOW(), 'COMPLETED');`,
      'INSERT', 400,
      () => {
        this.log('INSERT', `INSERT INTO orders VALUES (${orderId}, ${medicineId}, ${quantity}, ...);`, 1);
        return { success: true, result: `1 row inserted. order_id = ${orderId}` };
      }
    );

    // UPDATE STOCK (immutable)
    const newStock = currentMed.stock - quantity;
    await addStep(
      `UPDATE medicines SET stock = stock - ${quantity} WHERE id = ${medicineId};\n-- stock: ${currentMed.stock} → ${newStock}`,
      'UPDATE', 400,
      () => {
        this.updateStock(medicineId, newStock);
        this.log('UPDATE', `UPDATE medicines SET stock = ${newStock} WHERE id = ${medicineId};`, 1);
        return { success: true, result: `1 row updated. stock: ${stockBefore} → ${newStock}` };
      }
    );

    // COMMIT
    await addStep('COMMIT;', 'TRANSACTION', 300, () => {
      this.log('TRANSACTION', 'COMMIT;');
      this.locks.delete(medicineId);
      return { success: true, result: 'Transaction committed successfully' };
    });

    this.orders = [
      ...this.orders,
      {
        id: orderId,
        medicine_id: medicineId,
        medicine_name: currentMed.name,
        quantity,
        total_price: currentMed.price * quantity,
        order_date: new Date().toISOString(),
        status: 'COMPLETED',
      },
    ];
    this.notify();

    return { success: true, stockBefore, stockAfter: newStock, steps, status: 'COMMITTED' };
  }

  // ─── Concurrency Simulation ───────────────────────────────────────────────

  async simulateConcurrency(
    medicineId: number,
    onUpdate?: (results: ConcurrencyResult[]) => void
  ): Promise<ConcurrencyResult[]> {
    const medicine = this.medicines.find(m => m.id === medicineId);
    if (!medicine) throw new Error('Medicine not found');

    const originalStock = medicine.stock;
    const qty = Math.min(3, originalStock);

    if (qty === 0) throw new Error('No stock available for concurrency demo');

    const results: ConcurrencyResult[] = [
      { txn_id: 'TXN-A', steps: [], final_status: 'WAITING', lock_acquired: false, wait_time_ms: 0 },
      { txn_id: 'TXN-B', steps: [], final_status: 'WAITING', lock_acquired: false, wait_time_ms: 0 },
    ];

    const addStep = (idx: number, sql: string, type: SqlLog['type'], status: TransactionStep['status'], result?: string, delay = 300) => {
      results[idx].steps.push({ sql, type, status, result, delay_ms: delay });
      onUpdate?.([...results.map(r => ({ ...r, steps: [...r.steps] }))]);
    };

    // Both start
    addStep(0, 'START TRANSACTION;', 'TRANSACTION', 'SUCCESS', 'Transaction A started');
    addStep(1, 'START TRANSACTION;', 'TRANSACTION', 'SUCCESS', 'Transaction B started');
    await new Promise(r => setTimeout(r, 500));

    this.log('TRANSACTION', 'START TRANSACTION; -- TXN-A');
    this.log('TRANSACTION', 'START TRANSACTION; -- TXN-B');

    // TXN-A acquires lock
    const stockSnapshot = this.medicines.find(m => m.id === medicineId)!.stock;
    addStep(0, `SELECT stock FROM medicines WHERE id = ${medicineId} FOR UPDATE;`, 'LOCK', 'SUCCESS', `Lock ACQUIRED. stock = ${stockSnapshot}`);
    results[0].lock_acquired = true;
    onUpdate?.([...results.map(r => ({ ...r, steps: [...r.steps] }))]);
    await new Promise(r => setTimeout(r, 600));

    this.log('LOCK', `SELECT ... FOR UPDATE; -- TXN-A acquired row lock on medicine ${medicineId}`, 1);

    // TXN-B waits
    addStep(1, `SELECT stock FROM medicines WHERE id = ${medicineId} FOR UPDATE;`, 'LOCK', 'PENDING', '⏳ WAITING for TXN-A to release lock...');
    results[1].wait_time_ms = 2000;
    onUpdate?.([...results.map(r => ({ ...r, steps: [...r.steps] }))]);
    await new Promise(r => setTimeout(r, 800));

    this.log('LOCK', `SELECT ... FOR UPDATE; -- TXN-B WAITING (row locked by TXN-A)`, 0);

    // TXN-A: INSERT + UPDATE
    addStep(0, `INSERT INTO orders (medicine_id, quantity) VALUES (${medicineId}, ${qty});`, 'INSERT', 'SUCCESS', `order inserted, qty=${qty}`);
    await new Promise(r => setTimeout(r, 500));

    const currentStockA = this.medicines.find(m => m.id === medicineId)!.stock;
    const newStockA = currentStockA - qty;
    addStep(0, `UPDATE medicines SET stock = ${newStockA} WHERE id = ${medicineId};`, 'UPDATE', 'SUCCESS', `stock: ${currentStockA} → ${newStockA}`);
    this.updateStock(medicineId, newStockA);
    await new Promise(r => setTimeout(r, 500));

    this.log('INSERT', `INSERT INTO orders ... -- TXN-A`, 1);
    this.log('UPDATE', `UPDATE medicines SET stock = ${newStockA} -- TXN-A`, 1);

    // TXN-A commits
    addStep(0, 'COMMIT;', 'TRANSACTION', 'SUCCESS', '✓ Transaction A COMMITTED. Lock released.');
    results[0].final_status = 'COMMITTED';
    onUpdate?.([...results.map(r => ({ ...r, steps: [...r.steps] }))]);
    await new Promise(r => setTimeout(r, 600));

    this.log('TRANSACTION', 'COMMIT; -- TXN-A');

    // TXN-B now acquires lock
    const lastStepB = results[1].steps[results[1].steps.length - 1];
    const stockAfterA = this.medicines.find(m => m.id === medicineId)!.stock;
    lastStepB.status = 'SUCCESS';
    lastStepB.result = `Lock ACQUIRED (after wait). stock = ${stockAfterA}`;
    results[1].lock_acquired = true;
    onUpdate?.([...results.map(r => ({ ...r, steps: [...r.steps] }))]);
    await new Promise(r => setTimeout(r, 500));

    this.log('LOCK', `SELECT ... FOR UPDATE; -- TXN-B acquired lock (after TXN-A commit)`, 1);

    // TXN-B: proceed or rollback
    if (stockAfterA >= qty) {
      addStep(1, `INSERT INTO orders (medicine_id, quantity) VALUES (${medicineId}, ${qty});`, 'INSERT', 'SUCCESS', `order inserted, qty=${qty}`);
      await new Promise(r => setTimeout(r, 500));

      const newStockB = stockAfterA - qty;
      addStep(1, `UPDATE medicines SET stock = ${newStockB} WHERE id = ${medicineId};`, 'UPDATE', 'SUCCESS', `stock: ${stockAfterA} → ${newStockB}`);
      this.updateStock(medicineId, newStockB);
      await new Promise(r => setTimeout(r, 500));

      addStep(1, 'COMMIT;', 'TRANSACTION', 'SUCCESS', '✓ Transaction B COMMITTED.');
      results[1].final_status = 'COMMITTED';

      this.log('INSERT', `INSERT INTO orders ... -- TXN-B`, 1);
      this.log('UPDATE', `UPDATE medicines SET stock = ${newStockB} -- TXN-B`, 1);
      this.log('TRANSACTION', 'COMMIT; -- TXN-B');

      this.orders = [
        ...this.orders,
        { id: this.nextOrderId++, medicine_id: medicineId, medicine_name: medicine.name, quantity: qty, total_price: medicine.price * qty, order_date: new Date().toISOString(), status: 'COMPLETED' },
        { id: this.nextOrderId++, medicine_id: medicineId, medicine_name: medicine.name, quantity: qty, total_price: medicine.price * qty, order_date: new Date().toISOString(), status: 'COMPLETED' },
      ];
    } else {
      addStep(1, `-- Stock check: ${stockAfterA} < ${qty} — INSUFFICIENT`, 'SELECT', 'ERROR', 'Not enough stock after TXN-A');
      addStep(1, 'ROLLBACK;', 'TRANSACTION', 'SUCCESS', '✗ Transaction B ROLLED BACK.');
      results[1].final_status = 'ROLLED BACK';

      this.log('SELECT', `-- TXN-B stock check failed: ${stockAfterA} < ${qty}`, 0, 'ERROR');
      this.log('TRANSACTION', 'ROLLBACK; -- TXN-B');

      this.orders = [
        ...this.orders,
        { id: this.nextOrderId++, medicine_id: medicineId, medicine_name: medicine.name, quantity: qty, total_price: medicine.price * qty, order_date: new Date().toISOString(), status: 'COMPLETED' },
        { id: this.nextOrderId++, medicine_id: medicineId, medicine_name: medicine.name, quantity: qty, total_price: medicine.price * qty, order_date: new Date().toISOString(), status: 'FAILED', failure_reason: 'Insufficient stock after concurrent txn' },
      ];
    }

    onUpdate?.([...results.map(r => ({ ...r, steps: [...r.steps] }))]);
    this.notify();
    return results;
  }

  // ─── Schema ───────────────────────────────────────────────────────────────

  getSchema(): string {
    return `-- ============================================
-- Online Medicine Ordering System
-- MySQL Database Schema
-- ============================================

CREATE DATABASE IF NOT EXISTS medicine_ordering_db;
USE medicine_ordering_db;

-- Medicine table
CREATE TABLE medicines (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    name        VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(100) NOT NULL,
    price       DECIMAL(10,2) NOT NULL CHECK (price > 0),
    stock       INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
    expiry_date DATE NOT NULL,
    category    VARCHAR(50) NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    medicine_id  INT NOT NULL,
    quantity     INT NOT NULL CHECK (quantity > 0),
    total_price  DECIMAL(10,2) NOT NULL,
    order_date   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status       ENUM('COMPLETED','FAILED') NOT NULL,
    failure_reason VARCHAR(255),
    FOREIGN KEY (medicine_id) REFERENCES medicines(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Transaction log table
CREATE TABLE transaction_log (
    id          INT PRIMARY KEY AUTO_INCREMENT,
    query_text  TEXT NOT NULL,
    query_type  ENUM('SELECT','INSERT','UPDATE','DELETE',
                     'TRANSACTION','TRIGGER','LOCK') NOT NULL,
    exec_time   INT NOT NULL COMMENT 'milliseconds',
    affected_rows INT,
    status      ENUM('SUCCESS','ERROR') NOT NULL,
    error_msg   VARCHAR(255),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- TRIGGER: Block orders for expired medicines
-- ============================================
DELIMITER //
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
DELIMITER ;

-- ============================================
-- Sample Data
-- ============================================
INSERT INTO medicines (name, manufacturer, price, stock, expiry_date, category) VALUES
('Paracetamol 500mg',  'Sun Pharma',  25.00, 150, '2027-01-15', 'Analgesic'),
('Amoxicillin 250mg',  'Cipla',       85.50,  75, '2026-08-20', 'Antibiotic'),
('Cetirizine 10mg',    "Dr. Reddy\\'s", 15.00, 200, '2028-03-10', 'Antihistamine'),
('Omeprazole 20mg',    'Lupin',       42.00,   5, '2027-01-15', 'Antacid'),
('Expired Cough Syrup','PharmaCorp',  60.00,  30, '2024-12-01', 'Cough'),
('Ibuprofen 400mg',    'Mankind',     18.00,   0, '2026-08-20', 'Analgesic'),
('Metformin 500mg',    'USV',         35.00, 120, '2027-01-15', 'Antidiabetic'),
('Azithromycin 500mg', 'Alkem',       95.00,  45, '2028-03-10', 'Antibiotic');`;
  }
}

// Singleton instance used by the application
export const db = new SimulatedDatabase();

// Named export for unit tests — allows creating fresh isolated instances
export { SimulatedDatabase as SimulatedDatabaseForTest };
