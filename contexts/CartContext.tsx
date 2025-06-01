// contexts/CartContext.tsx

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface CartItem {
  id: number;
  designation: string;
  size: string;
  prix: number;
  quantity: number;
  image?: string;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: number, size: string) => void;
  clearCart: () => void;
  updateQuantity: (
    id: number,
    size: string,
    quantity: number,
    designation?: string,
    prix?: number,
    image?: string
  ) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (item: CartItem) => {
    setCartItems((prevItems) => {
      const existing = prevItems.find(i => i.id === item.id && i.size === item.size);
      if (existing) {
        return prevItems.map(i =>
          i.id === item.id && i.size === item.size
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...prevItems, item];
    });
  };

  const removeFromCart = (id: number, size: string) => {
    setCartItems(prevItems =>
      prevItems.filter(item => !(item.id === id && item.size === size))
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const updateQuantity = (
    id: number,
    size: string,
    quantity: number,
    designation?: string,
    prix?: number,
    image?: string
  ) => {
    setCartItems(prevItems => {
      const exists = prevItems.some(i => i.id === id && i.size === size);
      if (exists) {
        return prevItems.map(item =>
          item.id === id && item.size === size ? { ...item, quantity } : item
        );
      } else if (designation && prix) {
        return [...prevItems, { id, size, quantity, designation, prix, image }];
      } else {
        return prevItems;
      }
    });
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, clearCart, updateQuantity }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
