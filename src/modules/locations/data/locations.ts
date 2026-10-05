import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type OrgLocation = {
  id: string;
  name: string;
  city: string | null;
  countryId: string | null;
};

export type ShopLocation = {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  name: string;
  slug: string;
  addressLine1: string | null;
  locality: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  phone: string | null;
  timezone: string;
  isVerified: boolean;
};

/** The public shop page's identity lookup — both slugs are public (RLS:
 * `locations_public_read`/`organizations_public_read`, `status = 'active'`). */
export async function getShopBySlug(organizationSlug: string, locationSlug: string): Promise<ShopLocation | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("locations")
    .select(
      `id, organization_id, name, slug, address_line1, locality, city, region, postal_code, phone, timezone, is_verified,
       organization:organizations!inner(name, slug, status)`,
    )
    .eq("slug", locationSlug)
    .eq("organization.slug", organizationSlug)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) return null;
  const org = Array.isArray(data.organization) ? data.organization[0] : data.organization;
  if (!org || org.status !== "active") return null;

  return {
    id: data.id,
    organizationId: data.organization_id,
    organizationName: org.name,
    organizationSlug: org.slug,
    name: data.name,
    slug: data.slug,
    addressLine1: data.address_line1,
    locality: data.locality,
    city: data.city,
    region: data.region,
    postalCode: data.postal_code,
    phone: data.phone,
    timezone: data.timezone,
    isVerified: data.is_verified,
  };
}

export async function listOrgLocations(organizationId: string): Promise<OrgLocation[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("locations")
    .select("id, name, city, country_id")
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("listOrgLocations failed:", error.message);
    return [];
  }
  return (data ?? []).map((l) => ({ id: l.id, name: l.name, city: l.city, countryId: l.country_id }));
}
