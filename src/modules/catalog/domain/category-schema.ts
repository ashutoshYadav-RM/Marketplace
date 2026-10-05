import { z } from "zod";

export const createCategorySchema = z.object({
  name: z.string().min(2, "Enter a name."),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Lowercase letters, numbers, and hyphens only."),
  type: z.enum(["product", "service", "both"]),
  icon: z.string().optional(),
  sortOrder: z.number().int().optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
