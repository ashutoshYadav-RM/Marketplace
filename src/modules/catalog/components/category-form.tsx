"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createCategorySchema, type CreateCategoryInput } from "../domain/category-schema";
import { createCategory } from "../service/actions";

export function CategoryForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<CreateCategoryInput>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: { name: "", slug: "", type: "product", icon: "", sortOrder: 0 },
  });

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface-raised p-4"
      onSubmit={form.handleSubmit((values) => {
        setError(null);
        startTransition(async () => {
          const result = await createCategory(values);
          if (!result.ok) return setError(result.error);
          form.reset();
          router.refresh();
        });
      })}
    >
      {error && <p className="w-full text-sm text-danger">{error}</p>}
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Name</label>
        <Input placeholder="Tailoring" {...form.register("name")} className="w-40" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Slug</label>
        <Input placeholder="tailoring" {...form.register("slug")} className="w-36" />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Type</label>
        <select
          className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          {...form.register("type")}
        >
          <option value="product">Product</option>
          <option value="service">Service</option>
          <option value="both">Both</option>
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        Add category
      </Button>
      {form.formState.errors.name && <p className="w-full text-xs text-danger">{form.formState.errors.name.message}</p>}
      {form.formState.errors.slug && <p className="w-full text-xs text-danger">{form.formState.errors.slug.message}</p>}
    </form>
  );
}
