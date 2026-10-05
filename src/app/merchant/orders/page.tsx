import { ClipboardList } from "lucide-react";
import { requireActiveOrganizationMembership } from "@/modules/organizations/data/organizations";
import { listOrgOrders } from "@/modules/orders/data/orders";
import { MerchantOrderCard } from "@/modules/orders/components/merchant-order-card";
import { EmptyState } from "@/components/ui/empty-state";

export default async function MerchantOrdersPage() {
  const membership = await requireActiveOrganizationMembership();
  const orders = await listOrgOrders(membership.organization.id, [
    "placed",
    "accepted",
    "packing",
    "ready_for_pickup",
  ]);

  const counts = {
    total: orders.length,
    new: orders.filter((o) => o.status === "placed").length,
    packing: orders.filter((o) => o.status === "packing").length,
    ready: orders.filter((o) => o.status === "ready_for_pickup").length,
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="mb-4 text-xl font-semibold text-foreground">Orders</h1>

      <div className="mb-8 grid grid-cols-4 gap-2 text-center">
        <SummaryStat label="Total" value={counts.total} />
        <SummaryStat label="New" value={counts.new} />
        <SummaryStat label="Packing" value={counts.packing} />
        <SummaryStat label="Ready" value={counts.ready} />
      </div>

      {orders.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="No active orders" body="New orders will show up here the moment a customer checks out." />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <MerchantOrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised py-3">
      <p className="text-xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
