import { notFound } from "next/navigation";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { getOrderDetail } from "@/modules/orders/data/orders";
import { PrintButton } from "@/modules/orders/components/print-button";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

export default async function PosBillPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const [order, locale] = await Promise.all([getOrderDetail(orderId), getLocale()]);

  if (!order || order.orderType !== "pos") notFound();

  const money = (amountMinor: number) => formatMoney({ amountMinor, currencyCode: order.currencyCode }, locale);
  const issuedAt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: order.locationTimezone,
  }).format(new Date(order.createdAt));

  return (
    <div className="mx-auto max-w-sm px-6 py-10 print:px-0 print:py-0">
      <Card className="p-6 print:border-0 print:shadow-none">
        <div className="mb-6 text-center">
          <p className="text-lg font-semibold text-foreground">{order.organizationName}</p>
          <p className="text-sm text-muted-foreground">{order.locationName}</p>
        </div>

        <div className="mb-4 flex justify-between text-xs text-muted-foreground">
          <span>{order.orderNumber}</span>
          <span>{issuedAt}</span>
        </div>

        <div className="divide-y divide-border border-y border-border">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <p className="text-foreground">{item.nameSnapshot}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity} × {money(item.unitPriceMinor)}
                </p>
              </div>
              <span className="font-medium text-foreground tabular-nums">{money(item.totalMinor)}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums">{money(order.subtotalMinor)}</span>
          </div>
          {order.taxMinor > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span className="tabular-nums">{money(order.taxMinor)}</span>
            </div>
          )}
          {order.discountMinor > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Discount</span>
              <span className="tabular-nums">−{money(order.discountMinor)}</span>
            </div>
          )}
          <div className="mt-1 flex justify-between border-t border-border pt-2 text-base font-semibold text-foreground">
            <span>Total</span>
            <span className="tabular-nums">{money(order.totalMinor)}</span>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">{order.currencyCode} · Paid in person</p>
      </Card>

      <div className="mt-4 flex gap-2 print:hidden">
        <PrintButton />
        <Link href="/merchant/pos" className="flex-1">
          <Button type="button" className="w-full">
            New sale
          </Button>
        </Link>
      </div>
    </div>
  );
}
