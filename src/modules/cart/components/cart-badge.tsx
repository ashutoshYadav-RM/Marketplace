"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "./cart-provider";

export function CartBadge() {
  const { cart, hydrated } = useCart();
  const count = cart?.items.reduce((sum, i) => sum + i.quantity, 0) ?? 0;

  return (
    <Link href="/cart" className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-raised">
      <ShoppingCart className="h-5 w-5 text-foreground" />
      {hydrated && count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-ready px-1 text-[10px] font-semibold text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
