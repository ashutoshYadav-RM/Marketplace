import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { listOrganizationsForAdmin, type OrganizationRow } from "@/modules/organizations/data/organizations";
import { MerchantApprovalRow } from "@/modules/organizations/components/merchant-approval-row";

const TABS: { value: OrganizationRow["status"]; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
];

export default async function AdminMerchantsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeTab = (TABS.find((t) => t.value === status)?.value ?? "pending") as OrganizationRow["status"];
  const [t, organizations] = await Promise.all([getTranslations("admin"), listOrganizationsForAdmin(activeTab)]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-4 text-xl font-semibold text-foreground">{t("merchantsTitle")}</h1>

      <div className="mb-6 flex gap-1">
        {TABS.map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/merchants?status=${tab.value}`}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium",
              activeTab === tab.value ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-surface-raised",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {organizations.length === 0 ? (
        <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title={t("merchantsEmptyTitle")} body={t("merchantsEmptyBody")} />
      ) : (
        <div className="flex flex-col gap-3">
          {organizations.map((org) => (
            <MerchantApprovalRow key={org.id} organization={org} />
          ))}
        </div>
      )}
    </div>
  );
}
