import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import { getLocale } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { productImageUrl } from "../lib/image-url";
import type { ProductListItem } from "../data/products";

export async function ProductCard({ product, locationId }: { product: ProductListItem; locationId: string | null }) {
  const locale = await getLocale();
  const variant = product.variants[0];
  const price = variant?.prices.find((p) => p.locationId === locationId) ?? variant?.prices[0];
  const totalStock = product.variants.reduce((sum, v) => {
    const s = v.stock.find((row) => row.locationId === locationId) ?? v.stock[0];
    return sum + (s?.stockQty ?? 0);
  }, 0);

  return (
    <Link href={`/merchant/inventory/${product.id}`}>
      <Card className="flex items-center gap-4 p-4 transition-colors hover:border-brand">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-background">
          {product.images[0] ? (
            <Image
              src={productImageUrl(product.images[0])}
              alt=""
              width={56}
              height={56}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <Package className="h-6 w-6 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-foreground">{product.name}</p>
            {!product.isActive && <Badge tone="neutral">Hidden</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {product.categoryName ?? "Uncategorized"}
            {product.variants.length > 1 ? ` · ${product.variants.length} variants` : ""}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="font-medium text-foreground">
            {price ? formatMoney({ amountMinor: price.amountMinor, currencyCode: price.currencyCode }, locale) : "—"}
          </p>
          <p className={`text-sm ${totalStock === 0 ? "text-danger" : "text-muted-foreground"}`}>
            {totalStock === 0 ? "Out of stock" : `${totalStock} ${product.unit}${totalStock === 1 ? "" : "s"}`}
          </p>
        </div>
      </Card>
    </Link>
  );
}
