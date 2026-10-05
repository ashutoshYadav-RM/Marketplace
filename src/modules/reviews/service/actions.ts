"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { replyToReviewSchema, submitReviewSchema, type ReplyToReviewInput, type SubmitReviewInput } from "../domain/schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function submitReview(input: SubmitReviewInput): Promise<ActionResult> {
  const parsed = submitReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to leave a review." };

  // RLS (`reviews_customer_insert`, 0001) is what actually enforces "the
  // order must be completed and belong to you" — this insert either
  // succeeds under that rule or is rejected, nothing here re-checks it.
  const { error } = await supabase.from("reviews").insert({
    organization_id: v.organizationId,
    location_id: v.locationId ?? null,
    order_id: v.orderId,
    customer_id: user.id,
    rating: v.rating,
    comment: v.comment || null,
    images: v.images ?? [],
  });

  if (error) {
    return { ok: false, error: error.code === "23505" ? "You've already reviewed this order." : error.message };
  }
  revalidatePath(`/orders/${v.orderId}`);
  return { ok: true };
}

/** Uploads one photo into the customer's own folder, ahead of the review
 * row existing — mirrors the product-image flow's chicken-and-egg fix,
 * scoped by the uploader's own user id instead of an org/product path (see
 * 0012_review_images.sql). Returns the storage path to attach to the
 * review on submit. */
export async function uploadReviewImage(formData: FormData): Promise<ActionResult & { path?: string }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image to upload." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "Only image files are supported." };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to upload a photo." };

  const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const { error } = await supabase.storage.from("review-images").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, path };
}

// Admin-only in practice: RLS (`reviews_admin_moderate`, 0010) rejects the
// update for anyone else.
export async function setReviewHidden(reviewId: string, hidden: boolean): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("reviews").update({ hidden }).eq("id", reviewId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/reviews");
  return { ok: true };
}

export async function replyToReview(input: ReplyToReviewInput): Promise<ActionResult> {
  const parsed = replyToReviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("reviews")
    .update({ reply: v.reply, replied_at: new Date().toISOString() })
    .eq("id", v.reviewId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/merchant/reviews");
  return { ok: true };
}
