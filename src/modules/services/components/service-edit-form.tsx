"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateServiceSchema, type UpdateServiceInput } from "../domain/schema";
import { updateService } from "../service/actions";
import type { CategorySummary } from "@/modules/catalog/data/categories";
import type { ServiceRow } from "../data/services";

export function ServiceEditForm({ service, categories }: { service: ServiceRow; categories: CategorySummary[] }) {
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<UpdateServiceInput>({
    resolver: zodResolver(updateServiceSchema),
    defaultValues: {
      serviceId: service.id,
      name: service.name,
      description: service.description ?? "",
      categoryId: service.categoryId ?? "",
      visitCharge: service.visitChargeMinor / 100,
      currencyCode: service.currencyCode,
      durationMinutes: service.durationMinutes ?? undefined,
      isActive: service.isActive,
    },
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) => {
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await updateService(values);
          if (!result.ok) return setError(result.error);
          setSaved(true);
        });
      })}
    >
      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      <Field label="Service name" error={form.formState.errors.name?.message}>
        <Input {...form.register("name")} />
      </Field>
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
      <Field label="Description">
        <textarea
          rows={3}
          className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          {...form.register("description")}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={`Visit charge (${service.currencyCode})`} error={form.formState.errors.visitCharge?.message}>
          <Input type="number" step="0.01" min="0" {...form.register("visitCharge", { valueAsNumber: true })} />
        </Field>
        <Field label="Duration, minutes">
          <Input type="number" step="5" min="0" {...form.register("durationMinutes", { valueAsNumber: true })} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" className="h-4 w-4 rounded border-border" {...form.register("isActive")} />
        Bookable by customers
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
