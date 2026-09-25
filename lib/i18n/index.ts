import { en } from "./en";
import { ar } from "./ar";
import { ru } from "./ru";
import { zh } from "./zh";
import type { Dictionary, Locale } from "./types";

export * from "./types";
export { en, ar, ru, zh };

/**
 * Locales without their own dictionary fall back to English on purpose: the
 * route, the selector and the <html lang> are all live from the moment a
 * locale is listed, so a translation can be dropped in as a single file
 * without touching a component. English copy in the meantime is a great
 * deal better than a page of missing-key placeholders.
 */
const DICTIONARIES: Record<Locale, Dictionary> = {
  en,
  ar,
  ru,
  zh,
  fr: en,
  hi: en,
  ur: en,
  ja: en,
  th: en,
  id: en,
};

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? en;
}

/**
 * Locales that have their own copy, as opposed to falling through to
 * English. The selector offers only these: a language button that changes
 * the URL and nothing else reads as a broken site, not as a coming-soon.
 * Adding a dictionary above makes it appear here automatically.
 */
export const TRANSLATED_LOCALES: Locale[] = (
  Object.entries(DICTIONARIES) as [Locale, Dictionary][]
)
  .filter(([code, dict]) => code === "en" || dict !== en)
  .map(([code]) => code);

/** Fill {placeholders} in a translated string. */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}
