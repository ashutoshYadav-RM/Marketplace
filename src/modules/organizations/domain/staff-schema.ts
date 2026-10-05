import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";

// "owner" is deliberately excluded — there is exactly one per org, set at
// creation (create_organization_with_location, 0002), never assigned here.
export const INVITABLE_ROLES = ["admin", "manager", "cashier", "staff"] as const;
export type InvitableRole = (typeof INVITABLE_ROLES)[number];

export const inviteStaffSchema = z.object({
  phone: z.string().refine(isValidPhoneNumber, "Enter a valid phone number, including country code."),
  role: z.enum(INVITABLE_ROLES),
  locationId: z.string().uuid().optional().or(z.literal("")),
});
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
