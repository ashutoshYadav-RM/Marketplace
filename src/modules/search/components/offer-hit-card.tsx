import Link from "next/link";
import { Tag } from "lucide-react";
import { getLocale } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { formatDistance } from "@/lib/distance";
import { formatMoney } from "@/lib/money";
import type { OfferHit } from "../domain/types";

export async function OfferHitCard({ hit }: { hit: OfferHit }) {
  const locale = await getLocale();
  const label =
    hit.type === "percent"
      ? `${hit.value}% off`
      : `${formatMoney({ amountMinor: hit.value, currencyCode: hit.currencyCode ?? "USD" }, locale)} off`;

  return (
    <Link href={`/shop/${hit.organizationSlug}/${hit.locationSlug}`}>
      <Card className="flex items-center gap-4 p-4 transition-colors hover:border-brand">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-ready-soft text-accent-ready">
          <Tag className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">
            {label} at {hit.organizationName}
          </p>
          <p className="font-mono text-xs text-muted-foreground">Code {hit.code}</p>
        </div>
        <span className="shrink-0 text-sm font-medium text-muted-foreground">{formatDistance(hit.distanceMeters)}</span>
      </Card>
    </Link>
  );
}
