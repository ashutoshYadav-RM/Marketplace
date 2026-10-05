import { Star } from "lucide-react";
import { listAllReviewsForAdmin } from "@/modules/reviews/data/reviews";
import { AdminReviewRowCard } from "@/modules/reviews/components/admin-review-row";
import { EmptyState } from "@/components/ui/empty-state";

export default async function AdminReviewsPage() {
  const reviews = await listAllReviewsForAdmin();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Reviews</h1>
      {reviews.length === 0 ? (
        <EmptyState icon={<Star className="h-6 w-6" />} title="No reviews yet" />
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((review) => (
            <AdminReviewRowCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
