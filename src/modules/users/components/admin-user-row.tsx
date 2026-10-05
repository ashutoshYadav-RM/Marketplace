"use client";

import { useState, useTransition } from "react";
import { UserX, UserCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { reinstateUser, suspendUser } from "@/modules/admin/service/actions";
import type { AdminUserRow } from "../data/admin-users";

export function AdminUserRow({ user }: { user: AdminUserRow }) {
  const [suspended, setSuspended] = useState(user.isSuspended);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-foreground">{user.fullName ?? "Unnamed"}</p>
          {suspended && <Badge tone="danger">Suspended</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{[user.email, user.phone].filter(Boolean).join(" · ") || "—"}</p>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = suspended ? await reinstateUser(user.id) : await suspendUser(user.id);
            if (!result.ok) return setError(result.error);
            setSuspended(!suspended);
          })
        }
      >
        {suspended ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
        {suspended ? "Reinstate" : "Suspend"}
      </Button>
    </Card>
  );
}
