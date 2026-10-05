import { Star } from "lucide-react";
import { requireActiveOrganizationMembership } from "@/modules/organizations/data/organizations";
import { listShopReviews } from "@/modules/reviews/data/reviews";
import { StarRating } from "@/modules/reviews/components/star-rating";
import { MerchantReplyForm } from "@/modules/reviews/components/merchant-reply-form";
import { ReviewImages } from "@/modules/reviews/components/review-images";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function MerchantReviewsPage() {
  const membership = await requireActiveOrganizationMembership();
  const { reviews, average } = await listShopReviews(membership.organization.id);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Reviews</h1>
        {average != null && (
          <span className="flex items-center gap-1.5 text-sm">
            <StarRating value={average} size="md" />
            <span className="font-medium text-foreground">{average.toFixed(1)}</span>
          </span>
        )}
      </div>

      {reviews.length === 0 ? (
        <EmptyState icon={<Star className="h-6 w-6" />} title="No reviews yet" body="They'll show up here once customers pick up their orders." />
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-center justify-between">
                <StarRating value={review.rating} />
                <span className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{review.customerName ?? "Customer"}</p>
              {review.comment && <p className="mt-2 text-sm text-foreground">{review.comment}</p>}
              <ReviewImages images={review.images} />
              {review.reply ? (
                <div className="mt-3 rounded-xl bg-background p-3 text-sm">
                  <p className="mb-0.5 text-xs font-medium text-muted-foreground">Your reply</p>
                  <p className="text-foreground">{review.reply}</p>
                </div>
              ) : (
                <div className="mt-2">
                  <MerchantReplyForm reviewId={review.id} />
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
