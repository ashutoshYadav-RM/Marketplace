import { requireActiveOrganizationMembership } from "@/modules/organizations/data/organizations";
import { listOrgLocations } from "@/modules/locations/data/locations";
import { getLocationHours } from "@/modules/locations/data/hours";
import { HoursEditor } from "@/modules/locations/components/hours-editor";
import { EmptyState } from "@/components/ui/empty-state";
import { Clock } from "lucide-react";

export default async function MerchantHoursPage() {
  const membership = await requireActiveOrganizationMembership();
  const locations = await listOrgLocations(membership.organization.id);
  const locationId = locations[0]?.id;

  if (!locationId) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <EmptyState icon={<Clock className="h-6 w-6" />} title="Add a location first" />
      </div>
    );
  }

  const hours = await getLocationHours(locationId);

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-1 text-xl font-semibold text-foreground">Opening hours</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Shown to customers on your shop page, and used for the &quot;Open now&quot; badge.
      </p>
      <HoursEditor locationId={locationId} initial={hours} />
    </div>
  );
}
