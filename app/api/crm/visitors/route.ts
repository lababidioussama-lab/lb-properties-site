import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { liveUser, sessionFromRequest } from "@/lib/crm-auth";
import { VISIT_ENTITY, type VisitDetail } from "@/lib/visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/* GET /api/crm/visitors?days=1|7|30|90&where=site|crm  (admin)
   Reads the visit rows for the period and adds them up here, so the browser
   gets totals and short lists, never the raw log. */

const PAGE = 1000;       // the most rows the database hands over at once
const MAX_PAGES = 30;    // 30,000 page views a period is plenty; more is flagged

type Row = { created_at: string; action: string; detail: VisitDetail | null };
const dubaiDay = (iso: string) => new Date(new Date(iso).getTime() + 4 * 3_600_000).toISOString().slice(0, 10);

function top(map: Map<string, { views: number; who: Set<string> }>, n: number) {
  return [...map.entries()].map(([name, x]) => ({ name, views: x.views, visitors: x.who.size }))
    .sort((a, b) => b.visitors - a.visitors || b.views - a.views).slice(0, n);
}
function add(map: Map<string, { views: number; who: Set<string> }>, key: string | undefined, who: string) {
  const k = key || "Unknown";
  const x = map.get(k) ?? { views: 0, who: new Set<string>() };
  x.views++; x.who.add(who);
  map.set(k, x);
}

export async function GET(request: NextRequest) {
  const user = await liveUser(sessionFromRequest(request));
  if (!user) return fail("unauthorised", 401);
  if (user.role !== "admin") return fail("forbidden", 403);
  const db = getSupabaseAdmin();
  if (!db) return fail("not_configured", 503);

  const url = new URL(request.url);
  const days = [1, 7, 30, 90].includes(Number(url.searchParams.get("days"))) ? Number(url.searchParams.get("days")) : 7;
  const where = url.searchParams.get("where") === "crm" ? "crm" : "site";
  const today = dubaiDay(new Date().toISOString());
  const start = new Date(new Date(`${today}T00:00:00+04:00`).getTime() - (days - 1) * 86_400_000);

  const rows: Row[] = [];
  let truncated = false;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await db.from("crm_audit").select("created_at, action, detail")
      .eq("entity", VISIT_ENTITY).eq("action", where).gte("created_at", start.toISOString())
      .order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) { console.error("[visitors] database:", error.message); return fail("server_error", 502); }
    rows.push(...((data ?? []) as Row[]));
    if ((data?.length ?? 0) < PAGE) break;
    if (page === MAX_PAGES - 1) truncated = true;
  }

  // The team's own visits to the public site would only flatter the numbers.
  const kept = rows.filter((r) => r.detail && (where === "crm" || !r.detail.team));
  const who = (r: Row) => `${dubaiDay(r.created_at)}:${r.detail!.v}`;

  const byDay = new Map<string, { views: number; who: Set<string> }>();
  for (let i = days - 1; i >= 0; i--) byDay.set(dubaiDay(new Date(Date.now() - i * 86_400_000).toISOString()), { views: 0, who: new Set() });
  const sources = new Map<string, { views: number; who: Set<string> }>(), referrers = new Map<string, { views: number; who: Set<string> }>();
  const countries = new Map<string, { views: number; who: Set<string> }>(), cities = new Map<string, { views: number; who: Set<string> }>();
  const pages = new Map<string, { views: number; who: Set<string> }>(), devices = new Map<string, { views: number; who: Set<string> }>();
  const browsers = new Map<string, { views: number; who: Set<string> }>(), campaigns = new Map<string, { views: number; who: Set<string> }>();
  const everyone = new Set<string>();

  for (const r of kept) {
    const d = r.detail!, w = who(r);
    everyone.add(w);
    const day = byDay.get(dubaiDay(r.created_at));
    if (day) { day.views++; day.who.add(w); }
    add(sources, d.src, w);
    if (d.ref) add(referrers, d.ref, w);
    add(countries, d.country, w);
    if (d.city) add(cities, d.country ? `${d.city}, ${d.country}` : d.city, w);
    add(pages, d.path, w);
    add(devices, d.device, w);
    add(browsers, d.browser, w);
    if (d.campaign) add(campaigns, d.campaign, w);
  }

  const todayRow = byDay.get(today);
  return NextResponse.json({
    ok: true, days, where, truncated,
    totals: { views: kept.length, visitors: everyone.size, todayViews: todayRow?.views ?? 0, todayVisitors: todayRow?.who.size ?? 0 },
    series: [...byDay.entries()].map(([day, x]) => ({ day, views: x.views, visitors: x.who.size })),
    sources: top(sources, 12), referrers: top(referrers, 10), countries: top(countries, 12), cities: top(cities, 10),
    pages: top(pages, 15), devices: top(devices, 8), browsers: top(browsers, 8), campaigns: top(campaigns, 10),
    recent: kept.slice(0, 60).map((r) => ({
      at: r.created_at, path: r.detail!.path, source: r.detail!.src, ref: r.detail!.ref ?? null,
      country: r.detail!.country ?? null, city: r.detail!.city ?? null, device: r.detail!.device, browser: r.detail!.browser, team: !!r.detail!.team,
    })),
  });
}
