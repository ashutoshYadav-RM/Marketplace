"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createOfferSchema, type CreateOfferInput } from "../domain/schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createOffer(
  input: CreateOfferInput,
  organizationId: string,
  currencyCode: string,
): Promise<ActionResult> {
  const parsed = createOfferSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("offers").insert({
    organization_id: organizationId,
    code: v.code.toUpperCase(),
    type: v.type,
    // "flat" is stored in minor units like every other money field; "percent" is a plain 0–100 number.
    value: v.type === "flat" ? Math.round(v.value * 100) : v.value,
    min_order_minor: v.minOrder ? Math.round(v.minOrder * 100) : 0,
    usage_limit: v.usageLimit ?? null,
    currency_code: currencyCode,
  });

  if (error) return { ok: false, error: error.code === "23505" ? "That code is already in use." : error.message };
  revalidatePath("/merchant/offers");
  return { ok: true };
}

export async function setOfferActive(offerId: string, isActive: boolean): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("offers").update({ is_active: isActive }).eq("id", offerId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/merchant/offers");
  return { ok: true };
}
