import type { SupabaseClient } from "@supabase/supabase-js";

import {
  CODE_QUERY, collapsePeople, demotePlotLevelCodes, dropBarePropertylessRows, dropCodeMismatches, dropEmptyRows,
  dropEntities, dropSellers, exactNameFirst, isPhoneKey, rawPhoneValues, usablePhones, type OwnerRow,
} from "./rows";
import {
  canonicalPlace, ccModel, detectDataNotes, explodeProperties, gatherPhones, hasPropertyDetails, matchNote, phoneish,
  rowKey, rowMatches, soldBanner, soldUnitKey, type CcModel, type SoldBanner,
} from "./card";
import { phoneCore, type DsCrmLink } from "./model";
import { numericIds, signRef } from "./guard";
import { crmLinks } from "./search";

/**
 * DB Search's three result lists — Search (search_full), Phone and a tapped
 * community — built the way DB Search builds them: its db-api steps on the
 * server, then its page's renderOwners() steps, then its card. The only
 * difference is where it runs: here everything happens on the server and the
 * browser receives finished cards with the numbers and email still hidden.
 */

type Db = SupabaseClient;
export const MAX_QUERY = 120;
const OWNER_COLS = "id, full_name, project_name, building, unit, role, email, raw_data, community_clean, unit_clean";
/** A tower search returns hundreds; DB Search draws them 50 at a time. This only bounds the payload. */
const MAX_CARDS = 1500;

/* ================================================================== card */

export interface DsCard {
  ref: string;
  name: string;
  /** A price-list entry named after its own building: "NO OWNER ON RECORD — property entry". */
  buildingRecord: boolean;
  model: Omit<CcModel, "email" | "name">;
  /** e.g. j•••@gmail.com — revealed only through /api/ds/reveal. */
  email: string | null;
  phoneCount: number;
  inCrm: DsCrmLink | null;
  match: { name: string; more: number } | null;
  sold: SoldBanner | null;
  /** community_clean || project_name, as the refine bar groups them. */
  comm: string;
  /** name, unit, building, project and community, lower-cased, for the refine box. */
  find: string;
}

export interface DsViewEntry { c: number; also?: string[] }
export type DsNote =
  | { kind: "no_exact"; n: number }
  | { kind: "showing_all"; n: number; hidden: number }
  | { kind: "names_hidden"; n: number }
  | { kind: "contact_only"; n: number };
export interface DsView { entries: DsViewEntry[]; notes: DsNote[]; capped: number }

export interface DsResults {
  cards: DsCard[];
  /** What DB Search shows first, and what it shows after "show anyway". */
  strict: DsView;
  loose: DsView;
}

export const maskEmail = (e: string) => {
  const [local, domain] = e.split("@");
  return `${local.slice(0, 1)}•••@${domain ?? ""}`;
};

const idsOf = (o: OwnerRow): string[] => {
  const ids = [o.id, ...(o.alt_ids ?? [])].filter((x) => x != null && x !== "").map(String);
  if (ids.length) return ids;
  return o.ou_key ? [`k:${o.ou_key}`] : [];
};

/* ================================================================== phones */

/** db-api attachPhones(lean): a count per row, and the raw phone columns stripped. */
async function countPhones(db: Db, rows: OwnerRow[]): Promise<Map<OwnerRow, string[]>> {
  const ids = [...new Set(rows.flatMap((r) => [r.id, ...(r.alt_ids ?? [])].filter((x) => x != null && x !== "").map(String)))];
  const byOwner = new Map<string, string[]>();
  for (let i = 0; i < ids.length; i += 300) {
    const { data } = await db.from("phones").select("owner_id, phone_raw").in("owner_id", ids.slice(i, i + 300));
    for (const p of data ?? []) byOwner.set(String(p.owner_id), [...(byOwner.get(String(p.owner_id)) ?? []), p.phone_raw as string]);
  }
  const out = new Map<OwnerRow, string[]>();
  for (const r of rows) {
    const mine = [r.id, ...(r.alt_ids ?? [])].filter((x) => x != null && x !== "").map(String).flatMap((id) => byOwner.get(id) ?? []);
    const all = usablePhones([...mine, ...rawPhoneValues(r.raw_data)]);
    r.phone_count = all.length;
    out.set(r, all);
    if (r.raw_data && typeof r.raw_data === "object") for (const k of Object.keys(r.raw_data)) if (isPhoneKey(k)) delete r.raw_data[k];
  }
  return out;
}

/**
 * The numbers behind one handle, in one fixed order — db-api reveal_phones.
 * A number equal to an ID / plot / unit value on the same records is that
 * value, not a phone, so it is dropped as DB Search's card drops it.
 */
export async function phonesForRef(db: Db, ids: string[]): Promise<string[]> {
  const key = ids.find((x) => x.startsWith("k:"));
  const nums = numericIds(ids);
  let values: unknown[] = [];
  let rows: OwnerRow[] = [];

  if (!nums.length && key) {
    const { data } = await db.rpc("phones_by_unit_key", { p_key: key.slice(2) });
    values = ((data ?? []) as unknown[]).map((v) => (v && typeof v === "object" ? (v as { phone_raw?: unknown }).phone_raw ?? Object.values(v)[0] : v));
  } else if (nums.length && Number(nums[0]) <= -1_000_000_000) {
    // property_index rows travel as synthetic negative ids
    const { data: pi } = await db.from("property_index").select("reg_no, unit_number, property_number, owner_name, contact").eq("id", -Number(nums[0]) - 1_000_000_000).maybeSingle();
    if (pi?.contact) values.push(pi.contact);
    const unit = pi?.reg_no || pi?.unit_number || pi?.property_number;
    const name = String(pi?.owner_name ?? "").toLowerCase().trim().replace(/\s+/g, " ");
    if (unit && name) {
      const { data: own } = await db.from("owners").select("id").eq("unit_clean", unit).eq("name_norm", name).limit(5);
      const oids = (own ?? []).map((o) => o.id);
      if (oids.length) {
        const { data: ph } = await db.from("phones").select("phone_raw").in("owner_id", oids).limit(40);
        values.push(...(ph ?? []).map((p) => p.phone_raw));
      }
    }
  } else if (nums.length) {
    const lookup = nums.slice(0, 9);
    const [ph, own] = await Promise.all([
      db.from("phones").select("phone_raw").in("owner_id", lookup).order("id", { ascending: true }).limit(60),
      db.from("owners").select("raw_data").in("id", lookup).limit(9),
    ]);
    rows = (own.data ?? []) as OwnerRow[];
    values = [...(ph.data ?? []).map((p) => p.phone_raw), ...rows.flatMap((o) => rawPhoneValues(o.raw_data))];
  }

  const banned = new Set<string>();
  for (const r of rows) {
    const rd = r.raw_data ?? {};
    for (const k of Object.keys(rd)) {
      const n = k.toLowerCase().replace(/[^a-z0-9]+/g, "");
      if (/^(idnumber|idno|uaeidnumber|unifiednumber|passport|passportno|passportnumber|idpassportnumber|emiratesid|eid|eidnumber|nationalid|licen[cs]e|licen[cs]eno|trn|trnno|pnumber|pnum|landnumber|landsubnumber|plotnumber|plotpreregno|municipalitynumber|parkingnumber|unitnumber|dmno|dmsubno)$/.test(n)) {
        const d = String(rd[k] ?? "").replace(/\D/g, "");
        if (d.length >= 7) banned.add(d.slice(-9));
      }
    }
  }
  return usablePhones(values).filter((v) => {
    const d = String(v).replace(/\D/g, "");
    return phoneish(d) && !banned.has(d.slice(-9));
  }).slice(0, 6);
}

/* ================================================================== collection */

async function codeRows(db: Db, q: string): Promise<OwnerRow[]> {
  const raw = q.trim();
  if (!raw || raw.length > 20 || !CODE_QUERY.test(raw)) return [];
  const k = raw.toUpperCase().replace(/\s+/g, "");
  const bare = k.replace(/^DL-/, "");
  const variants = [...new Set([k, bare, "DL-" + bare])];
  const [byUnit, byPlot] = await Promise.all([
    db.from("owners").select(OWNER_COLS).in("unit_clean", variants).limit(60),
    db.from("owners").select(OWNER_COLS).eq("raw_data->>plot pre reg no", "DL-" + bare).limit(60),
  ]);
  const seen = new Set<unknown>();
  return [...(byUnit.data ?? []), ...(byPlot.data ?? [])].filter((r) => !seen.has(r.id) && !!seen.add(r.id)) as OwnerRow[];
}

async function broadPlaceRows(db: Db, q: string): Promise<OwnerRow[]> {
  const raw = q.trim();
  if (raw.length < 3 || CODE_QUERY.test(raw)) return [];
  const { data } = await db.rpc("search_place_broad", { q: raw, lim: 1200 });
  return (data ?? []) as OwnerRow[];
}

/* ================================================================== renderOwners */

/**
 * The page's renderOwners(), once for each state of its "show anyway" toggle.
 * `query` is passed only by the free-text search: phone and community lists
 * come back as exact sets and are never re-filtered against it.
 */
function buildView(list: OwnerRow[], query: string | null, isPlace: boolean, showLoose: boolean, exploded: (o: OwnerRow) => OwnerRow[], modelOf: (o: OwnerRow) => CcModel) {
  const seen = new Set<string>();
  let filtered: OwnerRow[] = [];
  for (const o of list) {
    const key = rowKey(o);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    filtered.push(o);
  }
  const notes: DsNote[] = [];
  if (!filtered.length) return { rows: [] as { o: OwnerRow; also?: string[] }[], notes };

  if (query) {
    const strict = filtered.filter((o) => rowMatches(o, query));
    let hidden = filtered.length - strict.length;
    if (!strict.length) {
      // Never a bare "no results": the near-misses, labelled as near-misses.
      notes.push({ kind: "no_exact", n: filtered.length });
    } else if (showLoose) {
      notes.push({ kind: "showing_all", n: filtered.length, hidden });
    } else {
      filtered = strict;
      /* A person's name, and somebody is called exactly that: show only them.
         Never for a place search — a building's owning entity is routinely
         named after the building itself. */
      const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
      const nq = norm(query);
      if (!isPlace && nq.split(" ").length >= 2) {
        const exact = strict.filter((o) => norm(o.full_name) === nq);
        if (exact.length && exact.length < strict.length) {
          hidden = filtered.length - exact.length;
          filtered = exact;
        }
      }
      if (hidden > 0) notes.push({ kind: "names_hidden", n: hidden });
    }
  }

  // One card per property an owner holds, not one card claiming all of them.
  filtered = filtered.flatMap(exploded);

  /* Contact-list files (name + phone + a project tag) are loaded once per file
     a person appears in. Collapse those empties into a note on the person's
     real record. */
  const also = new Map<OwnerRow, string[]>();
  const byName = new Map<string, OwnerRow[]>();
  for (const o of filtered) {
    const key = String(o.full_name ?? "").trim().toLowerCase();
    if (!key) continue;
    (byName.get(key) ?? byName.set(key, []).get(key)!).push(o);
  }
  const drop = new Set<OwnerRow>();
  for (const group of byName.values()) {
    if (group.length < 2) continue;
    const withDetails = group.filter((o) => hasPropertyDetails(modelOf(o)));
    const empties = group.filter((o) => !hasPropertyDetails(modelOf(o)));
    if (!empties.length) continue;
    const anchor = withDetails.length ? withDetails[withDetails.length - 1] : empties[0];
    const toNote = withDetails.length ? empties : empties.slice(1);
    if (!toNote.length) continue;
    const areas = [...new Set(toNote.map((o) => String(o.community_clean || o.project_name || "").trim()).filter(Boolean))];
    if (areas.length) also.set(anchor, areas);
    for (const o of toNote) drop.add(o);
  }
  if (drop.size) filtered = filtered.filter((o) => !drop.has(o));

  /* A card with no unit, plot, size, price or date is a contact-list mention,
     not a property record. Hidden (and counted) unless it is all there is. */
  const withReal = filtered.filter((o) => hasPropertyDetails(modelOf(o)) || also.has(o));
  if (withReal.length && withReal.length < filtered.length && !showLoose) {
    notes.push({ kind: "contact_only", n: filtered.length - withReal.length });
    filtered = withReal;
  }
  return { rows: filtered.map((o) => ({ o, also: also.get(o) })), notes };
}

async function toResults(db: Db, viewer: { id: string }, list: OwnerRow[], opts: { query: string | null; isPlace: boolean; phones: Map<OwnerRow, string[]>; count?: (o: OwnerRow) => number }): Promise<DsResults> {
  const explodedCache = new Map<OwnerRow, OwnerRow[]>();
  const parentOf = new Map<OwnerRow, OwnerRow>();
  const exploded = (o: OwnerRow) => {
    let e = explodedCache.get(o);
    if (!e) { e = explodeProperties(o); explodedCache.set(o, e); for (const x of e) parentOf.set(x, o); }
    return e;
  };
  const models = new Map<OwnerRow, CcModel>();
  const modelOf = (o: OwnerRow) => { let m = models.get(o); if (!m) { m = ccModel(o); models.set(o, m); } return m; };

  const strictV = buildView(list, opts.query, opts.isPlace, false, exploded, modelOf);
  const looseV = buildView(list, opts.query, opts.isPlace, true, exploded, modelOf);

  // Everyone the CRM already has, matched on any of the row's numbers.
  const rowsUsed = [...new Set([...strictV.rows, ...looseV.rows].map((x) => parentOf.get(x.o) ?? x.o))];
  const links = await crmLinks(db, rowsUsed.flatMap((r) => (opts.phones.get(r) ?? []).map(phoneCore)), viewer);

  const cards: DsCard[] = [];
  const index = new Map<OwnerRow, number>();
  const cardOf = (o: OwnerRow): number => {
    const known = index.get(o);
    if (known != null) return known;
    const m = modelOf(o);
    const parent = parentOf.get(o) ?? o;
    const name = m.name || "Name not on record";
    const nameKey = String(m.name ?? "").trim().toLowerCase();
    const phoneCount = opts.count ? opts.count(parent) : Number(parent.phone_count ?? 0);
    const where = [m.badge ? `${m.badge.label} ${m.badge.v}` : null, m.building, m.community].filter(Boolean).join(", ");
    const { email, name: _n, ...model } = m;
    void _n;
    cards.push({
      ref: signRef(viewer.id, idsOf(parent), { name, where, nat: m.nat, email }),
      name,
      buildingRecord: !!nameKey && !phoneCount && [m.building, m.community].some((v) => v && String(v).trim().toLowerCase() === nameKey),
      model,
      email: email ? maskEmail(email) : null,
      phoneCount,
      inCrm: (opts.phones.get(parent) ?? []).map((p) => links.get(phoneCore(p))).find(Boolean) ?? null,
      match: opts.query ? matchNote(o, name, opts.query) : null,
      sold: soldBanner(o),
      comm: String(o.community_clean || o.project_name || "").trim(),
      find: [o.full_name, o.unit, o.unit_clean, o.building, o.project_name, o.community_clean].map((v) => String(v ?? "").toLowerCase()).join(" | "),
    });
    index.set(o, cards.length - 1);
    return cards.length - 1;
  };
  const view = (v: ReturnType<typeof buildView>): DsView => ({
    entries: v.rows.slice(0, MAX_CARDS).map(({ o, also }) => (also ? { c: cardOf(o), also } : { c: cardOf(o) })),
    notes: v.notes,
    capped: Math.max(0, v.rows.length - MAX_CARDS),
  });
  return { cards, strict: view(strictV), loose: view(looseV) };
}

/* ================================================================== the three lists */

export interface DamacSale { villa: string | null; sub_project: string | null; sale_type: string | null; sale_date: string | null; price: number | null; bua_sqft: number | null; payment_method: string | null; mortgage_amount: number | null; times_sold: number | null }

/** Search tab — db-api search_full, then the page. */
export async function searchFull(db: Db, viewer: { id: string }, rawQuery: string, includeEmpty = false) {
  const q = rawQuery.trim().slice(0, MAX_QUERY);
  const [s0, c, dl, broad] = await Promise.all([
    db.rpc("smart_search", { q, p_has_phone: false }),
    db.rpc("list_communities", { q }),
    db.rpc("search_damac_transactions", { q }),
    broadPlaceRows(db, q),
  ]);
  let s = s0;
  if (s.error) s = await db.rpc("smart_search", { q, p_has_phone: false });
  const first = (s.data ?? []) as OwnerRow[];
  const seen = new Set<unknown>(first.map((r) => r.id).filter((x) => x != null));
  const merged = [...first, ...broad.filter((r) => !seen.has(r.id))];

  const rows = collapsePeople(dropCodeMismatches([...exactNameFirst(dropEntities(dropSellers(merged, q), q), q), ...await codeRows(db, q)], q));
  const phones = await countPhones(db, rows);
  demotePlotLevelCodes(rows);
  for (const r of rows) r.data_notes = detectDataNotes(r);
  const before = rows.length;
  let kept = dropEmptyRows(rows, q, includeEmpty);
  if (!includeEmpty) kept = dropBarePropertylessRows(kept, q);

  const chipCount = new Map<string, number>();
  for (const r of kept) {
    const nm = canonicalPlace(String(r.community_clean || r.project_name || ""));
    if (nm) chipCount.set(nm, (chipCount.get(nm) ?? 0) + 1);
  }
  const chips = [...chipCount.entries()].map(([community, ct]) => ({ community, ct })).sort((a, b) => b.ct - a.ct).slice(0, 12);
  const communities = chips.length ? chips : ((c.data ?? []) as { community: string; ct: number }[]).slice(0, 12).map((x) => ({ community: x.community, ct: Number(x.ct) }));
  // Reachable owners first.
  kept.sort((a, b) => Number((b.phone_count ?? 0) > 0) - Number((a.phone_count ?? 0) > 0));

  // A non-empty community list is db-api's own signal that the query resolved to a place.
  const results = await toResults(db, viewer, kept, { query: q, isPlace: communities.length > 0, phones });
  return {
    ...results,
    communities,
    hiddenEmpty: before - kept.length,
    damac: ((dl.data ?? []) as DamacSale[]).slice(0, 40),
  };
}

/** A community chip — db-api `community`, rendered without the text filter. */
export async function communityList(db: Db, viewer: { id: string }, name: string, includeEmpty = false) {
  const cname = name.trim().slice(0, MAX_QUERY);
  const [res, broad] = await Promise.all([
    db.rpc("search_by_community", { name: cname }),
    broadPlaceRows(db, cname),
  ]);
  const rows = collapsePeople(dropEntities(dropSellers([...((res.data ?? []) as OwnerRow[]), ...broad], ""), ""));
  const phones = await countPhones(db, rows);
  const before = rows.length;
  let kept = dropEmptyRows(rows, "", includeEmpty);
  if (!includeEmpty) kept = dropBarePropertylessRows(kept, cname);
  const results = await toResults(db, viewer, kept, { query: null, isPlace: true, phones });
  return { ...results, hiddenEmpty: before - kept.length };
}

export interface DsAgentHit { name: string; company: string | null; phone: string | null; nationality: string | null; brn: string | null }

/** Phone tab — db-api `phone`: every owner record carrying the number, and whether it is a licensed broker's. */
export async function phoneList(db: Db, viewer: { id: string }, raw: string) {
  const core = raw.replace(/\D/g, "").slice(-9);
  // A full number is an exact match on its index; a fragment is DB Search's contains-match.
  const ph = core.length === 9
    ? await db.from("phones").select("owner_id").eq("phone_core", core).limit(80)
    : await db.from("phones").select("owner_id").ilike("phone_core", `%${core}%`).limit(80);
  const ids = [...new Set((ph.data ?? []).map((p) => p.owner_id))];
  const { data: agent } = await db.from("agents").select("agent_name, company, mobile_display, nationality, brn").eq("mobile_e164", "971" + core).maybeSingle();
  const agentHit: DsAgentHit | null = agent ? { name: agent.agent_name, company: agent.company, phone: agent.mobile_display, nationality: agent.nationality, brn: agent.brn } : null;
  if (!ids.length) return { cards: [] as DsCard[], strict: { entries: [], notes: [], capped: 0 }, loose: { entries: [], notes: [], capped: 0 }, agent: agentHit };

  const { data } = await db.from("owners").select(OWNER_COLS).in("id", ids).limit(80);
  const rows = (data ?? []) as OwnerRow[];
  // attachPhones(reveal): the card shows every number on the record, so the count is those numbers.
  const { data: nums } = await db.from("phones").select("owner_id, phone_raw").in("owner_id", ids);
  const byOwner = new Map<string, { phone_raw: unknown }[]>();
  for (const p of nums ?? []) byOwner.set(String(p.owner_id), [...(byOwner.get(String(p.owner_id)) ?? []), { phone_raw: p.phone_raw }]);
  const phones = new Map<OwnerRow, string[]>();
  for (const r of rows) phones.set(r, gatherPhones({ raw_data: r.raw_data, phones: byOwner.get(String(r.id)) ?? [] }));
  for (const r of rows) r.phone_count = phones.get(r)!.length;
  const results = await toResults(db, viewer, rows, { query: null, isPlace: false, phones });
  return { ...results, agent: agentHit };
}

/* ================================================================== sold flags */

/**
 * "Already sold" flags from registered sales (fam_sold_units), fetched after
 * the cards are drawn. Scoped to Damac Lagoons, as in DB Search: everywhere
 * else a loose unit key matched a different project's sale.
 */
export async function soldFlags(db: Db, groups: { comm: string; units: string[] }[]) {
  const jobs = groups.filter((g) => /lagoon/i.test(g.comm)).slice(0, 6);
  const found: { comm: string; unitKey: string; unit: string | null; project: string | null; date: string | null; price: number | null; payment: string | null; confidence: string | null }[] = [];
  await Promise.all(jobs.map(async (g) => {
    const units = [...new Set(g.units.map(String).filter((u) => soldUnitKey(u).length >= 4))].slice(0, 400);
    if (!units.length) return;
    const { data } = await db.rpc("fam_sold_units", { p_units: units, p_project: g.comm || null });
    for (const r of (data ?? []) as Record<string, unknown>[]) {
      found.push({
        comm: g.comm, unitKey: String(r.unit_key ?? ""), unit: (r.unit_number as string) ?? null, project: (r.project as string) ?? null,
        date: (r.date_sold as string) ?? null, price: r.price != null ? Number(r.price) : null, payment: (r.payment_method as string) ?? null,
        confidence: (r.confidence as string) ?? null,
      });
    }
  }));
  return found;
}
