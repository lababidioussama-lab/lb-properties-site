import type { SupabaseClient } from "@supabase/supabase-js";

import { signRef } from "./guard";
import { maskPhone, regionOf, type DsCrmLink, type DsHit, type DsPhone, type DsProperty, type OwnerStatus } from "./model";
import type { DsCard, DsResults } from "./results";

/**
 * DB Search on the clean database (schema `uae`, DS_DATA_SOURCE=uae).
 *
 * Every function here answers in the same shape as its legacy twin, so the
 * screens do not change. Data only ever comes through the `uae` functions,
 * server side, with the service key:
 *   - search_owners / find_units / get_unit / unit_owners / units_by_phone /
 *     list_communities / owners_min_properties say WHETHER a phone exists,
 *   - unit_phones is the only one that returns numbers, and it is called only
 *     for a reveal (or adding someone to the CRM), after the route has checked
 *     the person's right and limit and written the audit row.
 *
 * A record's handle (signed ref) carries `k:uae#<unit_key>#<who>`, where who
 * is p:<party_id> (same screen only: party ids change on every reload),
 * n:<owner name>, or l (the unit's latest owner).
 */

type Db = SupabaseClient;
type Row = Record<string, unknown>;

const U = (db: Db) => db.schema("uae");
const s = (v: unknown) => (v == null ? "" : String(v)).trim();
const lower = (v: unknown) => s(v).toLowerCase().replace(/\s+/g, " ");
const num = (v: unknown) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

export const isUaeIds = (ids: string[]) => ids.some((x) => x.startsWith("k:uae#"));

function refId(unitKey: string, who: string) {
  return `k:uae#${encodeURIComponent(unitKey)}#${who}`;
}
function parseId(id: string): { unitKey: string; who: string } | null {
  const m = /^k:uae#([^#]+)#(.+)$/.exec(id);
  if (!m) return null;
  try { return { unitKey: decodeURIComponent(m[1]), who: m[2] }; } catch { return null; }
}

/* ------------------------------------------------------------ communities */

let commCache: { at: number; rows: { key: string; name: string; buildings: number; units: number }[] } | null = null;
async function communities(db: Db) {
  if (commCache && Date.now() - commCache.at < 10 * 60_000) return commCache.rows;
  const { data, error } = await U(db).rpc("list_communities");
  if (error) throw new Error(error.message);
  const rows = ((data ?? []) as Row[]).map((r) => ({ key: s(r.community_key), name: s(r.name), buildings: Number(r.buildings ?? 0), units: Number(r.units ?? 0) }));
  commCache = { at: Date.now(), rows };
  return rows;
}
async function communityKey(db: Db, name: string) {
  const n = lower(name);
  const all = await communities(db);
  return all.find((c) => lower(c.name) === n)?.key ?? all.find((c) => lower(c.name).includes(n) || n.includes(lower(c.name)))?.key ?? null;
}

/* ------------------------------------------------------------ status */

function statusOf(status: unknown, isLatest: unknown): OwnerStatus {
  const st = lower(status);
  if (/sold/.test(st)) return "sold";
  if (/not in list/.test(st)) return "previous";
  if (/developer customer list|not confirmed/.test(st)) return "listed";
  if (/sale record/.test(st)) return "bought";
  if (isLatest === true || st === "owner") return "confirmed";
  return "unknown";
}
const PARTY: Record<string, string> = { confirmed: "buyer", listed: "buyer", bought: "buyer", sold: "seller", previous: "seller" };

/* ------------------------------------------------------------ cards */

interface UaeRow {
  unit_key: string; community: string | null; building: string | null; unit_code: string | null; p_number?: string | null;
  property_type: string | null; beds: string | null; size_sqm: number | null; owner_name: string; party_type?: string | null;
  status?: string | null; is_latest?: boolean | null; has_phone: boolean; date?: string | null; price?: number | null; who: string;
  /** 0 = the unit asked for, 1 = in the building asked for, 2 = an owner's name. */
  rank?: number;
}

function card(viewerId: string, r: UaeRow): DsCard {
  const st = statusOf(r.status, r.is_latest);
  const where = [r.unit_code && `Unit ${r.unit_code}`, r.building, r.community].filter(Boolean).join(", ");
  const statusNote = r.status && !/^owner$/i.test(r.status) ? [r.status] : [];
  return {
    ref: signRef(viewerId, [refId(r.unit_key, r.who)], { name: r.owner_name, where }),
    name: r.owner_name,
    buildingRecord: false,
    model: {
      community: r.community, building: r.building,
      badge: r.unit_code ? { k: "unit", label: "Unit", v: r.unit_code } : null,
      lines: r.p_number ? [{ k: "pnum", label: "P-number", parts: [{ v: r.p_number }] }] : [],
      size: r.size_sqm ? { v: Number(r.size_sqm), u: "sq m" } : null,
      plotArea: null, beds: r.beds, ptype: r.property_type,
      tx: { date: r.date ?? null, proc: null, value: r.price ?? null, party: PARTY[st] ?? null, label: r.price ? "Bought for" : "", noConsideration: false },
      nat: null, more: r.party_type && r.party_type !== "Person" ? [{ label: "Owner type", v: r.party_type, suffix: "" }] : [],
      notes: statusNote, nRec: 1, gaps: [], unreadable: [], pMatch: false,
    } as DsCard["model"],
    email: null,
    phoneCount: r.has_phone ? 1 : 0,
    inCrm: null as DsCrmLink | null,
    match: null,
    sold: null,
    comm: r.community ?? "",
    find: [r.owner_name, r.unit_code, r.building, r.community].filter(Boolean).join(" ").toLowerCase(),
  };
}

function results(viewerId: string, rows: UaeRow[]): DsResults {
  const seen = new Set<string>();
  const kept = rows.filter((r) => { const k = `${r.unit_key}|${lower(r.owner_name)}`; return !seen.has(k) && !!seen.add(k); }).slice(0, 1500);
  // What was asked for first (the unit, then the building, then names); within that, current owners who can be reached.
  kept.sort((a, b) => (a.rank ?? 1) - (b.rank ?? 1) || Number(!!b.is_latest) - Number(!!a.is_latest) || Number(b.has_phone) - Number(a.has_phone));
  const cards = kept.map((r) => card(viewerId, r));
  const view = { entries: cards.map((_, c) => ({ c })), notes: [], capped: rows.length > 1500 ? 1500 : 0 };
  return { cards, strict: view, loose: view };
}

const fromFind = (r: Row): UaeRow => ({
  unit_key: s(r.unit_key), community: s(r.community) || null, building: s(r.building) || null, unit_code: s(r.unit_code) || null, p_number: s(r.p_number) || null,
  property_type: s(r.property_type) || null, beds: s(r.beds) || null, size_sqm: num(r.size_sqm), owner_name: s(r.latest_owner) || "Owner not on record",
  party_type: s(r.owner_type) || null, status: "Owner", is_latest: true, has_phone: !!r.has_phone, date: s(r.last_sale_date) || null, price: num(r.last_sale_price), who: "l",
});
const fromOwners = (r: Row): UaeRow => ({
  unit_key: s(r.unit_key), community: s(r.community) || null, building: s(r.building) || null, unit_code: s(r.unit_code) || null,
  property_type: s(r.property_type) || null, beds: s(r.beds) || null, size_sqm: num(r.size_sqm), owner_name: s(r.owner_name),
  party_type: s(r.party_type) || null, status: s(r.status) || null, is_latest: r.is_latest === true, has_phone: !!r.has_phone, who: `n:${encodeURIComponent(s(r.owner_name))}`,
});

async function rpc(db: Db, fn: string, args: Row): Promise<Row[]> {
  const { data, error } = await U(db).rpc(fn, args);
  if (error) { console.error(`[uae] ${fn}:`, error.message); return []; }
  return (data ?? []) as Row[];
}

/* ------------------------------------------------------------ Search tab */

const bare = (v: unknown) => s(v).toUpperCase().replace(/[^A-Z0-9]/g, "");

/** The ways a unit code is typed: "DL-J439" is stored as J439, "BL 661" as BL661. */
function unitVariants(q: string) {
  const t = q.trim();
  return [...new Set([t, t.replace(/^[A-Za-z]{1,3}[-\s]+(?=[A-Za-z]*\d)/, ""), t.replace(/[-\s]/g, "")].filter((x) => x.length > 0))].slice(0, 3);
}

export async function searchFull(db: Db, viewer: { id: string }, rawQuery: string) {
  const q = rawQuery.trim().slice(0, 120);
  // "Portofino 661": a building and the end of a unit code together.
  const tail = /^(.*\S)\s+([A-Za-z]{0,3}-?\d[\w-]*)$/.exec(q);
  const [owners, byBuilding, inBuilding, ...byUnit] = await Promise.all([
    q.length >= 3 ? rpc(db, "search_owners", { p_query: q, p_limit: 300 }) : Promise.resolve([]),
    q.length >= 3 ? rpc(db, "find_units", { p_building: q, p_limit: 400 }) : Promise.resolve([]),
    tail ? rpc(db, "find_units", { p_building: tail[1], p_limit: 1500 }) : Promise.resolve([]),
    ...unitVariants(q).map((v) => rpc(db, "find_units", { p_unit: v, p_limit: 100 })),
  ]);
  const want = tail ? bare(tail[2]) : "";
  // Only when the whole text is not itself a building name ("Marina Gate 2" is a building).
  const both = want && !byBuilding.length ? inBuilding.filter((r) => bare(r.unit_code).endsWith(want)) : [];
  // Owner names: the ones that contain every word typed; the spelling-tolerant ones only when nothing else was found.
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const strong = owners.filter((r) => words.every((w) => lower(r.owner_name).includes(w)));
  const places = both.length + byUnit.flat().length + byBuilding.length;
  const named = strong.length || places ? strong : owners;
  const rows = [
    ...both.map((r) => ({ ...fromFind(r), rank: 0 })),
    ...byUnit.flat().map((r) => ({ ...fromFind(r), rank: 0 })),
    ...byBuilding.map((r) => ({ ...fromFind(r), rank: 1 })),
    ...named.map((r) => ({ ...fromOwners(r), rank: 2 })),
  ];
  const res = results(viewer.id, rows);
  const chip = new Map<string, number>();
  for (const c of res.cards) if (c.comm) chip.set(c.comm, (chip.get(c.comm) ?? 0) + 1);
  const communitiesFound = [...chip.entries()].map(([community, ct]) => ({ community, ct })).sort((x, y) => y.ct - x.ct).slice(0, 12);
  return { ...res, communities: communitiesFound, hiddenEmpty: 0, damac: [] as unknown[] };
}

/** A whole community, building by building (largest first), up to `limit` units. */
async function unitsInCommunity(db: Db, key: string, limit: number) {
  const buildings = (await rpc(db, "list_buildings", { p_community_key: key })).sort((x, y) => Number(y.units ?? 0) - Number(x.units ?? 0));
  const out: Row[] = [];
  for (let i = 0; i < buildings.length && out.length < limit; i += 8) {
    const batch = await Promise.all(buildings.slice(i, i + 8).map((bd) => rpc(db, "find_units", { p_building: s(bd.name), p_community_key: key, p_limit: Math.min(500, limit) })));
    for (const rows of batch) out.push(...rows);
  }
  const seen = new Set<string>();
  return out.filter((x) => !seen.has(s(x.unit_key)) && !!seen.add(s(x.unit_key))).slice(0, limit);
}

/** A community chip: its units with their current owners. */
export async function communityList(db: Db, viewer: { id: string }, name: string) {
  const key = await communityKey(db, name);
  if (!key) return { ...results(viewer.id, []), hiddenEmpty: 0 };
  const rows = await unitsInCommunity(db, key, 1500);
  return { ...results(viewer.id, rows.map(fromFind)), hiddenEmpty: 0 };
}

/** Phone tab: every unit whose owner record carries the number (no numbers are returned). */
export async function phoneList(db: Db, viewer: { id: string }, raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 7) return { ...results(viewer.id, []), agent: null };
  const rows = await rpc(db, "units_by_phone", { p_digits: digits });
  return {
    ...results(viewer.id, rows.slice(0, 500).map((r) => ({ ...fromOwners(r), has_phone: true, who: `p:${s(r.party_id)}` }))),
    agent: null,
  };
}

/* ------------------------------------------------------------ owner card */

function propertyOf(r: Row, unitCode?: unknown): DsProperty {
  return {
    community: s(r.community) || null, building: s(r.building) || null, unit: s(unitCode ?? r.unit_code) || null,
    propertyNo: s(r.p_number) || null, plot: s(r.plot_no) || null, dmNo: r.dm_no ? [s(r.dm_no), s(r.dm_sub_no)].filter(Boolean).join("-") : null,
    type: s(r.property_type) || null, beds: s(r.beds) || null, size: r.size_sqm ? { value: Number(r.size_sqm), unit: "sq m" } : null,
    price: num(r.last_sale_price), date: s(r.last_sale_date) || null,
  };
}

function pick(owners: Row[], who: string) {
  if (who.startsWith("p:")) return owners.filter((o) => s(o.party_id) === who.slice(2));
  if (who.startsWith("n:")) { const n = lower(decodeURIComponent(who.slice(2))); return owners.filter((o) => lower(o.owner_name) === n); }
  return owners.filter((o) => o.is_latest === true);
}

const PLACEHOLDER: DsPhone = { masked: "Number on file", region: "uae_mobile" };

export async function ownerDetail(db: Db, viewer: { id: string }, ids: string[]) {
  const id = ids.map(parseId).find(Boolean);
  if (!id) return null;
  const [owners, unit] = await Promise.all([rpc(db, "unit_owners", { p_unit_key: id.unitKey }), rpc(db, "get_unit", { p_unit_key: id.unitKey })]);
  const me = pick(owners, id.who)[0] ?? owners[0];
  if (!me) return null;
  const u = unit[0] ?? {};
  const name = s(me.owner_name);
  const base = { ref: signRef(viewer.id, [refId(id.unitKey, id.who)]), status: statusOf(me.status, me.is_latest), statusDate: s(me.bought_on) || null, property: propertyOf(u) };

  // Other properties: by full name only for companies and names of 3+ words (short names repeat across people).
  let others: typeof base[] = [];
  if (me.party_type === "Company" || name.split(/\s+/).length >= 3) {
    const same = (await rpc(db, "search_owners", { p_query: name, p_latest_only: true, p_limit: 60 })).filter((r) => lower(r.owner_name) === lower(name) && s(r.unit_key) !== id.unitKey);
    others = same.slice(0, 40).map((r) => ({ ref: signRef(viewer.id, [refId(s(r.unit_key), `n:${encodeURIComponent(name)}`)]), status: statusOf(r.status, r.is_latest), statusDate: null, property: propertyOf(r) }));
  }
  return {
    ref: base.ref,
    name,
    nationality: s(me.nationality) || null,
    phones: me.has_phone ? [PLACEHOLDER] : [],
    hasEmail: false,
    inCrm: null as DsCrmLink | null,
    properties: [base, ...others],
  };
}

/* ------------------------------------------------------------ the numbers */

/**
 * The numbers (or e-mails) behind a handle, in slot order. The ONLY call to
 * unit_phones: the route has already checked the right and the limit and
 * written the reveal before calling this.
 */
async function contacts(db: Db, ids: string[], kind: "mobile" | "email"): Promise<string[]> {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of ids.map(parseId).filter((x): x is NonNullable<typeof x> => !!x)) {
    const rows = await rpc(db, "unit_phones", { p_unit_key: id.unitKey });
    const mine = pick(rows, id.who).filter((r) => s(r.kind) === kind).sort((a, b) => Number(a.slot ?? 0) - Number(b.slot ?? 0));
    for (const r of mine) {
      const v = s(r.value);
      const k = kind === "mobile" ? s(r.phone_norm || v).replace(/\D/g, "").slice(-9) : v.toLowerCase();
      if (v && k && !seen.has(k)) { seen.add(k); out.push(v); }
    }
  }
  return out;
}
export const phonesForRef = (db: Db, ids: string[]) => contacts(db, ids, "mobile");
export async function phoneAt(db: Db, ids: string[], index: number) {
  if (!Number.isInteger(index) || index < 0) return null;
  return (await phonesForRef(db, ids))[index] ?? null;
}
export async function emailOf(db: Db, ids: string[]) {
  return (await contacts(db, ids, "email"))[0] ?? null;
}

/* ------------------------------------------------------------ unit history */

export async function unitLookup(db: Db, viewer: { id: string }, code: string, place?: string | null) {
  const raw = code.trim().slice(0, 40);
  const building = place ? place.split(", ").slice(0, -1).join(", ") || place : null;
  const units = building
    ? await rpc(db, "find_units", { p_unit: raw, p_building: building, p_limit: 20 })
    : (await Promise.all(unitVariants(raw).map((v) => rpc(db, "find_units", { p_unit: v, p_limit: 200 })))).flat();
  const label = (r: Row) => [s(r.building), s(r.community)].filter(Boolean).join(", ");
  const places = [...new Set(units.map(label).filter(Boolean))].sort();
  const chosen = place && places.includes(place) ? place : places.length === 1 ? places[0] : null;
  if (!chosen) return { code: raw, places, chosen: null, current: null, events: [] };
  const unitKey = s(units.find((r) => label(r) === chosen)?.unit_key);
  const [owners, unit] = await Promise.all([rpc(db, "unit_owners", { p_unit_key: unitKey }), rpc(db, "get_unit", { p_unit_key: unitKey })]);
  const u = unit[0] ?? {};
  const latest = owners.filter((o) => o.is_latest === true);
  const events = owners.map((o) => {
    const sold = /sold/i.test(s(o.status));
    const bank = /bank/i.test(s(o.party_type));
    return {
      name: s(o.owner_name),
      date: (sold ? s(o.sold_on) : s(o.bought_on)) || null,
      amount: num(sold ? o.sold_for : o.bought_for),
      role: (bank ? "Mortgage" : sold ? "Seller" : o.bought_on || o.is_latest ? "Buyer" : "Side not recorded") as "Buyer" | "Seller" | "Mortgage" | "Side not recorded",
    };
  });
  return {
    code: raw, places, chosen,
    current: latest.length ? {
      names: latest.map((o) => s(o.owner_name)),
      ref: signRef(viewer.id, [refId(unitKey, "l")]),
      confidence: (u.last_sale_date ? "confirmed" : "likely") as "confirmed" | "likely",
      date: s(u.last_sale_date) || null, amount: num(u.last_sale_price),
      landNumber: s(u.land_no) || null, transactions: Number(u.number_of_sales ?? 0),
    } : null,
    events,
  };
}

/* ------------------------------------------------------------ calling list */

export async function areaOwners(db: Db, viewer: { id: string }, area: string) {
  const key = await communityKey(db, area);
  const rows = key && (await communities(db)).some((c) => c.key === key && lower(c.name) === lower(area))
    ? await unitsInCommunity(db, key!, 1500)
    : await rpc(db, "find_units", { p_building: area, p_limit: 1500 });
  const withPhone = rows.filter((r) => r.has_phone && s(r.latest_owner));
  const hits: (DsHit & { optedOut: boolean })[] = withPhone.slice(0, 400).map((r) => {
    const where = [s(r.unit_code) && `Unit ${s(r.unit_code)}`, s(r.building), s(r.community)].filter(Boolean).join(", ");
    return {
      ref: signRef(viewer.id, [refId(s(r.unit_key), "l")], { name: s(r.latest_owner), where }),
      name: s(r.latest_owner), status: "confirmed", statusDate: s(r.last_sale_date) || null, nationality: null,
      property: propertyOf(r), phones: [PLACEHOLDER], hasEmail: false, inCrm: null, notes: [], optedOut: false,
    };
  });
  return { total: withPhone.length, hits };
}

/* ------------------------------------------------------------ tools */

export async function propertyNumber(db: Db, viewer: { id: string }, q: string) {
  const key = q.trim().slice(0, 40).replace(/\.0$/, "");
  if (!key) return [];
  const rows = await rpc(db, "find_units", { p_unit: key, p_limit: 40 });
  return rows.map((r) => ({
    ref: signRef(viewer.id, [refId(s(r.unit_key), "l")]),
    name: s(r.latest_owner) || "Owner not on record",
    side: "Owner",
    date: s(r.last_sale_date) || null,
    amount: num(r.last_sale_price),
    place: [s(r.unit_code) && `Unit ${s(r.unit_code)}`, s(r.building), s(r.community)].filter(Boolean).join(" · "),
    numbers: { plot: null, reg: null, property: s(r.p_number) || null },
    phones: r.has_phone ? [PLACEHOLDER] : [],
  }));
}

export async function suggest(db: Db, kind: string, q: string) {
  const text = lower(q);
  if (text.length < 2 || (kind && kind !== "community")) return [];
  return (await communities(db)).filter((c) => lower(c.name).includes(text)).slice(0, 12).map((c) => ({ name: c.name, meta: `${c.units.toLocaleString("en-US")} units` }));
}

export async function stats(db: Db) {
  const all = await communities(db);
  return { owners: 0, properties: all.reduce((t, c) => t + c.units, 0), projects: all.reduce((t, c) => t + c.buildings, 0), phones: 0 };
}

export { maskPhone, regionOf };
