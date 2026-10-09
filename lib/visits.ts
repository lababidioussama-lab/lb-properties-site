import { createHash } from "node:crypto";

/**
 * Visitor counting for the public site and the CRM sign-in pages.
 *
 * No cookie and no stored identifier: a visitor is a one-way hash of the
 * day, their network address and their browser, so the same person counts
 * once a day and can never be traced back to an address. Each page view is
 * one row in crm_audit (entity "visit"), like the CRM's other server-kept
 * records, so nothing new is needed in the database.
 */

export const VISIT_ENTITY = "visit";

export interface VisitDetail {
  /** today's anonymous visitor hash */
  v: string;
  path: string;
  /** where the visit came from, in plain words: "Instagram", "Google search", "Direct"… */
  src: string;
  /** the site that linked here, when there was one */
  ref?: string;
  campaign?: string;
  country?: string;
  city?: string;
  device: string;
  browser: string;
  lang?: string;
  /** a signed-in team member, not a member of the public */
  team?: boolean;
}

const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|node-fetch|axios|go-http|scrapy|semrush|ahrefs/i;
export const isBot = (ua: string) => !ua || BOT.test(ua);

export function visitorHash(ip: string, ua: string, secret: string): string {
  const day = new Date(Date.now() + 4 * 3_600_000).toISOString().slice(0, 10); // the Dubai day
  return createHash("sha256").update(`${secret}|${day}|${ip}|${ua}`).digest("hex").slice(0, 16);
}

export function deviceOf(ua: string): { device: string; browser: string } {
  const device = /iPad|Tablet/.test(ua) ? "Tablet" : /iPhone|Android.*Mobile|Mobile/.test(ua) ? "Phone" : "Computer";
  const os = /iPhone|iPad/.test(ua) ? "iPhone / iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "Other";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung Internet" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Other";
  return { device: `${device} · ${os}`, browser };
}

/* Names people type into utm_source, and the hosts links arrive from. */
const NAMED: [RegExp, string][] = [
  [/^(ig|insta|instagram)$/, "Instagram"], [/^(fb|facebook|meta)$/, "Facebook"], [/^(google|adwords|gads)$/, "Google"],
  [/^(tiktok|tt)$/, "TikTok"], [/^(wa|whatsapp)$/, "WhatsApp"], [/^(linkedin|li)$/, "LinkedIn"], [/^(youtube|yt)$/, "YouTube"],
  [/^(twitter|x)$/, "X (Twitter)"], [/^(snapchat|snap)$/, "Snapchat"], [/^(telegram|tg)$/, "Telegram"],
  [/^(email|newsletter|mail)$/, "Email"], [/^bayut$/, "Bayut"], [/^(propertyfinder|pf)$/, "Property Finder"], [/^dubizzle$/, "Dubizzle"],
];
const HOSTS: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, "Instagram"], [/(^|\.)(facebook\.com|fb\.me|fb\.com|messenger\.com)$/, "Facebook"],
  [/(^|\.)google\.[a-z.]+$/, "Google search"], [/(^|\.)bing\.com$/, "Bing search"], [/(^|\.)duckduckgo\.com$/, "DuckDuckGo search"],
  [/(^|\.)yahoo\.[a-z.]+$/, "Yahoo search"], [/(^|\.)yandex\.[a-z.]+$/, "Yandex search"], [/(^|\.)baidu\.com$/, "Baidu search"],
  [/(^|\.)(tiktok\.com)$/, "TikTok"], [/(^|\.)(linkedin\.com|lnkd\.in)$/, "LinkedIn"], [/(^|\.)(youtube\.com|youtu\.be)$/, "YouTube"],
  [/(^|\.)(twitter\.com|x\.com|t\.co)$/, "X (Twitter)"], [/(^|\.)(whatsapp\.com|wa\.me)$/, "WhatsApp"], [/(^|\.)(t\.me|telegram\.org)$/, "Telegram"],
  [/(^|\.)snapchat\.com$/, "Snapchat"], [/(^|\.)(chatgpt\.com|openai\.com)$/, "ChatGPT"], [/(^|\.)perplexity\.ai$/, "Perplexity"], [/(^|\.)claude\.ai$/, "Claude"],
  [/(^|\.)bayut\.com$/, "Bayut"], [/(^|\.)propertyfinder\.ae$/, "Property Finder"], [/(^|\.)dubizzle\.com$/, "Dubizzle"],
];
/* Apps open links in their own browser and hide where the tap came from;
   the browser's name still gives it away. */
const IN_APP: [RegExp, string][] = [
  [/Instagram/, "Instagram"], [/FBAN|FBAV|FB_IAB/, "Facebook"], [/TikTok|musical_ly|BytedanceWebview/i, "TikTok"],
  [/WhatsApp/, "WhatsApp"], [/Snapchat/, "Snapchat"], [/LinkedInApp/, "LinkedIn"], [/Telegram/i, "Telegram"],
];

/* Letters of any alphabet (city names arrive accented or in Arabic), digits and a little punctuation. */
const clean = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/[^\p{L}\p{N}_ .\-/+&']/gu, "").trim().slice(0, max) : "");

export function hostOf(url: unknown): string {
  if (typeof url !== "string" || !url) return "";
  try { return new URL(url).hostname.toLowerCase().replace(/^www\./, "").slice(0, 80); } catch { return ""; }
}

/** Where a visit came from, in the words the owner uses. */
export function sourceOf(input: { refHost: string; ownHost: string; utmSource?: unknown; utmMedium?: unknown; gclid?: boolean; fbclid?: boolean; ttclid?: boolean; ua: string }): string {
  const utm = clean(input.utmSource, 40).toLowerCase();
  const paid = /cpc|ppc|paid|ads?$/i.test(clean(input.utmMedium, 30));
  if (utm) {
    const named = NAMED.find(([re]) => re.test(utm))?.[1] ?? utm.replace(/^./, (c) => c.toUpperCase());
    return paid ? `${named} ads` : named;
  }
  if (input.gclid) return "Google ads";
  if (input.ttclid) return "TikTok ads";
  const ref = input.refHost && input.refHost !== input.ownHost ? input.refHost : "";
  const byHost = ref ? HOSTS.find(([re]) => re.test(ref))?.[1] : undefined;
  const byApp = IN_APP.find(([re]) => re.test(input.ua))?.[1];
  if (input.fbclid) return `${byHost === "Instagram" || byApp === "Instagram" ? "Instagram" : "Facebook"} ads or post`;
  if (byHost) return byHost;
  if (byApp) return byApp;
  if (ref) return ref;
  return "Direct (typed, bookmark or app)";
}

/** Netlify tells each function where the request came from. */
export function geoOf(headers: Headers): { country?: string; city?: string } {
  try {
    const raw = headers.get("x-nf-geo");
    if (raw) {
      const g = JSON.parse(Buffer.from(raw, "base64").toString("utf8")) as { city?: string; country?: { name?: string; code?: string } };
      return { country: clean(g.country?.name ?? g.country?.code, 60) || undefined, city: clean(g.city, 60) || undefined };
    }
  } catch { /* an unreadable header is simply no location */ }
  const code = clean(headers.get("x-country") ?? headers.get("x-vercel-ip-country"), 3);
  return code ? { country: code } : {};
}

export const cleanPath = (p: unknown) => {
  const s = typeof p === "string" ? p.split("?")[0].split("#")[0] : "";
  return /^\/[\w\-./%]*$/.test(s) ? s.slice(0, 160) : "/";
};
export const cleanText = clean;
