import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OfferRow = {
  id: string;
  code: string;
  type: "percent" | "flat";
  value: number;
  minOrderMinor: number;
  usageLimit: number | null;
  redeemedCount: number;
  isActive: boolean;
  currencyCode: string | null;
};

export async function listOrgOffers(organizationId: string): Promise<OfferRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("offers")
    .select("id, code, type, value, min_order_minor, usage_limit, redeemed_count, is_active, currency_code")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listOrgOffers failed:", error.message);
    return [];
  }
  return (data ?? []).map((o) => ({
    id: o.id,
    code: o.code,
    type: o.type,
    value: o.value,
    minOrderMinor: o.min_order_minor,
    usageLimit: o.usage_limit,
    redeemedCount: o.redeemed_count,
    isActive: o.is_active,
    currencyCode: o.currency_code,
  }));
}
