/**
 * Central, typed access to environment variables. Nothing else in the app
 * should read `process.env` directly — that keeps a missing/misnamed var a
 * one-file problem instead of a scattered one, and keeps the service-role
 * key from ever being reachable through a path that could bundle it to the
 * client (see `serverEnv` below).
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Copy .env.local.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/** Safe to import from client components. */
export const publicEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  },
};

/**
 * Server-only. Importing this from a file that ends up in a client bundle
 * is a build-time error in Next.js because of the `server-only` guard.
 */
export const serverEnv = {
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
  },
};
