"use client";

import { useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "./cart-provider";
import type { CartShop } from "../domain/types";

export function AddToCartButton({
  shop,
  variantId,
  productId,
  productName,
  variantName,
  unit,
  amountMinor,
  currencyCode,
  maxQuantity,
}: {
  shop: CartShop;
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  unit: string;
  amountMinor: number;
  currencyCode: string;
  maxQuantity: number;
}) {
  const { cart, addItem, replaceCart } = useCart();
  const [confirmingSwitch, setConfirmingSwitch] = useState(false);
  const inCartQty = cart?.items.find((i) => i.variantId === variantId)?.quantity ?? 0;

  function attemptAdd() {
    const item = {
      variantId,
      productId,
      productName,
      variantName,
      unit,
      amountMinor,
      currencyCode,
      quantity: 1,
      maxQuantity,
    };
    const result = addItem(shop, item);
    if (result === "conflict") setConfirmingSwitch(true);
  }

  function confirmSwitch() {
    replaceCart(shop, {
      variantId,
      productId,
      productName,
      variantName,
      unit,
      amountMinor,
      currencyCode,
      quantity: 1,
      maxQuantity,
    });
    setConfirmingSwitch(false);
  }

  function adjust(delta: number) {
    const next = Math.min(Math.max(inCartQty + delta, 0), maxQuantity);
    if (next === 0) {
      addItem(shop, {
        variantId,
        productId,
        productName,
        variantName,
        unit,
        amountMinor,
        currencyCode,
        quantity: -inCartQty,
        maxQuantity,
      });
      return;
    }
    addItem(shop, {
      variantId,
      productId,
      productName,
      variantName,
      unit,
      amountMinor,
      currencyCode,
      quantity: delta,
      maxQuantity,
    });
  }

  if (confirmingSwitch) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface p-2 text-xs">
        <span className="text-muted-foreground">Start a new cart for this shop?</span>
        <Button type="button" size="sm" onClick={confirmSwitch}>
          Yes
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingSwitch(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  if (maxQuantity <= 0) {
    return (
      <span className="text-sm font-medium text-danger" aria-live="polite">
        Out of stock
      </span>
    );
  }

  if (inCartQty > 0) {
    return (
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" variant="secondary" onClick={() => adjust(-1)} aria-label="Remove one">
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-6 text-center text-sm font-medium tabular-nums">{inCartQty}</span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => adjust(1)}
          disabled={inCartQty >= maxQuantity}
          aria-label="Add one more"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Button type="button" size="sm" onClick={attemptAdd}>
      <ShoppingCart className="h-4 w-4" />
      Add
    </Button>
  );
}
