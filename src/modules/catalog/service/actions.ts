"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { findVariantByBarcode, lookupGlobalProductByBarcode, type GlobalProductSuggestion, type PosLookupItem } from "../data/products";
import { createCategorySchema, type CreateCategoryInput } from "../domain/category-schema";
import {
  addVariantSchema,
  createProductSchema,
  updatePriceSchema,
  updateProductSchema,
  updateStockSchema,
  type AddVariantInput,
  type CreateProductInput,
  type UpdatePriceInput,
  type UpdateProductInput,
  type UpdateStockInput,
} from "../domain/schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateInventory() {
  revalidatePath("/merchant/inventory");
}

export async function createProduct(input: CreateProductInput, organizationId: string): Promise<ActionResult> {
  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("create_product_with_variant", {
    p_organization_id: organizationId,
    p_location_id: v.locationId,
    p_category_id: v.categoryId || null,
    p_name: v.name,
    p_description: v.description ?? null,
    p_brand: v.brand ?? null,
    p_unit: v.unit,
    p_variant_name: v.variantName,
    p_sku: v.sku ?? null,
    p_barcode: v.barcode ?? null,
    p_amount_minor: Math.round(v.amount * 100),
    p_currency_code: v.currencyCode,
    p_stock_qty: v.stockQty,
  });

  if (error) return { ok: false, error: error.message };
  revalidateInventory();
  return { ok: true };
}

export async function addVariant(input: AddVariantInput): Promise<ActionResult> {
  const parsed = addVariantSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("add_product_variant", {
    p_product_id: v.productId,
    p_location_id: v.locationId,
    p_variant_name: v.variantName,
    p_sku: v.sku ?? null,
    p_barcode: v.barcode ?? null,
    p_amount_minor: Math.round(v.amount * 100),
    p_currency_code: v.currencyCode,
    p_stock_qty: v.stockQty,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/merchant/inventory/${v.productId}`);
  return { ok: true };
}

export async function updateProduct(input: UpdateProductInput): Promise<ActionResult> {
  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: v.name,
      description: v.description || null,
      brand: v.brand || null,
      category_id: v.categoryId || null,
      unit: v.unit,
      is_active: v.isActive,
    })
    .eq("id", v.productId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/merchant/inventory/${v.productId}`);
  revalidateInventory();
  return { ok: true };
}

export async function updatePrice(input: UpdatePriceInput, productId: string): Promise<ActionResult> {
  const parsed = updatePriceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("prices")
    .update({ amount_minor: Math.round(v.amount * 100) })
    .eq("id", v.priceId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/merchant/inventory/${productId}`);
  revalidateInventory();
  return { ok: true };
}

export async function updateStock(input: UpdateStockInput, productId: string): Promise<ActionResult> {
  const parsed = updateStockSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("inventory")
    .update({ stock_qty: v.stockQty, is_available: v.isAvailable })
    .eq("location_id", v.locationId)
    .eq("variant_id", v.variantId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/merchant/inventory/${productId}`);
  revalidateInventory();
  return { ok: true };
}

export async function archiveProduct(productId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("archive_product", { p_product_id: productId });

  if (error) return { ok: false, error: error.message };
  revalidateInventory();
  return { ok: true };
}

export async function uploadProductImage(
  organizationId: string,
  productId: string,
  formData: FormData,
): Promise<ActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose an image to upload." };
  if (!file.type.startsWith("image/")) return { ok: false, error: "Only image files are supported." };

  const supabase = await createSupabaseServerClient();
  const path = `${organizationId}/${productId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

  const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: product } = await supabase.from("products").select("images").eq("id", productId).single();
  const nextImages = [...(product?.images ?? []), path];

  const { error: updateError } = await supabase.from("products").update({ images: nextImages }).eq("id", productId);
  if (updateError) return { ok: false, error: updateError.message };

  revalidatePath(`/merchant/inventory/${productId}`);
  return { ok: true };
}

// Admin-only in practice: RLS (`categories_admin_write`, 0010) rejects
// the write for anyone else, this is just the typed entry point.
export async function createCategory(input: CreateCategoryInput) {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message };
  const v = parsed.data;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("categories").insert({
    name: v.name,
    slug: v.slug,
    type: v.type,
    icon: v.icon || null,
    sort_order: v.sortOrder ?? 0,
  });

  if (error) return { ok: false as const, error: error.code === "23505" ? "That slug is already used." : error.message };
  revalidatePath("/admin/categories");
  return { ok: true as const };
}

export async function deleteCategory(categoryId: string) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/admin/categories");
  return { ok: true as const };
}

export async function lookupProductByBarcode(
  organizationId: string,
  locationId: string,
  barcode: string,
): Promise<PosLookupItem | null> {
  if (!barcode.trim()) return null;
  return findVariantByBarcode(organizationId, locationId, barcode.trim());
}

/** For the "add product" form — checks the shared catalog (0011), not this
 * org's own listings, so a shop can pre-fill name/brand/unit/category the
 * first time it scans a barcode another shop already added. */
export async function lookupGlobalProduct(barcode: string): Promise<GlobalProductSuggestion | null> {
  return lookupGlobalProductByBarcode(barcode);
}
