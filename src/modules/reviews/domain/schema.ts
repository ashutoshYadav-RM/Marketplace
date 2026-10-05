import { z } from "zod";

export const submitReviewSchema = z.object({
  orderId: z.string().uuid(),
  organizationId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
  images: z.array(z.string()).optional(),
});
export type SubmitReviewInput = z.infer<typeof submitReviewSchema>;

export const replyToReviewSchema = z.object({
  reviewId: z.string().uuid(),
  reply: z.string().min(1, "Write a reply.").max(2000),
});
export type ReplyToReviewInput = z.infer<typeof replyToReviewSchema>;
