import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface CartItem {
  medicineId: number;
  name: string;
  price: number;
  quantity: number;
  stock: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (medicine: { id: number; name: string; price: number; stock: number }) => void;
  updateQuantity: (medicineId: number, delta: number) => void;
  removeFromCart: (medicineId: number) => void;
  clearCart: () => void;
  cartCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (medicine: { id: number; name: string; price: number; stock: number }) => {
    setCart(prev => {
      const existing = prev.find(c => c.medicineId === medicine.id);
      if (existing) {
        if (existing.quantity >= medicine.stock) return prev;
        return prev.map(c => c.medicineId === medicine.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { medicineId: medicine.id, name: medicine.name, price: medicine.price, quantity: 1, stock: medicine.stock }];
    });
  };

  const updateQuantity = (medicineId: number, delta: number) => {
    setCart(prev =>
      prev.map(c => {
        if (c.medicineId !== medicineId) return c;
        const newQty = c.quantity + delta;
        if (newQty <= 0) return null as any;
        if (newQty > c.stock) return c;
        return { ...c, quantity: newQty };
      }).filter(Boolean)
    );
  };

  const removeFromCart = (medicineId: number) => {
    setCart(prev => prev.filter(c => c.medicineId !== medicineId));
  };

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, updateQuantity, removeFromCart, clearCart, cartCount }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
