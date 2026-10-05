"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProductSchema, PRODUCT_UNITS, type UpdateProductInput } from "../domain/schema";
import { updateProduct } from "../service/actions";
import type { CategorySummary } from "../data/categories";
import type { ProductListItem } from "../data/products";

export function ProductEditForm({ product, categories }: { product: ProductListItem; categories: CategorySummary[] }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<UpdateProductInput>({
    resolver: zodResolver(updateProductSchema),
    defaultValues: {
      productId: product.id,
      name: product.name,
      description: product.description ?? "",
      brand: product.brand ?? "",
      categoryId: product.categoryId ?? "",
      unit: product.unit as UpdateProductInput["unit"],
      isActive: product.isActive,
    },
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) => {
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await updateProduct(values);
          if (!result.ok) return setError(result.error);
          setSaved(true);
        });
      })}
    >
      {error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <Field label="Product name" error={form.formState.errors.name?.message}>
        <Input {...form.register("name")} />
      </Field>
      <Field label="Description (optional)">
        <textarea
          rows={3}
          className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          {...form.register("description")}
        />
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
        <Input {...form.register("brand")} />
      </Field>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" className="h-4 w-4 rounded border-border" {...form.register("isActive")} />
        Visible to customers
      </label>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} variant="secondary">
          Save changes
        </Button>
        {saved && <span className="text-sm text-success">Saved</span>}
      </div>
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
