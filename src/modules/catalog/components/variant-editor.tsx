"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { updatePrice, updateStock } from "../service/actions";
import type { ProductVariantSummary } from "../data/products";
import type { OrgLocation } from "@/modules/locations/data/locations";

export function VariantEditor({
  productId,
  variant,
  locations,
}: {
  productId: string;
  variant: ProductVariantSummary;
  locations: OrgLocation[];
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-medium text-foreground">{variant.variantName}</p>
          {(variant.sku || variant.barcode) && (
            <p className="text-xs text-muted-foreground">
              {variant.sku && `SKU ${variant.sku}`}
              {variant.sku && variant.barcode && " · "}
              {variant.barcode && `Barcode ${variant.barcode}`}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {locations.map((location) => {
          const price = variant.prices.find((p) => p.locationId === location.id);
          const stock = variant.stock.find((s) => s.locationId === location.id);
          if (!price || !stock) return null;
          return (
            <LocationRow
              key={location.id}
              productId={productId}
              locationName={locations.length > 1 ? location.name : null}
              locationId={location.id}
              variantId={variant.id}
              price={price}
              stock={stock}
            />
          );
        })}
      </div>
    </div>
  );
}

function LocationRow({
  productId,
  locationName,
  locationId,
  variantId,
  price,
  stock,
}: {
  productId: string;
  locationName: string | null;
  locationId: string;
  variantId: string;
  price: { id: string; amountMinor: number; currencyCode: string };
  stock: { stockQty: number; isAvailable: boolean };
}) {
  const [amount, setAmount] = useState((price.amountMinor / 100).toString());
  const [stockQty, setStockQty] = useState(stock.stockQty.toString());
  const [isAvailable, setIsAvailable] = useState(stock.isAvailable);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const [priceResult, stockResult] = await Promise.all([
        updatePrice({ priceId: price.id, amount: Number(amount) }, productId),
        updateStock({ locationId, variantId, stockQty: Number(stockQty), isAvailable }, productId),
      ]);
      if (!priceResult.ok) return setError(priceResult.error);
      if (!stockResult.ok) return setError(stockResult.error);
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      {locationName && <span className="min-w-0 shrink-0 text-sm text-muted-foreground">{locationName}</span>}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Price ({price.currencyCode})</span>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="h-9 w-28"
        />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Stock</span>
        <Input
          type="number"
          step="1"
          min="0"
          value={stockQty}
          onChange={(e) => setStockQty(e.target.value)}
          className="h-9 w-24"
        />
      </div>
      <button
        type="button"
        onClick={() => setIsAvailable((v) => !v)}
        className="mb-0.5"
        aria-pressed={isAvailable}
      >
        <Badge tone={isAvailable ? "success" : "danger"}>{isAvailable ? "Available" : "Unavailable"}</Badge>
      </button>
      <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={save}>
        Save
      </Button>
      {saved && <span className="text-sm text-success">Saved</span>}
      {error && <span className="text-sm text-danger">{error}</span>}
    </div>
  );
}
