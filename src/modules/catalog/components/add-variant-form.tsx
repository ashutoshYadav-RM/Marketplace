"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addVariantSchema, type AddVariantInput } from "../domain/schema";
import { addVariant } from "../service/actions";
import type { OrgLocation } from "@/modules/locations/data/locations";

export function AddVariantForm({
  productId,
  locations,
  currencyCode,
}: {
  productId: string;
  locations: OrgLocation[];
  currencyCode: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<AddVariantInput>({
    resolver: zodResolver(addVariantSchema),
    defaultValues: {
      productId,
      locationId: locations[0]?.id ?? "",
      variantName: "",
      sku: "",
      barcode: "",
      amount: 0,
      currencyCode,
      stockQty: 0,
    },
  });

  if (!open) {
    return (
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add another variant
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-4"
      onSubmit={form.handleSubmit((values) => {
        setError(null);
        startTransition(async () => {
          const result = await addVariant(values);
          if (!result.ok) return setError(result.error);
          setOpen(false);
          form.reset();
          router.refresh();
        });
      })}
    >
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Variant name</Label>
          <Input placeholder='e.g. "1 kg"' {...form.register("variantName")} />
          {form.formState.errors.variantName && (
            <p className="mt-1 text-xs text-danger">{form.formState.errors.variantName.message}</p>
          )}
        </div>
        <div>
          <Label>SKU (optional)</Label>
          <Input {...form.register("sku")} />
        </div>
        <div>
          <Label>{`Price (${currencyCode})`}</Label>
          <Input type="number" step="0.01" min="0" {...form.register("amount", { valueAsNumber: true })} />
          {form.formState.errors.amount && <p className="mt-1 text-xs text-danger">{form.formState.errors.amount.message}</p>}
        </div>
        <div>
          <Label>Stock on hand</Label>
          <Input type="number" step="1" min="0" {...form.register("stockQty", { valueAsNumber: true })} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          Add variant
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
