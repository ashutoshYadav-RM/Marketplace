import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireActiveOrganizationMembership, getCountryDefaultCurrency } from "@/modules/organizations/data/organizations";
import { listOrgLocations } from "@/modules/locations/data/locations";
import { listAllProductCategories } from "@/modules/catalog/data/categories";
import { getOrgProduct } from "@/modules/catalog/data/products";
import { ProductEditForm } from "@/modules/catalog/components/product-edit-form";
import { VariantEditor } from "@/modules/catalog/components/variant-editor";
import { AddVariantForm } from "@/modules/catalog/components/add-variant-form";
import { ImageUploader } from "@/modules/catalog/components/image-uploader";
import { ArchiveProductButton } from "@/modules/catalog/components/archive-product-button";

export default async function ProductDetailPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const membership = await requireActiveOrganizationMembership();
  const product = await getOrgProduct(productId);

  if (!product || product.organizationId !== membership.organization.id) notFound();

  const [locations, categories, currencyCode] = await Promise.all([
    listOrgLocations(membership.organization.id),
    listAllProductCategories(),
    getCountryDefaultCurrency(membership.organization.country_id),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/merchant/inventory" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Inventory
      </Link>

      <h1 className="mb-6 text-xl font-semibold text-foreground">{product.name}</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Photos</h2>
        <ImageUploader organizationId={membership.organization.id} productId={product.id} images={product.images} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Details</h2>
        <ProductEditForm product={product} categories={categories} />
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Variants, price & stock</h2>
        <div className="flex flex-col gap-3">
          {product.variants.map((variant) => (
            <VariantEditor key={variant.id} productId={product.id} variant={variant} locations={locations} />
          ))}
        </div>
        <div className="mt-3">
          <AddVariantForm productId={product.id} locations={locations} currencyCode={currencyCode} />
        </div>
      </section>

      <section className="border-t border-border pt-6">
        <ArchiveProductButton productId={product.id} />
      </section>
    </div>
  );
}
