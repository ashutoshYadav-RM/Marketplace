import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { getLocale } from "next-intl/server";
import { listCustomerBookings } from "@/modules/services/data/bookings";
import { BookingStatusBadge } from "@/modules/services/components/booking-status-badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/money";

export default async function BookingsPage() {
  const [bookings, locale] = await Promise.all([listCustomerBookings(), getLocale()]);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-lg font-semibold text-foreground">Your bookings</h1>
      {bookings.length === 0 ? (
        <EmptyState icon={<CalendarClock className="h-6 w-6" />} title="No bookings yet" body="Services you book will show up here with live status." />
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <Link key={booking.id} href={`/bookings/${booking.id}`}>
              <Card className="flex items-center justify-between gap-3 p-4 transition-colors hover:border-brand">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{booking.serviceName}</p>
                  <p className="text-xs text-muted-foreground">
                    {booking.organizationName} · {new Date(booking.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {booking.visitChargeMinor != null && booking.currencyCode && (
                    <span className="font-medium text-foreground tabular-nums">
                      {formatMoney({ amountMinor: booking.visitChargeMinor, currencyCode: booking.currencyCode }, locale)}
                    </span>
                  )}
                  <BookingStatusBadge status={booking.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
