/**
 * Single source of truth for brand identity and contact routing.
 * Change the number here and every CTA, deeplink and tel: link follows.
 */

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
  "maintenance",
  "fitout",
  "construction",
  "mortgage",
];

/** The five that earn a slot in the desktop nav bar. */
export const NAV_KEYS: ServiceKey[] = [
  "advisory",
  "netRoi",
  "fitout",
  "construction",
  "mortgage",
];
