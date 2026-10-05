import { publicEnv } from "@/lib/env";

/** Public URL for a path in the `product-images` bucket (see 0003_catalog.sql — public bucket, org-scoped writes). */
export function productImageUrl(path: string): string {
  return `${publicEnv.supabaseUrl}/storage/v1/object/public/product-images/${path}`;
}
