// This file defines a context and is not a React component.
// Move this file to a non-routing directory or exclude it from routing.

// This file defines a context and is not a React component route.
// Move this file to a directory outside of the app/ folder or rename it to CartContext.context.tsx to avoid routing warnings.

// Moved from app/auth/contexts/ to contexts/ to avoid Expo Router route warning.

import React, { createContext, useContext, useState } from 'react';

// 🧾 Typage d'un article du panier
export type CartItem = {
  id: number;
  designation: string;
  prix: number;
  quantity: number;
  size: string;
  [key: string]: any; // Permet d'accepter d'autres champs optionnels
};

// 🎯 Typage du contexte
type CartContextType = {
  cartItems: CartItem[];
  addToCart: (product: CartItem) => void;
  removeFromCart: (productId: number, size: string) => void;
  updateQuantity: (id: number, size: string, quantity: number) => void; // Ajouté ici
  clearCart: () => void;
};

// ⚠️ Initialisation du contexte avec "null" par défaut
const CartContext = createContext<CartContextType | null>(null);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = (product: CartItem) => {
    const exists = cartItems.find(
      (item) => item.id === product.id && item.size === product.size
    );

    if (exists) {
      setCartItems((prev) =>
        prev.map((item) =>
          item.id === product.id && item.size === product.size
            ? { ...item, quantity: item.quantity + product.quantity }
            : item
        )
      );
    } else {
      setCartItems((prev) => [...prev, product]);
    }
  };

  const removeFromCart = (productId: number, size: string) => {
    setCartItems((prev) =>
      prev.filter((item) => !(item.id === productId && item.size === size))
    );
  };

  const updateQuantity = (id: number, size: string, quantity: number) => {
    setCartItems(prev =>
      prev.map(item =>
        item.id === id && item.size === size
          ? { ...item, quantity }
          : item
      )
    );
  };

  const clearCart = () => setCartItems([]);

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

// Hook personnalisé pour utiliser le panier
export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

