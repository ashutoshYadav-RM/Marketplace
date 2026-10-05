import { z } from "zod";

export const placeOrderItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().positive(),
});

export const placeOrderSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  items: z.array(placeOrderItemSchema).min(1, "Your cart is empty."),
  notes: z.string().optional(),
  couponCode: z.string().optional(),
});
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const posSaleItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().positive(),
});

export const posSaleSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  items: z.array(posSaleItemSchema).min(1, "Add at least one item."),
  discountMinor: z.number().min(0).optional(),
});
export type PosSaleInput = z.infer<typeof posSaleSchema>;

export const ORDER_STATUSES = [
  "placed",
  "accepted",
  "packing",
  "ready_for_pickup",
  "picked_up",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
