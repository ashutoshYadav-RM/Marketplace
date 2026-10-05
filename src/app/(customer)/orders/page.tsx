import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { getLocale } from "next-intl/server";
import { listCustomerOrders } from "@/modules/orders/data/orders";
import { OrderStatusBadge } from "@/modules/orders/components/order-status-badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/money";

export default async function OrdersPage() {
  const [orders, locale] = await Promise.all([listCustomerOrders(), getLocale()]);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-lg font-semibold text-foreground">Your orders</h1>
      {orders.length === 0 ? (
        <EmptyState
          icon={<ClipboardList className="h-6 w-6" />}
          title="No orders yet"
          body="Orders you place will show up here with live status."
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`}>
              <Card className="flex items-center justify-between gap-3 p-4 transition-colors hover:border-brand">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{order.organizationName}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.orderNumber} · {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-medium text-foreground tabular-nums">
                    {formatMoney({ amountMinor: order.totalMinor, currencyCode: order.currencyCode }, locale)}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
