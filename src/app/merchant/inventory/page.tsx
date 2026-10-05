import Link from "next/link";
import { Package, Plus } from "lucide-react";
import { requireActiveOrganizationMembership } from "@/modules/organizations/data/organizations";
import { listOrgLocations } from "@/modules/locations/data/locations";
import { listOrgProducts } from "@/modules/catalog/data/products";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductCard } from "@/modules/catalog/components/product-card";

export default async function MerchantInventoryPage() {
  const membership = await requireActiveOrganizationMembership();
  const [locations, products] = await Promise.all([
    listOrgLocations(membership.organization.id),
    listOrgProducts(membership.organization.id),
  ]);
  const primaryLocationId = locations[0]?.id ?? null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Inventory</h1>
        <Link href="/merchant/inventory/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Add product
          </Button>
        </Link>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title="No products yet"
          body="Add your first product — a name, a price, and how many you have in stock is all it takes."
          action={
            <Link href="/merchant/inventory/new">
              <Button>Add your first product</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} locationId={primaryLocationId} />
          ))}
        </div>
      )}
    </div>
  );
}
