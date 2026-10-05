import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireActiveOrganizationMembership } from "@/modules/organizations/data/organizations";
import { listAllServiceCategories } from "@/modules/catalog/data/categories";
import { getOrgService } from "@/modules/services/data/services";
import { ServiceEditForm } from "@/modules/services/components/service-edit-form";
import { ArchiveServiceButton } from "@/modules/services/components/archive-service-button";

export default async function ServiceDetailPage({ params }: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await params;
  const membership = await requireActiveOrganizationMembership();
  const service = await getOrgService(serviceId);

  if (!service || service.organizationId !== membership.organization.id) notFound();

  const categories = await listAllServiceCategories();

  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <Link href="/merchant/services" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Services
      </Link>
      <h1 className="mb-6 text-xl font-semibold text-foreground">{service.name}</h1>
      <ServiceEditForm service={service} categories={categories} />
      <div className="mt-8 border-t border-border pt-6">
        <ArchiveServiceButton serviceId={service.id} />
      </div>
    </div>
  );
}
