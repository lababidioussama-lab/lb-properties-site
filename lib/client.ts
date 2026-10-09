import { timingSafeEqual } from "node:crypto";

/**
 * Who is asking, and from where.
 *
 * On Netlify, Netlify reports the visitor's address itself. On Cloudflare the
 * address and country arrive in Cloudflare's own headers. Those are believed
 * when the code is running as a Cloudflare Worker, or, for a server that
 * Cloudflare only fronts, when the request also carries the edge secret a
 * Cloudflare rule adds (EDGE_SECRET here, the same value in the rule). Without
 * that proof anybody reaching the server directly could type any address they
 * liked and dodge every per-address limit, so the other headers are used.
 */

/* Running as a Cloudflare Worker, every request has come through Cloudflare,
   which sets these headers itself and replaces any a caller sends. */
const onCloudflareWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";

function fromCloudflare(headers: Headers): boolean {
  if (onCloudflareWorkers) return true;
  const secret = process.env.EDGE_SECRET;
  const given = headers.get("x-lb-edge");
  if (!secret || secret.length < 16 || !given) return false;
  const a = Buffer.from(secret), b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The visitor's network address, or "unknown". */
export function clientIp(headers: Headers): string {
  if (fromCloudflare(headers)) {
    const cf = headers.get("cf-connecting-ip")?.trim();
    if (cf) return cf.slice(0, 64);
  }
  return (headers.get("x-nf-client-connection-ip") ?? headers.get("x-forwarded-for")?.split(",")[0].trim() ?? headers.get("x-real-ip") ?? "unknown").slice(0, 64);
}

const place = (s: string | null | undefined, max: number) => (s ?? "").replace(/[^\p{L}\p{N}_ .\-/+&']/gu, "").trim().slice(0, max);

/** Country and city as Cloudflare reports them, when the request is proven to come through it. */
export function cloudflareGeo(headers: Headers): { country?: string; city?: string } | null {
  if (!fromCloudflare(headers)) return null;
  const code = place(headers.get("cf-ipcountry"), 3);
  const city = place(headers.get("cf-ipcity"), 60);
  if (!code && !city) return null;
  return { country: code && code !== "XX" && code !== "T1" ? code : undefined, city: city || undefined };
}
