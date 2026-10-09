import { clientIp as clientAddress } from "@/lib/client";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { readSession, CRM_COOKIE } from "@/lib/crm-auth";
import { VISIT_ENTITY, cleanPath, cleanText, deviceOf, geoOf, hostOf, isBot, sourceOf, visitorHash, type VisitDetail } from "@/lib/visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* One page view from the site's own pages. Public by nature, so it accepts
   very little: a path, where the visit came from, and nothing that names a
   person. Robots are dropped, and one address can only send so many. */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const seen = new Map<string, number[]>();
function tooMany(ip: string): boolean {
  const now = Date.now();
  const recent = (seen.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  seen.set(ip, recent);
  if (seen.size > 5_000) seen.clear();
  return recent.length > MAX_PER_WINDOW;
}

/* The public website (a separate Worker with no database key) reports its page
   views here, so these origins may post. Anything else must be this server's own pages. */
const SITE_ORIGINS = (process.env.VISIT_SITE_ORIGINS ?? "https://lababidiproperties.com,https://www.lababidiproperties.com")
  .split(",").map((o) => o.trim().toLowerCase()).filter(Boolean);

const done = (allowOrigin?: string) =>
  new NextResponse(null, { status: 204, headers: allowOrigin ? { "Access-Control-Allow-Origin": allowOrigin, Vary: "Origin" } : undefined });

export async function POST(request: NextRequest) {
  const ua = request.headers.get("user-agent")?.slice(0, 300) ?? "";
  if (isBot(ua)) return done();
  // Only our own pages report visits.
  // A browser always names the page a POST came from; anything without it is a script.
  const origin = request.headers.get("origin");
  const host = (request.headers.get("host") ?? "").toLowerCase();
  const fromSite = !!origin && SITE_ORIGINS.includes(origin.toLowerCase());
  const fromOwn = !!origin && hostOf(origin) === host.split(":")[0].replace(/^www\./, "");
  if (!fromSite && !fromOwn) return done();
  const reply = () => done(fromSite ? origin! : undefined);

  const ip = clientAddress(request.headers);
  if (tooMany(ip)) return reply();
  const secret = process.env.SESSION_SECRET;
  const db = getSupabaseAdmin();
  if (!db || !secret) return reply();

  const text = await request.text().catch(() => "");
  if (text.length > 2_000) return reply();
  let b: Record<string, unknown> = {};
  try { b = JSON.parse(text) as Record<string, unknown>; } catch { return reply(); }

  const path = cleanPath(b.p);
  // Pages of this server are the CRM; pages reported by the public website are the website.
  const crm = !fromSite;
  const refHost = hostOf(b.r);
  const ownHost = fromSite ? hostOf(origin) : host.split(":")[0].replace(/^www\./, "");
  const detail: VisitDetail = {
    v: visitorHash(ip, ua, secret),
    path,
    src: sourceOf({ refHost, ownHost, utmSource: b.us, utmMedium: b.um, gclid: b.g === 1, fbclid: b.f === 1, ttclid: b.t === 1, ua }),
    ...deviceOf(ua),
    ...geoOf(request.headers),
  };
  if (refHost && refHost !== ownHost) detail.ref = refHost;
  const campaign = cleanText(b.uc, 60);
  if (campaign) detail.campaign = campaign;
  const lang = cleanText(b.l, 12);
  if (lang) detail.lang = lang;
  if (!fromSite && readSession(request.cookies.get(CRM_COOKIE)?.value)) detail.team = true;

  await db.from("crm_audit").insert({ user_id: null, entity: VISIT_ENTITY, entity_id: null, action: crm ? "crm" : "site", detail });
  return reply();
}
