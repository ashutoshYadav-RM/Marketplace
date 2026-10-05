import { publicEnv } from "@/lib/env";

/** Public URL for a path in the `review-images` bucket (0012_review_images.sql). */
export function reviewImageUrl(path: string): string {
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/review-images/${path}`;
}
