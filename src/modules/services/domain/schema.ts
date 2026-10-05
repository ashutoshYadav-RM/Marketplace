import { z } from "zod";

const moneyField = z.number({ message: "Enter a visit charge." }).min(0, "Can't be negative.");

export const createServiceSchema = z.object({
  name: z.string().min(2, "Enter a service name."),
  description: z.string().optional(),
  categoryId: z.string().uuid().optional().or(z.literal("")),
  visitCharge: moneyField,
  currencyCode: z.string().length(3),
  durationMinutes: z.number().int().positive().optional(),
});
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = createServiceSchema.extend({
  serviceId: z.string().uuid(),
  isActive: z.boolean(),
});
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

export const requestBookingSchema = z.object({
  organizationId: z.string().uuid(),
  locationId: z.string().uuid(),
  serviceId: z.string().uuid(),
  requestedTime: z.string().min(1, "Choose a preferred time."),
  description: z.string().optional(),
});
export type RequestBookingInput = z.infer<typeof requestBookingSchema>;

export const BOOKING_STATUSES = [
  "requested",
  "accepted",
  "scheduled",
  "arrived",
  "work_started",
  "completed",
  "paid",
  "rejected",
  "cancelled",
  "no_show",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];
