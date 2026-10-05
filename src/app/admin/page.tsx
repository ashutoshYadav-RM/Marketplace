import Link from "next/link";
import type { ReactNode } from "react";
import { ClipboardList, Star, Store, Tag, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { listPendingOrganizations } from "@/modules/organizations/data/organizations";
import { listUsersForAdmin } from "@/modules/users/data/admin-users";
import { listAllOrdersForAdmin } from "@/modules/orders/data/orders";
import { listAllReviewsForAdmin } from "@/modules/reviews/data/reviews";

export default async function AdminHomePage() {
  const [t, pending, users, orders, reviews] = await Promise.all([
    getTranslations("admin"),
    listPendingOrganizations(),
    listUsersForAdmin(),
    listAllOrdersForAdmin(),
    listAllReviewsForAdmin(),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Admin</h1>
      <div className="flex flex-col gap-3">
        <AdminCard
          href="/admin/merchants"
          icon={<Store className="h-5 w-5 text-brand" />}
          label={t("merchantsTitle")}
          badge={pending.length > 0 ? `${pending.length} pending` : undefined}
          badgeTone="ready"
        />
        <AdminCard href="/admin/users" icon={<Users className="h-5 w-5 text-brand" />} label="Users" badge={`${users.length}`} />
        <AdminCard
          href="/admin/orders"
          icon={<ClipboardList className="h-5 w-5 text-brand" />}
          label="Orders"
          badge={`${orders.length} recent`}
        />
        <AdminCard href="/admin/reviews" icon={<Star className="h-5 w-5 text-brand" />} label="Reviews" badge={`${reviews.length}`} />
        <AdminCard href="/admin/categories" icon={<Tag className="h-5 w-5 text-brand" />} label="Categories" />
      </div>
    </div>
  );
}

function AdminCard({
  href,
  icon,
  label,
  badge,
  badgeTone = "neutral",
}: {
  href: string;
  icon: ReactNode;
  label: string;
  badge?: string;
  badgeTone?: "neutral" | "ready";
}) {
  return (
    <Link href={href}>
      <Card className="flex items-center justify-between p-5 transition-colors hover:border-brand">
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-medium text-foreground">{label}</span>
        </div>
        {badge && <Badge tone={badgeTone}>{badge}</Badge>}
      </Card>
    </Link>
  );
}
