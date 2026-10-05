import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CategorySummary = {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
};

export type CategoryDetail = CategorySummary & { type: "product" | "service" | "both" };
export type AdminCategoryRow = CategoryDetail & { sortOrder: number; parentId: string | null };

/**
 * Root product categories for the home page's category row. Public read
 * (see `categories_public_read` in 0001_init.sql) — no auth required.
 */
export async function listHomeCategories(limit = 7): Promise<CategorySummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, icon")
    .eq("type", "product")
    .is("parent_id", null)
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (error) {
    // A missing/unlinked Supabase project surfaces here rather than crashing
    // the page — the home shell still renders with an empty category row.
    console.error("listHomeCategories failed:", error.message);
    return [];
  }
  return (data ?? []) as CategorySummary[];
}

export async function getCategoryBySlug(slug: string): Promise<CategoryDetail | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, icon, type")
    .eq("slug", slug)
    .maybeSingle();
  if (error || !data) return null;
  return data as CategoryDetail;
}

/** Full product category list — for the merchant's "add product" form. */
export async function listAllProductCategories(): Promise<CategorySummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, icon")
    .eq("type", "product")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("listAllProductCategories failed:", error.message);
    return [];
  }
  return (data ?? []) as CategorySummary[];
}

/** Service category list — for the merchant's "add service" form. */
export async function listAllServiceCategories(): Promise<CategorySummary[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, icon")
    .in("type", ["service", "both"])
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("listAllServiceCategories failed:", error.message);
    return [];
  }
  return (data ?? []) as CategorySummary[];
}

/** The full taxonomy, for the admin categories page. */
export async function listAllCategoriesForAdmin(): Promise<AdminCategoryRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name, icon, type, sort_order, parent_id")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("listAllCategoriesForAdmin failed:", error.message);
    return [];
  }
  return (data ?? []).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    icon: c.icon,
    type: c.type,
    sortOrder: c.sort_order,
    parentId: c.parent_id,
  }));
}
