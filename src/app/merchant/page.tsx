import Link from "next/link";
import { CalendarClock, Clock, Clock3, ClipboardList, Package, ScanBarcode, ShieldAlert, Star, Tag, Users, Wrench } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { OnboardingForm } from "@/modules/organizations/components/onboarding-form";
import { getCurrentUserMembership, listCountries } from "@/modules/organizations/data/organizations";
import { listOrgProducts } from "@/modules/catalog/data/products";
import { listOrgOrders } from "@/modules/orders/data/orders";
import { listOrgServices } from "@/modules/services/data/services";
import { listOrgBookings } from "@/modules/services/data/bookings";
import { listShopReviews } from "@/modules/reviews/data/reviews";

export default async function MerchantDashboardPage() {
  const [t, membership] = await Promise.all([getTranslations("merchant"), getCurrentUserMembership()]);

  if (!membership) {
    const countries = await listCountries();
    return (
      <div className="mx-auto max-w-xl px-6 py-10">
        <h1 className="mb-1 text-xl font-semibold text-foreground">{t("onboardingTitle")}</h1>
        <p className="mb-8 text-sm text-muted-foreground">{t("onboardingBody")}</p>
        <OnboardingForm countries={countries} />
      </div>
    );
  }

  const { organization, role } = membership;

  if (organization.status === "pending") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <EmptyState
          icon={<Clock3 className="h-6 w-6" />}
          title={t("pendingTitle", { name: organization.name })}
          body={t("pendingBody")}
        />
      </div>
    );
  }

  if (organization.status === "rejected" || organization.status === "suspended") {
    return (
      <div className="mx-auto max-w-xl px-6 py-16">
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" />}
          title={t(organization.status === "rejected" ? "rejectedTitle" : "suspendedTitle", {
            name: organization.name,
          })}
          body={t("rejectedBody")}
        />
      </div>
    );
  }

  const [products, activeOrders, services, activeBookings, { reviews, average }] = await Promise.all([
    listOrgProducts(organization.id),
    listOrgOrders(organization.id, ["placed", "accepted", "packing", "ready_for_pickup"]),
    listOrgServices(organization.id),
    listOrgBookings(organization.id, ["requested", "accepted", "scheduled", "arrived", "work_started", "completed"]),
    listShopReviews(organization.id),
  ]);
  const newCount = activeOrders.filter((o) => o.status === "placed").length;
  const newBookingCount = activeBookings.filter((b) => b.status === "requested").length;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{t("greeting", { name: organization.name })}</h1>
          <p className="text-sm text-muted-foreground">{t("signedInAs", { role })}</p>
        </div>
        <Badge tone="success">Active</Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/merchant/orders">
          <Card className="flex items-center justify-between p-5 transition-colors hover:border-brand">
            <div className="flex items-center gap-3">
              <ClipboardList className="h-5 w-5 text-brand" />
              <span className="font-medium text-foreground">Orders</span>
            </div>
            <div className="flex items-center gap-2">
              {newCount > 0 && <Badge tone="ready">{newCount} new</Badge>}
              <Badge tone="neutral">{activeOrders.length} active</Badge>
            </div>
          </Card>
        </Link>

        <Link href="/merchant/inventory">
          <Card className="flex items-center justify-between p-5 transition-colors hover:border-brand">
            <div className="flex items-center gap-3">
              <Package className="h-5 w-5 text-brand" />
              <span className="font-medium text-foreground">Inventory</span>
            </div>
            <Badge tone="neutral">{products.length} product{products.length === 1 ? "" : "s"}</Badge>
          </Card>
        </Link>

        <Link href="/merchant/pos">
          <Card className="flex items-center justify-between p-5 transition-colors hover:border-brand">
            <div className="flex items-center gap-3">
              <ScanBarcode className="h-5 w-5 text-brand" />
              <span className="font-medium text-foreground">Scan &amp; bill</span>
            </div>
            <span className="text-sm text-muted-foreground">Walk-in sale</span>
          </Card>
        </Link>

        <Link href="/merchant/bookings">
          <Card className="flex items-center justify-between p-5 transition-colors hover:border-brand">
            <div className="flex items-center gap-3">
              <CalendarClock className="h-5 w-5 text-brand" />
              <span className="font-medium text-foreground">Bookings</span>
            </div>
            <div className="flex items-center gap-2">
              {newBookingCount > 0 && <Badge tone="ready">{newBookingCount} new</Badge>}
              <Badge tone="neutral">{activeBookings.length} active</Badge>
            </div>
          </Card>
        </Link>

        <Link href="/merchant/services">
          <Card className="flex items-center justify-between p-5 transition-colors hover:border-brand">
            <div className="flex items-center gap-3">
              <Wrench className="h-5 w-5 text-brand" />
              <span className="font-medium text-foreground">Services</span>
            </div>
            <Badge tone="neutral">{services.length} listed</Badge>
          </Card>
        </Link>

        <Link href="/merchant/reviews">
          <Card className="flex items-center justify-between p-5 transition-colors hover:border-brand">
            <div className="flex items-center gap-3">
              <Star className="h-5 w-5 text-brand" />
              <span className="font-medium text-foreground">Reviews</span>
            </div>
            <Badge tone="neutral">{average != null ? `${average.toFixed(1)} (${reviews.length})` : "None yet"}</Badge>
          </Card>
        </Link>

        <Link href="/merchant/offers">
          <Card className="flex items-center justify-between p-5 transition-colors hover:border-brand">
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-brand" />
              <span className="font-medium text-foreground">Offers</span>
            </div>
            <span className="text-sm text-muted-foreground">Coupon codes</span>
          </Card>
        </Link>

        <Link href="/merchant/hours">
          <Card className="flex items-center justify-between p-5 transition-colors hover:border-brand">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-brand" />
              <span className="font-medium text-foreground">Opening hours</span>
            </div>
          </Card>
        </Link>

        {(role === "owner" || role === "admin") && (
          <Link href="/merchant/staff">
            <Card className="flex items-center justify-between p-5 transition-colors hover:border-brand">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-brand" />
                <span className="font-medium text-foreground">Staff</span>
              </div>
            </Card>
          </Link>
        )}
      </div>
    </div>
  );
}
