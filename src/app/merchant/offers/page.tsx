import { Tag } from "lucide-react";
import { getLocale } from "next-intl/server";
import { requireActiveOrganizationMembership, getCountryDefaultCurrency } from "@/modules/organizations/data/organizations";
import { listOrgOffers } from "@/modules/offers/data/offers";
import { OfferForm } from "@/modules/offers/components/offer-form";
import { OfferRow } from "@/modules/offers/components/offer-row";
import { EmptyState } from "@/components/ui/empty-state";

export default async function MerchantOffersPage() {
  const membership = await requireActiveOrganizationMembership();
  const [offers, currencyCode, locale] = await Promise.all([
    listOrgOffers(membership.organization.id),
    getCountryDefaultCurrency(membership.organization.country_id),
    getLocale(),
  ]);

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="mb-1 text-xl font-semibold text-foreground">Offers</h1>
      <p className="mb-6 text-sm text-muted-foreground">Coupon codes customers can apply at checkout.</p>

      <OfferForm organizationId={membership.organization.id} currencyCode={currencyCode} />

      <div className="mt-6 flex flex-col gap-3">
        {offers.length === 0 ? (
          <EmptyState icon={<Tag className="h-6 w-6" />} title="No offers yet" />
        ) : (
          offers.map((offer) => <OfferRow key={offer.id} offer={offer} locale={locale} />)
        )}
      </div>
    </div>
  );
}
