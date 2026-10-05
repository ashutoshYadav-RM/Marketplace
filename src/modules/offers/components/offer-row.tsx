"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { setOfferActive } from "../service/actions";
import type { OfferRow as OfferRowType } from "../data/offers";

export function OfferRow({ offer, locale }: { offer: OfferRowType; locale: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const valueLabel =
    offer.type === "percent"
      ? `${offer.value}% off`
      : `${formatMoney({ amountMinor: offer.value, currencyCode: offer.currencyCode ?? "USD" }, locale)} off`;

  return (
    <Card className="flex items-center justify-between gap-3 p-4">
      <div>
        <p className="font-mono font-semibold text-foreground">{offer.code}</p>
        <p className="text-sm text-muted-foreground">
          {valueLabel}
          {offer.minOrderMinor > 0 && ` · min ${formatMoney({ amountMinor: offer.minOrderMinor, currencyCode: offer.currencyCode ?? "USD" }, locale)}`}
          {offer.usageLimit && ` · ${offer.redeemedCount}/${offer.usageLimit} used`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={offer.isActive ? "success" : "neutral"}>{offer.isActive ? "Active" : "Off"}</Badge>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await setOfferActive(offer.id, !offer.isActive);
              router.refresh();
            })
          }
        >
          {offer.isActive ? "Turn off" : "Turn on"}
        </Button>
      </div>
    </Card>
  );
}
