import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 renamed `middleware.ts` to `proxy.ts` (same execution model).
// See node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md
export function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and image optimization, so
     * the session cookie stays fresh across the whole app without paying
     * the cost on every CSS/JS/image request.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
