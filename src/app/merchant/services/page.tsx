import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { getLocale } from "next-intl/server";
import { requireActiveOrganizationMembership } from "@/modules/organizations/data/organizations";
import { listOrgServices } from "@/modules/services/data/services";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatMoney } from "@/lib/money";

export default async function MerchantServicesPage() {
  const membership = await requireActiveOrganizationMembership();
  const [services, locale] = await Promise.all([listOrgServices(membership.organization.id), getLocale()]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-foreground">Services</h1>
        <Link href="/merchant/services/new">
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Add service
          </Button>
        </Link>
      </div>

      {services.length === 0 ? (
        <EmptyState
          icon={<Wrench className="h-6 w-6" />}
          title="No services yet"
          body="List a service — electrician, plumber, salon, repair — with a visit charge, and customers can book it."
          action={
            <Link href="/merchant/services/new">
              <Button>Add your first service</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {services.map((service) => (
            <Link key={service.id} href={`/merchant/services/${service.id}`}>
              <Card className="flex items-center justify-between gap-4 p-4 transition-colors hover:border-brand">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">{service.name}</p>
                    {!service.isActive && <Badge tone="neutral">Hidden</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{service.categoryName ?? "Uncategorized"}</p>
                </div>
                <span className="shrink-0 font-medium text-foreground">
                  {formatMoney({ amountMinor: service.visitChargeMinor, currencyCode: service.currencyCode }, locale)}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
