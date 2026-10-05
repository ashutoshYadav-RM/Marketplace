import { Suspense, type ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Store, Sparkles, Wrench, Clock, RotateCcw } from "lucide-react";
import { SearchBar } from "@/modules/catalog/components/search-bar";
import { CategoryRow } from "@/modules/catalog/components/category-row";
import { LocationPrompt } from "@/modules/locations/components/location-prompt";
import { getSearchLocation } from "@/modules/locations/data/search-location";
import { searchNearbyLocations, searchNearbyOffers, searchNearbyServices } from "@/modules/search/service/search";
import { LocationHitCard } from "@/modules/search/components/location-hit-card";
import { ServiceHitCard } from "@/modules/search/components/service-hit-card";
import { OfferHitCard } from "@/modules/search/components/offer-hit-card";
import { listReorderCandidates } from "@/modules/orders/data/orders";
import { ReorderCard } from "@/modules/orders/components/reorder-card";
import { getCurrentUser } from "@/modules/users/data/current-user";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

export default async function HomePage() {
  const [t, origin, user] = await Promise.all([getTranslations("home"), getSearchLocation(), getCurrentUser()]);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-8 sm:px-6">
      <section className="flex flex-col gap-4">
        <SearchBar />
        <LocationPrompt />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">{t("categoriesTitle")}</h2>
        <Suspense fallback={<CategoryRowSkeleton />}>
          <CategoryRow />
        </Suspense>
      </section>

      <HomeSection title={t("nearbyShopsTitle")}>
        {origin ? (
          <NearbyShops origin={origin} />
        ) : (
          <EmptyState icon={<Store className="h-6 w-6" />} title={t("nearbyShopsEmpty")} body={t("nearbyShopsEmptyBody")} />
        )}
      </HomeSection>

      <HomeSection title={t("offersTitle")}>
        {origin ? (
          <NearbyOffers origin={origin} />
        ) : (
          <EmptyState icon={<Sparkles className="h-6 w-6" />} title={t("nearbyShopsEmpty")} />
        )}
      </HomeSection>

      <HomeSection title={t("servicesTitle")}>
        {origin ? (
          <NearbyServices origin={origin} />
        ) : (
          <EmptyState icon={<Wrench className="h-6 w-6" />} title={t("nearbyShopsEmpty")} />
        )}
      </HomeSection>

      <div className="grid gap-10 sm:grid-cols-2">
        <HomeSection title={t("recentlyViewedTitle")}>
          <EmptyState icon={<Clock className="h-6 w-6" />} title={t("nearbyShopsEmpty")} />
        </HomeSection>
        <HomeSection title={t("reorderTitle")}>
          {user ? <Reorder /> : <EmptyState icon={<RotateCcw className="h-6 w-6" />} title={t("nearbyShopsEmpty")} />}
        </HomeSection>
      </div>
    </div>
  );
}

async function NearbyShops({ origin }: { origin: { latitude: number; longitude: number } }) {
  const t = await getTranslations("home");
  const hits = await searchNearbyLocations({ origin, limit: 6 });

  if (hits.length === 0) {
    return <EmptyState icon={<Store className="h-6 w-6" />} title={t("nearbyShopsEmpty")} body={t("nearbyShopsEmptyBody")} />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {hits.map((hit) => (
        <LocationHitCard key={hit.locationId} hit={hit} />
      ))}
    </div>
  );
}

async function NearbyServices({ origin }: { origin: { latitude: number; longitude: number } }) {
  const t = await getTranslations("home");
  const hits = await searchNearbyServices({ origin, limit: 4 });

  if (hits.length === 0) {
    return <EmptyState icon={<Wrench className="h-6 w-6" />} title={t("nearbyShopsEmpty")} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {hits.map((hit) => (
        <ServiceHitCard key={`${hit.serviceId}-${hit.locationSlug}`} hit={hit} />
      ))}
    </div>
  );
}

async function NearbyOffers({ origin }: { origin: { latitude: number; longitude: number } }) {
  const t = await getTranslations("home");
  const hits = await searchNearbyOffers({ origin, limit: 4 });

  if (hits.length === 0) {
    return <EmptyState icon={<Sparkles className="h-6 w-6" />} title={t("nearbyShopsEmpty")} />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {hits.map((hit) => (
        <OfferHitCard key={hit.offerId} hit={hit} />
      ))}
    </div>
  );
}

async function Reorder() {
  const t = await getTranslations("home");
  const candidates = await listReorderCandidates();

  if (candidates.length === 0) {
    return <EmptyState icon={<RotateCcw className="h-6 w-6" />} title={t("nearbyShopsEmpty")} />;
  }

  return (
    <div className="flex flex-col gap-2">
      {candidates.map((candidate) => (
        <ReorderCard key={candidate.variantId} candidate={candidate} />
      ))}
    </div>
  );
}

function HomeSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

function CategoryRowSkeleton() {
  return (
    <div className="flex gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-20 shrink-0" />
      ))}
    </div>
  );
}
