import { z } from "zod";

export const PRODUCT_UNITS = ["piece", "kg", "gram", "litre", "ml", "metre", "box", "pack", "set"] as const;
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

const moneyField = z
  .number({ message: "Enter a price." })
  .min(0, "Price can't be negative.")
  .max(10_000_000, "That price looks too high — check the amount.");

const stockField = z.number({ message: "Enter a stock count." }).min(0, "Stock can't be negative.");

export const createProductSchema = z.object({
  locationId: z.string().uuid("Choose a location."),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().min(2, "Enter a product name."),
  description: z.string().optional(),
  brand: z.string().optional(),
  unit: z.enum(PRODUCT_UNITS),
  variantName: z.string().min(1, 'Name this variant (e.g. "500 ml").'),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  amount: moneyField,
  currencyCode: z.string().length(3),
  stockQty: stockField,
  images: z.array(z.string()).optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const addVariantSchema = z.object({
  productId: z.string().uuid(),
  locationId: z.string().uuid(),
  variantName: z.string().min(1, "Name this variant."),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  amount: moneyField,
  currencyCode: z.string().length(3),
  stockQty: stockField,
});
export type AddVariantInput = z.infer<typeof addVariantSchema>;

export const updateProductSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().min(2, "Enter a product name."),
  description: z.string().optional(),
  brand: z.string().optional(),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  unit: z.enum(PRODUCT_UNITS),
  isActive: z.boolean(),
});
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const updatePriceSchema = z.object({
  priceId: z.string().uuid(),
  amount: moneyField,
});
export type UpdatePriceInput = z.infer<typeof updatePriceSchema>;

export const updateStockSchema = z.object({
  locationId: z.string().uuid(),
  variantId: z.string().uuid(),
  stockQty: stockField,
  isAvailable: z.boolean(),
});
export type UpdateStockInput = z.infer<typeof updateStockSchema>;
