import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";

/**
 * Registering a shop creates an organization, its owner membership, and its
 * first location together (see `create_organization_with_location` in
 * 0002_organizations.sql) — a shop with no location isn't a shop yet.
 */
export const registerOrganizationSchema = z.object({
  name: z.string().min(2, "Enter your shop or business name."),
  countryId: z.string().length(2, "Choose a country."),
  locationName: z.string().min(2, "Name this location (e.g. \"Main branch\")."),
  addressLine1: z.string().min(3, "Enter the shop address."),
  locality: z.string().min(1, "Enter the neighborhood or area."),
  city: z.string().min(1, "Enter the city."),
  region: z.string().optional(),
  postalCode: z.string().optional(),
  phone: z.string().refine(isValidPhoneNumber, "Enter a valid phone number, including country code."),
  timezone: z.string().min(1),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});
export type RegisterOrganizationInput = z.infer<typeof registerOrganizationSchema>;
