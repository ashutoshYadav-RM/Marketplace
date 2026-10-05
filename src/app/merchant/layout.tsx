import type { ReactNode } from "react";
import Link from "next/link";
import { ScanLine } from "lucide-react";
import { signOut } from "@/modules/auth/service/actions";
import { getCurrentUser } from "@/modules/users/data/current-user";
import { listRecentNotifications } from "@/modules/notifications/data/notifications";
import { NotificationBell } from "@/modules/notifications/components/notification-bell";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/config";

// Auth is enforced upstream by the proxy (`/merchant` is a protected prefix,
// see src/lib/supabase/proxy.ts). Which organization/role a signed-in user
// gets access to is a Phase 1 concern (organizations + organization_members).
export default async function MerchantLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  const notifications = user ? await listRecentNotifications(user.id) : [];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
        <Link href="/merchant" className="text-sm font-semibold tracking-tight text-foreground">
          {APP_NAME} <span className="text-muted-foreground">Merchant OS</span>
        </Link>
        <div className="flex items-center gap-2">
          {user && <NotificationBell userId={user.id} initial={notifications} />}
          <Link href="/merchant/scan">
            <Button type="button" variant="secondary" size="sm">
              <ScanLine className="h-4 w-4" />
              Verify pickup
            </Button>
          </Link>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
