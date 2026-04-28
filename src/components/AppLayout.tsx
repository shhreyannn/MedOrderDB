import React, { useState } from 'react';
import { NavLink as RouterNavLink, useLocation } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, Phone, Mail, ChevronDown, Activity, Terminal, Layers, AlertTriangle } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [devToolsOpen, setDevToolsOpen] = useState(false);
  const location = useLocation();
  const { cartCount } = useCart();

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background">
      {/* Top Offer Strip */}
      <div className="bg-primary text-primary-foreground py-1.5 text-center text-xs font-medium tracking-wide">
        Free Delivery on orders above ₹500 | Use code <span className="font-bold">HEALTH15</span> for 15% off
      </div>

      {/* Main Header */}
      <header className="bg-white border-b border-border sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo */}
            <RouterNavLink to="/" className="flex items-center gap-2.5 group">
              <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl leading-none text-foreground tracking-tight">
                  Med<span className="text-primary">Order</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  Pharmacy
                </span>
              </div>
            </RouterNavLink>

            {/* Main Nav */}
            <nav className="hidden md:flex items-center gap-6">
              <RouterNavLink
                to="/"
                className={({ isActive }) =>
                  `text-sm font-semibold transition-colors ${
                    isActive ? 'text-primary' : 'text-foreground/70 hover:text-primary'
                  }`
                }
              >
                Medicines
              </RouterNavLink>
              
              <RouterNavLink
                to="/order"
                className={({ isActive }) =>
                  `text-sm font-semibold transition-colors ${
                    isActive ? 'text-primary' : 'text-foreground/70 hover:text-primary'
                  }`
                }
              >
                Order
              </RouterNavLink>

              {/* Developer Tools Dropdown */}
              <div className="relative group">
                <button
                  onMouseEnter={() => setDevToolsOpen(true)}
                  onMouseLeave={() => setDevToolsOpen(false)}
                  className={`flex items-center gap-1 text-sm font-semibold transition-colors ${
                    ['/trigger', '/concurrency', '/admin'].includes(location.pathname)
                      ? 'text-accent'
                      : 'text-foreground/70 hover:text-accent'
                  }`}
                >
                  Dev Tools <ChevronDown className="w-4 h-4" />
                </button>

                {devToolsOpen && (
                  <div
                    onMouseEnter={() => setDevToolsOpen(true)}
                    onMouseLeave={() => setDevToolsOpen(false)}
                    className="absolute top-full right-0 pt-2 w-48 z-50 animate-fade-in-up"
                  >
                    <div className="bg-white rounded-xl shadow-lg border border-border py-2">
                      <RouterNavLink to="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-foreground/80 hover:bg-secondary hover:text-primary transition-colors">
                        <Terminal className="w-4 h-4" /> SQL Log & Admin
                      </RouterNavLink>
                      <RouterNavLink to="/concurrency" className="flex items-center gap-2 px-4 py-2 text-sm text-foreground/80 hover:bg-secondary hover:text-primary transition-colors">
                        <Layers className="w-4 h-4" /> Concurrency Demo
                      </RouterNavLink>
                      <RouterNavLink to="/trigger" className="flex items-center gap-2 px-4 py-2 text-sm text-foreground/80 hover:bg-secondary hover:text-primary transition-colors">
                        <AlertTriangle className="w-4 h-4" /> Trigger Demo
                      </RouterNavLink>
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <RouterNavLink
                to="/order"
                className="relative flex items-center justify-center w-10 h-10 rounded-full hover:bg-secondary transition-colors text-foreground"
              >
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute top-0 right-0 -mt-1 -mr-1 flex items-center justify-center w-5 h-5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </RouterNavLink>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>

      {/* Professional Footer */}
      <footer className="bg-white border-t border-border mt-12 pt-12 pb-6">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <span className="font-bold text-lg text-foreground tracking-tight">
                  Med<span className="text-primary">Order</span>
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Your trusted digital pharmacy. We ensure 100% genuine medicines, fast delivery, and secure transactions.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold text-foreground mb-4">Categories</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><span className="hover:text-primary cursor-pointer transition-colors">Analgesics</span></li>
                <li><span className="hover:text-primary cursor-pointer transition-colors">Antibiotics</span></li>
                <li><span className="hover:text-primary cursor-pointer transition-colors">Antihistamines</span></li>
                <li><span className="hover:text-primary cursor-pointer transition-colors">Antidiabetics</span></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Contact Us</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> 1800-123-4567</li>
                <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> support@medorder.com</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Trust & Safety</h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg border border-border">
                <ShieldCheck className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-semibold text-foreground">100% Secure</p>
                  <p className="text-xs">ACID Compliant</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()} MedOrder Pharmacy. All rights reserved.
            </p>
            <div className="text-xs text-muted-foreground">
              Educational DBMS Simulator • Transactions • Triggers • Concurrency Control
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
