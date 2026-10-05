import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LocationControl } from "@/modules/locations/components/location-control";
import { getSearchLocation } from "@/modules/locations/data/search-location";
import { getCurrentUser } from "@/modules/users/data/current-user";
import { signOut } from "@/modules/auth/service/actions";
import { CartBadge } from "@/modules/cart/components/cart-badge";
import { NotificationBell } from "@/modules/notifications/components/notification-bell";
import { listRecentNotifications } from "@/modules/notifications/data/notifications";
import { APP_NAME } from "@/lib/config";
import { Button } from "@/components/ui/button";

export async function AppHeader() {
  const [t, user, searchLocation] = await Promise.all([
    getTranslations("nav"),
    getCurrentUser(),
    getSearchLocation(),
  ]);
  const notifications = user ? await listRecentNotifications(user.id) : [];

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-brand">
            {APP_NAME}
          </Link>
          <div className="hidden sm:block">
            <LocationControl compact initial={searchLocation} />
          </div>
        </div>

        <nav className="flex items-center gap-3">
          <Link
            href="/merchant"
            className="hidden text-sm font-medium text-muted-foreground hover:text-foreground sm:block"
          >
            {t("forMerchants")}
          </Link>
          <CartBadge />
          {user ? (
            <div className="flex items-center gap-2">
              <NotificationBell userId={user.id} initial={notifications} />
              <Link href="/account" className="text-sm font-medium text-foreground hover:text-brand">
                {t("account")}
              </Link>
              <form action={signOut}>
                <Button type="submit" variant="ghost" size="sm">
                  {t("signOut")}
                </Button>
              </form>
            </div>
          ) : (
            <Link href="/auth/sign-in">
              <Button size="sm">{t("signIn")}</Button>
            </Link>
          )}
        </nav>
      </div>
      <div className="border-t border-border px-4 py-2 sm:hidden">
        <LocationControl compact initial={searchLocation} />
      </div>
    </header>
  );
}
