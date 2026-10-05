import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Server client — anon key, request-scoped, still bound by RLS. Use from
 * Server Components and Server Functions ("use server" actions).
 *
 * Server Components can only *read* cookies (Next.js forbids setting them
 * during render), so `setAll` is a best-effort no-op there — the proxy
 * (`src/proxy.ts`) is what actually keeps the session cookie fresh on every
 * request. Server Functions and Route Handlers run in the request/response
 * cycle, so their `setAll` writes cookies for real.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component render — expected, see above.
        }
      },
    },
  });
}
