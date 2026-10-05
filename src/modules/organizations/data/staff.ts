import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StaffMember = {
  id: string; // organization_members.id
  userId: string;
  role: "owner" | "admin" | "manager" | "cashier" | "staff";
  locationId: string | null;
  locationName: string | null;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  isOwner: boolean;
  createdAt: string;
};

/** RLS (`org_members_self_or_staff_read`, 0001) already scopes this to
 * members of the caller's own org. */
export async function listOrgStaff(organizationId: string): Promise<StaffMember[]> {
  const supabase = await createSupabaseServerClient();
  const { data: org } = await supabase.from("organizations").select("owner_id").eq("id", organizationId).maybeSingle();

  const { data, error } = await supabase
    .from("organization_members")
    .select("id, user_id, role, location_id, created_at, location:locations(name)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  const userIds = Array.from(new Set(data.map((m) => m.user_id)));
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, email, phone_e164").in("id", userIds);
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return data.map((m) => {
    const location = Array.isArray(m.location) ? m.location[0] : m.location;
    const profile = profileById.get(m.user_id);
    return {
      id: m.id,
      userId: m.user_id,
      role: m.role,
      locationId: m.location_id,
      locationName: location?.name ?? null,
      fullName: profile?.full_name ?? null,
      phone: profile?.phone_e164 ?? null,
      email: profile?.email ?? null,
      isOwner: m.user_id === org?.owner_id,
      createdAt: m.created_at,
    };
  });
}
