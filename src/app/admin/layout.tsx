import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { isCurrentUserAdmin } from "@/modules/admin/data/is-admin";
import { APP_NAME } from "@/lib/config";

const NAV = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/merchants", label: "Merchants" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/reviews", label: "Reviews" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) redirect("/");

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border bg-surface px-6 py-3">
        <Link href="/admin" className="text-sm font-semibold tracking-tight text-foreground">
          {APP_NAME} <span className="text-muted-foreground">Admin</span>
        </Link>
      </header>
      <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-6 py-1.5">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-background hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <main className="flex-1">{children}</main>
    </div>
  );
}
