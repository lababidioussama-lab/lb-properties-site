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
const MAX_PER_WINDOW = 60;
const seen = new Map<string, number[]>();
function tooMany(ip: string): boolean {
  const now = Date.now();
  const recent = (seen.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  seen.set(ip, recent);
  if (seen.size > 5_000) seen.clear();
  return recent.length > MAX_PER_WINDOW;
}

const done = () => new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest) {
  const ua = request.headers.get("user-agent")?.slice(0, 300) ?? "";
  if (isBot(ua)) return done();
  // Only our own pages report visits.
  const origin = request.headers.get("origin");
  const host = (request.headers.get("host") ?? "").toLowerCase();
  if (origin && hostOf(origin) !== host.split(":")[0].replace(/^www\./, "")) return done();

  const ip = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (tooMany(ip)) return done();
  const secret = process.env.SESSION_SECRET;
  const db = getSupabaseAdmin();
  if (!db || !secret) return done();

  const text = await request.text().catch(() => "");
  if (text.length > 2_000) return done();
  let b: Record<string, unknown> = {};
  try { b = JSON.parse(text) as Record<string, unknown>; } catch { return done(); }

  const path = cleanPath(b.p);
  const crm = path === "/admin" || path.startsWith("/admin/") || path.startsWith("/documents");
  const refHost = hostOf(b.r);
  const ownHost = host.split(":")[0].replace(/^www\./, "");
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
  if (readSession(request.cookies.get(CRM_COOKIE)?.value)) detail.team = true;

  await db.from("crm_audit").insert({ user_id: null, entity: VISIT_ENTITY, entity_id: null, action: crm ? "crm" : "site", detail });
  return done();
}
