import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

const PROTECTED_PREFIXES = ["/merchant", "/admin", "/account", "/orders", "/cart", "/bookings"];

/**
 * Refreshes the Supabase session cookie on every request and redirects
 * signed-out visitors away from surfaces that require a session.
 *
 * This is a coarse gate only — "is someone signed in" — because a Proxy
 * matcher change or a Server Function called from an unmatched route can
 * silently skip this file (see the Next.js Proxy docs on execution order).
 * The actual authorization decision (which role, which organization, which
 * row) is re-checked by RLS and by the role check in each layout — Proxy is
 * a UX shortcut, not the security boundary.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  if (isProtected && !user) {
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return response;
}
