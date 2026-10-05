"use client";

import { useState, useTransition } from "react";
import { EyeOff, Eye } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "./star-rating";
import { ReviewImages } from "./review-images";
import { setReviewHidden } from "../service/actions";
import type { AdminReviewRow } from "../data/reviews";

export function AdminReviewRowCard({ review }: { review: AdminReviewRow }) {
  const [hidden, setHidden] = useState(review.hidden);
  const [pending, startTransition] = useTransition();

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StarRating value={review.rating} />
          {hidden && <Badge tone="danger">Hidden</Badge>}
        </div>
        <span className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {review.customerName ?? "Customer"} · {review.organizationName}
      </p>
      {review.comment && <p className="mt-2 text-sm text-foreground">{review.comment}</p>}
      <ReviewImages images={review.images} />
      <div className="mt-3">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await setReviewHidden(review.id, !hidden);
              if (result.ok) setHidden(!hidden);
            })
          }
        >
          {hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          {hidden ? "Unhide" : "Hide"}
        </Button>
      </div>
    </Card>
  );
}
