/**
 * Money is always `{ amountMinor, currencyCode }` — never a bare number,
 * never a hardcoded ₹. See blueprint §10 (Globalization).
 */
export type Money = {
  amountMinor: number;
  currencyCode: string;
};

/**
 * Minor-unit exponent per currency. Most currencies are 2 (cents/paise);
 * a few (JPY, KRW, ...) have 0. Extend this map before adding a currency
 * that isn't 2 decimal places — never assume.
 */
const MINOR_UNIT_EXPONENTS: Record<string, number> = {
  JPY: 0,
  KRW: 0,
  VND: 0,
};

function minorUnitExponent(currencyCode: string): number {
  return MINOR_UNIT_EXPONENTS[currencyCode] ?? 2;
}

/** Formats money for display in the given locale. Never assumes en-IN or ₹. */
export function formatMoney(money: Money, locale: string): string {
  const exponent = minorUnitExponent(money.currencyCode);
  const amount = money.amountMinor / 10 ** exponent;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: money.currencyCode,
  }).format(amount);
}
