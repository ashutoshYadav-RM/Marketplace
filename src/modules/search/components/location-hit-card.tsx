import Link from "next/link";
import { Store, BadgeCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatDistance } from "@/lib/distance";
import type { LocationHit } from "../domain/types";

export function LocationHitCard({ hit }: { hit: LocationHit }) {
  return (
    <Link href={`/shop/${hit.organizationSlug}/${hit.locationSlug}`}>
      <Card className="flex items-center gap-4 p-4 transition-colors hover:border-brand">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background">
          <Store className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate font-medium text-foreground">{hit.organizationName}</p>
            {hit.isVerified && <BadgeCheck className="h-4 w-4 shrink-0 text-brand" aria-label="Verified" />}
          </div>
          <p className="text-sm text-muted-foreground">
            {[hit.locality, hit.city].filter(Boolean).join(", ") || hit.locationName}
          </p>
        </div>
        <span className="shrink-0 text-sm font-medium text-muted-foreground">{formatDistance(hit.distanceMeters)}</span>
      </Card>
    </Link>
  );
}
