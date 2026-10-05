"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  createServiceSchema,
  requestBookingSchema,
  updateServiceSchema,
  type BookingStatus,
  type CreateServiceInput,
  type RequestBookingInput,
  type UpdateServiceInput,
} from "../domain/schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createService(input: CreateServiceInput, organizationId: string): Promise<ActionResult> {
  const parsed = createServiceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("services").insert({
    organization_id: organizationId,
    category_id: v.categoryId || null,
    name: v.name,
    description: v.description || null,
    visit_charge_minor: Math.round(v.visitCharge * 100),
    currency_code: v.currencyCode,
    duration_estimate_minutes: v.durationMinutes ?? null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/merchant/services");
  return { ok: true };
}

export async function updateService(input: UpdateServiceInput): Promise<ActionResult> {
  const parsed = updateServiceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("services")
    .update({
      name: v.name,
      description: v.description || null,
      category_id: v.categoryId || null,
      visit_charge_minor: Math.round(v.visitCharge * 100),
      duration_estimate_minutes: v.durationMinutes ?? null,
      is_active: v.isActive,
    })
    .eq("id", v.serviceId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/merchant/services/${v.serviceId}`);
  revalidatePath("/merchant/services");
  return { ok: true };
}

export async function archiveService(serviceId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("services")
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq("id", serviceId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/merchant/services");
  return { ok: true };
}

export async function requestBooking(input: RequestBookingInput): Promise<ActionResult & { bookingId?: string }> {
  const parsed = requestBookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("request_service_booking", {
    p_organization_id: v.organizationId,
    p_location_id: v.locationId,
    p_service_id: v.serviceId,
    p_requested_time: new Date(v.requestedTime).toISOString(),
    p_description: v.description ?? null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/bookings");
  return { ok: true, bookingId: data?.id };
}

export async function advanceBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  note?: string,
  scheduledTime?: string,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("transition_booking_status", {
    p_booking_id: bookingId,
    p_new_status: newStatus,
    p_note: note ?? null,
    p_scheduled_time: scheduledTime ? new Date(scheduledTime).toISOString() : null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/merchant/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  return { ok: true };
}
