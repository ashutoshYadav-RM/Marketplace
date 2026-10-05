"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  emailSignInSchema,
  emailSignUpSchema,
  phoneRequestSchema,
  phoneVerifySchema,
} from "../domain/schema";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function requestPhoneOtp(input: { phone: string }): Promise<ActionResult> {
  const parsed = phoneRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithOtp({ phone: parsed.data.phone });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function verifyPhoneOtp(input: { phone: string; code: string }): Promise<ActionResult> {
  const parsed = phoneVerifySchema.safeParse({ phone: input.phone, code: input.code });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({
    phone: parsed.data.phone,
    token: parsed.data.code,
    type: "sms",
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signInWithEmail(input: { email: string; password: string }): Promise<ActionResult> {
  const parsed = emailSignInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signUpWithEmail(
  input: { email: string; password: string; fullName: string },
): Promise<ActionResult> {
  const parsed = emailSignUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { full_name: parsed.data.fullName } },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
