"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { registerOrganizationSchema, type RegisterOrganizationInput } from "../domain/schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function registerOrganization(input: RegisterOrganizationInput): Promise<ActionResult> {
  const parsed = registerOrganizationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_organization_with_location", {
    p_name: v.name,
    p_country_id: v.countryId,
    p_location_name: v.locationName,
    p_address_line1: v.addressLine1,
    p_locality: v.locality,
    p_city: v.city,
    p_region: v.region ?? null,
    p_postal_code: v.postalCode ?? null,
    p_timezone: v.timezone,
    p_phone: v.phone,
    p_latitude: v.latitude ?? null,
    p_longitude: v.longitude ?? null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/merchant");
  return { ok: true };
}

type OrgStatus = "active" | "rejected" | "suspended" | "pending";

export async function setOrganizationStatus(
  organizationId: string,
  status: OrgStatus,
  note?: string,
): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_organization_status", {
    p_org_id: organizationId,
    p_new_status: status,
    p_note: note ?? null,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/merchants");
  revalidatePath("/merchant");
  return { ok: true };
}
