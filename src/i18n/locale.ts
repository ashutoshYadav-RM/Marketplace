"use server";

import { cookies } from "next/headers";
import { defaultLocale, LOCALE_COOKIE, locales, type Locale } from "./request";

export async function getUserLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  return (locales as readonly string[]).includes(value ?? "") ? (value as Locale) : defaultLocale;
}

export async function setUserLocale(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
}
