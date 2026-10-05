import { Card } from "@/components/ui/card";
import { ShopPriceRow } from "./shop-price-row";
import type { ProductHit } from "../domain/types";

export function ProductGroup({ productName, hits }: { productName: string; hits: ProductHit[] }) {
  const variantLabel = hits[0]?.variantName && hits[0].variantName !== "Default" ? ` — ${hits[0].variantName}` : "";

  return (
    <Card className="p-4">
      <h3 className="mb-1 font-semibold text-foreground">
        {productName}
        {variantLabel}
      </h3>
      <div className="flex flex-col">
        {hits.map((hit) => (
          <ShopPriceRow key={`${hit.locationId}-${hit.variantId}`} hit={hit} />
        ))}
      </div>
    </Card>
  );
}

/** Groups flat search hits by product so shops selling the same thing show
 * together — matches the comparison mockup in blueprint §"Search". */
export function groupProductHits(hits: ProductHit[]): { key: string; productName: string; hits: ProductHit[] }[] {
  const groups = new Map<string, { productName: string; hits: ProductHit[] }>();
  for (const hit of hits) {
    const key = `${hit.productName}|${hit.variantName}`;
    if (!groups.has(key)) groups.set(key, { productName: hit.productName, hits: [] });
    groups.get(key)!.hits.push(hit);
  }
  return Array.from(groups.entries()).map(([key, value]) => ({ key, ...value }));
}
