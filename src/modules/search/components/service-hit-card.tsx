import Link from "next/link";
import { getLocale } from "next-intl/server";
import { Wrench } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatDistance } from "@/lib/distance";
import { formatMoney } from "@/lib/money";
import type { ServiceHit } from "../domain/types";

export async function ServiceHitCard({ hit }: { hit: ServiceHit }) {
  const locale = await getLocale();

  return (
    <Link href={`/shop/${hit.organizationSlug}/${hit.locationSlug}`}>
      <Card className="flex items-center gap-4 p-4 transition-colors hover:border-brand">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background">
          <Wrench className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium text-foreground">{hit.serviceName}</p>
          <p className="text-sm text-muted-foreground">{hit.organizationName}</p>
        </div>
        <div className="shrink-0 text-right">
          {hit.visitChargeMinor != null && hit.currencyCode && (
            <p className="font-medium text-foreground">
              {formatMoney({ amountMinor: hit.visitChargeMinor, currencyCode: hit.currencyCode }, locale)}
            </p>
          )}
          <p className="text-sm text-muted-foreground">{formatDistance(hit.distanceMeters)}</p>
        </div>
      </Card>
    </Link>
  );
}
