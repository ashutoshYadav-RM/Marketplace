"use client";

import { useState, useTransition } from "react";
import { useLocale } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookingStatusBadge } from "./booking-status-badge";
import { advanceBookingStatus } from "../service/actions";
import { formatMoney } from "@/lib/money";
import type { MerchantBookingSummary } from "../data/bookings";
import type { BookingStatus } from "../domain/schema";

// "accepted" is handled separately below — it needs a scheduled_time input,
// not just a status flip.
const NEXT_STEP: Partial<Record<BookingStatus, { status: BookingStatus; label: string }>> = {
  scheduled: { status: "arrived", label: "Mark arrived" },
  arrived: { status: "work_started", label: "Start work" },
  work_started: { status: "completed", label: "Mark completed" },
  completed: { status: "paid", label: "Mark paid" },
};

export function MerchantBookingCard({ booking }: { booking: MerchantBookingSummary }) {
  const locale = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [scheduledTime, setScheduledTime] = useState("");
  const [pending, startTransition] = useTransition();

  const next = NEXT_STEP[booking.status];
  const canDecline = booking.status === "requested";
  const canCancel = ["requested", "accepted", "scheduled"].includes(booking.status);

  function transition(status: BookingStatus, time?: string) {
    setError(null);
    startTransition(async () => {
      const result = await advanceBookingStatus(booking.id, status, undefined, time);
      if (!result.ok) setError(result.error);
      else setScheduling(false);
    });
  }

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="font-medium text-foreground">{booking.serviceName}</p>
          <p className="text-xs text-muted-foreground">
            {booking.customerName ?? "Customer"} · {booking.bookingNumber}
          </p>
        </div>
        <BookingStatusBadge status={booking.status} />
      </div>

      {booking.requestedTime && (
        <p className="mb-1 text-xs text-muted-foreground">
          Requested for {new Date(booking.requestedTime).toLocaleString(locale)}
        </p>
      )}
      {booking.scheduledTime && (
        <p className="mb-1 text-xs text-muted-foreground">Scheduled {new Date(booking.scheduledTime).toLocaleString(locale)}</p>
      )}
      {booking.visitChargeMinor != null && booking.currencyCode && (
        <p className="mb-2 text-sm font-medium text-foreground">
          {formatMoney({ amountMinor: booking.visitChargeMinor, currencyCode: booking.currencyCode }, locale)}
        </p>
      )}

      {error && <p className="mb-2 text-xs text-danger">{error}</p>}

      {booking.status === "requested" && (
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={() => transition("accepted")}>
            ACCEPT
          </Button>
          {canDecline && (
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => transition("rejected")}>
              Decline
            </Button>
          )}
        </div>
      )}

      {booking.status === "accepted" && !scheduling && (
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={() => setScheduling(true)}>
            Confirm schedule
          </Button>
          {canCancel && (
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => transition("cancelled")}>
              Cancel
            </Button>
          )}
        </div>
      )}

      {booking.status === "accepted" && scheduling && (
        <div className="flex items-center gap-2">
          <Input
            type="datetime-local"
            value={scheduledTime}
            onChange={(e) => setScheduledTime(e.target.value)}
            className="h-9 w-auto"
          />
          <Button type="button" size="sm" disabled={pending || !scheduledTime} onClick={() => transition("scheduled", scheduledTime)}>
            Save
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setScheduling(false)}>
            Cancel
          </Button>
        </div>
      )}

      {next && (
        <div className="flex items-center gap-2">
          <Button type="button" size="sm" disabled={pending} onClick={() => transition(next.status)}>
            {next.label.toUpperCase()}
          </Button>
          {canCancel && (
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => transition("cancelled")}>
              Cancel
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}
