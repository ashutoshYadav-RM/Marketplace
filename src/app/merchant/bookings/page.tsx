import { CalendarClock } from "lucide-react";
import { requireActiveOrganizationMembership } from "@/modules/organizations/data/organizations";
import { listOrgBookings } from "@/modules/services/data/bookings";
import { MerchantBookingCard } from "@/modules/services/components/merchant-booking-card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function MerchantBookingsPage() {
  const membership = await requireActiveOrganizationMembership();
  const bookings = await listOrgBookings(membership.organization.id, [
    "requested",
    "accepted",
    "scheduled",
    "arrived",
    "work_started",
    "completed",
  ]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Bookings</h1>
      {bookings.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-6 w-6" />}
          title="No active bookings"
          body="Requests for your services will show up here."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((booking) => (
            <MerchantBookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}
    </div>
  );
}
