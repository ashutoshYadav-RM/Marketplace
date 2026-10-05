"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { setOrganizationStatus } from "../service/actions";
import type { PendingOrganization } from "../data/organizations";

const STATUS_TONE = {
  pending: "brand",
  active: "success",
  suspended: "danger",
  rejected: "neutral",
} as const;

export function MerchantApprovalRow({ organization }: { organization: PendingOrganization }) {
  const t = useTranslations("admin");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(organization.status);

  function transition(next: "active" | "rejected" | "suspended") {
    setError(null);
    startTransition(async () => {
      const result = await setOrganizationStatus(organization.id, next, note || undefined);
      if (!result.ok) return setError(result.error);
      setStatus(next);
    });
  }

  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-medium text-foreground">{organization.name}</p>
          <Badge tone={STATUS_TONE[status]}>{status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {[organization.location?.locality, organization.location?.city].filter(Boolean).join(", ") || "—"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("appliedOn", { date: new Date(organization.created_at).toLocaleDateString() })}
        </p>
        {error && <p className="mt-1 text-xs text-danger">{error}</p>}
      </div>
      <div className="flex items-center gap-2">
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="hidden h-9 w-40 text-xs sm:block"
        />
        {status === "pending" && (
          <>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => transition("rejected")}>
              <X className="h-4 w-4" />
              {t("reject")}
            </Button>
            <Button size="sm" disabled={pending} onClick={() => transition("active")}>
              <Check className="h-4 w-4" />
              {t("approve")}
            </Button>
          </>
        )}
        {status === "active" && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => transition("suspended")}>
            <Pause className="h-4 w-4" />
            Suspend
          </Button>
        )}
        {status === "suspended" && (
          <Button size="sm" disabled={pending} onClick={() => transition("active")}>
            <Play className="h-4 w-4" />
            Reactivate
          </Button>
        )}
        {status === "rejected" && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => transition("active")}>
            <Check className="h-4 w-4" />
            Approve anyway
          </Button>
        )}
      </div>
    </Card>
  );
}
