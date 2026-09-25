import type { Metadata } from "next";
import { getDictionary, LOCALES, type Locale } from "@/lib/i18n";
import { SITE, type PageKey } from "@/lib/site-config";

const plain = (s: string) => s.replace(/\[\[|\]\]/g, "");

export async function pageMetadata(params: Promise<{ locale: string }>, page: PageKey): Promise<Metadata> {
  const { locale } = await params;
  if (!(LOCALES as readonly string[]).includes(locale)) return {};
  const c = getDictionary(locale as Locale).pages[page];
  const title = `${plain(c.title)} — ${SITE.name}`;
  return {
    title,
    description: c.subtitle,
    alternates: {
      canonical: `/${locale}/${page}`,
      languages: Object.fromEntries(LOCALES.map((l) => [l, `/${l}/${page}`])),
    },
    openGraph: { title, description: c.subtitle, locale, type: "website" },
  };
}
