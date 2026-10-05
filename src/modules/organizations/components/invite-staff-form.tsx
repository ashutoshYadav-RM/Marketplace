"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteStaffSchema, INVITABLE_ROLES, type InviteStaffInput } from "../domain/staff-schema";
import { inviteStaffByPhone } from "../service/staff-actions";
import type { OrgLocation } from "@/modules/locations/data/locations";

export function InviteStaffForm({ organizationId, locations }: { organizationId: string; locations: OrgLocation[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<InviteStaffInput>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: { phone: "", role: "staff", locationId: "" },
  });

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-raised p-4"
      onSubmit={form.handleSubmit((values) => {
        setError(null);
        startTransition(async () => {
          const result = await inviteStaffByPhone(organizationId, values);
          if (!result.ok) return setError(result.error);
          form.reset();
          router.refresh();
        });
      })}
    >
      <p className="text-sm font-semibold text-foreground">Add staff</p>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Phone number</Label>
          <Input type="tel" placeholder="+91 98765 43210" {...form.register("phone")} />
          {form.formState.errors.phone && <p className="mt-1 text-xs text-danger">{form.formState.errors.phone.message}</p>}
          <p className="mt-1 text-xs text-muted-foreground">They must already have an account.</p>
        </div>
        <div>
          <Label>Role</Label>
          <select
            className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            {...form.register("role")}
          >
            {INVITABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        {locations.length > 1 && (
          <div className="col-span-2">
            <Label>Location (optional — leave blank for all)</Label>
            <select
              className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              {...form.register("locationId")}
            >
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <Button type="submit" disabled={pending} className="self-start">
        Add staff member
      </Button>
    </form>
  );
}
