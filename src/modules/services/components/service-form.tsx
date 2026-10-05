"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createServiceSchema, type CreateServiceInput } from "../domain/schema";
import { createService } from "../service/actions";
import type { CategorySummary } from "@/modules/catalog/data/categories";

export function ServiceForm({
  organizationId,
  categories,
  currencyCode,
}: {
  organizationId: string;
  categories: CategorySummary[];
  currencyCode: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<CreateServiceInput>({
    resolver: zodResolver(createServiceSchema),
    defaultValues: { name: "", description: "", categoryId: "", visitCharge: 0, currencyCode, durationMinutes: undefined },
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={form.handleSubmit((values) => {
        setError(null);
        startTransition(async () => {
          const result = await createService(values, organizationId);
          if (!result.ok) return setError(result.error);
          router.push("/merchant/services");
          router.refresh();
        });
      })}
    >
      {error && <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}

      <Field label="Service name" error={form.formState.errors.name?.message}>
        <Input placeholder="AC repair — visit & diagnosis" {...form.register("name")} />
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
      <Field label="Description (optional)">
        <textarea
          rows={3}
          className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          {...form.register("description")}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label={`Visit charge (${currencyCode})`} error={form.formState.errors.visitCharge?.message}>
          <Input type="number" step="0.01" min="0" {...form.register("visitCharge", { valueAsNumber: true })} />
        </Field>
        <Field label="Duration, minutes (optional)">
          <Input type="number" step="5" min="0" {...form.register("durationMinutes", { valueAsNumber: true })} />
        </Field>
      </div>

      <Button type="submit" disabled={pending} size="lg" className="w-full">
        Add service
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
