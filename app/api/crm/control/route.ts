import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAdmin } from "@/lib/supabase";
import { cutSessions, liveUser, sameOrigin, sessionFromRequest } from "@/lib/crm-auth";
import { LOOKUPS, dubaiMidnight, getSettings, putSettings, usageToday, type DsSettings } from "@/lib/dbsearch/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Access & activity, for the admin, from the CRM itself (no DB Search
 * sign-in needed): every person's CRM account and DB Search access, their
 * limits, locks and usage, and one feed of sign-ins and DB Search activity.
 *
 *   GET   ?view=people                     → people, today's totals
 *   GET   ?view=activity&user=&kind=&days= → the activity feed (newest first)
 *   PATCH { userId, ds_access?, searches?, reveals?, lists?, unlock?, kick? }
 *
 * Blocking a CRM account uses the existing users PATCH (active: false); it
 * also ends DB Search, which signs in with the same account. Nothing new is
 * stored: DB Search settings stay in crm_audit, as before.
 */

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });
const ok = (body: Record<string, unknown>) => NextResponse.json({ ok: true, ...body }, { headers: { "Cache-Control": "no-store" } });

async function admin(request: NextRequest) {
  if (!sameOrigin(request)) return { error: fail("bad_origin", 403) } as const;
  const me = await liveUser(sessionFromRequest(request));
  if (!me) return { error: fail("unauthorised", 401) } as const;
  if (me.role !== "admin") return { error: fail("forbidden", 403) } as const;
  const db = getSupabaseAdmin();
  if (!db) return { error: fail("not_configured", 503) } as const;
  return { me, db } as const;
}

const KINDS: Record<string, { entity: string; actions?: string[] }> = {
  searches: { entity: "dbsearch", actions: [...LOOKUPS, "open"] },
  reveals: { entity: "dbsearch", actions: ["reveal", "to_lead", "to_contact", "to_temp"] },
  dbsearch: { entity: "dbsearch" },
  signins: { entity: "session" },
  locks: { entity: "dbsearch", actions: ["locked", "denied", "admin"] },
};

export async function GET(request: NextRequest) {
  const g = await admin(request);
  if ("error" in g) return g.error;
  const { db } = g;
  const url = new URL(request.url);

  if (url.searchParams.get("view") === "activity") {
    const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") ?? 7) || 7));
    const since = days === 1 ? dubaiMidnight() : new Date(Date.now() - days * 86_400_000).toISOString();
    const kind = KINDS[url.searchParams.get("kind") ?? ""];
    const user = url.searchParams.get("user");
    let q = db.from("crm_audit").select("id, created_at, user_id, entity, entity_id, action, detail")
      .in("entity", kind ? [kind.entity] : ["dbsearch", "session"])
      .gte("created_at", since).order("created_at", { ascending: false }).limit(500);
    if (kind?.actions) q = q.in("action", kind.actions);
    if (user && /^[\w-]{1,60}$/.test(user)) q = q.eq("entity_id", user);
    const { data, error } = await q;
    if (error) return fail(error.message, 502);
    return ok({
      rows: (data ?? []).map((r) => {
        const d = (r.detail ?? {}) as Record<string, unknown>;
        return {
          id: r.id, at: r.created_at, user_id: (r.entity_id ?? r.user_id) as string | null, source: r.entity, action: r.action,
          query: (d.query as string) ?? null, target: (d.target as string) ?? null, reason: (d.reason as string) ?? null,
          ip: (d.ip as string) ?? null, device: (d.device as string) ?? (d.agent as string) ?? null, email: (d.email as string) ?? null,
        };
      }),
    });
  }

  const since7 = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: users, error } = await db.from("crm_users").select("id, full_name, email, role, active").order("full_name");
  if (error) return fail(error.message, 502);
  const people = await Promise.all((users ?? []).map(async (u) => {
    const id = u.id as string;
    const [settings, today, week, last, lastLogin] = await Promise.all([
      getSettings(db, id),
      usageToday(db, id),
      db.from("crm_audit").select("action").eq("entity", "dbsearch").eq("entity_id", id).gte("created_at", since7).limit(5000),
      db.from("crm_audit").select("created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("crm_audit").select("created_at").eq("entity", "session").eq("user_id", id).eq("action", "login").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    const acts = (week.data ?? []).map((w) => String(w.action));
    return {
      id, full_name: u.full_name, email: u.email, role: u.role, active: u.active,
      ds: settings,
      today,
      week: {
        searches: acts.filter((a) => (LOOKUPS as string[]).includes(a)).length,
        reveals: acts.filter((a) => a === "reveal" || a === "to_lead" || a === "to_contact").length,
        lists: acts.filter((a) => a === "to_temp").length,
      },
      lastSeen: (last.data?.created_at as string) ?? null,
      lastLogin: (lastLogin.data?.created_at as string) ?? null,
    };
  }));
  return ok({ people });
}

export async function PATCH(request: NextRequest) {
  const g = await admin(request);
  if ("error" in g) return g.error;
  const { db, me } = g;
  const b = ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  const userId = typeof b.userId === "string" ? b.userId.slice(0, 60) : "";
  if (!userId) return fail("missing_user");
  const { data: target } = await db.from("crm_users").select("id").eq("id", userId).maybeSingle();
  if (!target) return fail("not_found", 404);

  /* Sign out everywhere: ends this person's CRM, DB Search and Documents
     sessions on every device. They can sign in again with a new code. */
  if (b.signout_all === true) {
    await cutSessions(userId, me.id, "signed out everywhere by admin");
    await putSettings(db, me.id, userId, { kickedAt: new Date().toISOString() });
    return ok({ ds: await getSettings(db, userId), today: await usageToday(db, userId) });
  }

  const patch: Partial<DsSettings> = {};
  const bound = (v: unknown, max: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max ? (v as number) : undefined);
  if (typeof b.ds_access === "boolean") patch.access = b.ds_access;
  const s = bound(b.searches, 5000), r = bound(b.reveals, 1000), l = bound(b.lists, 1000);
  if (s !== undefined) patch.searches = s;
  if (r !== undefined) patch.reveals = r;
  if (l !== undefined) patch.lists = l;
  if (b.unlock === true) { patch.lockedAt = null; patch.lockReason = null; }
  if (b.lock === true) { patch.lockedAt = new Date().toISOString(); patch.lockReason = "Locked by the admin"; }
  if (b.kick === true) patch.kickedAt = new Date().toISOString();
  if (!Object.keys(patch).length) return fail("empty_patch");

  const next = await putSettings(db, me.id, userId, patch);
  await db.from("crm_audit").insert({ user_id: me.id, entity: "dbsearch", entity_id: userId, action: "admin", detail: { change: patch } });
  return ok({ ds: next, today: await usageToday(db, userId) });
}
