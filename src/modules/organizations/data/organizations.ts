import "server-only";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  country_id: string | null;
  status: "pending" | "active" | "suspended" | "rejected";
  created_at: string;
};

export type CurrentMembership = {
  role: "owner" | "admin" | "manager" | "cashier" | "staff";
  organization: OrganizationRow;
};

/**
 * A signed-in user's merchant membership, if any. V1 keeps this to "one
 * organization per person" in the UI even though the schema (and RLS)
 * already support belonging to several — that's a Phase-2-or-later surface
 * (an org switcher), not a data model change.
 */
export async function getCurrentUserMembership(): Promise<CurrentMembership | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("organization_members")
    .select("role, organization:organizations(id, name, slug, owner_id, country_id, status, created_at)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.organization) return null;
  return { role: data.role, organization: data.organization as unknown as OrganizationRow };
}

/**
 * Onboarding always sets `organizations.country_id`, so the fallback below
 * is defensive, not a business default — it should never actually fire.
 */
export async function getCountryDefaultCurrency(countryId: string | null): Promise<string> {
  const FALLBACK_CURRENCY = "USD";
  if (!countryId) return FALLBACK_CURRENCY;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("countries").select("default_currency").eq("iso2", countryId).maybeSingle();
  return data?.default_currency ?? FALLBACK_CURRENCY;
}

/** Every page under /merchant/inventory needs an approved shop — this is
 * the shared gate so each page doesn't re-implement the redirect logic. */
export async function requireActiveOrganizationMembership(): Promise<CurrentMembership> {
  const membership = await getCurrentUserMembership();
  if (!membership) redirect("/merchant");
  if (membership.organization.status !== "active") redirect("/merchant");
  return membership;
}

export type CountryOption = { iso2: string; name: string; phoneCode: string };

export async function listCountries(): Promise<CountryOption[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("countries")
    .select("iso2, name, phone_code")
    .eq("is_active", true)
    .order("name");

  if (error) return [];
  return (data ?? []).map((c) => ({ iso2: c.iso2, name: c.name, phoneCode: c.phone_code }));
}

export type PendingOrganization = OrganizationRow & {
  location: { city: string | null; locality: string | null } | null;
};

/** Admin-only in practice: RLS lets an admin see every org (0002), the
 * `pending` filter is what makes this an approval queue. */
export async function listPendingOrganizations(): Promise<PendingOrganization[]> {
  return listOrganizationsForAdmin("pending");
}

/** Every organization, or one status slice of it — the admin merchants page. */
export async function listOrganizationsForAdmin(status?: OrganizationRow["status"]): Promise<PendingOrganization[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("organizations")
    .select("id, name, slug, owner_id, country_id, status, created_at, location:locations(city, locality)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;

  if (error) {
    console.error("listOrganizationsForAdmin failed:", error.message);
    return [];
  }
  return (data ?? []).map((org) => ({
    ...org,
    location: Array.isArray(org.location) ? (org.location[0] ?? null) : org.location,
  })) as PendingOrganization[];
}
