"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestBooking } from "../service/actions";

export function BookingForm({
  organizationId,
  locationId,
  serviceId,
}: {
  organizationId: string;
  locationId: string;
  serviceId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [requestedTime, setRequestedTime] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <Button type="button" size="sm" onClick={() => setOpen(true)}>
        <CalendarClock className="h-4 w-4" />
        Book
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await requestBooking({ organizationId, locationId, serviceId, requestedTime, description });
          if (!result.ok) return setError(result.error);
          router.push(`/bookings/${result.bookingId}`);
        });
      }}
    >
      {error && <p className="text-xs text-danger">{error}</p>}
      <Input
        type="datetime-local"
        required
        value={requestedTime}
        onChange={(e) => setRequestedTime(e.target.value)}
        className="h-9"
      />
      <textarea
        placeholder="What do you need help with? (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Requesting…" : "Request booking"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
