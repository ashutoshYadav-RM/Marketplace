"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Cart, CartItem, CartShop } from "../domain/types";

const STORAGE_KEY = "cart.v1";

type AddResult = "added" | "conflict";

type CartContextValue = {
  cart: Cart | null;
  hydrated: boolean;
  /** Adds an item; returns "conflict" without changing state if the cart
   * already holds items from a different shop — pickup is one order from
   * one shop, so the caller must confirm before `replaceCart`. */
  addItem: (shop: CartShop, item: CartItem) => AddResult;
  replaceCart: (shop: CartShop, item: CartItem) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // One-time sync from localStorage on mount — there's no SSR-safe way to
    // read it during render (no `window`), and no subscription to model
    // this as, so a direct setState here is the correct, standard pattern
    // despite the lint rule's general preference against it.
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setCart(JSON.parse(raw) as Cart);
    } catch {
      // Corrupt or inaccessible storage — start with an empty cart.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (cart && cart.items.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private browsing / storage disabled — cart just won't persist across reloads.
    }
  }, [cart, hydrated]);

  function addItem(shop: CartShop, item: CartItem): AddResult {
    if (cart && cart.items.length > 0 && cart.locationId !== shop.locationId) return "conflict";

    setCart((prev) => {
      const base: Cart = prev && prev.locationId === shop.locationId ? prev : { ...shop, items: [] };
      const existing = base.items.find((i) => i.variantId === item.variantId);
      const items = existing
        ? base.items.map((i) =>
            i.variantId === item.variantId
              ? { ...i, quantity: Math.min(i.quantity + item.quantity, item.maxQuantity) }
              : i,
          )
        : [...base.items, item];
      return { ...base, items };
    });
    return "added";
  }

  function replaceCart(shop: CartShop, item: CartItem) {
    setCart({ ...shop, items: [item] });
  }

  function updateQuantity(variantId: string, quantity: number) {
    setCart((prev) => {
      if (!prev) return prev;
      if (quantity <= 0) {
        const items = prev.items.filter((i) => i.variantId !== variantId);
        return items.length > 0 ? { ...prev, items } : null;
      }
      return { ...prev, items: prev.items.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)) };
    });
  }

  function removeItem(variantId: string) {
    updateQuantity(variantId, 0);
  }

  function clearCart() {
    setCart(null);
  }

  return (
    <CartContext.Provider value={{ cart, hydrated, addItem, replaceCart, updateQuantity, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
