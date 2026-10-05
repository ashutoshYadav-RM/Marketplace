"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { advanceOrderStatus } from "../service/actions";
import type { MerchantOrderSummary } from "../data/orders";
import type { OrderStatus } from "../domain/schema";

const NEXT_STEP: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  placed: { status: "accepted", label: "Accept" },
  accepted: { status: "packing", label: "Start packing" },
  packing: { status: "ready_for_pickup", label: "Mark ready" },
};

export function MerchantOrderCard({ order }: { order: MerchantOrderSummary }) {
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const next = NEXT_STEP[order.status];
  const canCancel = order.status === "placed" || order.status === "accepted" || order.status === "packing";

  function transition(status: OrderStatus) {
    setError(null);
    startTransition(async () => {
      const result = await advanceOrderStatus(order.id, status);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="font-medium text-foreground">#{order.orderNumber}</p>
          <p className="text-xs text-muted-foreground">{order.customerName ?? "Customer"}</p>
        </div>
        <span className="font-medium text-foreground tabular-nums">
          {formatMoney({ amountMinor: order.totalMinor, currencyCode: order.currencyCode }, locale)}
        </span>
      </div>

      <ul className="mb-3 text-sm text-muted-foreground">
        {order.items.map((item) => (
          <li key={item.id}>
            {item.nameSnapshot} × {item.quantity}
          </li>
        ))}
      </ul>

      {error && <p className="mb-2 text-xs text-danger">{error}</p>}

      {order.status === "ready_for_pickup" ? (
        <p className="text-xs font-medium text-accent-ready">Waiting for customer pickup</p>
      ) : (
        <div className="flex items-center gap-2">
          {next && (
            <Button type="button" size="sm" disabled={pending} onClick={() => transition(next.status)}>
              {next.label.toUpperCase()}
            </Button>
          )}
          {canCancel && (
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => transition("cancelled")}>
              Decline
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
