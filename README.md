# MedOrderDB: Educational E-Commerce Pharmacy & DBMS Simulator

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Vitest](https://img.shields.io/badge/-Vitest-729B1B?style=for-the-badge&logo=vitest&logoColor=white)

**MedOrderDB** is a fully functional, professional-grade e-commerce pharmacy storefront wrapped around an intricate, purely local **Relational Database Management System (DBMS) Simulator**. 

Built entirely in React and TypeScript, it operates locally within the browser, demonstrating complex backend database concepts—such as ACID transactions, row-level concurrency locking, and triggers—through a sleek, modern UI.

---

## 🎯 Project Objective

The primary goal of this project is to bridge the gap between abstract backend theory and practical frontend execution. It proves that you can visualize complex backend database behaviors (like rollbacks, deadlocks, and triggers) natively in the browser while maintaining a premium, consumer-facing design.

## ✨ Key Features

### 1. The Premium Storefront
*   **Clinical Theme & Layout:** A modern, fully responsive UI modeled after industry-leading online pharmacies.
*   **Global Cart State:** Search, filter, and add medical products to your cart via a global React Context.
*   **Secure Checkout Terminal:** A real-time, terminal-like visualizer during checkout that exposes exactly what SQL transactions are occurring under the hood.

### 2. The DBMS Simulation Engine
Under the hood, `src/lib/database.ts` acts as a mock MySQL engine, persistently storing data in `localStorage`. It simulates:
*   **ACID Transactions:** Full support for `COMMIT` and `ROLLBACK` states.
*   **Concurrency Control (Row-Level Locking):** Demonstrates `SELECT ... FOR UPDATE` locks when multiple simulated clients attempt to buy the same limited stock.
*   **Triggers:** A simulated `BEFORE INSERT` trigger that automatically intercepts and blocks the sale of expired medicines.

### 3. Developer & Debug Tools
Tucked away in a dedicated "Dev Tools" dropdown, the application features an administrative suite:
*   **Trigger Demo:** A dedicated interface to forcefully test the expiry-date trigger.
*   **Concurrency Demo:** A split-pane tool to race two transactions against each other and observe deadlock/queueing behavior.
*   **Admin Console:** View raw SQL operation logs, schema definitions, and current database stock/order states.

---

## 🛠️ Architecture & Tech Stack

*   **Frontend Framework:** React 18, TypeScript, Vite
*   **Styling:** Tailwind CSS, shadcn/ui, Lucide React
*   **State & Data Fetching:** TanStack React Query v5, React Context API
*   **Testing:** Vitest (22+ unit tests validating the DBMS engine logic)
*   **Persistence:** HTML5 `localStorage`

## 🚀 Getting Started

### Prerequisites
*   Node.js 18+ and npm

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to the project directory
cd MedOrderDB-main

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:8080` (or `http://localhost:5173`).

---

## 🧪 Running the Test Suite

The simulation engine's logic (transactions, concurrency locks, triggers) is heavily tested. To run the suite:

```bash
npm run test
```
*Note: Some concurrency tests simulate artificial latency and may take a few seconds to resolve.*

---

## 📁 Project Structure

```text
src/
├── assets/          # Medical product images and static assets
├── components/      # Reusable UI components (AppLayout, Terminal Visualizer)
├── contexts/        # Global React Contexts (CartContext)
├── lib/             # Core Database Simulation Engine (database.ts)
├── pages/           # Application views (Storefront, Checkout, Admin, Demos)
└── test/            # Vitest unit test suite (database.test.ts)
```

## 📄 License
This project is open source and available under the MIT License.
