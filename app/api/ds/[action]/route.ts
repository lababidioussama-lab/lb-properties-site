import { NextResponse, type NextRequest } from "next/server";

import { LEADS_TABLE } from "@/lib/supabase";
import { LEAD_SLA_HOURS } from "@/lib/crm";
import { DS_COOKIE, audit, dsGate, fail, getSettings, lockIfBurst, putSettings, readRef, readRefInfo, signedIn as signedInAs, usageToday, type DsSettings, type DsUser } from "@/lib/dbsearch/guard";
import { crmLinks, emailOf, ownerDetail, phoneAt, unitLookup } from "@/lib/dbsearch/search";
import { MAX_QUERY, communityList, phoneList, phonesForRef, searchFull, soldFlags } from "@/lib/dbsearch/results";
import { areaOwners, brokers, listedNow, marketOverview, permitLookup, portfolioOwners, propertyNumber, rentals, suggest, valuation } from "@/lib/dbsearch/tools";
import { formatPhone, maskPhone, phoneCore, toInternational } from "@/lib/dbsearch/model";
import { SESSION_COOKIE_OPTIONS } from "@/lib/crm-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * DB Search in the CRM. Every action passes dsGate first: CRM session, a
 * separate DB Search session for the same person, access, lock state.
 *
 *   GET    session   who is signed in to DB Search, limits and today's use
 *   DELETE session   leave DB Search (the CRM session stays)
 *   GET    stats                                    → the four totals DB Search shows
 *   POST   search    { q, includeEmpty? }           → DB Search's Search tab, cards masked
 *   POST   community { name, includeEmpty? }        → a "what we found" chip
 *   POST   phone     { q }                          → DB Search's Phone tab
 *   POST   sold      { groups }                     → "already sold" flags (registered sales)
 *   POST   owner     { ref }                        → owner card, still masked
 *   POST   reveal    { ref, reason, kind }          → the card's numbers, or its email
 *   POST   unit      { code, place? }               → a unit's owners
 *   POST   add       { ref, as, index }             → create lead / contact / temp lead
 *   POST   portfolio { min }                        → owners of several units (by name)
 *   POST   area      { area }                       → a community as a masked calling list
 *   POST   area_send { refs, list }                 → put owners from it into Temp leads
 *   POST   market    { area, months }               → registered sales, aggregated
 *   POST   rentals   { area, version }              → registered rents, aggregated
 *   POST   valuation { scope, name, sqft, since }   → a value range from comparables
 *   POST   suggest   { kind, q, scope? }            → names for the pickers
 *   POST   permit    { q }                          → cached DLD permits
 *   POST   pnumber   { q }                          → a unit from its property number
 *   POST   listed    { q }                          → live portal listings (CRM's own key)
 *   POST   brokers   { q }                          → registered brokers
 *   GET    admin                                    → access, limits, activity (admin)
 *   PATCH  admin     { userId, … }                  → change access or limits (admin)
 */

const REASONS = { owner_outreach: "Selling: owner outreach", buyer_followup: "Buyer follow-up", listing_check: "Checking a listing" } as const;
type Reason = keyof typeof REASONS;

type Body = Record<string, unknown>;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

async function quota(user: DsUser, db: Parameters<typeof usageToday>[0], kind: "searches" | "reveals" | "lists") {
  if (user.role === "admin") return null;
  const used = await usageToday(db, user.id);
  return used[kind] >= user.limits[kind] ? fail("daily_limit", 429, { kind, limit: user.limits[kind] }) : null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;

  if (action === "session") {
    const g = await dsGate(request, { allowSignedOut: true });
    if (!g.ok) return g.response;
    const signedIn = !!signedInAs(request, g.user.id);
    return g.done({
      signedIn,
      user: { name: g.user.name, role: g.user.role },
      limits: g.user.role === "admin" ? null : g.user.limits,
      usage: signedIn ? await usageToday(g.db, g.user.id) : null,
    });
  }

  if (action === "stats") {
    const g = await dsGate(request);
    if (!g.ok) return g.response;
    const { data } = await g.db.rpc("get_stats");
    const d = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
    return g.done({ stats: d ? { owners: Number(d.owners ?? 0), properties: Number(d.properties ?? 0), projects: Number(d.projects ?? 0), phones: Number(d.phones ?? 0) } : null });
  }

  if (action === "admin") {
    const g = await dsGate(request);
    if (!g.ok) return g.response;
    if (g.user.role !== "admin") return fail("forbidden", 403);
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [users, log] = await Promise.all([
      g.db.from("crm_users").select("id, full_name, email, role, active").order("full_name"),
      g.db.from("crm_audit").select("id, created_at, entity_id, action, detail").eq("entity", "dbsearch").gte("created_at", since).order("created_at", { ascending: false }).limit(300),
    ]);
    const people = await Promise.all((users.data ?? []).map(async (u) => {
      const s = await getSettings(g.db, u.id as string);
      return {
        ...u,
        ds_access: s.access, ds_searches_per_day: s.searches, ds_reveals_per_day: s.reveals, ds_lists_per_day: s.lists,
        ds_locked_at: s.lockedAt, ds_lock_reason: s.lockReason,
        usage: await usageToday(g.db, u.id as string),
      };
    }));
    const activity = (log.data ?? []).map((a) => {
      const d = (a.detail ?? {}) as Record<string, unknown>;
      return { id: a.id, created_at: a.created_at, user_id: a.entity_id, action: a.action, query: (d.query as string) ?? null, target: (d.target as string) ?? null, detail: d };
    });
    return g.done({ users: people, activity });
  }

  return fail("not_found", 404);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action !== "session") return fail("not_found", 404);
  const g = await dsGate(request, { allowSignedOut: true });
  if (g.ok) await audit(g.db, g.user, "signout", { request });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(DS_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return res;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const g = await dsGate(request);
  if (!g.ok) return g.response;
  const { user, db, done } = g;
  const b = ((await request.json().catch(() => ({}))) ?? {}) as Body;

  switch (action) {
    case "search":
    case "community":
    case "phone": {
      const q = str(action === "community" ? b.name : b.q, MAX_QUERY);
      if (action === "phone" ? q.replace(/\D/g, "").length < 4 : q.length < 2) return fail("query_too_short");
      const limited = await quota(user, db, "searches");
      if (limited) return limited;
      await audit(db, user, "search", { query: action === "search" ? q : `${action}: ${q}`, request });
      if (await lockIfBurst(db, user, request)) return fail("locked", 423);
      const includeEmpty = b.includeEmpty === true;
      const result = action === "search" ? await searchFull(db, user, q, includeEmpty)
        : action === "community" ? await communityList(db, user, q, includeEmpty)
        : await phoneList(db, user, q);
      return done({ ...result, usage: await usageToday(db, user.id) });
    }

    case "sold": {
      // Registered sales only — no person in it — so it is not counted as a search.
      const groups = (Array.isArray(b.groups) ? b.groups : []).slice(0, 12).map((x) => {
        const o = (x ?? {}) as Body;
        return { comm: str(o.comm, 200), units: (Array.isArray(o.units) ? o.units : []).slice(0, 400).map((u) => str(u, 40)).filter(Boolean) };
      });
      return done({ found: await soldFlags(db, groups) });
    }

    case "owner": {
      const ids = readRef(b.ref, user.id);
      if (!ids) return fail("expired_ref", 410);
      const owner = await ownerDetail(db, user, ids);
      if (!owner) return fail("not_found", 404);
      await audit(db, user, "open", { target: ids.join(","), request });
      if (await lockIfBurst(db, user, request)) return fail("locked", 423);
      return done({ owner });
    }

    case "reveal": {
      const info = readRefInfo(b.ref, user.id);
      if (!info) return fail("expired_ref", 410);
      const ids = info.ids;
      const reason = str(b.reason, 40) as Reason;
      if (!(reason in REASONS)) return fail("reason_required");
      const kind = b.kind === "email" ? "email" : b.kind === "phone" ? "phone" : "phones";
      const limited = await quota(user, db, "reveals");
      if (limited) return limited;

      if (kind === "email") {
        const value = info.email ?? await emailOf(db, ids);
        if (!value) return fail("not_found", 404);
        await audit(db, user, "reveal", { target: ids.join(","), detail: { reason, kind }, request });
        if (await lockIfBurst(db, user, request)) return fail("locked", 423);
        return done({ kind, value, usage: await usageToday(db, user.id) });
      }

      // DB Search's "Show N numbers": every number on the record at once, in one fixed order.
      const all = await phonesForRef(db, ids);
      const at = Number(b.index ?? 0);
      const list = kind === "phone" ? all.slice(at, at + 1) : all;
      if (!list.length) return fail("no_phone", 404);
      const { data: optedOut } = await db.from("wa_consent").select("phone").in("phone", list.map(toInternational)).not("opted_out_at", "is", null);
      const blocked = new Set((optedOut ?? []).map((x) => String(x.phone)));
      const links = await crmLinks(db, list.map(phoneCore), user);
      const numbers = list.map((p) => blocked.has(toInternational(p))
        ? { index: all.indexOf(p), value: maskPhone(p), dial: null, dnc: true, inCrm: null }
        : { index: all.indexOf(p), value: formatPhone(p), dial: toInternational(p), dnc: false, inCrm: links.get(phoneCore(p)) ?? null });
      await audit(db, user, "reveal", { target: ids.join(","), detail: { reason, kind, count: numbers.filter((n) => !n.dnc).length }, request });
      if (await lockIfBurst(db, user, request)) return fail("locked", 423);
      if (kind === "phone") {
        const n = numbers[0];
        if (n.dnc) return fail("do_not_contact", 409);
        return done({ kind, value: n.value, dial: n.dial, usage: await usageToday(db, user.id) });
      }
      return done({ kind, numbers, usage: await usageToday(db, user.id) });
    }

    case "unit": {
      const code = str(b.code, 40);
      if (!code) return fail("code_required");
      const limited = await quota(user, db, "searches");
      if (limited) return limited;
      await audit(db, user, "unit", { query: code, target: str(b.place, 200) || null, request });
      if (await lockIfBurst(db, user, request)) return fail("locked", 423);
      return done({ unit: await unitLookup(db, user, code, str(b.place, 200) || null) });
    }

    /* ---------------------------------------------------- lookups */
    case "portfolio":
    case "area":
    case "market":
    case "rentals":
    case "valuation":
    case "permit":
    case "pnumber":
    case "listed":
    case "brokers": {
      const limited = await quota(user, db, "searches");
      if (limited) return limited;
      const kind = action === "portfolio" ? "portfolio" : action === "area" ? "area" : action === "brokers" ? "brokers"
        : action === "permit" || action === "pnumber" || action === "listed" ? "check" : "market";
      const q = str(b.q ?? b.area ?? b.name, MAX_QUERY);
      await audit(db, user, kind, { query: `${action}: ${q || String(b.min ?? "")}`.slice(0, 300), request });
      if (await lockIfBurst(db, user, request)) return fail("locked", 423);

      switch (action) {
        case "portfolio": return done({ owners: await portfolioOwners(db, Number(b.min ?? 5)) });
        case "area": {
          if (q.length < 3) return fail("query_too_short");
          return done(await areaOwners(db, user, q));
        }
        case "market": return done(await marketOverview(db, q, Number(b.months ?? 12)));
        case "rentals": return done(await rentals(db, q, str(b.version, 10)));
        case "valuation": {
          if (q.length < 2) return fail("query_too_short");
          return done(await valuation(db, str(b.scope, 12), q, Number(b.sqft), Number(b.since), b.exact !== false));
        }
        case "permit": return done(await permitLookup(db, q) as Record<string, unknown>);
        case "pnumber": return done({ rows: await propertyNumber(db, user, q) });
        case "listed": return done(await listedNow(db, q));
        case "brokers": return done({ brokers: await brokers(db, q) });
      }
      return fail("not_found", 404);
    }

    case "suggest": {
      // Name completion for the pickers: aggregate names only, not counted as a search.
      return done({ items: await suggest(db, str(b.kind, 20), str(b.q, 80), str(b.scope, 12)) });
    }

    case "area_send": {
      const refs = (Array.isArray(b.refs) ? b.refs : []).slice(0, 100);
      const list = str(b.list, 80) || "DB Search list";
      if (!refs.length) return fail("nothing_selected");
      const used = user.role === "admin" ? 0 : (await usageToday(db, user.id)).lists;
      const room = user.role === "admin" ? refs.length : Math.max(0, user.limits.lists - used);
      if (room === 0) return fail("daily_limit", 429, { kind: "lists", limit: user.limits.lists });

      let added = 0, skipped = 0;
      for (const ref of refs.slice(0, room)) {
        const ids = readRef(ref, user.id);
        const phone = ids ? await phoneAt(db, ids, 0) : null;
        if (!ids || !phone) { skipped++; continue; }
        const { data: consent } = await db.from("wa_consent").select("opted_out_at").eq("phone", toInternational(phone)).maybeSingle();
        if (consent?.opted_out_at || (await crmLinks(db, [phoneCore(phone)], user)).size) { skipped++; continue; }
        const owner = await ownerDetail(db, user, ids);
        if (!owner) { skipped++; continue; }
        const p = owner.properties[0]?.property;
        const where = p ? [p.unit && `Unit ${p.unit}`, p.building, p.community].filter(Boolean).join(", ") : "";
        const { data: row, error } = await db.from("crm_temp_leads").insert({
          full_name: owner.name.slice(0, 200), phone: formatPhone(phone), source: "DB Search", status: "to_call", owner_id: user.id,
          notes: `${list}${where ? ` — owner of ${where}` : ""}.`,
        }).select("id").single();
        if (error || !row) { skipped++; continue; }
        await audit(db, user, "to_temp", { target: ids.join(","), detail: { list, id: row.id }, request });
        added++;
      }
      return done({ added, skipped, capped: refs.length > room ? refs.length - room : 0, usage: await usageToday(db, user.id) });
    }

    case "add": {
      const info = readRefInfo(b.ref, user.id);
      if (!info) return fail("expired_ref", 410);
      const ids = info.ids;
      const as = b.as === "contact" ? "contact" : b.as === "temp" ? "temp" : "lead";
      const limited = await quota(user, db, as === "temp" ? "lists" : "reveals");
      if (limited) return limited;
      const phone = await phoneAt(db, ids, Number(b.index ?? 0));
      if (!phone) return fail("no_phone", 422);
      const { data: consent } = await db.from("wa_consent").select("opted_out_at").eq("phone", toInternational(phone)).maybeSingle();
      if (consent?.opted_out_at) return fail("do_not_contact", 409);

      // Never create a second record for someone the CRM already has.
      const existing = (await crmLinks(db, [phoneCore(phone)], user)).get(phoneCore(phone));
      if (existing) return fail("already_in_crm", 409, { link: existing });

      // A search card carries its own name and place; the other tools' handles are looked up.
      let personName = info.name ?? null, where = info.where ?? "", nationality = info.nat ?? null;
      if (!personName) {
        const owner = await ownerDetail(db, user, ids);
        if (!owner) return fail("not_found", 404);
        const p = owner.properties[0]?.property;
        personName = owner.name;
        nationality = owner.nationality;
        where = p ? [p.unit && `Unit ${p.unit}`, p.building, p.community].filter(Boolean).join(", ") : "";
      }
      const note = `From DB Search${where ? ` — owner of ${where}` : ""}.`;
      const full_name = personName.slice(0, 200);
      const number = formatPhone(phone);

      let created: { id: string } | null = null;
      if (as === "lead") {
        const { data, error } = await db.from(LEADS_TABLE).insert({
          full_name, phone: number, source: "db_search", service: "advisory", stage: "new",
          owner_id: user.id, expires_at: new Date(Date.now() + LEAD_SLA_HOURS * 3_600_000).toISOString(),
          notes: note, payload: { db_search: { owner_ids: ids } }, user_agent: "db_search",
        }).select("id").single();
        if (error) return fail(error.message, 502);
        created = data as { id: string };
      } else if (as === "contact") {
        const { data, error } = await db.from("crm_contacts").insert({
          full_name, phone: number, nationality, kind: "seller", owner_id: user.id, notes: note,
        }).select("id").single();
        if (error) return fail(error.message, 502);
        created = data as { id: string };
      } else {
        const { data, error } = await db.from("crm_temp_leads").insert({
          full_name, phone: number, source: "DB Search", status: "to_call", owner_id: user.id, notes: note,
        }).select("id").single();
        if (error) return fail(error.message, 502);
        created = data as { id: string };
      }
      await audit(db, user, as === "lead" ? "to_lead" : as === "contact" ? "to_contact" : "to_temp", { target: ids.join(","), detail: { id: created?.id }, request });
      if (await lockIfBurst(db, user, request)) return fail("locked", 423);
      return done({ created: { as, id: created?.id } });
    }
  }
  return fail("not_found", 404);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  if (action !== "admin") return fail("not_found", 404);
  const g = await dsGate(request);
  if (!g.ok) return g.response;
  if (g.user.role !== "admin") return fail("forbidden", 403);
  const b = ((await request.json().catch(() => ({}))) ?? {}) as Body;
  const userId = str(b.userId, 60);
  if (!userId) return fail("missing_user");

  const { data: target } = await g.db.from("crm_users").select("id").eq("id", userId).maybeSingle();
  if (!target) return fail("not_found", 404);

  const patch: Partial<DsSettings> = {};
  if (typeof b.ds_access === "boolean") patch.access = b.ds_access;
  const bound = (v: unknown, max: number) => (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= max ? (v as number) : undefined);
  const s = bound(b.ds_searches_per_day, 5000), r = bound(b.ds_reveals_per_day, 1000), l = bound(b.ds_lists_per_day, 1000);
  if (s !== undefined) patch.searches = s;
  if (r !== undefined) patch.reveals = r;
  if (l !== undefined) patch.lists = l;
  if (b.unlock === true) { patch.lockedAt = null; patch.lockReason = null; }
  if (b.lock === true) { patch.lockedAt = new Date().toISOString(); patch.lockReason = "Locked by the admin"; }
  if (!Object.keys(patch).length) return fail("nothing_to_change");

  const next = await putSettings(g.db, g.user.id, userId, patch);
  await audit(g.db, g.user, "admin", { target: userId, detail: { change: patch }, request });
  return g.done({ updated: next });
}
