import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type VariantPrice = { id: string; locationId: string; amountMinor: number; currencyCode: string };
export type VariantStock = { locationId: string; stockQty: number; isAvailable: boolean };

export type ProductVariantSummary = {
  id: string;
  variantName: string;
  sku: string | null;
  barcode: string | null;
  prices: VariantPrice[];
  stock: VariantStock[];
};

export type ProductListItem = {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  brand: string | null;
  unit: string;
  isActive: boolean;
  images: string[];
  categoryId: string | null;
  categoryName: string | null;
  variants: ProductVariantSummary[];
};

export type GlobalProductSuggestion = {
  name: string;
  brand: string | null;
  unit: string;
  categoryId: string | null;
};

/**
 * Barcode -> shared identity lookup (see 0011_global_catalog.sql). Used to
 * pre-fill "add product" when another shop has already scanned this exact
 * barcode — never trusted for price/stock, only name/brand/unit/category.
 */
export async function lookupGlobalProductByBarcode(barcode: string): Promise<GlobalProductSuggestion | null> {
  const trimmed = barcode.trim();
  if (!trimmed) return null;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("global_products")
    .select("name, brand, unit, category_id")
    .eq("barcode", trimmed)
    .maybeSingle();

  if (error || !data) return null;
  return { name: data.name, brand: data.brand, unit: data.unit, categoryId: data.category_id };
}

const PRODUCT_SELECT = `
  id, organization_id, name, description, brand, unit, is_active, images, category_id,
  category:categories(name),
  variants:product_variants(
    id, variant_name, sku, barcode,
    prices(id, amount_minor, currency_code, location_id),
    stock:inventory(stock_qty, is_available, location_id)
  )
`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProductRow(row: any): ProductListItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    description: row.description ?? null,
    brand: row.brand ?? null,
    unit: row.unit,
    isActive: row.is_active,
    images: row.images ?? [],
    categoryId: row.category_id ?? null,
    categoryName: row.category?.name ?? null,
    variants: (row.variants ?? []).map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (v: any): ProductVariantSummary => ({
        id: v.id,
        variantName: v.variant_name,
        sku: v.sku,
        barcode: v.barcode,
        prices: (v.prices ?? []).map((p: { id: string; location_id: string; amount_minor: number; currency_code: string }) => ({
          id: p.id,
          locationId: p.location_id,
          amountMinor: p.amount_minor,
          currencyCode: p.currency_code,
        })),
        stock: (v.stock ?? []).map((s: { location_id: string; stock_qty: number; is_available: boolean }) => ({
          locationId: s.location_id,
          stockQty: s.stock_qty,
          isAvailable: s.is_available,
        })),
      }),
    ),
  };
}

export async function listOrgProducts(organizationId: string): Promise<ProductListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("organization_id", organizationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listOrgProducts failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapProductRow);
}

const LOCATION_CATALOG_SELECT = `
  id, organization_id, name, description, brand, unit, is_active, images, category_id,
  category:categories(name),
  variants:product_variants!inner(
    id, variant_name, sku, barcode,
    prices:prices!inner(id, amount_minor, currency_code, location_id),
    stock:inventory!inner(stock_qty, is_available, location_id)
  )
`;

/** Public shop-page catalog: only this location's price/stock, only active,
 * non-deleted products (RLS: `products_public_read` covers the rest). */
export async function listLocationCatalog(organizationId: string, locationId: string): Promise<ProductListItem[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .select(LOCATION_CATALOG_SELECT)
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .is("deleted_at", null)
    .eq("variants.prices.location_id", locationId)
    .eq("variants.stock.location_id", locationId)
    .order("name", { ascending: true });

  if (error) {
    console.error("listLocationCatalog failed:", error.message);
    return [];
  }
  return (data ?? []).map(mapProductRow);
}

export type PosLookupItem = {
  variantId: string;
  productId: string;
  productName: string;
  variantName: string;
  unit: string;
  amountMinor: number;
  currencyCode: string;
  stockQty: number;
};

/** POS barcode lookup — one variant, one location, price and stock already resolved. */
export async function findVariantByBarcode(
  organizationId: string,
  locationId: string,
  barcode: string,
): Promise<PosLookupItem | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select(
      `id, variant_name,
       product:products!inner(id, name, unit, organization_id),
       prices:prices!inner(amount_minor, currency_code, location_id),
       stock:inventory!inner(stock_qty, location_id)`,
    )
    .eq("barcode", barcode)
    .eq("product.organization_id", organizationId)
    .eq("prices.location_id", locationId)
    .eq("stock.location_id", locationId)
    .maybeSingle();

  if (error || !data) return null;
  const product = Array.isArray(data.product) ? data.product[0] : data.product;
  const price = Array.isArray(data.prices) ? data.prices[0] : data.prices;
  const stock = Array.isArray(data.stock) ? data.stock[0] : data.stock;
  if (!product || !price || !stock) return null;

  return {
    variantId: data.id,
    productId: product.id,
    productName: product.name,
    variantName: data.variant_name,
    unit: product.unit,
    amountMinor: price.amount_minor,
    currencyCode: price.currency_code,
    stockQty: stock.stock_qty,
  };
}

/** Same shape as findVariantByBarcode, keyed by variant id instead — used
 * for "order again", where we already know the variant from order history
 * and just need its *current* price/stock, not the snapshot. */
export async function getVariantAtLocation(variantId: string, locationId: string): Promise<PosLookupItem | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_variants")
    .select(
      `id, variant_name,
       product:products!inner(id, name, unit, organization_id, is_active, deleted_at),
       prices:prices!inner(amount_minor, currency_code, location_id),
       stock:inventory!inner(stock_qty, location_id)`,
    )
    .eq("id", variantId)
    .eq("prices.location_id", locationId)
    .eq("stock.location_id", locationId)
    .maybeSingle();

  if (error || !data) return null;
  const product = Array.isArray(data.product) ? data.product[0] : data.product;
  const price = Array.isArray(data.prices) ? data.prices[0] : data.prices;
  const stock = Array.isArray(data.stock) ? data.stock[0] : data.stock;
  if (!product || !price || !stock || !product.is_active || product.deleted_at) return null;

  return {
    variantId: data.id,
    productId: product.id,
    productName: product.name,
    variantName: data.variant_name,
    unit: product.unit,
    amountMinor: price.amount_minor,
    currencyCode: price.currency_code,
    stockQty: stock.stock_qty,
  };
}

export async function getOrgProduct(productId: string): Promise<ProductListItem | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("products").select(PRODUCT_SELECT).eq("id", productId).maybeSingle();

  if (error || !data) return null;
  return mapProductRow(data);
}
