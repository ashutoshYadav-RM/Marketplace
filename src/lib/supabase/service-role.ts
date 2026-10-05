import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Service-role client — bypasses RLS entirely. This is a trusted-code-only
 * escape hatch, not a general-purpose backend client.
 *
 * Rules for using this client (enforced by review, not by the compiler):
 *   1. Only from Edge Functions or a server route gated by `is_platform_admin()`
 *      / an explicit `app_admins` check — never from a page or a Server
 *      Action reachable by a plain authenticated user.
 *   2. Every write through this client must also write an `audit_logs` row.
 *   3. Never imported by a client component — the `server-only` guard above
 *      turns that into a build error, not a runtime leak.
 */
export function createSupabaseServiceRoleClient() {
  return createClient<Database>(publicEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
