import { requireActiveOrganizationMembership, getCountryDefaultCurrency } from "@/modules/organizations/data/organizations";
import { listOrgLocations } from "@/modules/locations/data/locations";
import { listOrgProducts } from "@/modules/catalog/data/products";
import { PosTerminal } from "@/modules/orders/components/pos-terminal";
import { EmptyState } from "@/components/ui/empty-state";
import { ScanBarcode } from "lucide-react";

export default async function MerchantPosPage() {
  const membership = await requireActiveOrganizationMembership();
  const [locations, products, currencyCode] = await Promise.all([
    listOrgLocations(membership.organization.id),
    listOrgProducts(membership.organization.id),
    getCountryDefaultCurrency(membership.organization.country_id),
  ]);

  const locationId = locations[0]?.id;

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <h1 className="mb-1 text-xl font-semibold text-foreground">Scan &amp; bill</h1>
      <p className="mb-6 text-sm text-muted-foreground">For customers buying in person, right now.</p>

      {!locationId ? (
        <EmptyState icon={<ScanBarcode className="h-6 w-6" />} title="Add a location first" />
      ) : (
        <PosTerminal
          organizationId={membership.organization.id}
          locationId={locationId}
          currencyCode={currencyCode}
          products={products.filter((p) => p.isActive)}
          canBill={membership.role !== "staff"}
        />
      )}
    </div>
  );
}
