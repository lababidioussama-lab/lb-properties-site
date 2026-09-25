/**
 * Currency display. AED is the base unit for every figure in the app —
 * conversion happens only at render time so the underlying model stays in
 * one unit and rounding never compounds.
 *
 * Rates are static constants, not a live FX feed: this is indicative pricing
 * for a marketing calculator, and a broken third-party FX call at render time
 * would be a worse failure than a rate that is a few percent stale. AED is
 * pegged to USD at 3.6725, so that leg is fixed by policy rather than market.
 */

export const RATES_AS_OF = "2026-08-01";

export const CURRENCIES = {
  AED: { code: "AED", symbol: "AED", perAed: 1, locale: "en-AE", decimals: 0 },
  USD: { code: "USD", symbol: "$", perAed: 1 / 3.6725, locale: "en-US", decimals: 0 },
  EUR: { code: "EUR", symbol: "€", perAed: 0.2513, locale: "de-DE", decimals: 0 },
  GBP: { code: "GBP", symbol: "£", perAed: 0.2141, locale: "en-GB", decimals: 0 },
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;
export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export function convertFromAed(amountAed: number, code: CurrencyCode): number {
  return amountAed * CURRENCIES[code].perAed;
}

/**
 * Format an AED-denominated figure in the target currency.
 * Numerals stay Western even in Arabic — standard for UAE financial copy,
 * and it keeps figures comparable across the locale switch.
 */
export function formatCurrency(
  amountAed: number,
  code: CurrencyCode,
  opts: { compact?: boolean; decimals?: number } = {},
): string {
  const value = convertFromAed(amountAed, code);
  const decimals = opts.decimals ?? CURRENCIES[code].decimals;

  const formatted = new Intl.NumberFormat("en-US", {
    notation: opts.compact ? "compact" : "standard",
    maximumFractionDigits: opts.compact ? 2 : decimals,
    minimumFractionDigits: opts.compact ? 0 : decimals,
  }).format(value);

  return code === "AED" ? `AED ${formatted}` : `${CURRENCIES[code].symbol}${formatted}`;
}

/** Compact form for slider labels and axis ticks: "AED 4.5M" */
export function formatCompact(amountAed: number, code: CurrencyCode): string {
  return formatCurrency(amountAed, code, { compact: true });
}
