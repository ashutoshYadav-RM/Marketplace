"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Camera, CameraOff, Minus, Plus, ScanBarcode, Search, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { lookupProductByBarcode } from "@/modules/catalog/service/actions";
import { createPosSale } from "../service/actions";
import { BarcodeCameraScanner } from "@/modules/catalog/components/barcode-camera-scanner";
import type { ProductListItem } from "@/modules/catalog/data/products";

type BillItem = {
  variantId: string;
  name: string;
  amountMinor: number;
  currencyCode: string;
  quantity: number;
  stockQty: number;
};

export function PosTerminal({
  organizationId,
  locationId,
  currencyCode,
  products,
  canBill,
}: {
  organizationId: string;
  locationId: string;
  currencyCode: string;
  products: ProductListItem[];
  canBill: boolean;
}) {
  const router = useRouter();
  const locale = useLocale();
  const [items, setItems] = useState<BillItem[]>([]);
  const [barcode, setBarcode] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  const [searching, setSearching] = useState(false);
  const [discount, setDiscount] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<{ text: string; ok: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const barcodeRef = useRef<HTMLInputElement>(null);
  const lookupInFlight = useRef(false);

  function addItem(item: BillItem) {
    setItems((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) {
        return prev.map((i) =>
          i.variantId === item.variantId ? { ...i, quantity: Math.min(i.quantity + 1, i.stockQty) } : i,
        );
      }
      return [...prev, item];
    });
  }

  function adjustQuantity(variantId: string, delta: number) {
    setItems((prev) =>
      prev
        .map((i) => (i.variantId === variantId ? { ...i, quantity: Math.min(Math.max(i.quantity + delta, 0), i.stockQty) } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  const handleBarcodeValue = useCallback(
    async (value: string, opts: { fromCamera: boolean } = { fromCamera: false }) => {
      if (!value || lookupInFlight.current) return;
      lookupInFlight.current = true;
      if (!opts.fromCamera) setError(null);

      const result = await lookupProductByBarcode(organizationId, locationId, value);
      if (!result) {
        const message = `No product matches barcode "${value}".`;
        if (opts.fromCamera) setScanFeedback({ text: message, ok: false });
        else setError(message);
      } else if (result.stockQty <= 0) {
        const message = `${result.productName} is out of stock.`;
        if (opts.fromCamera) setScanFeedback({ text: message, ok: false });
        else setError(message);
      } else {
        addItem({
          variantId: result.variantId,
          name: result.productName + (result.variantName !== "Default" ? ` — ${result.variantName}` : ""),
          amountMinor: result.amountMinor,
          currencyCode: result.currencyCode,
          quantity: 1,
          stockQty: result.stockQty,
        });
        if (opts.fromCamera) setScanFeedback({ text: `Added ${result.productName}`, ok: true });
      }
      lookupInFlight.current = false;
    },
    [organizationId, locationId],
  );

  async function submitBarcode() {
    const value = barcode.trim();
    if (!value) return;
    await handleBarcodeValue(value);
    setBarcode("");
    barcodeRef.current?.focus();
  }

  const nameMatches = useMemo(() => {
    if (!nameFilter.trim()) return [];
    const q = nameFilter.trim().toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [nameFilter, products]);

  const subtotalMinor = items.reduce((sum, i) => sum + i.amountMinor * i.quantity, 0);
  const discountMinor = Math.round((Number(discount) || 0) * 100);
  const previewTotal = Math.max(subtotalMinor - discountMinor, 0);

  return (
    <div className="flex flex-col gap-5">
      <form
        className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2"
        onSubmit={(e) => {
          e.preventDefault();
          submitBarcode();
        }}
      >
        <ScanBarcode className="ml-2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={barcodeRef}
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Scan or type a barcode, then Enter"
          autoFocus
          className="border-0 focus-visible:ring-0"
        />
        <Button type="submit" size="sm" variant="secondary">
          Add
        </Button>
      </form>

      {error && <p className="text-sm text-danger">{error}</p>}

      <div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setScanFeedback(null);
            setCameraOn((v) => !v);
          }}
        >
          {cameraOn ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          {cameraOn ? "Stop camera" : "Scan with camera"}
        </Button>
        {cameraOn && (
          <div className="mt-3 flex flex-col gap-2">
            <BarcodeCameraScanner active={cameraOn} onScan={(value) => handleBarcodeValue(value, { fromCamera: true })} />
            {scanFeedback && (
              <p className={`text-center text-sm ${scanFeedback.ok ? "text-success" : "text-danger"}`}>{scanFeedback.text}</p>
            )}
            <p className="text-center text-xs text-muted-foreground">Hold a barcode inside the frame — items add automatically.</p>
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setSearching((v) => !v)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Search className="h-4 w-4" />
          No barcode? Search by name
        </button>
        {searching && (
          <div className="relative mt-2">
            <Input
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Product name"
              autoFocus
            />
            {nameMatches.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-surface-raised shadow-lg">
                {nameMatches.map((product) => {
                  const variant = product.variants[0];
                  const price = variant?.prices.find((p) => p.locationId === locationId);
                  const stock = variant?.stock.find((s) => s.locationId === locationId);
                  return (
                    <button
                      key={product.id}
                      type="button"
                      disabled={!variant || !price || !stock || stock.stockQty <= 0}
                      onClick={() => {
                        if (!variant || !price || !stock) return;
                        addItem({
                          variantId: variant.id,
                          name: product.name,
                          amountMinor: price.amountMinor,
                          currencyCode: price.currencyCode,
                          quantity: 1,
                          stockQty: stock.stockQty,
                        });
                        setNameFilter("");
                        setSearching(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-background disabled:opacity-40"
                    >
                      <span>{product.name}</span>
                      <span className="text-muted-foreground">
                        {variant?.stock.find((s) => s.locationId === locationId)?.stockQty ?? 0} left
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Scan an item to start the bill
        </p>
      ) : (
        <Card className="divide-y divide-border">
          {items.map((item) => (
            <div key={item.variantId} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatMoney({ amountMinor: item.amountMinor, currencyCode: item.currencyCode }, locale)} each
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => adjustQuantity(item.variantId, -1)}>
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-6 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={item.quantity >= item.stockQty}
                  onClick={() => adjustQuantity(item.variantId, 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="w-16 text-right text-sm font-medium tabular-nums">
                  {formatMoney({ amountMinor: item.amountMinor * item.quantity, currencyCode: item.currencyCode }, locale)}
                </span>
                <button
                  type="button"
                  onClick={() => setItems((prev) => prev.filter((i) => i.variantId !== item.variantId))}
                  className="text-muted-foreground hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          Discount ({currencyCode})
          <Input
            type="number"
            min="0"
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="h-9 w-24"
          />
        </label>
        {Number(discount) > 0 && (
          <button type="button" onClick={() => setDiscount("0")} className="text-muted-foreground hover:text-danger">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4 text-lg font-semibold text-foreground">
        <span>Total</span>
        <span className="tabular-nums">{formatMoney({ amountMinor: previewTotal, currencyCode }, locale)}</span>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">Tax, if any, is added when the bill is generated.</p>

      {!canBill && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          Your role can view prices but not generate bills — ask an owner, admin, manager, or cashier.
        </p>
      )}

      <Button
        type="button"
        size="lg"
        disabled={!canBill || items.length === 0 || pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await createPosSale({
              organizationId,
              locationId,
              items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
              discountMinor,
            });
            if (!result.ok) return setError(result.error);
            router.push(`/merchant/pos/${result.orderId}`);
          });
        }}
      >
        {pending ? "Generating…" : "Generate bill"}
      </Button>
    </div>
  );
}
