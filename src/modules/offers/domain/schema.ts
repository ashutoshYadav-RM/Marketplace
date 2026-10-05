import { z } from "zod";

export const OFFER_TYPES = ["percent", "flat"] as const;

export const createOfferSchema = z.object({
  code: z
    .string()
    .min(3, "At least 3 characters.")
    .max(20)
    .regex(/^[a-zA-Z0-9]+$/, "Letters and numbers only."),
  type: z.enum(OFFER_TYPES),
  value: z.number().positive("Enter a value greater than 0."),
  minOrder: z.number().min(0).optional(),
  usageLimit: z.number().int().positive().optional(),
});
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
