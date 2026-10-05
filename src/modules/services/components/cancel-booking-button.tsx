"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { advanceBookingStatus } from "../service/actions";

export function CancelBookingButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button type="button" onClick={() => setConfirming(true)} className="text-sm font-medium text-danger hover:underline">
        Cancel booking
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-danger/30 bg-danger-soft p-3">
      <p className="text-sm text-danger">Cancel this booking?</p>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await advanceBookingStatus(bookingId, "cancelled", "Cancelled by customer");
              if (!result.ok) return setError(result.error);
              router.refresh();
            })
          }
        >
          <X className="h-4 w-4" />
          Yes, cancel
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)}>
          Never mind
        </Button>
      </div>
    </div>
  );
}
