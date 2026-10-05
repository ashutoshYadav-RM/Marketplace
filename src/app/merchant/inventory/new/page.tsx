import { requireActiveOrganizationMembership, getCountryDefaultCurrency } from "@/modules/organizations/data/organizations";
import { listOrgLocations } from "@/modules/locations/data/locations";
import { listAllProductCategories } from "@/modules/catalog/data/categories";
import { ProductForm } from "@/modules/catalog/components/product-form";

export default async function NewProductPage() {
  const membership = await requireActiveOrganizationMembership();
  const [locations, categories, currencyCode] = await Promise.all([
    listOrgLocations(membership.organization.id),
    listAllProductCategories(),
    getCountryDefaultCurrency(membership.organization.country_id),
  ]);

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-1 text-xl font-semibold text-foreground">Add a product</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Name, price, and stock is enough to start — add photos and more variants any time after.
      </p>
      <ProductForm
        organizationId={membership.organization.id}
        locations={locations}
        categories={categories}
        currencyCode={currencyCode}
      />
    </div>
  );
}
