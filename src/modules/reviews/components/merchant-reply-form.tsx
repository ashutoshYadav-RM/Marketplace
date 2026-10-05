"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { replyToReview } from "../service/actions";

export function MerchantReplyForm({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-medium text-brand hover:underline">
        Reply
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2">
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={2}
        placeholder="Thank the customer, or address their feedback…"
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending || !reply.trim()}
          onClick={() =>
            startTransition(async () => {
              const result = await replyToReview({ reviewId, reply });
              if (!result.ok) return setError(result.error);
              setOpen(false);
              router.refresh();
            })
          }
        >
          Post reply
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
