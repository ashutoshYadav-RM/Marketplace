"use server";

import { revalidatePath } from "next/cache";
import { parsePhoneNumber } from "libphonenumber-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { inviteStaffSchema, type InviteStaffInput, type InvitableRole } from "../domain/staff-schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * There is no email-invite flow yet (no SMTP/notification infra for it) —
 * this looks the phone number up against existing profiles and links them
 * directly. That means the person has to have signed up at least once
 * (even just as a customer) before an owner/admin can add them as staff;
 * the error message says so rather than silently failing.
 */
export async function inviteStaffByPhone(organizationId: string, input: InviteStaffInput): Promise<ActionResult> {
  const parsed = inviteStaffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: actor },
  } = await supabase.auth.getUser();
  if (!actor) return { ok: false, error: "Sign in first." };

  const e164 = parsePhoneNumber(v.phone).number;
  const { data: profile } = await supabase.from("profiles").select("id").eq("phone_e164", e164).maybeSingle();
  if (!profile) {
    return { ok: false, error: "No account with that phone number yet — ask them to sign up first, then add them." };
  }

  // RLS (`org_members_admin_write`, 0001) is what actually restricts this
  // insert to owners/admins of this org — the unique(organization_id,
  // user_id) constraint turns "already a member" into a clean error.
  const { error } = await supabase.from("organization_members").insert({
    organization_id: organizationId,
    user_id: profile.id,
    role: v.role,
    location_id: v.locationId || null,
    invited_by: actor.id,
  });

  if (error) {
    return { ok: false, error: error.code === "23505" ? "Already a staff member here." : error.message };
  }
  revalidatePath("/merchant/staff");
  return { ok: true };
}

export async function updateStaffRole(memberId: string, role: InvitableRole): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: member } = await supabase.from("organization_members").select("role").eq("id", memberId).maybeSingle();
  if (member?.role === "owner") return { ok: false, error: "The owner's role can't be changed here." };

  const { error } = await supabase.from("organization_members").update({ role }).eq("id", memberId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/merchant/staff");
  return { ok: true };
}

export async function removeStaffMember(memberId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { data: member } = await supabase.from("organization_members").select("role").eq("id", memberId).maybeSingle();
  if (member?.role === "owner") return { ok: false, error: "The owner can't be removed." };

  const { error } = await supabase.from("organization_members").delete().eq("id", memberId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/merchant/staff");
  return { ok: true };
}
