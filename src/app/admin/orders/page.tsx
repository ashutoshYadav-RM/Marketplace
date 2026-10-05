import { ClipboardList } from "lucide-react";
import { getLocale } from "next-intl/server";
import { listAllOrdersForAdmin } from "@/modules/orders/data/orders";
import { OrderStatusBadge } from "@/modules/orders/components/order-status-badge";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/money";

export default async function AdminOrdersPage() {
  const [orders, locale] = await Promise.all([listAllOrdersForAdmin(), getLocale()]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-xl font-semibold text-foreground">Orders</h1>
      {orders.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="No orders yet" />
      ) : (
        <Card className="divide-y divide-border">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between gap-3 p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{order.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {order.organizationName} · {new Date(order.createdAt).toLocaleString(locale)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone="neutral">{order.orderType}</Badge>
                <span className="font-medium text-foreground tabular-nums">
                  {formatMoney({ amountMinor: order.totalMinor, currencyCode: order.currencyCode }, locale)}
                </span>
                <OrderStatusBadge status={order.status} />
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
