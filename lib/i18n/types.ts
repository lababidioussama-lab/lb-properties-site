import type { en } from "./en";

/**
 * `en` is declared `as const`, so every value is a string *literal* type.
 * A translation obviously can't match those literals, so widen them back to
 * plain strings while keeping the structure exact. The result is that a
 * missing or misspelled key in a translation is a compile error, but a
 * different string value is not.
 */
type Widen<T> = T extends string
  ? string
  : T extends number
    ? number
    : T extends boolean
      ? boolean
      : T extends readonly (infer U)[]
        ? readonly Widen<U>[]
        : { [K in keyof T]: Widen<T[K]> };

export type Dictionary = Widen<typeof en>;

export const LOCALES = [
  "en",
  "ar",
  "ru",
  "zh",
  "fr",
  "hi",
  "ur",
  "ja",
  "th",
  "id",
] as const;
export type Locale = (typeof LOCALES)[number];

/* Urdu is right-to-left like Arabic, so it inherits the whole mirroring
   pass already built for `ar` — the direction is derived from this list
   rather than hard-coded anywhere, so nothing else needs to change. */
export const RTL_LOCALES: readonly Locale[] = ["ar", "ur"];

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export function dirFor(locale: Locale): "rtl" | "ltr" {
  return isRtl(locale) ? "rtl" : "ltr";
}

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "EN",
  ar: "AR",
  ru: "RU",
  zh: "中文",
  fr: "FR",
  hi: "HI",
  ur: "UR",
  ja: "日本語",
  th: "TH",
  id: "ID",
};

/* Endonyms, not English names: a Russian buyer scans a language list for
   "Русский", not for "Russian". */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
  ru: "Русский",
  zh: "简体中文",
  fr: "Français",
  hi: "हिन्दी",
  ur: "اردو",
  ja: "日本語",
  th: "ไทย",
  id: "Bahasa Indonesia",
};
