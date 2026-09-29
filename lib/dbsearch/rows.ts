/**
 * DB Search's row rules, ported from its `db-api` edge function and page.
 *
 * The owners table is ~16M rows loaded from hundreds of source files by four
 * different loaders, so almost every rule here is a scar from a real wrong
 * answer (the original comments in DBproperties/supabase/functions/db-api
 * explain each one). They are copied faithfully — typed, not reinvented —
 * so the CRM and DB Search give the same answer to the same question.
 */

export type RawData = Record<string, unknown>;

/** One row of `owners`, as smart_search / search_place_broad return it. */
export interface OwnerRow {
  id: number | string | null;
  full_name: string | null;
  project_name?: string | null;
  building?: string | null;
  unit?: string | null;
  role?: string | null;
  email?: string | null;
  raw_data?: RawData | null;
  community_clean?: string | null;
  unit_clean?: string | null;
  /* added while processing */
  alt_ids?: (number | string)[];
  phone_count?: number;
  merged_rows?: number;
}

/* ------------------------------------------------------------ raw_data keys */

/** Keys are matched loosely ("Procedure Party Type Name En" = procedurepartytypenameen). */
const nk = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
const EMPTY = /^(null|undefined|nan|none|n\/?a|0000-00-00|-{1,3}|#n\/a)$/i;

function rv(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || EMPTY.test(s)) return null;
  return String(v);
}

const keyMaps = new WeakMap<object, Map<string, string>>();
function keyMap(rd: RawData): Map<string, string> {
  let m = keyMaps.get(rd);
  if (!m) {
    m = new Map();
    for (const k of Object.keys(rd)) {
      const n = nk(k);
      if (n && !m.has(n)) m.set(n, k);
    }
    keyMaps.set(rd, m);
  }
  return m;
}

/** First usable value among `keys` in the row's raw_data. */
export function fromRaw(r: OwnerRow, keys: string[]): string | null {
  const rd = r.raw_data;
  if (!rd || typeof rd !== "object") return null;
  const m = keyMap(rd);
  for (const key of keys) {
    const k = m.get(nk(key));
    if (k !== undefined) {
      const v = rv(rd[k]);
      if (v != null) return v;
    }
  }
  return null;
}

export const first = (...vals: (string | null | undefined)[]) =>
  vals.find((v) => v != null && String(v).trim() !== "" && String(v).toLowerCase() !== "null") ?? null;

/* ------------------------------------------------------------ shape guards */

/** A human label, never a bare number or a spreadsheet error token. */
export function asLabel(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s || /^[\d.,\s/-]+$/.test(s) || /^#(n\/a|ref!?)$/i.test(s)) return null;
  if ((s.match(/[a-z؀-ۿ]/gi) ?? []).length < 2) return null;
  return s;
}

export function asName(v: unknown): string | null {
  const s = asLabel(v);
  return s && !s.includes("@") ? s : null;
}

export function asNum(v: unknown): number | null {
  if (v == null) return null;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function asBeds(v: unknown): string | null {
  const lab = asLabel(v);
  if (lab) return lab;
  const s = String(v ?? "").trim();
  if (!/^\d{1,2}$/.test(s)) return null;
  const n = parseInt(s, 10);
  return n >= 1 && n <= 10 ? `${n} BR` : null;
}

function looksLikePlaceName(s: string): boolean {
  const tokens = s.trim().split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return false;
  return tokens.filter((t) => /[a-zA-Z]{3,}/.test(t) && !/\d/.test(t)).length >= 2;
}

/** A unit / plot / registration code: '0', '.' and trailing hyphens are placeholders. */
export function asPropId(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim().replace(/-+$/, "").trim();
  if (!s || s === "." || s === "0" || s.toLowerCase() === "null" || looksLikePlaceName(s)) return null;
  return s;
}

/** ISO, day-first dd/mm/yyyy, or an Excel serial → yyyy-mm-dd. */
export function asDate(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{4,5}(\.\d+)?$/.test(s)) {
    const n = parseFloat(s);
    if (n < 20000 || n > 60000) return null;
    return new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86_400_000).toISOString().slice(0, 10);
  }
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/.exec(s);
  if (m) {
    let d = +m[1], mo = +m[2];
    if (mo > 12 && d <= 12) [d, mo] = [mo, d];
    return `${m[3]}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  const t = Date.parse(s);
  return Number.isFinite(t) ? new Date(t).toISOString().slice(0, 10) : null;
}

/* ------------------------------------------------------------ party / side */

const PARTY_KEYS = ["procedurepartytypenameen", "procedurepartytypename", "procedurepartytype", "partytype", "buyerseller", "role"];

export function partyOf(r: OwnerRow): string {
  const direct = String(r.role ?? "").trim();
  if (direct) return direct.toLowerCase();
  return (fromRaw(r, PARTY_KEYS) ?? "").toLowerCase();
}

/* ------------------------------------------------------------ query shapes */

export const DM_QUERY = /^\d{1,6}[-/]\d{1,6}$/;
const IDENTIFIER_QUERY = /\d{6,}/;
export const CODE_QUERY = /^[a-z]{0,4}[-\s]?[a-z]{0,3}\d{1,6}[a-z]?$/i;

/* ------------------------------------------------------------ filters */

/** Searching a unit returns its owner, not everyone who ever sold it. A name search keeps them. */
export function dropSellers(rows: OwnerRow[], q: string): OwnerRow[] {
  const t = q.trim().toLowerCase();
  if (DM_QUERY.test(q.trim()) || IDENTIFIER_QUERY.test(q)) return rows;
  return rows.filter((r) => !/seller/.test(partyOf(r)) || (!!t && String(r.full_name ?? "").toLowerCase().includes(t)));
}

const ENTITY_NAME_RE = /(l\.?\s?l\.?\s?c|f\.?z\.?[ce]|p\.?\s?j\.?\s?s\.?\s?c|p\.?\s?s\.?\s?c|bank|limited|\bltd\b|\bco\.?\b|company|holdings|\bgroup\b|trading|development|properties|investment|real estate|corporation|\bcorp\b|establishment|\best\.?\b|management|enterprises|emaar|damac|nakheel|sobha|azizi|meraas|dubai properties|nshama|binghatti|danube|ellington|omniyat|select group|deyaar|union properties|tecom|dubai holding|wasl|dubai aviation|dubai municipality|dubai land department|\brta\b|government of dubai|ministry of|federal|municipality|authority|trust|\bfund\b|mortgage)/i;

/** Developers, banks and companies are not the owner an agent calls — unless searched by name. */
export function dropEntities(rows: OwnerRow[], q: string): OwnerRow[] {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const t = norm(q);
  return rows.filter((r) => {
    const name = String(r.full_name ?? "");
    return !ENTITY_NAME_RE.test(name) || (!!t && norm(name) === t);
  });
}

const nameKey = (s: unknown) => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim();

export function exactNameFirst(rows: OwnerRow[], q: string): OwnerRow[] {
  const t = nameKey(q);
  if (!t || !/[a-z]/.test(t)) return rows;
  const exact = rows.filter((r) => nameKey(r.full_name) === t);
  if (!exact.length) return rows;
  const set = new Set(exact);
  return [...exact, ...rows.filter((r) => !set.has(r))];
}

function idsOnRow(r: OwnerRow): string[] {
  const rd = (r.raw_data ?? {}) as RawData;
  return [r.unit_clean, r.unit, r.building, rd["plot pre reg no"], rd["plot"], rd["landnumber"], rd["land number"],
    rd["plot number"], rd["villa number"], rd["unitnumber"], rd["unit number"], rd["property number"], rd["reg_no"],
    rd["registration"], rd["unit name"], rd["unit_key"]]
    .map((v) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .filter(Boolean);
}

/** A code search keeps only rows that actually carry the code — never emptying a real answer. */
export function dropCodeMismatches(rows: OwnerRow[], q: string): OwnerRow[] {
  const raw = q.trim();
  if (!raw || !CODE_QUERY.test(raw)) return rows;
  const k = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const bare = k.replace(/^DL/, "");
  const short = bare.length < 3;
  const kept = rows.filter((r) => idsOnRow(r).some((v) => v === k || v === bare || v === "DL" + bare || (!short && v.endsWith(bare))));
  return kept.length ? kept : rows;
}

/* ------------------------------------------------------------ merging duplicate people */

function dmPlotKey(r: OwnerRow): string {
  const rd = (r.raw_data ?? {}) as RawData;
  const no = String(rd["dmno"] ?? rd["municipality no"] ?? "").trim();
  const sub = String(rd["dmsubno"] ?? rd["municipality sub no"] ?? "").trim();
  return no && sub ? `dm:${no}/${sub}` : "";
}

function plotToken(r: OwnerRow): string {
  const rd = (r.raw_data ?? {}) as RawData;
  for (const v of [rd["plot pre reg no"], r.unit_clean, r.unit, rd["plot"], rd["villa number"]]) {
    const s = String(v ?? "").toUpperCase().trim();
    if (!s) continue;
    const tail = s.split("/").pop() ?? s;
    const m = /^(?:DL-)?([A-Z]{1,3}\d{1,5})$/.exec(tail.replace(/\s+/g, ""));
    if (m) return m[1];
  }
  return "";
}

function strongPropertyKey(r: OwnerRow): string {
  const tok = plotToken(r);
  if (tok) return "tok:" + tok;
  const pn = String((r.raw_data ?? {})["property number"] ?? "").toUpperCase().trim();
  if (pn) return "pn:" + pn;
  return dmPlotKey(r);
}

function regKey(r: OwnerRow): string {
  const rd = (r.raw_data ?? {}) as RawData;
  for (const k of ["registration", "plot pre reg no", "registrationnumber", "regno", "property number", "propertynumber", "propertyno"]) {
    const v = String(rd[k] ?? "").toUpperCase().trim().replace(/\s+/g, " ");
    if (v && v !== "0" && v !== "NULL") return v;
  }
  return "";
}

/** A bare unit number repeats across towers, so it only counts together with its building. */
function unitKeyOf(r: OwnerRow): string {
  const rd = (r.raw_data ?? {}) as RawData;
  const raw = String(r.unit_clean || r.unit || rd["unitnumber"] || rd["unit number"] || "").trim();
  const s = raw.toUpperCase().replace(/-0$/, "").replace(/[^A-Z0-9]/g, "");
  if (!s || s === "0" || s === "NULL") return "";
  const place = String(r.building || r.community_clean || r.project_name || "").toLowerCase().trim();
  return place ? `${place}|${s}` : "";
}

const MERGE_ID_KEYS = ["idnumber", "uaeidnumber", "unifiednumber", "id number", "passport", "id_number"];
function mergeIdsOf(r: OwnerRow): string[] {
  const rd = (r.raw_data ?? {}) as RawData;
  return MERGE_ID_KEYS.map((k) => rd[k]).filter((v) => v != null && String(v).trim()).map((v) => String(v).trim().toUpperCase());
}
/** Two different ID numbers prove two different people, whatever else matches. */
const idsConflict = (a: OwnerRow, b: OwnerRow) => {
  const x = mergeIdsOf(a), y = mergeIdsOf(b);
  return x.length > 0 && y.length > 0 && !x.some((id) => y.includes(id));
};

function sizeOf(r: OwnerRow): number | null {
  const rd = (r.raw_data ?? {}) as RawData;
  for (const k of ["size", "actual area sqm", "actual size", "builtup area sqm", "built up"]) {
    const n = parseFloat(String(rd[k] ?? "").replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}
const sizesCompatible = (a: OwnerRow, b: OwnerRow) => {
  const x = sizeOf(a), y = sizeOf(b);
  return x == null || y == null || Math.abs(x - y) / Math.max(x, y) < 0.02;
};

/**
 * The same person on the same property arrives up to four times (four loaders,
 * four key schemes). Collapse those into one row that remembers the others'
 * ids, so phones from every copy can still be found.
 */
export function collapsePeople(rows: OwnerRow[]): OwnerRow[] {
  const out: OwnerRow[] = [];
  const byKey = new Map<string, OwnerRow>();
  for (const r of rows) {
    const name = nameKey(r.full_name);
    const cands = [...new Set([strongPropertyKey(r), dmPlotKey(r), regKey(r) && "reg:" + regKey(r), unitKeyOf(r) && "u:" + unitKeyOf(r)].filter(Boolean))];
    if (!name || !cands.length) { out.push(r); continue; }

    let seen: OwnerRow | null = null;
    for (const c of cands) {
      const hit = byKey.get(name + "|" + c);
      if (hit && sizesCompatible(hit, r) && !idsConflict(hit, r)) { seen = hit; break; }
    }
    if (!seen) {
      for (const c of cands) if (!byKey.has(name + "|" + c)) byKey.set(name + "|" + c, r);
      out.push(r);
      continue;
    }
    const better = (!seen.id && !!r.id) || (!String(seen.email ?? "").trim() && !!String(r.email ?? "").trim());
    const winner = better ? r : seen;
    const loser = better ? seen : r;
    if (better) {
      out[out.indexOf(seen)] = r;
      for (const [k, v] of byKey) if (v === seen) byKey.set(k, r);
    }
    for (const c of cands) if (!byKey.has(name + "|" + c)) byKey.set(name + "|" + c, winner);
    winner.alt_ids = [...(winner.alt_ids ?? []), ...(loser.alt_ids ?? []), loser.id].filter((x): x is number | string => x != null);
    winner.email = String(winner.email ?? "").trim() || loser.email || null;
    if (!winner.building && loser.building) winner.building = loser.building;
    winner.merged_rows = (winner.merged_rows ?? 1) + (loser.merged_rows ?? 1);
  }
  return out;
}

/**
 * A plot or DM code shared by several units in the result is the PLOT's code,
 * not the unit's — it must not be shown as each unit's own number.
 */
export function demotePlotLevelCodes(rows: OwnerRow[]): OwnerRow[] {
  const CODE_KEYS = ["property number", "plot pre reg no", "landnumber", "land number", "plot number"];
  const unitOf = (r: OwnerRow) => String(r.unit_clean || r.unit || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const dmOf = (rd: RawData) => {
    const no = String(rd["dmno"] ?? rd["municipality no"] ?? "").trim();
    const sub = String(rd["dmsubno"] ?? rd["municipality sub no"] ?? "").trim();
    return no && sub ? `${no}/${sub}` : "";
  };
  const perCode = new Map<string, Set<string>>();
  const perDm = new Map<string, Set<string>>();
  const add = (m: Map<string, Set<string>>, k: string, u: string) => (m.get(k) ?? m.set(k, new Set()).get(k)!).add(u);
  for (const r of rows) {
    const rd = r.raw_data;
    const unit = unitOf(r);
    if (!rd || !unit) continue;
    for (const k of CODE_KEYS) {
      const c = String(rd[k] ?? "").trim().toUpperCase();
      if (c && c !== "0" && c !== "NULL") add(perCode, c, unit);
    }
    const dm = dmOf(rd);
    if (dm) add(perDm, dm, unit);
  }
  for (const r of rows) {
    const rd = r.raw_data;
    if (!rd) continue;
    const unit = unitOf(r);
    for (const k of CODE_KEYS) {
      const c = String(rd[k] ?? "").trim().toUpperCase();
      if (!c || (unit && c.replace(/[^A-Z0-9]/g, "") === unit)) continue;
      if ((perCode.get(c)?.size ?? 0) > 1) {
        if (!rd["plot code"]) rd["plot code"] = rd[k];
        delete rd[k];
      }
    }
    const dm = dmOf(rd);
    if (dm && (perDm.get(dm)?.size ?? 0) > 1) {
      if (!rd["plot code"]) rd["plot code"] = dm.replace("/", "-");
      for (const k of ["dmno", "dmsubno", "municipality no", "municipality sub no"]) delete rd[k];
    }
  }
  return rows;
}

/* ------------------------------------------------------------ empty rows */

function isRealBuilding(building: unknown, community: unknown): boolean {
  const b = String(building ?? "").trim();
  return !!b && !/^\d{1,3}$/.test(b) && b.toLowerCase() !== String(community ?? "").trim().toLowerCase();
}

/** A row with no unit and no real building is noise in a place search. */
export function dropBarePropertylessRows(rows: OwnerRow[], q: string): OwnerRow[] {
  const t = q.trim().toLowerCase();
  const isPhoneQ = q.replace(/\D/g, "").length >= 7;
  return rows.filter((r) =>
    !!String(r.unit_clean || r.unit || "").trim() || isRealBuilding(r.building, r.community_clean) ||
    isPhoneQ || DM_QUERY.test(t) || (!!t && String(r.full_name ?? "").toLowerCase().includes(t)));
}

/** Nothing to act on: no phone, no email, no named owner of a real unit. */
export function dropEmptyRows(rows: OwnerRow[], q: string): OwnerRow[] {
  if (DM_QUERY.test(q.trim())) return rows;
  return rows.filter((r) => {
    if ((r.phone_count ?? 0) > 0 || String(r.email ?? "").trim()) return true;
    const nm = String(r.full_name ?? "").trim().toLowerCase();
    return !!nm && !["null", "0", "#n/a", "nan"].includes(nm) && !!String(r.unit_clean || r.unit || "").trim();
  });
}

/* ------------------------------------------------------------ phones */

const PHONEISH_KEY = /mobile|phone|contact|whats/i;
export const isPhoneKey = (k: string) => PHONEISH_KEY.test(k) && !/no$|number$/i.test(k.trim());

/** Real mobiles and landlines — the phones table also holds Emirates ID and serial numbers. */
function isPhoneish(d: string): boolean {
  return /^(00)?9710?5\d{8}$/.test(d) || /^0?5\d{8}$/.test(d) || /^(00)?9710?[2-4679]\d{7}$/.test(d) ||
    /^0[2-4679]\d{7}$/.test(d) || (d.length >= 11 && d.length <= 15 && !/^(\d)\1+$/.test(d));
}

/** Distinct usable numbers, de-duplicated on their last nine digits. */
export function usablePhones(values: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (v == null) continue;
    const d = String(v).replace(/\D/g, "");
    if (d.length < 9 || d.length > 15 || !isPhoneish(d)) continue;
    const k = d.slice(-9);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(String(v));
  }
  return out;
}

export function rawPhoneValues(rd: RawData | null | undefined): string[] {
  if (!rd || typeof rd !== "object") return [];
  return Object.keys(rd)
    .filter(isPhoneKey)
    .map((k) => rd[k])
    .filter((v) => v != null && String(v).replace(/\D/g, "").length >= 9 && String(v).replace(/\D/g, "").length <= 15)
    .map(String);
}
