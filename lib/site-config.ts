/**
 * Single source of truth for brand identity and contact routing.
 * Change the number here and every CTA, deeplink and tel: link follows.
 */

/** The public address Google should index. Override with SITE_URL (e.g. the
    netlify.app address) until the real domain is connected. */
export const SITE_URL = (process.env.SITE_URL || "https://lababidiproperties.com").replace(/\/$/, "");

export const SITE = {
  name: "Lababidi Properties",
  /** Wordmark line 1 / line 2, as set in the lockup */
  nameMark: "Lababidi",
  nameSuffix: "Properties",
  nameShort: "Lababidi Properties",
  tagline: "A private office for Dubai property.",

  /** Dubai Department of Economy & Tourism commercial license number. */
  licenseNo: "1652937",

  /** E.164 without the +, as wa.me requires */
  whatsappNumber: "971547044047",
  phoneDisplay: "+971 54 704 4047",
  phoneHref: "+971547044047",

  waLink(message?: string) {
    const base = `https://wa.me/${SITE.whatsappNumber}`;
    return message ? `${base}?text=${encodeURIComponent(message)}` : base;
  },
} as const;

export const SECTION_IDS = {
  advisory: "investor-advisory",
  netRoi: "net-roi-service-charges",
  relocation: "relocation-utilities",
  maintenance: "home-maintenance",
  fitout: "interior-fitout",
  construction: "construction-renovations",
  mortgage: "mortgage-advisory",
} as const;

export type ServiceKey = keyof typeof SECTION_IDS;

export const SERVICE_KEYS: ServiceKey[] = [
  "advisory",
  "netRoi",
  "relocation",
  "fitout",
  "construction",
  "mortgage",
];

/** Top-level pages. Each service section now lives on one of them. */
export type PageKey = "projects" | "invest" | "services";

export const SERVICE_PAGE: Record<ServiceKey, PageKey> = {
  advisory: "invest",
  netRoi: "invest",
  mortgage: "invest",
  relocation: "services",
  maintenance: "services",
  fitout: "services",
  construction: "services",
};

export function pageHref(locale: string, page: PageKey, hash?: string) {
  return `/${locale}/${page}${hash ? `#${hash}` : ""}`;
}

export function serviceHref(locale: string, service: ServiceKey) {
  return pageHref(locale, SERVICE_PAGE[service], SECTION_IDS[service]);
}

export const MARKET_SECTION_ID = "market-data";
export const PROJECTS_SECTION_ID = "off-plan-projects";
