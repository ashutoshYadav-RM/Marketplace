import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ReviewRow = {
  id: string;
  rating: number;
  comment: string | null;
  images: string[];
  reply: string | null;
  repliedAt: string | null;
  createdAt: string;
  customerName: string | null;
};

export type AdminReviewRow = ReviewRow & { organizationName: string; hidden: boolean };

/** Platform-wide moderation queue (RLS: reviews_public_read includes
 * hidden rows for admins, 0010). */
export async function listAllReviewsForAdmin(limit = 50): Promise<AdminReviewRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, images, reply, replied_at, created_at, hidden, customer_id, organization:organizations(name)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const customerIds = Array.from(new Set(data.map((r) => r.customer_id)));
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", customerIds);
  const nameByCustomer = new Map((profiles ?? []).map((p) => [p.id, p.full_name as string | null]));

  return data.map((r) => {
    const org = Array.isArray(r.organization) ? r.organization[0] : r.organization;
    return {
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      images: r.images ?? [],
      reply: r.reply,
      repliedAt: r.replied_at,
      createdAt: r.created_at,
      customerName: nameByCustomer.get(r.customer_id) ?? null,
      organizationName: org?.name ?? "",
      hidden: r.hidden,
    };
  });
}

export async function listShopReviews(organizationId: string): Promise<{ reviews: ReviewRow[]; average: number | null }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, images, reply, replied_at, created_at, customer_id")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) return { reviews: [], average: null };

  const customerIds = Array.from(new Set(data.map((r) => r.customer_id)));
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", customerIds);
  const nameByCustomer = new Map((profiles ?? []).map((p) => [p.id, p.full_name as string | null]));

  const reviews = data.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    images: r.images ?? [],
    reply: r.reply,
    repliedAt: r.replied_at,
    createdAt: r.created_at,
    customerName: nameByCustomer.get(r.customer_id) ?? null,
  }));
  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  return { reviews, average };
}

export async function getReviewForOrder(orderId: string): Promise<ReviewRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, images, reply, replied_at, created_at")
    .eq("order_id", orderId)
    .maybeSingle();

  if (error || !data) return null;
  return {
    id: data.id,
    rating: data.rating,
    comment: data.comment,
    images: data.images ?? [],
    reply: data.reply,
    repliedAt: data.replied_at,
    createdAt: data.created_at,
    customerName: null,
  };
}
