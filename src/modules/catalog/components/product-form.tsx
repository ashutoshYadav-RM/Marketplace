"use client";

import { useCallback, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Camera, CameraOff, CheckCircle2, ScanBarcode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createProductSchema, PRODUCT_UNITS, type CreateProductInput } from "../domain/schema";
import { createProduct, lookupGlobalProduct } from "../service/actions";
import { BarcodeCameraScanner } from "./barcode-camera-scanner";
import type { CategorySummary } from "../data/categories";
import type { OrgLocation } from "@/modules/locations/data/locations";

export function ProductForm({
  organizationId,
  locations,
  categories,
  currencyCode,
}: {
  organizationId: string;
  locations: OrgLocation[];
  categories: CategorySummary[];
  currencyCode: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [cameraOn, setCameraOn] = useState(false);
  const [catalogMatch, setCatalogMatch] = useState<string | null>(null);
  const [lookupInFlight, setLookupInFlight] = useState(false);

  const form = useForm<CreateProductInput>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      locationId: locations[0]?.id ?? "",
      categoryId: "",
      name: "",
      brand: "",
      unit: "piece",
      variantName: "Default",
      sku: "",
      barcode: "",
      amount: 0,
      currencyCode,
      stockQty: 0,
      images: [],
    },
  });

  // Checks the shared, barcode-keyed catalog (0011_global_catalog.sql) —
  // not this shop's own products — so scanning something another shop
  // already listed fills in name/brand/unit/category instead of retyping
  // them. Price and stock are never part of that lookup; they're always
  // this shop's own numbers.
  const handleBarcodeValue = useCallback(
    async (value: string) => {
      const trimmed = value.trim();
      form.setValue("barcode", trimmed);
      if (!trimmed || lookupInFlight) return;
      setLookupInFlight(true);
      setCatalogMatch(null);

      const match = await lookupGlobalProduct(trimmed);
      if (match) {
        form.setValue("name", match.name, { shouldValidate: true });
        if (match.brand) form.setValue("brand", match.brand);
        form.setValue("unit", match.unit as CreateProductInput["unit"]);
        if (match.categoryId) form.setValue("categoryId", match.categoryId);
        setCatalogMatch(match.name);
      }
      setLookupInFlight(false);
    },
    [form, lookupInFlight],
  );

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((values) => {
        setError(null);
        startTransition(async () => {
          const result = await createProduct(values, organizationId);
          if (!result.ok) return setError(result.error);
          router.push("/merchant/inventory");
          router.refresh();
        });
      })}
    >
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-border p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">Barcode (optional)</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <ScanBarcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Scan or type a barcode"
              className="pl-9"
              {...form.register("barcode", {
                onChange: (e) => handleBarcodeValue(e.target.value),
              })}
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setCameraOn((v) => !v);
            }}
          >
            {cameraOn ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
          </Button>
        </div>
        {cameraOn && (
          <div className="mt-3">
            <BarcodeCameraScanner
              active={cameraOn}
              onScan={(value) => {
                handleBarcodeValue(value);
                setCameraOn(false);
              }}
            />
          </div>
        )}
        {catalogMatch && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-success">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Found &quot;{catalogMatch}&quot; — details filled in below, just set your price and stock.
          </p>
        )}
      </div>

      <Field label="Product name" error={form.formState.errors.name?.message}>
        <Input placeholder="Amul Milk" {...form.register("name")} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Category">
          <select
            className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            {...form.register("categoryId")}
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Sold by unit">
          <select
            className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            {...form.register("unit")}
          >
            {PRODUCT_UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Brand (optional)">
        <Input placeholder="Amul" {...form.register("brand")} />
      </Field>

      {locations.length > 1 && (
        <Field label="Location">
          <select
            className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            {...form.register("locationId")}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <div className="rounded-2xl border border-border p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">First variant</p>
        <div className="flex flex-col gap-4">
          <Field label="Variant name" error={form.formState.errors.variantName?.message}>
            <Input placeholder='e.g. "500 ml" or "Default"' {...form.register("variantName")} />
          </Field>
          <Field label="SKU (optional)">
            <Input {...form.register("sku")} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={`Price (${currencyCode})`} error={form.formState.errors.amount?.message}>
              <Input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                {...form.register("amount", { valueAsNumber: true })}
              />
            </Field>
            <Field label="Stock on hand" error={form.formState.errors.stockQty?.message}>
              <Input type="number" step="1" min="0" {...form.register("stockQty", { valueAsNumber: true })} />
            </Field>
          </div>
        </div>
      </div>

      <p className="-mt-2 text-xs text-muted-foreground">
        Adding a barcode here also helps other nearby shops — and lets customers compare this item&apos;s price
        across shops that carry it.
      </p>

      <Button type="submit" disabled={pending} size="lg" className="w-full">
        Add product
      </Button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
