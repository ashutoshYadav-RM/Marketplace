import { requireActiveOrganizationMembership } from "@/modules/organizations/data/organizations";
import { listOrgLocations } from "@/modules/locations/data/locations";
import { PickupScanner } from "@/modules/orders/components/pickup-scanner";

export default async function MerchantScanPage() {
  const membership = await requireActiveOrganizationMembership();
  const locations = await listOrgLocations(membership.organization.id);

  return (
    <div className="mx-auto max-w-sm px-6 py-10">
      <h1 className="mb-1 text-xl font-semibold text-foreground">Verify pickup</h1>
      <p className="mb-6 text-sm text-muted-foreground">Scan the customer&apos;s QR or enter their pickup code.</p>
      <PickupScanner locations={locations} />
    </div>
  );
}
