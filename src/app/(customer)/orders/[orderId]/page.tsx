import { notFound } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { getLocale } from "next-intl/server";
import { getOrderDetail } from "@/modules/orders/data/orders";
import { OrderStatusBadge } from "@/modules/orders/components/order-status-badge";
import { LiveOrderStatus } from "@/modules/orders/components/live-order-status";
import { OrderQrCode } from "@/modules/orders/components/order-qr-code";
import { getReviewForOrder } from "@/modules/reviews/data/reviews";
import { ReviewForm } from "@/modules/reviews/components/review-form";
import { StarRating } from "@/modules/reviews/components/star-rating";
import { ReviewImages } from "@/modules/reviews/components/review-images";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/modules/orders/domain/schema";

const PICKUP_STEPS: OrderStatus[] = ["placed", "accepted", "packing", "ready_for_pickup", "picked_up"];
const TERMINAL_STATUSES: OrderStatus[] = ["picked_up", "completed", "cancelled"];

function isTerminal(status: OrderStatus) {
  return TERMINAL_STATUSES.includes(status);
}

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const [order, locale] = await Promise.all([getOrderDetail(orderId), getLocale()]);

  if (!order) notFound();

  const review = order.status === "completed" ? await getReviewForOrder(order.id) : null;

  const isCancelled = order.status === "cancelled";
  const currentStepIndex = PICKUP_STEPS.indexOf(order.status === "completed" ? "picked_up" : order.status);

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{order.orderNumber}</p>
          <Link href={`/shop/${order.organizationSlug}/${order.locationSlug}`} className="text-lg font-semibold text-foreground hover:text-brand">
            {order.organizationName}
          </Link>
        </div>
        <div className="flex flex-col items-end gap-1">
          <OrderStatusBadge status={order.status} />
          {!isTerminal(order.status) && <LiveOrderStatus orderId={order.id} />}
        </div>
      </div>

      {!isCancelled && (
        <ol className="mb-8 flex items-center">
          {PICKUP_STEPS.map((step, i) => (
            <li key={step} className="flex flex-1 items-center last:flex-none">
              <div
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
                  i <= currentStepIndex ? "border-brand bg-brand text-brand-foreground" : "border-border text-muted-foreground",
                )}
              >
                {i < currentStepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < PICKUP_STEPS.length - 1 && (
                <div className={cn("mx-1 h-0.5 flex-1", i < currentStepIndex ? "bg-brand" : "bg-border")} />
              )}
            </li>
          ))}
        </ol>
      )}

      {order.status === "ready_for_pickup" && (
        <Card className="mb-6 flex flex-col items-center gap-4 bg-accent-ready-soft p-6 text-center">
          <p className="text-sm font-medium text-accent-ready">Show this at the counter</p>
          <OrderQrCode token={order.qrToken} />
          {order.pickupCode && (
            <p className="font-mono text-2xl font-bold tracking-widest text-accent-ready">{order.pickupCode}</p>
          )}
        </Card>
      )}

      <Card className="divide-y divide-border">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 p-4 text-sm">
            <span className="text-foreground">
              {item.nameSnapshot} × {item.quantity}
            </span>
            <span className="font-medium text-foreground tabular-nums">
              {formatMoney({ amountMinor: item.totalMinor, currencyCode: order.currencyCode }, locale)}
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 p-4 text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatMoney({ amountMinor: order.subtotalMinor, currencyCode: order.currencyCode }, locale)}</span>
        </div>
        {order.taxMinor > 0 && (
          <div className="flex items-center justify-between gap-3 p-4 text-sm text-muted-foreground">
            <span>Tax</span>
            <span className="tabular-nums">{formatMoney({ amountMinor: order.taxMinor, currencyCode: order.currencyCode }, locale)}</span>
          </div>
        )}
        {order.discountMinor > 0 && (
          <div className="flex items-center justify-between gap-3 p-4 text-sm text-success">
            <span>Discount{order.offerCode ? ` (${order.offerCode})` : ""}</span>
            <span className="tabular-nums">−{formatMoney({ amountMinor: order.discountMinor, currencyCode: order.currencyCode }, locale)}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 p-4 font-medium text-foreground">
          <span>Total</span>
          <span className="tabular-nums">{formatMoney({ amountMinor: order.totalMinor, currencyCode: order.currencyCode }, locale)}</span>
        </div>
      </Card>

      <p className="mt-6 text-center text-xs text-muted-foreground">Pay when you pick up.</p>

      {order.status === "completed" && (
        <div className="mt-6">
          {review ? (
            <Card className="p-4">
              <StarRating value={review.rating} size="md" />
              {review.comment && <p className="mt-2 text-sm text-foreground">{review.comment}</p>}
              <ReviewImages images={review.images} />
              {review.reply && (
                <div className="mt-3 rounded-xl bg-background p-3 text-sm">
                  <p className="mb-0.5 text-xs font-medium text-muted-foreground">Reply from {order.organizationName}</p>
                  <p className="text-foreground">{review.reply}</p>
                </div>
              )}
            </Card>
          ) : (
            <ReviewForm orderId={order.id} organizationId={order.organizationId} locationId={order.locationId} />
          )}
        </div>
      )}
    </div>
  );
}
