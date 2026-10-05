"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale } from "next-intl";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "@/modules/cart/components/cart-provider";
import { placeOrder } from "@/modules/orders/service/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/money";

export default function CartPage() {
  const { cart, hydrated, updateQuantity, removeItem, clearCart } = useCart();
  const locale = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [pending, startTransition] = useTransition();

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <EmptyState
          icon={<ShoppingCart className="h-6 w-6" />}
          title="Your cart is empty"
          body="Find a shop nearby and add something to pick up."
          action={
            <Link href="/">
              <Button>Browse nearby</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const currencyCode = cart.items[0].currencyCode;
  const subtotalMinor = cart.items.reduce((sum, i) => sum + i.amountMinor * i.quantity, 0);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Your cart</h1>
          <p className="text-sm text-muted-foreground">{cart.organizationName}</p>
        </div>
        <Link href={`/shop/${cart.organizationSlug}/${cart.locationSlug}`} className="text-sm font-medium text-brand hover:underline">
          Add more
        </Link>
      </div>

      <Card className="divide-y divide-border">
        {cart.items.map((item) => (
          <div key={item.variantId} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">
                {item.productName}
                {item.variantName !== "Default" ? ` — ${item.variantName}` : ""}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatMoney({ amountMinor: item.amountMinor, currencyCode: item.currencyCode }, locale)} / {item.unit}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                aria-label="Remove one"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-6 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => updateQuantity(item.variantId, Math.min(item.quantity + 1, item.maxQuantity))}
                disabled={item.quantity >= item.maxQuantity}
                aria-label="Add one more"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <button
                type="button"
                onClick={() => removeItem(item.variantId)}
                className="ml-1 text-muted-foreground hover:text-danger"
                aria-label="Remove item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </Card>

      <div className="mt-4 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-medium text-foreground tabular-nums">
          {formatMoney({ amountMinor: subtotalMinor, currencyCode }, locale)}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Tax, if any, is added at checkout. Pay when you pick up.</p>

      <div className="mt-4">
        <Input
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          placeholder="Coupon code (optional)"
          className="uppercase"
        />
      </div>

      {error && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      <Button
        type="button"
        size="lg"
        disabled={pending}
        className="mt-4 w-full"
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await placeOrder({
              organizationId: cart.organizationId,
              locationId: cart.locationId,
              items: cart.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
              couponCode: couponCode || undefined,
            });
            if (!result.ok) return setError(result.error);
            clearCart();
            router.push(`/orders/${result.orderId}`);
          });
        }}
      >
        {pending ? "Placing order…" : "Place order"}
      </Button>
    </div>
  );
}
