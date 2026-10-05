import { requireActiveOrganizationMembership, getCountryDefaultCurrency } from "@/modules/organizations/data/organizations";
import { listAllServiceCategories } from "@/modules/catalog/data/categories";
import { ServiceForm } from "@/modules/services/components/service-form";

export default async function NewServicePage() {
  const membership = await requireActiveOrganizationMembership();
  const [categories, currencyCode] = await Promise.all([
    listAllServiceCategories(),
    getCountryDefaultCurrency(membership.organization.country_id),
  ]);

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-1 text-xl font-semibold text-foreground">Add a service</h1>
      <p className="mb-8 text-sm text-muted-foreground">A name and a visit charge is enough to start.</p>
      <ServiceForm organizationId={membership.organization.id} categories={categories} currencyCode={currencyCode} />
    </div>
  );
}
