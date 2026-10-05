import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { AppHeader } from "@/modules/users/components/app-header";
import { CartProvider } from "@/modules/cart/components/cart-provider";
import { APP_NAME } from "@/lib/config";

export default async function CustomerLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("footer");

  return (
    <CartProvider>
      <div className="flex min-h-dvh flex-col">
        <AppHeader />
        <main className="flex-1">{children}</main>
        <footer className="border-t border-border px-4 py-6 text-center text-sm text-muted-foreground sm:px-6">
          <p>
            {APP_NAME} — {t("tagline")}
          </p>
        </footer>
      </div>
    </CartProvider>
  );
}
