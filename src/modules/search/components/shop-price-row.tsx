import Link from "next/link";
import { getLocale } from "next-intl/server";
import { formatMoney } from "@/lib/money";
import { formatDistance } from "@/lib/distance";
import { Badge } from "@/components/ui/badge";
import type { ProductHit } from "../domain/types";

export async function ShopPriceRow({ hit }: { hit: ProductHit }) {
  const locale = await getLocale();

  return (
    <Link
      href={`/shop/${hit.organizationSlug}/${hit.locationSlug}`}
      className="flex items-center justify-between gap-4 border-b border-border py-3 last:border-0 hover:bg-surface-raised"
    >
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{hit.organizationName}</p>
        <p className="text-xs text-muted-foreground">{formatDistance(hit.distanceMeters)} away</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="font-semibold text-foreground">
          {formatMoney({ amountMinor: hit.amountMinor, currencyCode: hit.currencyCode }, locale)}
        </span>
        <Badge tone={hit.isAvailable && hit.stockQty > 0 ? "success" : "danger"}>
          {hit.isAvailable && hit.stockQty > 0 ? (hit.stockQty <= 3 ? "Limited" : "Available") : "Out of stock"}
        </Badge>
      </div>
    </Link>
  );
}
