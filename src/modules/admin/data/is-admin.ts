import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Reads the caller's own `app_admins` row (RLS: self-read only — see
 * `app_admins_self_read` in 0001_init.sql). This is a UX gate for the admin
 * shell, not the security boundary itself: every admin-only mutation is
 * re-checked server-side via `is_platform_admin()` regardless of what this
 * returns (§04).
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase.from("app_admins").select("is_active").eq("user_id", user.id).maybeSingle();
  return Boolean(data?.is_active);
}
