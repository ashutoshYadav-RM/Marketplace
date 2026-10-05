import { notFound } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { getLocale } from "next-intl/server";
import { getBookingDetail } from "@/modules/services/data/bookings";
import { BookingStatusBadge } from "@/modules/services/components/booking-status-badge";
import { LiveBookingStatus } from "@/modules/services/components/live-booking-status";
import { CancelBookingButton } from "@/modules/services/components/cancel-booking-button";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { BookingStatus } from "@/modules/services/domain/schema";

const STEPS: BookingStatus[] = ["requested", "accepted", "scheduled", "arrived", "work_started", "completed", "paid"];
const TERMINAL: BookingStatus[] = ["rejected", "cancelled", "no_show", "paid"];
const CANCELLABLE: BookingStatus[] = ["requested", "accepted", "scheduled"];

export default async function BookingDetailPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const [booking, locale] = await Promise.all([getBookingDetail(bookingId), getLocale()]);

  if (!booking) notFound();

  const isDerailed = booking.status === "rejected" || booking.status === "cancelled" || booking.status === "no_show";
  const currentStepIndex = STEPS.indexOf(booking.status);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{booking.bookingNumber}</p>
          <Link href={`/shop/${booking.organizationSlug}/${booking.locationSlug}`} className="text-lg font-semibold text-foreground hover:text-brand">
            {booking.organizationName}
          </Link>
          <p className="text-sm text-muted-foreground">{booking.serviceName}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <BookingStatusBadge status={booking.status} />
          {!TERMINAL.includes(booking.status) && <LiveBookingStatus bookingId={booking.id} />}
        </div>
      </div>

      {!isDerailed && (
        <ol className="mb-8 flex items-center">
          {STEPS.map((step, i) => (
            <li key={step} className="flex flex-1 items-center last:flex-none">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                  i <= currentStepIndex ? "border-brand bg-brand text-brand-foreground" : "border-border text-muted-foreground",
                )}
              >
                {i < currentStepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && <div className={cn("mx-1 h-0.5 flex-1", i < currentStepIndex ? "bg-brand" : "bg-border")} />}
            </li>
          ))}
        </ol>
      )}

      {isDerailed && booking.cancelReason && (
        <Card className="mb-6 bg-danger-soft p-4 text-sm text-danger">{booking.cancelReason}</Card>
      )}

      <Card className="flex flex-col gap-2 p-4 text-sm">
        {booking.requestedTime && (
          <Row label="Requested for" value={new Date(booking.requestedTime).toLocaleString(locale)} />
        )}
        {booking.scheduledTime && <Row label="Scheduled" value={new Date(booking.scheduledTime).toLocaleString(locale)} />}
        {booking.description && <Row label="Notes" value={booking.description} />}
        {booking.visitChargeMinor != null && booking.currencyCode && (
          <Row
            label="Visit charge"
            value={formatMoney({ amountMinor: booking.visitChargeMinor, currencyCode: booking.currencyCode }, locale)}
          />
        )}
      </Card>

      {CANCELLABLE.includes(booking.status) && (
        <div className="mt-6 flex justify-center">
          <CancelBookingButton bookingId={booking.id} />
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">Pay when the work is done.</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}
