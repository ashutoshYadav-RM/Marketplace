"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Browser client — anon key, bound by RLS to whatever the signed-in user's
 * JWT allows. Use from client components only. For Server Components and
 * Server Actions, use `createServerSupabaseClient` in `./server.ts` instead.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
