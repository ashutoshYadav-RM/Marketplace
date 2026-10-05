"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { INVITABLE_ROLES, type InvitableRole } from "../domain/staff-schema";
import { removeStaffMember, updateStaffRole } from "../service/staff-actions";
import type { StaffMember } from "../data/staff";

export function StaffRow({ member, isSelf }: { member: StaffMember; isSelf: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-foreground">
            {member.fullName ?? "Unnamed"}
            {isSelf && <span className="text-muted-foreground"> (you)</span>}
          </p>
          {member.isOwner && <Badge tone="brand">Owner</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {[member.phone, member.email].filter(Boolean).join(" · ") || "—"}
          {member.locationName ? ` · ${member.locationName}` : ""}
        </p>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {member.isOwner ? (
          <span className="text-sm text-muted-foreground">owner</span>
        ) : (
          <>
            <select
              defaultValue={member.role}
              disabled={pending}
              onChange={(e) =>
                startTransition(async () => {
                  setError(null);
                  const result = await updateStaffRole(member.id, e.target.value as InvitableRole);
                  if (!result.ok) return setError(result.error);
                  router.refresh();
                })
              }
              className="h-9 rounded-xl border border-border bg-surface px-2.5 text-sm text-foreground"
            >
              {INVITABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  setError(null);
                  const result = await removeStaffMember(member.id);
                  if (!result.ok) return setError(result.error);
                  router.refresh();
                })
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
