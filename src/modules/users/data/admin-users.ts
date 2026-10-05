import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminUserRow = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  isSuspended: boolean;
  createdAt: string;
};

export async function listUsersForAdmin(search?: string): Promise<AdminUserRow[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, phone_e164, is_suspended, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (search?.trim()) {
    const term = search.trim().replace(/[%,]/g, "");
    query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone_e164.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("listUsersForAdmin failed:", error.message);
    return [];
  }
  return (data ?? []).map((u) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    phone: u.phone_e164,
    isSuspended: u.is_suspended,
    createdAt: u.created_at,
  }));
}
