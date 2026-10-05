import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

/**
 * V1 ships English only, at no URL cost: there is no `/en/...` prefix, so
 * adding Hindi/Spanish/etc. later is "add a JSON file + an entry here", not
 * a routing rewrite. `defaultLocale` and `locales` are the two lines that
 * change when that happens.
 */
export const defaultLocale = "en";
export const locales = ["en"] as const;
export type Locale = (typeof locales)[number];

export const LOCALE_COOKIE = "locale";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const requested = cookieStore.get(LOCALE_COOKIE)?.value;
  const locale = (locales as readonly string[]).includes(requested ?? "") ? (requested as Locale) : defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
