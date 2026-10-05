import { notFound } from "next/navigation";
import { Clock, MapPin, Package, Phone, Star } from "lucide-react";
import { getLocale } from "next-intl/server";
import { getShopBySlug } from "@/modules/locations/data/locations";
import { getLocationHours } from "@/modules/locations/data/hours";
import { listLocationCatalog } from "@/modules/catalog/data/products";
import { listActiveOrgServices } from "@/modules/services/data/services";
import { AddToCartButton } from "@/modules/cart/components/add-to-cart-button";
import { BookingForm } from "@/modules/services/components/booking-form";
import { listShopReviews } from "@/modules/reviews/data/reviews";
import { StarRating } from "@/modules/reviews/components/star-rating";
import { ReviewImages } from "@/modules/reviews/components/review-images";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { isOpenNow, DAY_LABELS } from "@/lib/opening-hours";

export default async function ShopPage({
  params,
}: {
  params: Promise<{ orgSlug: string; locationSlug: string }>;
}) {
  const { orgSlug, locationSlug } = await params;
  const [shop, locale] = await Promise.all([getShopBySlug(orgSlug, locationSlug), getLocale()]);

  if (!shop) notFound();

  const [products, services, { reviews, average }, hours] = await Promise.all([
    listLocationCatalog(shop.organizationId, shop.id),
    listActiveOrgServices(shop.organizationId),
    listShopReviews(shop.organizationId),
    getLocationHours(shop.id),
  ]);
  const hoursSet = hours.some((h) => !h.isClosed);
  const open = hoursSet && isOpenNow(hours, shop.timezone);
  const address = [shop.addressLine1, shop.locality, shop.city].filter(Boolean).join(", ");
  const cartShop = {
    organizationId: shop.organizationId,
    organizationName: shop.organizationName,
    organizationSlug: shop.organizationSlug,
    locationId: shop.id,
    locationName: shop.name,
    locationSlug: shop.slug,
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-semibold text-foreground">{shop.organizationName}</h1>
        {hoursSet && <Badge tone={open ? "success" : "danger"}>{open ? "Open" : "Closed"}</Badge>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        {average != null && (
          <span className="flex items-center gap-1.5">
            <StarRating value={average} />
            <span className="font-medium text-foreground">{average.toFixed(1)}</span>
            <span>({reviews.length})</span>
          </span>
        )}
        {address && (
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" /> {address}
          </span>
        )}
        {shop.phone && (
          <span className="flex items-center gap-1">
            <Phone className="h-4 w-4" /> {shop.phone}
          </span>
        )}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Products</h2>
        {products.length === 0 ? (
          <EmptyState icon={<Package className="h-6 w-6" />} title="No products listed yet" />
        ) : (
          <Card className="divide-y divide-border">
            {products.map((product) => {
              const variant = product.variants[0];
              const price = variant?.prices[0];
              const stock = variant?.stock[0];
              const available = stock?.isAvailable && stock.stockQty > 0;
              return (
                <div key={product.id} className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {product.name}
                      {variant && variant.variantName !== "Default" ? ` — ${variant.variantName}` : ""}
                    </p>
                    {price && (
                      <p className="text-sm text-muted-foreground">
                        {formatMoney({ amountMinor: price.amountMinor, currencyCode: price.currencyCode }, locale)}
                      </p>
                    )}
                  </div>
                  {variant && price && (
                    <div className="shrink-0">
                      <AddToCartButton
                        shop={cartShop}
                        variantId={variant.id}
                        productId={product.id}
                        productName={product.name}
                        variantName={variant.variantName}
                        unit={product.unit}
                        amountMinor={price.amountMinor}
                        currencyCode={price.currencyCode}
                        maxQuantity={available ? stock.stockQty : 0}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        )}
      </section>

      {services.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Services</h2>
          <Card className="divide-y divide-border">
            {services.map((service) => (
              <div key={service.id} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{service.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatMoney({ amountMinor: service.visitChargeMinor, currencyCode: service.currencyCode }, locale)} visit
                    charge
                  </p>
                </div>
                <div className="shrink-0">
                  <BookingForm organizationId={shop.organizationId} locationId={shop.id} serviceId={service.id} />
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      {hoursSet && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4" /> Opening hours
          </h2>
          <Card className="divide-y divide-border">
            {hours.map((day) => (
              <div key={day.dayOfWeek} className="flex items-center justify-between px-4 py-2 text-sm">
                <span className="text-muted-foreground">{DAY_LABELS[day.dayOfWeek]}</span>
                <span className="text-foreground">
                  {day.isClosed || !day.openTime || !day.closeTime
                    ? "Closed"
                    : `${day.openTime.slice(0, 5)} – ${day.closeTime.slice(0, 5)}`}
                </span>
              </div>
            ))}
          </Card>
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Reviews</h2>
        {reviews.length === 0 ? (
          <EmptyState icon={<Star className="h-6 w-6" />} title="No reviews yet" body="Reviews show up here once customers pick up their orders." />
        ) : (
          <div className="flex flex-col gap-3">
            {reviews.map((review) => (
              <Card key={review.id} className="p-4">
                <div className="flex items-center justify-between">
                  <StarRating value={review.rating} />
                  <span className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{review.customerName ?? "Customer"}</p>
                {review.comment && <p className="mt-2 text-sm text-foreground">{review.comment}</p>}
                <ReviewImages images={review.images} />
                {review.reply && (
                  <div className="mt-3 rounded-xl bg-background p-3 text-sm">
                    <p className="mb-0.5 text-xs font-medium text-muted-foreground">Reply from {shop.organizationName}</p>
                    <p className="text-foreground">{review.reply}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
