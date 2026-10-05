"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { RotateCcw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/modules/cart/components/cart-provider";
import { formatMoney } from "@/lib/money";
import type { ReorderCandidate } from "../data/orders";

export function ReorderCard({ candidate }: { candidate: ReorderCandidate }) {
  const { addItem } = useCart();
  const router = useRouter();
  const locale = useLocale();
  const [conflict, setConflict] = useState(false);
  const outOfStock = candidate.stockQty <= 0;

  function reorder() {
    const result = addItem(
      {
        organizationId: candidate.organizationId,
        organizationName: candidate.organizationName,
        organizationSlug: candidate.organizationSlug,
        locationId: candidate.locationId,
        locationName: candidate.locationName,
        locationSlug: candidate.locationSlug,
      },
      {
        variantId: candidate.variantId,
        productId: candidate.productId,
        productName: candidate.productName,
        variantName: candidate.variantName,
        unit: candidate.unit,
        amountMinor: candidate.amountMinor,
        currencyCode: candidate.currencyCode,
        quantity: 1,
        maxQuantity: candidate.stockQty,
      },
    );
    if (result === "conflict") setConflict(true);
    else router.push("/cart");
  }

  return (
    <Card className="flex items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{candidate.productName}</p>
        <p className="text-xs text-muted-foreground">
          {candidate.organizationName} · {formatMoney({ amountMinor: candidate.amountMinor, currencyCode: candidate.currencyCode }, locale)}
        </p>
      </div>
      {conflict ? (
        <span className="shrink-0 text-xs text-muted-foreground">Different shop in cart</span>
      ) : (
        <Button type="button" size="sm" variant="secondary" disabled={outOfStock} onClick={reorder}>
          <RotateCcw className="h-3.5 w-3.5" />
          {outOfStock ? "Unavailable" : "Reorder"}
        </Button>
      )}
    </Card>
  );
}
