"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { archiveService } from "../service/actions";

export function ArchiveServiceButton({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        <Trash2 className="h-4 w-4" />
        Remove service
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Remove from your shop?</span>
      {error && <span className="text-sm text-danger">{error}</span>}
      <Button
        type="button"
        variant="danger"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await archiveService(serviceId);
            if (!result.ok) return setError(result.error);
            router.push("/merchant/services");
            router.refresh();
          })
        }
      >
        Yes, remove
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
