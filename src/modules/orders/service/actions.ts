"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { placeOrderSchema, posSaleSchema, type PlaceOrderInput, type PosSaleInput, type OrderStatus } from "../domain/schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function placeOrder(input: PlaceOrderInput): Promise<ActionResult & { orderId?: string }> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_organization_id: v.organizationId,
    p_location_id: v.locationId,
    p_items: v.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
    p_notes: v.notes ?? null,
    p_coupon_code: v.couponCode || null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/orders");
  return { ok: true, orderId: data?.id };
}

export async function createPosSale(input: PosSaleInput): Promise<ActionResult & { orderId?: string }> {
  const parsed = posSaleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_pos_sale", {
    p_organization_id: v.organizationId,
    p_location_id: v.locationId,
    p_items: v.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
    p_discount_minor: Math.round(v.discountMinor ?? 0),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, orderId: data?.id };
}

export type PickupVerifyResult =
  | { ok: true; orderId: string }
  | { ok: false; reason: "not_found" | "wrong_shop" | "not_authorized" | "already_picked_up" | "not_ready" };

export async function verifyPickupByToken(qrToken: string, locationId: string): Promise<PickupVerifyResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("verify_and_complete_pickup", {
    p_qr_token: qrToken,
    p_scanning_location_id: locationId,
  });
  if (error || !data) return { ok: false, reason: "not_found" };
  revalidatePath("/merchant/orders");
  return data.ok ? { ok: true, orderId: data.order_id } : { ok: false, reason: data.reason };
}

export async function verifyPickupByCode(pickupCode: string, locationId: string): Promise<PickupVerifyResult> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("verify_pickup_by_code", {
    p_pickup_code: pickupCode,
    p_scanning_location_id: locationId,
  });
  if (error || !data) return { ok: false, reason: "not_found" };
  revalidatePath("/merchant/orders");
  return data.ok ? { ok: true, orderId: data.order_id } : { ok: false, reason: data.reason };
}

export async function advanceOrderStatus(orderId: string, newStatus: OrderStatus, note?: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("transition_order_status", {
    p_order_id: orderId,
    p_new_status: newStatus,
    p_note: note ?? null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/merchant/orders");
  revalidatePath(`/orders/${orderId}`);
  return { ok: true };
}
