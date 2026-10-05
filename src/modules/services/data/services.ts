import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ServiceRow = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  visitChargeMinor: number;
  currencyCode: string;
  durationMinutes: number | null;
  isActive: boolean;
};

const SERVICE_SELECT = `
  id, organization_id, name, description, category_id, visit_charge_minor, currency_code, duration_estimate_minutes, is_active,
  category:categories(name)
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapServiceRow(row: any): ServiceRow {
  const category = Array.isArray(row.category) ? row.category[0] : row.category;
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    categoryName: category?.name ?? null,
    visitChargeMinor: row.visit_charge_minor,
    currencyCode: row.currency_code,
    durationMinutes: row.duration_estimate_minutes,
    isActive: row.is_active,
  };
}

export async function listOrgServices(organizationId: string): Promise<ServiceRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("services")
    .select(SERVICE_SELECT)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listOrgServices failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapServiceRow);
}

export async function listActiveOrgServices(organizationId: string): Promise<ServiceRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("services")
    .select(SERVICE_SELECT)
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (error) {
    console.error("listActiveOrgServices failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapServiceRow);
}

export async function getOrgService(serviceId: string): Promise<ServiceRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("services").select(SERVICE_SELECT).eq("id", serviceId).maybeSingle();
  if (error || !data) return null;
  return mapServiceRow(data);
}
