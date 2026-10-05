import type { ReactNode } from "react";
import { Search as SearchIcon } from "lucide-react";
import { getSearchLocation } from "@/modules/locations/data/search-location";
import { LocationPrompt } from "@/modules/locations/components/location-prompt";
import { getCategoryBySlug } from "@/modules/catalog/data/categories";
import { searchNearbyLocations, searchNearbyProducts, searchNearbyServices } from "@/modules/search/service/search";
import { groupProductHits, ProductGroup } from "@/modules/search/components/product-group";
import { LocationHitCard } from "@/modules/search/components/location-hit-card";
import { ServiceHitCard } from "@/modules/search/components/service-hit-card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; type?: string }>;
}) {
  const { q, category, type } = await searchParams;
  const origin = await getSearchLocation();

  if (!origin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <LocationPrompt />
      </div>
    );
  }

  const categoryRow = category ? await getCategoryBySlug(category) : null;
  const wantsServices = type === "service" || categoryRow?.type === "service";

  const heading = q ? `Results for "${q}"` : categoryRow ? categoryRow.name : wantsServices ? "Services nearby" : "Shops nearby";

  if (wantsServices) {
    const hits = await searchNearbyServices({ origin, query: q, categoryId: categoryRow?.id });
    return (
      <ResultsShell heading={heading}>
        {hits.length === 0 ? (
          <NoResults />
        ) : (
          <div className="flex flex-col gap-3">
            {hits.map((hit) => (
              <ServiceHitCard key={`${hit.serviceId}-${hit.locationSlug}`} hit={hit} />
            ))}
          </div>
        )}
      </ResultsShell>
    );
  }

  if (q) {
    const hits = await searchNearbyProducts({ origin, query: q, categoryId: categoryRow?.id });
    const groups = groupProductHits(hits);
    return (
      <ResultsShell heading={heading}>
        {groups.length === 0 ? (
          <NoResults />
        ) : (
          <div className="flex flex-col gap-4">
            {groups.map((group) => (
              <ProductGroup key={group.key} productName={group.productName} hits={group.hits} />
            ))}
          </div>
        )}
      </ResultsShell>
    );
  }

  const hits = await searchNearbyLocations({ origin, categoryId: categoryRow?.id });
  return (
    <ResultsShell heading={heading}>
      {hits.length === 0 ? (
        <NoResults />
      ) : (
        <div className="flex flex-col gap-3">
          {hits.map((hit) => (
            <LocationHitCard key={hit.locationId} hit={hit} />
          ))}
        </div>
      )}
    </ResultsShell>
  );
}

function ResultsShell({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="mb-5 text-lg font-semibold text-foreground">{heading}</h1>
      {children}
    </div>
  );
}

function NoResults() {
  return (
    <EmptyState
      icon={<SearchIcon className="h-6 w-6" />}
      title="Nothing nearby yet"
      body="Try a wider search, or check back as more shops join in your area."
    />
  );
}
