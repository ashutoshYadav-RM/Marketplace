"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createOfferSchema, type CreateOfferInput } from "../domain/schema";
import { createOffer } from "../service/actions";

export function OfferForm({ organizationId, currencyCode }: { organizationId: string; currencyCode: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<CreateOfferInput>({
    resolver: zodResolver(createOfferSchema),
    defaultValues: { code: "", type: "percent", value: 10, minOrder: undefined, usageLimit: undefined },
  });
  const type = form.watch("type");

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-raised p-4"
      onSubmit={form.handleSubmit((values) => {
        setError(null);
        startTransition(async () => {
          const result = await createOffer(values, organizationId, currencyCode);
          if (!result.ok) return setError(result.error);
          form.reset();
          router.refresh();
        });
      })}
    >
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Code" error={form.formState.errors.code?.message}>
          <Input placeholder="WELCOME10" {...form.register("code")} className="uppercase" />
        </Field>
        <Field label="Type">
          <select
            className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            {...form.register("type")}
          >
            <option value="percent">Percent off</option>
            <option value="flat">Flat amount off</option>
          </select>
        </Field>
        <Field label={type === "percent" ? "Percent off" : `Amount off (${currencyCode})`} error={form.formState.errors.value?.message}>
          <Input type="number" step={type === "percent" ? "1" : "0.01"} min="0" {...form.register("value", { valueAsNumber: true })} />
        </Field>
        <Field label={`Minimum order (${currencyCode}, optional)`}>
          <Input type="number" step="0.01" min="0" {...form.register("minOrder", { valueAsNumber: true })} />
        </Field>
        <Field label="Usage limit (optional)">
          <Input type="number" step="1" min="1" {...form.register("usageLimit", { valueAsNumber: true })} />
        </Field>
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        Create offer
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
