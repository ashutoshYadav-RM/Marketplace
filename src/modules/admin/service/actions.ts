"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/service-role";
import { isCurrentUserAdmin } from "../data/is-admin";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * The one place in the app that uses the service-role client for a write.
 * Suspension is a Supabase Auth ban (auth.users, not a table RLS can scope)
 * so there is no RLS-covered path here — which is exactly the case the
 * service-role client exists for. Every call re-checks admin status itself
 * (never trusts the caller got here through a gated page) and writes an
 * audit_logs row, per the rule in service-role.ts.
 */
async function setUserSuspended(userId: string, suspended: boolean): Promise<ActionResult> {
  if (!(await isCurrentUserAdmin())) return { ok: false, error: "Not authorized." };

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: actor },
  } = await supabase.auth.getUser();

  const admin = createSupabaseServiceRoleClient();
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: suspended ? "876000h" : "none", // ~100 years, i.e. "until reinstated"
  });
  if (authError) return { ok: false, error: authError.message };

  const { error: profileError } = await admin.from("profiles").update({ is_suspended: suspended }).eq("id", userId);
  if (profileError) return { ok: false, error: profileError.message };

  await admin.from("audit_logs").insert({
    actor_id: actor?.id ?? null,
    action: suspended ? "user_suspended" : "user_reinstated",
    entity_type: "user",
    entity_id: userId,
  });

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function suspendUser(userId: string) {
  return setUserSuspended(userId, true);
}

export async function reinstateUser(userId: string) {
  return setUserSuspended(userId, false);
}
