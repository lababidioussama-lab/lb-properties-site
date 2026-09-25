import type { MetadataRoute } from "next";
import { LOCALES } from "@/lib/i18n/types";
import { SITE_URL } from "@/lib/site-config";

/* Every public page in every language, with hreflang alternates, so Google
   indexes the Arabic, Russian and Chinese versions as translations. */
const PAGES = ["", "/invest", "/projects", "/services"];

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.flatMap((page) =>
    LOCALES.map((locale) => ({
      url: `${SITE_URL}/${locale}${page}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: page === "" ? (locale === "en" ? 1 : 0.9) : 0.7,
      alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, `${SITE_URL}/${l}${page}`])) },
    })),
  );
}
