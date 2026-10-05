import { z } from "zod";

export const dayHoursSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  isClosed: z.boolean(),
  openTime: z.string().optional(),
  closeTime: z.string().optional(),
});
export type DayHoursInput = z.infer<typeof dayHoursSchema>;

export const setLocationHoursSchema = z.object({
  locationId: z.string().uuid(),
  days: z.array(dayHoursSchema).length(7, "Expected all 7 days."),
});
export type SetLocationHoursInput = z.infer<typeof setLocationHoursSchema>;
