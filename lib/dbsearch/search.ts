import type { SupabaseClient } from "@supabase/supabase-js";

import { LEADS_TABLE } from "@/lib/supabase";
import {
  CODE_QUERY, collapsePeople, demotePlotLevelCodes, dropBarePropertylessRows, dropCodeMismatches,
  dropEmptyRows, dropEntities, dropSellers, exactNameFirst, rawPhoneValues, usablePhones, type OwnerRow,
} from "./rows";
import { conflictNotes, maskPhone, nameOf, nationalityOf, phoneCore, propertyOf, regionOf, sideOf, type DsCrmLink, type DsHit, type OwnerStatus } from "./model";
import { signRef } from "./guard";

/**
 * The search itself: DB Search's own database functions, then its row rules,
 * then everything the CRM adds — ownership confidence, masked phones and
 * whether the person is already in the CRM.
 */

export const MAX_QUERY = 120;
const MAX_HITS = 200;

type Db = SupabaseClient;
const idsOf = (r: OwnerRow) => [r.id, ...(r.alt_ids ?? [])].filter((x): x is string | number => x != null).map(String);

/* ------------------------------------------------------------ collection */

/** Plot / unit codes looked up directly: smart_search resolves them through names and can return the owner's OTHER flat. */
async function codeRows(db: Db, q: string): Promise<OwnerRow[]> {
  const raw = q.trim();
  if (!raw || raw.length > 20 || !CODE_QUERY.test(raw)) return [];
  const k = raw.toUpperCase().replace(/\s+/g, "");
  const bare = k.replace(/^DL-/, "");
  const variants = [...new Set([k, bare, "DL-" + bare])];
  const [byUnit, byPlot] = await Promise.all([
    db.from("owners").select("id, full_name, project_name, building, unit, role, email, raw_data, community_clean, unit_clean").in("unit_clean", variants).limit(60),
    db.from("owners").select("id, full_name, project_name, building, unit, role, email, raw_data, community_clean, unit_clean").eq("raw_data->>plot pre reg no", "DL-" + bare).limit(60),
  ]);
  const seen = new Set<unknown>();
  return [...(byUnit.data ?? []), ...(byPlot.data ?? [])].filter((r) => !seen.has(r.id) && !!seen.add(r.id)) as OwnerRow[];
}

/** smart_search matches places narrowly ("Malta": 859 of 2,065); this widens a place search. */
async function broadPlaceRows(db: Db, q: string): Promise<OwnerRow[]> {
  const raw = q.trim();
  if (raw.length < 3 || CODE_QUERY.test(raw)) return [];
  const { data } = await db.rpc("search_place_broad", { q: raw, lim: 1200 });
  return (data ?? []) as OwnerRow[];
}

/** A phone search goes straight to the phones table. */
async function phoneRows(db: Db, q: string): Promise<OwnerRow[] | null> {
  const digits = q.replace(/\D/g, "");
  if (digits.length < 7 || /[a-z]/i.test(q)) return null;
  const core = digits.slice(-9);
  const { data: ph } = await db.from("phones").select("owner_id").eq("phone_core", core).limit(80);
  const ids = [...new Set((ph ?? []).map((p) => p.owner_id))];
  if (!ids.length) return [];
  const { data } = await db.from("owners").select("id, full_name, project_name, building, unit, role, email, raw_data, community_clean, unit_clean").in("id", ids).limit(80);
  return (data ?? []) as OwnerRow[];
}

/* ------------------------------------------------------------ enrichment */

async function phonesFor(db: Db, rows: OwnerRow[]): Promise<Map<OwnerRow, string[]>> {
  const ids = [...new Set(rows.flatMap(idsOf))];
  const byOwner = new Map<string, string[]>();
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await db.from("phones").select("owner_id, phone_raw").in("owner_id", ids.slice(i, i + 300));
    for (const p of data ?? []) {
      const k = String(p.owner_id);
      byOwner.set(k, [...(byOwner.get(k) ?? []), p.phone_raw as string]);
    }
  }
  const out = new Map<OwnerRow, string[]>();
  for (const r of rows) out.set(r, usablePhones([...idsOf(r).flatMap((id) => byOwner.get(id) ?? []), ...rawPhoneValues(r.raw_data)]));
  return out;
}

/** Who owns each unit now, from unit_current_owner (a dated Buyer, banks excluded). */
async function statusFor(db: Db, rows: OwnerRow[]): Promise<Map<OwnerRow, { status: OwnerStatus; date: string | null }>> {
  const unitKey = (r: OwnerRow) => String(r.unit_clean || r.unit || "").toUpperCase().replace(/\s+/g, "");
  const units = [...new Set(rows.map(unitKey).filter((u) => u && u !== "0"))].slice(0, 400);
  type Rec = { unit_no: string; place: string | null; owner_ids: (number | string)[] | null; owner_names: string[] | null; confidence: string; tx_date: string | null };
  const recs: Rec[] = [];
  for (let i = 0; i < units.length; i += 200) {
    const { data } = await db.from("unit_current_owner").select("unit_no, place, owner_ids, owner_names, confidence, tx_date").in("unit_no", units.slice(i, i + 200));
    recs.push(...((data ?? []) as Rec[]));
  }
  const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, " ").trim();
  /* A code like DL-Q166 or DH2-XH101B names one unit in the whole city; a bare
     "1405" names one in every tower, so it only counts inside the same place. */
  const distinctive = (u: string) => /[A-Z]/.test(u) && /\d/.test(u) && u.length >= 4;
  const byUnit = new Map<string, Rec[]>();
  for (const r of recs) byUnit.set(r.unit_no, [...(byUnit.get(r.unit_no) ?? []), r]);

  const placeOf = (r: OwnerRow) => [r.building, r.community_clean, r.project_name].map((v) => String(v ?? "").toLowerCase().trim()).filter(Boolean);
  const out = new Map<OwnerRow, { status: OwnerStatus; date: string | null }>();
  for (const r of rows) {
    const places = placeOf(r);
    const inPlace = (c: Rec) => {
      const p = String(c.place ?? "").toLowerCase().trim();
      return !!p && places.some((x) => x === p || x.includes(p) || p.includes(x));
    };
    const cands = (byUnit.get(unitKey(r)) ?? []).filter((c) => distinctive(unitKey(r)) || inPlace(c));
    const mine = idsOf(r);
    const myName = norm(r.full_name);
    // The owner table often points at another duplicate copy of the same
    // person, so a match on the NAME within the unit counts as well as the id.
    const named = cands.find((c) =>
      (c.owner_ids ?? []).map(String).some((id) => mine.includes(id)) ||
      (!!myName && (c.owner_names ?? []).some((n) => norm(n) === myName)));
    if (named) {
      out.set(r, { status: named.confidence === "high" ? "confirmed" : "likely", date: named.tx_date });
      continue;
    }
    // Same unit, confirmed for someone else: this person has sold since.
    const samePlace = cands;
    if (samePlace.length === 1 && samePlace[0].confidence === "high") {
      out.set(r, { status: "previous", date: samePlace[0].tx_date });
      continue;
    }
    out.set(r, { status: sideOf(r), date: propertyOf(r).date });
  }
  return out;
}

/** People already in the CRM, matched on the last nine digits of any of their numbers. */
export async function crmLinks(db: Db, cores: string[], viewer: { id: string }): Promise<Map<string, DsCrmLink>> {
  const out = new Map<string, DsCrmLink>();
  const want = new Set(cores.filter((c) => c.length === 9));
  if (!want.size) return out;
  const [leads, contacts, temps, users] = await Promise.all([
    db.from(LEADS_TABLE).select("id, full_name, phone, stage, owner_id").order("created_at", { ascending: false }).limit(5000),
    db.from("crm_contacts").select("id, full_name, phone, owner_id").limit(5000),
    db.from("crm_temp_leads").select("id, full_name, phone, owner_id").limit(5000),
    db.from("crm_users").select("id, full_name"),
  ]);
  const who = new Map((users.data ?? []).map((u) => [u.id as string, u.full_name as string]));
  const add = (kind: DsCrmLink["kind"], rows: { id: string; full_name: string; phone: string | null; stage?: string | null; owner_id: string | null }[]) => {
    for (const r of rows) {
      const core = phoneCore(String(r.phone ?? ""));
      if (!want.has(core) || out.has(core)) continue;
      out.set(core, { kind, id: String(r.id), name: r.full_name, stage: r.stage ?? null, ownerName: r.owner_id ? who.get(r.owner_id) ?? null : null, mine: r.owner_id === viewer.id });
    }
  };
  add("lead", (leads.data ?? []) as never);
  add("contact", (contacts.data ?? []) as never);
  add("temp", (temps.data ?? []) as never);
  return out;
}

/* ------------------------------------------------------------ public */

export async function searchOwners(db: Db, viewer: { id: string }, rawQuery: string): Promise<{ hits: DsHit[]; total: number; hiddenPast: number }> {
  const q = rawQuery.trim().slice(0, MAX_QUERY);
  let rows: OwnerRow[];

  const byPhone = await phoneRows(db, q);
  if (byPhone) {
    rows = byPhone;
  } else {
    const [ss, broad, codes] = await Promise.all([
      db.rpc("smart_search", { q, p_has_phone: false }),
      broadPlaceRows(db, q),
      codeRows(db, q),
    ]);
    const seen = new Set(((ss.data ?? []) as OwnerRow[]).map((r) => r.id));
    rows = [...((ss.data ?? []) as OwnerRow[]), ...broad.filter((r) => !seen.has(r.id))];
    rows = exactNameFirst(dropEntities(dropSellers(rows, q), q), q);
    rows = collapsePeople(dropCodeMismatches([...rows, ...codes], q));
  }

  rows = rows.slice(0, 600);
  const phones = await phonesFor(db, rows);
  for (const r of rows) r.phone_count = phones.get(r)?.length ?? 0;
  demotePlotLevelCodes(rows);
  rows = dropBarePropertylessRows(dropEmptyRows(rows, q), q);
  rows.sort((a, b) => Number((b.phone_count ?? 0) > 0) - Number((a.phone_count ?? 0) > 0));

  const total = rows.length;
  rows = rows.slice(0, MAX_HITS);
  const [status, links] = await Promise.all([
    statusFor(db, rows),
    crmLinks(db, rows.flatMap((r) => (phones.get(r) ?? []).map(phoneCore)), viewer),
  ]);

  const conflicts = conflictNotes(rows.map((r) => { const p = propertyOf(r); return { building: p.building, community: p.community }; }));
  const hits: DsHit[] = rows.map((r, i) => {
    const nums = phones.get(r) ?? [];
    const st = status.get(r) ?? { status: "unknown" as const, date: null };
    return {
      ref: signRef(viewer.id, idsOf(r)),
      name: nameOf(r),
      status: st.status,
      statusDate: st.date,
      nationality: nationalityOf(r),
      property: propertyOf(r),
      phones: nums.map((p) => ({ masked: maskPhone(p), region: regionOf(p) })),
      hasEmail: !!String(r.email ?? "").trim(),
      inCrm: nums.map((p) => links.get(phoneCore(p))).find(Boolean) ?? null,
      notes: conflicts[i] ? [conflicts[i]] : [],
    };
  });
  // Records whose own files contradict each other go last.
  hits.sort((a, b) => Number(a.notes.length > 0) - Number(b.notes.length > 0));

  // Past owners stay out of the default list but are counted, so nobody is hidden silently.
  const hiddenPast = hits.filter((h) => h.status === "previous" || h.status === "sold").length;
  return { hits, total, hiddenPast };
}

const OWNER_COLS = "id, full_name, project_name, building, unit, role, email, raw_data, community_clean, unit_clean";

/** The rows behind one handle, primary first — always in the handle's own order. */
async function loadOwnerRows(db: Db, ids: string[]): Promise<OwnerRow[]> {
  const { data } = await db.from("owners").select(OWNER_COLS).in("id", ids).limit(12);
  const pos = (r: OwnerRow) => ids.indexOf(String(r.id));
  return ((data ?? []) as OwnerRow[]).sort((a, b) => pos(a) - pos(b));
}

/**
 * The owner's numbers, in one fixed order. The card lists them from this and
 * a reveal picks from this, so "number 2" is the same number in both places.
 */
async function numbersFor(db: Db, rows: OwnerRow[]): Promise<string[]> {
  const ids = rows.map((r) => String(r.id));
  const { data } = await db.from("phones").select("owner_id, phone_raw").in("owner_id", ids).order("id", { ascending: true });
  const byOwner = (id: string) => (data ?? []).filter((p) => String(p.owner_id) === id).map((p) => p.phone_raw as string);
  return usablePhones(rows.flatMap((r) => [...byOwner(String(r.id)), ...rawPhoneValues(r.raw_data)]));
}

/** Everything the owner card needs, for the ids in one signed handle. */
export async function ownerDetail(db: Db, viewer: { id: string }, ids: string[]) {
  const rows = await loadOwnerRows(db, ids);
  if (!rows.length) return null;
  const base = rows[0];
  base.alt_ids = rows.slice(1).map((r) => r.id!).filter(Boolean);
  const phones = await numbersFor(db, rows);
  const cores = phones.map(phoneCore);

  // Other properties: only those linked by the SAME phone number. Names repeat
  // across different people ("MOHAMMED ALI" owns 400 units), phones do not.
  let others: OwnerRow[] = [];
  if (cores.length) {
    const { data: ph } = await db.from("phones").select("owner_id").in("phone_core", cores).limit(60);
    const otherIds = [...new Set((ph ?? []).map((p) => String(p.owner_id)))].filter((id) => !ids.includes(id)).slice(0, 40);
    if (otherIds.length) {
      const { data: more } = await db.from("owners").select(OWNER_COLS).in("id", otherIds);
      others = collapsePeople(((more ?? []) as OwnerRow[]).filter((r) => !/seller/.test(String(r.role ?? "").toLowerCase())));
      demotePlotLevelCodes(others);
    }
  }
  const all = [base, ...others];
  const [status, links] = await Promise.all([statusFor(db, all), crmLinks(db, cores, viewer)]);

  const card = (r: OwnerRow) => {
    const st = status.get(r) ?? { status: "unknown" as OwnerStatus, date: null };
    return { ref: signRef(viewer.id, idsOf(r)), status: st.status, statusDate: st.date, property: propertyOf(r) };
  };
  return {
    ref: signRef(viewer.id, idsOf(base)),
    name: nameOf(base),
    nationality: nationalityOf(base),
    phones: phones.map((p) => ({ masked: maskPhone(p), region: regionOf(p) })),
    hasEmail: !!String(base.email ?? "").trim(),
    inCrm: cores.map((c) => links.get(c)).find(Boolean) ?? null,
    properties: all.map(card),
  };
}

/** The one place a real number is produced. The caller has already checked limits and logged the reveal. */
export async function phoneAt(db: Db, ids: string[], index: number): Promise<string | null> {
  const rows = await loadOwnerRows(db, ids);
  if (!rows.length || !Number.isInteger(index) || index < 0) return null;
  return (await numbersFor(db, rows))[index] ?? null;
}

export async function emailOf(db: Db, ids: string[]): Promise<string | null> {
  const { data } = await db.from("owners").select("email").in("id", ids).limit(12);
  return (data ?? []).map((r) => String(r.email ?? "").trim()).find((e) => e.includes("@")) ?? null;
}

/* ------------------------------------------------------------ units */

export interface UnitEvent { name: string; date: string | null; amount: number | null; role: "Buyer" | "Seller" | "Mortgage" | "Side not recorded" }

/**
 * One unit's owners, newest first.
 *
 * A unit number repeats across buildings ("1405" exists in 20+ places), so
 * the places are listed and the caller picks one. The history is then read
 * straight from unit_rows by that unit's own key, across the 16 buckets of
 * its only index — ~30 ms. DB Search's unit_owner_history instead matches
 * unit_no, which has no index: a full scan of 15M rows on every call, and
 * capped at 200 events across ALL buildings, so one busy unit number could
 * crowd out the building actually asked about.
 */
export async function unitLookup(db: Db, viewer: { id: string }, code: string, place?: string | null) {
  const raw = code.trim().slice(0, 40);
  const k = raw.toUpperCase().replace(/\s+/g, "");
  type Rec = { ukey: string; unit_no: string; place: string | null; land_number: string | null; owner_names: string[] | null; owner_ids: (string | number)[] | null; tx_date: string | null; amount: number | null; confidence: string; n_transactions: number };
  const cols = "ukey, unit_no, place, land_number, owner_names, owner_ids, tx_date, amount, confidence, n_transactions";
  const [byUnit, byLand] = await Promise.all([
    db.from("unit_current_owner").select(cols).eq("unit_no", k).limit(60),
    db.from("unit_current_owner").select(cols).eq("land_number", raw).limit(20),
  ]);
  const seen = new Set<string>();
  const records = ([...(byUnit.data ?? []), ...(byLand.data ?? [])] as Rec[]).filter((r) => !seen.has(r.ukey) && !!seen.add(r.ukey));

  const places = [...new Set(records.map((r) => r.place).filter((p): p is string => !!p))].sort();
  const chosen = place && places.includes(place) ? place : places.length === 1 ? places[0] : null;
  if (!chosen) return { code: raw, places, chosen: null, current: null, events: [] as UnitEvent[] };

  // Prefer the confirmed record when a place carries more than one.
  const rec = records.filter((r) => r.place === chosen).sort((a, b) => Number(b.confidence === "high") - Number(a.confidence === "high"))[0];
  const { data: rows } = await db.from("unit_rows")
    .select("full_name, tx_date, amount, is_buyer, is_bank")
    .in("bucket", Array.from({ length: 16 }, (_, i) => i))
    .eq("ukey", rec.ukey)
    .order("tx_date", { ascending: false, nullsFirst: false })
    .limit(200);
  const dedupe = new Set<string>();
  const events: UnitEvent[] = ((rows ?? []) as { full_name: string; tx_date: string | null; amount: number | null; is_buyer: boolean | null; is_bank: boolean | null }[])
    .map((e) => ({
      name: e.full_name,
      date: e.tx_date,
      amount: e.amount,
      // NULL is "not recorded", never Seller: rendering it as Seller invents a sale.
      role: (e.is_bank ? "Mortgage" : e.is_buyer === true ? "Buyer" : e.is_buyer === false ? "Seller" : "Side not recorded") as UnitEvent["role"],
    }))
    .filter((e) => { const key = `${e.name}|${e.date}|${e.role}`; return !dedupe.has(key) && !!dedupe.add(key); });

  return {
    code: raw,
    places,
    chosen,
    current: {
      names: rec.owner_names ?? [],
      ref: rec.owner_ids?.length ? signRef(viewer.id, rec.owner_ids.map(String)) : null,
      confidence: rec.confidence === "high" ? "confirmed" as const : "likely" as const,
      date: rec.tx_date,
      amount: rec.amount,
      landNumber: rec.land_number,
      transactions: rec.n_transactions,
    },
    events,
  };
}
