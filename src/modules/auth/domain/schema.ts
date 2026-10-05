import { isValidPhoneNumber } from "libphonenumber-js";
import { z } from "zod";

/**
 * Shared client/server validation (§08 — "the schema lives in `domain/` so
 * the same rules run instantly in the browser and are re-checked, trusted,
 * on the server"). Phone numbers are validated as international E.164, not
 * a 10-digit-India regex — see blueprint §10.
 */

export const phoneRequestSchema = z.object({
  phone: z.string().refine(isValidPhoneNumber, "Enter a valid phone number, including country code."),
});
export type PhoneRequestInput = z.infer<typeof phoneRequestSchema>;

export const phoneVerifySchema = z.object({
  phone: z.string().refine(isValidPhoneNumber, "Invalid phone number."),
  code: z.string().length(6, "Enter the 6-digit code."),
});
export type PhoneVerifyInput = z.infer<typeof phoneVerifySchema>;

export const emailSignInSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});
export type EmailSignInInput = z.infer<typeof emailSignInSchema>;

export const emailSignUpSchema = emailSignInSchema.extend({
  fullName: z.string().min(1, "Enter your name."),
});
export type EmailSignUpInput = z.infer<typeof emailSignUpSchema>;
