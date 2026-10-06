import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { liveUser, sessionFromRequest } from "@/lib/crm-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/* GET /api/crm/security?days=1|7|30  (admin)
   Every refused or suspicious sign-in event from the audit trail, added up
   by the address it came from and the account it aimed at. */

const BAD = ["login_failed", "otp_failed", "docs_denied", "ds_denied", "blocked_address"];
const ALL = [...BAD, "login", "docs_login", "ds_login", "alert_sent"];
type Detail = { email?: string; ip?: string; agent?: string; country?: string; city?: string; reason?: string; purpose?: string; title?: string };
type Row = { id: string; created_at: string; user_id: string | null; action: string; detail: Detail | null };

export async function GET(request: NextRequest) {
  const user = await liveUser(sessionFromRequest(request));
  if (!user) return fail("unauthorised", 401);
  if (user.role !== "admin") return fail("forbidden", 403);
  const db = getSupabaseAdmin();
  if (!db) return fail("not_configured", 503);

  const days = [1, 7, 30].includes(Number(new URL(request.url).searchParams.get("days"))) ? Number(new URL(request.url).searchParams.get("days")) : 7;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const [{ data, error }, { data: people }] = await Promise.all([
    db.from("crm_audit").select("id, created_at, user_id, action, detail").eq("entity", "session").in("action", ALL)
      .gte("created_at", since).order("created_at", { ascending: false }).limit(1000),
    db.from("crm_users").select("id, email, full_name, active"),
  ]);
  if (error) { console.error("[security] database:", error.message); return fail("server_error", 502); }
  const rows = (data ?? []) as Row[];
  const byId = new Map((people ?? []).map((p) => [String(p.id), p as { id: string; email: string; full_name: string; active: boolean }]));
  const known = new Set((people ?? []).map((p) => String(p.email).toLowerCase()));
  const account = (r: Row) => r.detail?.email ?? (r.user_id ? byId.get(r.user_id)?.email : undefined) ?? null;

  const bad = rows.filter((r) => BAD.includes(r.action));
  const count = (a: string) => bad.filter((r) => r.action === a).length;

  // Addresses, worst first: how many refusals, at how many accounts.
  const ips = new Map<string, { ip: string; country: string | null; fails: number; codes: number; accounts: Set<string>; last: string }>();
  for (const r of bad) {
    const ip = r.detail?.ip;
    if (!ip || ip === "unknown") continue;
    const x = ips.get(ip) ?? { ip, country: null, fails: 0, codes: 0, accounts: new Set<string>(), last: r.created_at };
    x.fails++;
    if (r.action === "otp_failed") x.codes++;
    if (!x.country && r.detail?.country) x.country = [r.detail.city, r.detail.country].filter(Boolean).join(", ");
    const a = account(r);
    if (a) x.accounts.add(a);
    ips.set(ip, x);
  }
  // Accounts under fire. A wrong code means the password was already right.
  const targets = new Map<string, { email: string; known: boolean; passwords: number; codes: number; last: string }>();
  for (const r of bad) {
    const a = account(r);
    if (!a || (r.action !== "login_failed" && r.action !== "otp_failed")) continue;
    const x = targets.get(a) ?? { email: a, known: known.has(a.toLowerCase()), passwords: 0, codes: 0, last: r.created_at };
    if (r.action === "otp_failed") x.codes++; else x.passwords++;
    targets.set(a, x);
  }
  const lockedNow = [...targets.values()].filter((t) => bad.filter((r) => r.action === "login_failed" && account(r) === t.email && Date.now() - new Date(r.created_at).getTime() < 15 * 60_000).length >= 8).map((t) => t.email);

  return NextResponse.json({
    ok: true, days,
    totals: { wrongPasswords: count("login_failed"), wrongCodes: count("otp_failed"), refused: count("docs_denied") + count("ds_denied"), blocked: count("blocked_address"), addresses: ips.size, lockedNow: lockedNow.length },
    lockedNow,
    addresses: [...ips.values()].sort((a, b) => b.fails - a.fails).slice(0, 15).map((x) => ({ ...x, accounts: [...x.accounts].slice(0, 5) })),
    targets: [...targets.values()].sort((a, b) => b.codes - a.codes || b.passwords - a.passwords).slice(0, 15),
    events: rows.filter((r) => r.action !== "alert_sent").slice(0, 150).map((r) => ({
      id: r.id, at: r.created_at, action: r.action, account: account(r), name: r.user_id ? byId.get(r.user_id)?.full_name ?? null : null,
      ip: r.detail?.ip ?? null, place: [r.detail?.city, r.detail?.country].filter(Boolean).join(", ") || null,
      agent: r.detail?.agent ?? null, reason: r.detail?.reason ?? null,
    })),
    alerts: rows.filter((r) => r.action === "alert_sent").slice(0, 20).map((r) => ({ at: r.created_at, title: r.detail?.title ?? "Alert" })),
  });
}
