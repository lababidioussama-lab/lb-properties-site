/**
 * DB Search's result card and result filtering, ported from its page
 * (DBproperties/public/index.html: CLEAN CARD release F1, STRICT RESULT
 * FILTERING, gatherPhones, explodeProperties, the sold banners).
 *
 * In DB Search this runs in the browser on the raw rows. Here it runs on the
 * server, so raw_data — which carries phone, ID and passport numbers — never
 * reaches the browser; only the finished card does. The rules are copied as
 * they are, comments and all where they explain a real wrong answer.
 */

import { CC_NAT_GROUPS, SOLD_UNITS } from "./cc-data";
import { asBeds, asDate, asName, first, fromRaw, looksLikePlaceName, type OwnerRow, type RawData } from "./rows";

/* =================================================================== raw access */

/** The page's _raw(): keys normalised to [a-z0-9] only, first key wins. */
const nk = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");
function rawMap(o: OwnerRow): { obj: RawData; map: Map<string, string> } | null {
  const p = o.raw_data;
  if (!p || typeof p !== "object" || Array.isArray(p)) return null;
  const map = new Map<string, string>();
  for (const k of Object.keys(p)) { const n = nk(k); if (n && !map.has(n)) map.set(n, k); }
  return { obj: p, map };
}

/* =================================================================== phones */

/** proposal 20 C8: placeholder numbers ('971|0000000000', '0555555555') are not phones. */
export function phoneish(d: string): boolean {
  const core = d.slice(-9);
  if (/^(\d)\1{8}$/.test(core)) return false;
  if (/^5(\d)\1{7}$/.test(core)) return false;
  if (/^0*$/.test(d.replace(/^(00)?971/, ""))) return false;
  if (/^(00)?9710?5\d{8}$/.test(d)) return true;
  if (/^0?5\d{8}$/.test(d)) return true;
  if (/^(00)?9710?[2-4679]\d{7}$/.test(d)) return true;
  if (/^0[2-4679]\d{7}$/.test(d)) return true;
  // NOTE: no blanket "9-10 digits are a foreign number" branch — those are
  // overwhelmingly ID and serial numbers (see DB Search's _phoneish).
  return d.length >= 11 && d.length <= 15 && !/^(\d)\1+$/.test(d);
}

const ID_KEY = /^(idnumber|idno|uaeidnumber|unifiednumber|passport|passportno|passportnumber|id {3}passport number|emiratesid|eid|eidnumber|nationalid|licen[cs]e|licen[cs]eno|trn|trnno|p ?-? ?number|pnumber|pnum|landnumber|landsubnumber|plot number|plot pre reg no|municipality number|parking number|unitnumber|dmno|dmsubno)$/;

/**
 * Numbers on a record: the phones table plus raw_data's phone-ish columns.
 * A value that equals an ID / plot / unit number on the same row is that
 * number, not a phone — ~24k passport and Emirates ID numbers had been loaded
 * into `phones`.
 */
export function gatherPhones(rec: { raw_data?: RawData | null; phones?: { phone_raw: unknown }[] }): string[] {
  const out: string[] = [], seen = new Set<string>(), banned = new Set<string>();
  const r = rawMap(rec as OwnerRow);
  if (r) for (const [n, k] of r.map) {
    if (ID_KEY.test(n)) {
      const d = String(r.obj[k] ?? "").replace(/\D/g, "");
      if (d.length >= 7) banned.add(d.slice(-9));
    }
  }
  const add = (x: unknown) => {
    const d = String(x ?? "").replace(/\D/g, "");
    if (d.length < 9 || d.length > 15) return;
    const k = d.slice(-9);
    if (banned.has(k) || !phoneish(d) || seen.has(k)) return;
    seen.add(k); out.push(String(x));
  };
  for (const p of rec.phones ?? []) add(p.phone_raw);
  if (r) for (const [n, k] of r.map) if (/mobile|phone|contact|whats/.test(n) && !/no$|number$/.test(n)) add(r.obj[k]);
  return out;
}

/* =================================================================== identity */

/** The identity of a result row: owners.id, else owner_units' ou_key, else name + unit. */
export function rowKey(o: OwnerRow): string {
  const u = String(o.unit_clean || o.unit || "").trim().toLowerCase();
  if (o.id) return `i:${o.id}|${u}`;
  if (o.ou_key) return `k:${o.ou_key}|${u}`;
  const n = String(o.full_name || "").trim().toLowerCase();
  return n || u ? `n:${n}|${u}` : "";
}

/* =================================================================== strict filtering */

const mnorm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
const sq = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "");

/** Every person-name on the row, excluding name-ish keys that describe a place. */
export function allNamesOn(o: OwnerRow): string[] {
  const r = rawMap(o), out: string[] = [], seen = new Set<string>();
  const push = (v: unknown) => { const s = asName(v); if (!s) return; const k = mnorm(s); if (!k || seen.has(k)) return; seen.add(k); out.push(s); };
  push(o.full_name);
  if (r) for (const [n, k] of r.map) {
    if (!n.includes("name")) continue;
    if (/area|building|project|country|procedure|room|property|type|zone|master|community|bank|developer|usage|nearest|land/.test(n)) continue;
    push(r.obj[k]);
  }
  return out;
}

/**
 * Identifier columns only — never the whole raw_data blob: raw_data.plot
 * carries codes belonging to other units, so blob matching is exactly how a
 * plot search returns the wrong property.
 */
function idsOn(o: OwnerRow): string[] {
  const r = rawMap(o), out: string[] = [];
  const push = (v: unknown) => { const s = sq(v); if (s) out.push(s); };
  push(o.unit); push(o.unit_clean); push(o.building);
  if (r) {
    for (const [n, k] of r.map) {
      if (/^(unitnumber|unitno|unit|flatno|flatnumber|villanumber|villano|propertynumber|propertyno|plotpreregno|plotnumber|plotno|landnumber|landno|registration|registrationnumber|regno|buildingno|buildingnumber|plotcode)$/.test(n)) push(r.obj[k]);
    }
    // Premises number (dmno + dmsubno) is a pair, never one raw field.
    const noKey = r.map.get("dmno") ?? r.map.get("municipalityno");
    const subKey = r.map.get("dmsubno") ?? r.map.get("municipalitysubno");
    const no = noKey != null ? r.obj[noKey] : null, sub = subKey != null ? r.obj[subKey] : null;
    if (no && sub) push(String(no).trim() + String(sub).trim());
  }
  return out;
}

function textOn(o: OwnerRow): string {
  const parts: unknown[] = allNamesOn(o).slice();
  parts.push(o.community_clean, o.project_name, o.building, o.unit, o.unit_clean);
  const r = rawMap(o);
  if (r) for (const [n, k] of r.map) {
    if (/^(areanameen|areaname|area|masterproject|masterprojecten|projectnameen|projectname|project|buildingnameen|buildingname|building|subproject|subprojecten|tower|towername|community|communityname|propertytypeen|propertytype)$/.test(n)) parts.push(r.obj[k]);
  }
  return mnorm(parts.join(" "));
}

/**
 * smart_search is a trigram matcher (similarity 0.3), so it returns anything
 * that merely LOOKS like the query. A record is kept only if what was typed
 * is actually on it.
 */
export function rowMatches(o: OwnerRow, q: string): boolean {
  const raw = String(q ?? "").trim();
  if (raw.length < 2) return true;
  const s = sq(raw);
  if (!s) return true;
  const ids = idsOn(o);
  // (a) pure number / phone query
  if (/^[\d+\s()-]+$/.test(raw)) {
    const d = raw.replace(/\D/g, "");
    if (d.length >= 7) {
      const core = d.slice(-9);
      if (gatherPhones(o).some((p) => p.replace(/\D/g, "").slice(-9) === core)) return true;
    }
    return ids.some((v) => v === s);
  }
  // (b) code query: letters and digits (DL-J116, BL459, TAG-ELAN-B437)
  if (/[a-z]/i.test(raw) && /\d/.test(raw)) {
    if (ids.some((v) => v === s || v.includes(s))) return true;
    return textOn(o).replace(/ /g, "").includes(s);
  }
  // (c) plain text: EVERY word must be present
  const t = textOn(o), tsq = t.replace(/ /g, "");
  return mnorm(raw).split(" ").filter(Boolean).every((w) => t.includes(w) || tsq.includes(w));
}

/** "Matched X — also named on this record": the query hit a different person on the same row. */
export function matchNote(o: OwnerRow, shownName: string, query: string): { name: string; more: number } | null {
  const q = mnorm(query);
  if (q.length < 3 || mnorm(shownName).includes(q)) return null;
  const others = allNamesOn(o).filter((n) => mnorm(n) !== mnorm(shownName));
  const hit = others.find((n) => mnorm(n).includes(q));
  return hit ? { name: hit, more: others.length - 1 } : null;
}

/* =================================================================== clean card: sanitisers */

const CC_PLACEHOLDER = /^(null|\(null\)|undefined|nan|none|nil|n\/a|#n\/a|#value!|#ref!?|#name\?|#div\/0!|#null!|0000-00-00|unknown|unspecified|not available|tba|tbc|-+|\.+|_+|\/+|\*+|\?+|#+|0+(\.0+)?)$/i;
const CC_NA = /^(na|n\.a\.)$/i;
const CC_SCI = /^\d(\.\d+)?e\+\d+$/i;
const CC_MAX_AREA = 100000;
const LETTER = /[a-z؀-ۿ]/gi;

type Bad = { bad: string };
type Clean = string | number | Bad | null;

function ccText(v: unknown): string | null {
  if (v == null || typeof v === "object") return null;
  let s = String(v).replace(/_x000[dD]_/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return null;
  if (s.includes("|")) {
    const raw = s.split("|"), parts = raw.map((p) => p.trim()).filter((p) => p && !CC_PLACEHOLDER.test(p));
    const uniq: string[] = [], seen = new Set<string>();
    for (const p of parts) { const k = p.toLowerCase(); if (!seen.has(k)) { seen.add(k); uniq.push(p); } }
    if (!uniq.length) return null;
    if (uniq.length < raw.length) s = uniq.join(" | ");
  }
  return CC_PLACEHOLDER.test(s) ? null : s;
}
function ccCode(v: unknown): string | Bad | null {
  let s = ccText(v);
  if (s == null || CC_NA.test(s)) return null;
  if (CC_SCI.test(s)) return { bad: s };
  if (/^\d{4}-\d{2}-\d{2}([ T]\d{2}:\d{2}(:\d{2})?)?$/.test(s)) return { bad: s.slice(0, 10) };
  s = s.replace(/-+$/, "").trim();
  if (/^\d+\.0+$/.test(s)) s = s.replace(/\.0+$/, "");
  if (!s || CC_PLACEHOLDER.test(s)) return null;
  if (!/\d/.test(s)) return null;
  return s;
}
function ccUnit(v: unknown): string | Bad | null {
  const s = ccCode(v);
  return s == null || typeof s === "object" ? s : looksLikePlaceName(s) ? null : s;
}
function ccLabel(v: unknown): string | null {
  const s = ccText(v);
  if (s == null || CC_NA.test(s)) return null;
  if (/^[\d.,\s/-]+$/.test(s)) return null;
  if ((s.match(LETTER) ?? []).length < 2) return null;
  if (/\.(xlsx?|csv)$|\b(pre|previous to|before) 20\d\d\b|\b20\d\d\s*\(c\)\s*$/i.test(s)) return null;
  return s;
}
function ccName(v: unknown): string | null {
  const s = ccText(v);
  if (s == null || s.includes("@")) return null;
  return (s.match(LETTER) ?? []).length < 2 ? null : s;
}
function ccNum(v: unknown): number | null {
  const s = ccText(v);
  if (s == null) return null;
  const n = Number(s.replace(/,/g, "").replace(/\s*(aed|sqm|sq\.?\s?m|sqft|sq\.?\s?ft)$/i, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}
const ccArea = (v: unknown) => { const n = ccNum(v); return n != null && n <= CC_MAX_AREA ? n : null; };
const ccDate = (v: unknown) => { const s = ccText(v); return s == null ? null : asDate(s); };

const CC_FAKE_EMAIL = new Set(["h@hotmail.com", "h@hot.ail.com", "1111@gmail.com", "1@gmail.com", "a@gmail.com", "a@hotmail.com",
  "aa@gmail.com", "none@hotmail.com", "0@0.0", "0@0.com", "0@111.com", "00@000.com", "000@000.com", "000@000.ae", "000@000.ooo",
  "000@000.000", "000@0000.com", "noemail@noemail.noemail"]);
function ccEmailFake(a: string): boolean {
  const i = a.indexOf("@"), loc = a.slice(0, i), dom = a.slice(i + 1);
  return CC_FAKE_EMAIL.has(a)
    || /^(.)\1*$/.test(loc)
    || /^(0+|[0.]+|na|n\.?a|none|nil|null|test|noemail|nomail|no\.?email|no\.?mail|dummy|unknown|notavailable|not\.?available|x+|no|abc)$/.test(loc)
    || /^([0.]+|0+\.[a-z0-9]+|noemail\.noemail|none\.com|na\.com|test\.com|example\.com)$/.test(dom);
}
/** First real address in the cell; placeholder addresses are never shown. */
export function ccEmail(v: unknown): string | null {
  const s = ccText(v);
  if (s == null) return null;
  for (const p of s.split(/[/;,\s]+/)) {
    if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(p)) continue;
    if (ccEmailFake(p.toLowerCase())) continue;
    return p;
  }
  return null;
}

const ccNatNorm = (s: unknown) => String(s ?? "").toUpperCase().replace(/[.'`’]/g, "").replace(/[^A-Z]+/g, " ").trim();
const CC_NAT: Record<string, string> = {};
for (const [c, al] of Object.entries(CC_NAT_GROUPS)) for (const a of al) CC_NAT[a] = c;
/** Canonical country, or nothing: passport numbers and unmapped junk typed into the column are never shown. */
function ccNat(v: unknown): string | null {
  const s = ccText(v);
  if (s == null || /[0-9]{3,}/.test(s)) return null;
  return CC_NAT[ccNatNorm(s)] ?? null;
}
function ccSide(v: unknown): string | null {
  const s = ccText(v);
  if (s == null) return null;
  const l = s.toLowerCase();
  return /^(buyer|seller|owner|mortgagee)$/.test(l) ? l : null;
}
function ccProc(v: unknown): string | null {
  const s = ccLabel(v);
  if (s == null) return null;
  if (/\bl\s*\.?\s*l\s*\.?\s*c\b/i.test(s) || /^(buyer|seller|owner)$/i.test(s) || CC_NAT[ccNatNorm(s)]) return null;
  return s;
}

type Kind = "name" | "label" | "code" | "unit" | "num" | "area" | "date" | "email" | "text" | "nat" | "side" | "proc" | "beds";
const CC_CLEAN: Record<Kind, (v: unknown) => Clean> = {
  name: ccName, label: ccLabel, code: ccCode, unit: ccUnit, num: ccNum, area: ccArea, date: ccDate, email: ccEmail, text: ccText,
  nat: ccNat, side: ccSide, proc: ccProc, beds: (v) => { const s = ccText(v); return s == null ? null : asBeds(s); },
};
function ccKey(kind: Kind, v: unknown): string {
  if (v == null) return "";
  if (kind === "code" || kind === "unit") return String(v).toUpperCase().replace(/^DL-/, "").replace(/-0$/, "").replace(/[^A-Z0-9]/g, "");
  if (kind === "num" || kind === "area") return String(Math.round(Number(v) * 100));
  return String(v).toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, " ").trim();
}

/* =================================================================== clean card: field map */

interface Field { kind: Kind; cols?: (keyof OwnerRow)[]; raw: string[]; tail?: (keyof OwnerRow)[] }
const CC_FIELDS = {
  name: { kind: "name", cols: ["full_name"], raw: ["nameen", "name", "owner name", "ownernameen", "ownername", "full name", "fullname", "customer name", "customername", "primary applicant name", "owner`s name", "buyername", "sellername", "clientname", "partyname", "owner", "owner 1"] },
  community: { kind: "label", cols: ["community_clean"], raw: ["master project", "masterproject", "masterprojecten", "master project name", "master_project_en", "master projects", "mastre project", "community", "communityname", "community name", "master location", "location", "areanameen", "area name en", "area_name_en", "area name", "area"], tail: ["project_name"] },
  building: { kind: "label", cols: ["building"], raw: ["buildingnameen", "building name", "buildingname", "building", "building 1", "buildingname 2", "tower name", "towername", "tower", "bldg", "bldg.", "sub project", "subproject", "subprojecten", "sub project   building", "projectnameen", "project name", "project", "property name", "propertyname", "sub location", "sublocation", "sub community"] },
  unit: { kind: "unit", cols: ["unit_clean", "unit"], raw: ["unitnumber", "unit number", "unit no", "unit no.", "unitno", "unit#", "unit", "flat number", "flat no", "flat no.", "flatnumber", "flatno", "flat", "apartment number", "apartmentno"] },
  villa: { kind: "unit", raw: ["villa number", "villa  number", "villa no", "villanumber", "villano", "villa", "townhouse number"] },
  propno: { kind: "code", raw: ["property number", "property_number", "propertynumber", "propertyno"] },
  regno: { kind: "code", raw: ["registration", "registration number", "registrationnumber", "reg no", "reg. no.", "reg. no", "regno", "reg_no", "reg", "unit reg"] },
  prereg: { kind: "code", raw: ["plot pre reg no", "plotpreregno", "plot pre reg", "plot regi", "plot registeration", "plot regis", "plot reg no", "pre_registration_number", "pre reg no"] },
  plot: { kind: "code", raw: ["plot number", "plot no", "plotnumber", "plotno", "plot_number"] },
  land: { kind: "code", raw: ["landnumber", "land number", "land_number", "land no", "land"] },
  landsub: { kind: "code", raw: ["landsubnumber", "land_sub_number"] },
  munno: { kind: "code", raw: ["municipality number", "munc_number", "muncplty no"] },
  pnumber: { kind: "code", raw: ["p-number", "p number", "p  number", "pnumber", "p-num"] },
  // proposal 35 E5: which size key is in which unit
  size: { kind: "area", raw: ["actual area", "actualarea", "actual_area", "size", "sqm", "size sqm", "size  sqm", "total area", "totalarea", "area owned", "areaowned", "builtup area sqm", "builtup_area_sqm"] }, // sqm
  sizeSqft: { kind: "area", raw: ["bua", "saleable area", "area sqft", "built-up area sqft", "sqft"] }, // sq ft
  sizeUnk: { kind: "area", raw: ["actual size", "built up", "builtup", "builtuparea", "actual area sqm", "actual_area_sqm", "built-up area sqm", "internal area"] }, // mixed: no unit printed
  plotArea: { kind: "area", raw: ["plot area", "plotarea", "plot area sqft", "plot size", "plot area sqm", "plot_area_sqm", "plot size sqm"] },
  beds: { kind: "beds", raw: ["roomsdescriptionen", "rooms description", "roomsdescription", "rooms", "bedrooms", "bedroom", "beds", "room", "no. bhk", "br."] },
  ptype: { kind: "label", raw: ["propertytypeen", "property type", "property_type_en", "propertytype", "property`s type", "prop. type", "propertysubtypenameen", "property sub type", "property_sub_type_en", "sub type", "type", "usage"] },
  txDate: { kind: "date", raw: ["regis", "instancedate", "transactiondate", "transaction date", "registrationdate", "regisdate", "purchasedate", "contractdate", "date", "tx_date", "booking date"] },
  txProc: { kind: "proc", raw: ["procedurenameen", "procedurename", "procedure", "transactiontype", "sale type"] },
  txValue: { kind: "num", raw: ["procedurevalue", "transactionamount", "transaction amount", "transaction_amount", "transaction value  aed", "transactionvalue", "purchase price", "purchaseprice", "price", "price (aed)", "saleprice", "amount", "value"] },
  party: { kind: "side", cols: ["role"], raw: ["procedurepartytypenameen", "procedure party type name en", "procedurepartytypename", "procedurepartytype", "party type", "partytype", "client type", "buyerseller", "role", "party"] },
  nat: { kind: "nat", raw: ["countrynameen", "nationality", "nationalityen", "countryname", "nationality en"] }, // never 'country' (the phone's country)
  email: { kind: "email", cols: ["email"], raw: ["email", "email address", "email 1", "emailaddress", "owneremail", "mail", "email add"] },
} satisfies Record<string, Field>;
type FieldName = keyof typeof CC_FIELDS;

const CC_PLOTAREA_SQFT = new Set(["plot area", "plotarea", "plot area sqft"]);
const CC_MORE: (Field & { label: string; suffix?: string })[] = [
  { label: "Floor", kind: "text", raw: ["floor"] },
  { label: "Parking", kind: "code", raw: ["parking number", "parking"] },
  { label: "Balcony", kind: "area", raw: ["balcony area"], suffix: " sqm" },
  { label: "Completion", kind: "label", raw: ["completion status"] },
  { label: "View", kind: "label", raw: ["view", "unit view"] },
  { label: "Layout", kind: "label", raw: ["plan type", "flat typology", "unit type", "room type"] },
  { label: "Transactions on record", kind: "num", raw: ["transactions on this property"] },
];
const CC_DM_PAIRS: [string, string][] = [["dmno", "dmsubno"], ["municipality no", "municipality sub no"]];
const CC_LABEL: Partial<Record<FieldName, string>> = { unit: "Unit", villa: "Villa no", propno: "Property no", regno: "Registration no", prereg: "Pre-reg no", plot: "Plot no", land: "Land no", landsub: "Land sub no", munno: "Municipality no", pnumber: "P-number", size: "Size", sizeSqft: "Size", sizeUnk: "Size", plotArea: "Plot area" };
const CC_SHARED_FIELD: Record<string, FieldName> = { plot_pre_reg_no: "prereg", land_number: "land", plot_number: "plot", plot: "plot", municipality_number: "munno" };

/* =================================================================== clean card: exact raw access */

function ccRawIndex(o: OwnerRow) {
  const p = o.raw_data;
  const obj: RawData = p && typeof p === "object" && !Array.isArray(p) ? p : {};
  const idx = new Map<string, string[]>();
  for (const k of Object.keys(obj)) { const a = k.toLowerCase().trim(); if (!idx.has(a)) idx.set(a, []); idx.get(a)!.push(k); }
  return { obj, idx, get: (a: string) => { const ks = idx.get(a); return ks ? obj[ks[0]] : undefined; } };
}
type Val = { v: string | number; src: string };
function ccCollect(o: OwnerRow, R: ReturnType<typeof ccRawIndex>, f: Field): { vals: Val[]; bad: string[] } {
  const clean = CC_CLEAN[f.kind], out: Val[] = [], seen = new Set<string>(), bad: string[] = [];
  const push = (v: unknown, src: string) => {
    const c = clean(v);
    if (c == null) return;
    if (typeof c === "object") { bad.push(c.bad); return; }
    const key = ccKey(f.kind, c);
    if (!key || seen.has(key)) return;
    seen.add(key); out.push({ v: c, src });
  };
  for (const c of f.cols ?? []) push(o[c], String(c));
  for (const a of f.raw) for (const k of R.idx.get(a) ?? []) push(R.obj[k], "raw:" + k);
  for (const c of f.tail ?? []) push(o[c], String(c));
  return { vals: out, bad };
}

/* =================================================================== clean card: model */

export interface CcShared { n_units: number | null; level?: string | null }
export interface CcLine { k: string; label: string; parts: { pre?: string; v: string; shared?: CcShared | null }[]; multi?: boolean }
export interface CcModel {
  name: string | null;
  community: string | null;
  building: string | null;
  badge: { k: string; label: string; v: string } | null;
  lines: CcLine[];
  size: { v: number; u: string } | null;
  plotArea: { v: number; u: string } | null;
  beds: string | null;
  ptype: string | null;
  tx: { date: string | null; proc: string | null; value: number | null; party: string | null; label: string; noConsideration: boolean };
  nat: string | null;
  email: string | null;
  more: { label: string; v: string | number; suffix: string }[];
  notes: string[];
  nRec: number;
  gaps: string[];
  unreadable: string[];
  pMatch: boolean;
}

export function ccModel(o: OwnerRow): CcModel {
  const R = ccRawIndex(o);
  const F = {} as Record<FieldName, Val[]>;
  const unreadable: string[] = [];
  for (const k of Object.keys(CC_FIELDS) as FieldName[]) {
    const r = ccCollect(o, R, CC_FIELDS[k]);
    F[k] = r.vals;
    for (const b of r.bad) unreadable.push(`${CC_LABEL[k] ?? k} ${b}`);
  }
  const one = (k: FieldName) => (F[k].length ? F[k][0].v : null);
  const oneS = (k: FieldName) => { const v = one(k); return v == null ? null : String(v); };
  const oneN = (k: FieldName) => { const v = one(k); return v == null ? null : Number(v); };

  const sharedRaw = R.obj._shared_codes;
  const sharedList = (Array.isArray(sharedRaw) ? sharedRaw : []).filter((s): s is { value: unknown; kind?: string; key?: string; n_units?: number; level?: string } => !!s && typeof s === "object" && (s as { value?: unknown }).value != null);
  const sharedOf = (val: string): CcShared | null => {
    const kv = ccKey("code", val);
    const s = sharedList.find((x) => ccKey("code", String(x.value)) === kv);
    return s ? { n_units: s.n_units ?? null, level: s.level ?? null } : null;
  };
  let sharedDm: string | null = null;
  for (const s of sharedList) {
    const f = s.kind ? CC_SHARED_FIELD[s.kind] : undefined, v = ccCode(s.value);
    if (f && v && typeof v !== "object" && !F[f].some((x) => ccKey("code", x.v) === ccKey("code", v))) F[f].push({ v, src: "shared:" + s.key });
    if (s.kind === "dm_pair") sharedDm = String(s.value).replace("/", "-");
  }
  // DM pair (sub-number 0 is a real DLD value; text in dmsubno is column scramble)
  let dm: string | null = null;
  for (const [a, b] of CC_DM_PAIRS) {
    const no = ccCode(R.get(a));
    const sub = R.get(b);
    const subRaw = sub == null ? "" : String(sub).trim().replace(/\.0+$/, "");
    if (no && typeof no !== "object" && /^\d{1,6}$/.test(subRaw)) { dm = `${no}-${subRaw}`; break; }
  }
  if (!dm && sharedDm) dm = sharedDm;

  // Identifiers: badge first, then location codes in canonical order, each value printed once.
  const shown = new Set<string>(), lines: CcLine[] = [];
  const mark = (v: unknown) => shown.add(ccKey("code", v)), isShown = (v: unknown) => shown.has(ccKey("code", v));
  let badge: CcModel["badge"] = null;
  for (const k of ["unit", "villa", "propno", "regno"] as const) { const v = oneS(k); if (v) { badge = { k, label: CC_LABEL[k]!, v }; break; } }
  if (badge) mark(badge.v);
  const idLine = (k: string, label: string, vals: Val[]) => {
    const fresh = vals.filter((x) => !isShown(x.v));
    if (!fresh.length) return;
    fresh.forEach((x) => mark(x.v));
    lines.push({ k, label, parts: fresh.map((x) => ({ v: String(x.v), shared: sharedOf(String(x.v)) })), multi: fresh.length > 1 && /^(pnumber|regno|propno|villa)$/.test(k) });
  };
  idLine("villa", "Villa no", F.villa);
  idLine("propno", "Property no", F.propno);
  idLine("regno", "Registration no", F.regno);
  idLine("prereg", "Pre-reg no", F.prereg);
  {
    const parts: CcLine["parts"] = [];
    for (const [pre, list] of [["Plot ", F.plot], ["Land ", F.land]] as const) for (const x of list) {
      if (isShown(x.v)) continue;
      mark(x.v);
      parts.push({ pre, v: String(x.v), shared: sharedOf(String(x.v)) });
    }
    const sub = oneS("landsub");
    if (sub && sub !== "0" && parts.some((p) => p.pre === "Land ")) parts.push({ pre: "sub ", v: sub });
    if (parts.length === 1) delete parts[0].pre;
    if (parts.length) lines.push({ k: "plotland", label: "Plot / Land no", parts });
  }
  if (dm) {
    const [n, s] = dm.split("-");
    const same = new Set([ccKey("code", n + s), ccKey("code", n + s.padStart(4, "0"))]);
    F.munno = F.munno.filter((x) => !same.has(ccKey("code", x.v))); // 'municipality number' 6765407 = DM 676-5407
  }
  idLine("munno", "Municipality no", F.munno);
  if (dm && !isShown(dm)) { mark(dm); lines.push({ k: "dm", label: "DM no / sub no", parts: [{ v: dm, shared: sharedOf(dm) }] }); }
  const plotCode = ccCode(R.get("plot code")); // db-api's demotion stash (shared within the result set)
  if (plotCode && typeof plotCode !== "object" && !isShown(plotCode)) { mark(plotCode); lines.push({ k: "plotcode", label: "Building / plot code", parts: [{ v: plotCode, shared: { n_units: null } }] }); }
  idLine("pnumber", "P-number", F.pnumber);

  // labels
  const community = oneS("community");
  let building: string | null = null;
  for (const x of F.building) {
    const v = String(x.v);
    if (community && ccKey("label", v) === ccKey("label", community)) continue; // building = community again
    if (/^-?\d+(\.\d+)?$/.test(v) || isShown(v)) continue; // a number / a unit or plot code in the building column
    building = v; break;
  }

  // sizes (35 E5): the unit printed is the unit of the source key, never assumed
  let size: CcModel["size"] = oneN("size") != null ? { v: oneN("size")!, u: "sqm" } : oneN("sizeSqft") != null ? { v: oneN("sizeSqft")!, u: "sq ft" } : oneN("sizeUnk") != null ? { v: oneN("sizeUnk")!, u: "" } : null;
  const pa = F.plotArea[0] ?? null;
  const plotArea = pa ? { v: Number(pa.v), u: CC_PLOTAREA_SQFT.has(String(pa.src).replace(/^raw:/, "").toLowerCase().trim()) ? "sq ft" : "" } : null;
  if (size && !size.u && plotArea && Number(size.v) === Number(plotArea.v)) size = null; // property_index copies plot size into 'built up'

  // side (35 E4): a mortgagee is the bank side, never BOUGHT; disagreeing sources → a note, no badge
  const notes: string[] = [];
  let side: string | null = null;
  const sides = F.party.map((x) => String(x.v));
  if (sides.includes("mortgagee")) side = "mortgagee";
  else if (sides.includes("seller") && (sides.includes("buyer") || sides.includes("owner"))) notes.push("Source rows disagree on buyer/seller — verify");
  else if (sides.length) side = sides[0];
  const proc = oneS("txProc");
  const value = oneN("txValue");
  const pl = String(proc ?? "").toLowerCase();
  const tx: CcModel["tx"] = {
    date: oneS("txDate"), proc, value, party: side,
    // price label (35 E6): what the amount is, by procedure first, then side
    label: /mortgage|lease finance/.test(pl) ? "Mortgage amount" : /^grant/.test(pl) ? "Grant value" : side === "seller" ? "Sold for" : side === "buyer" ? "Bought for" : "",
    noConsideration: !value && /^(ownership transfer|bestowal)$/.test(pl),
  };

  const more: CcModel["more"] = [];
  for (const m of CC_MORE) {
    const r = ccCollect(o, R, m);
    const vals = r.vals.filter((x) => !(m.kind === "code" && isShown(x.v)) && ccKey("label", x.v) !== ccKey("label", building ?? "") && ccKey("label", x.v) !== ccKey("label", community ?? ""));
    if (vals.length) more.push({ label: m.label, v: vals[0].v, suffix: m.suffix ?? "" });
  }

  // notes the old card dropped (the building-name-overlap heuristic is skipped: false alarms like 'Opera Grand' in Downtown)
  (Array.isArray(o.data_notes) ? o.data_notes : []).filter((n) => !/^building "/.test(String(n))).slice(0, 2).forEach((n) => notes.push(String(n)));
  if (notes.length < 2) { const dc = ccText(R.get("data_conflict")); if (dc && !notes.includes(dc)) notes.push(dc); }
  if (F.unit.length > 1) notes.push(`Other unit values on this record: ${F.unit.slice(1, 4).map((x) => x.v).join(", ")} — source columns disagree, verify`);
  const conf = ccText(R.get("owner_confidence"));
  if (conf) notes.push(`Owner taken from the unit’s transaction history (confidence: ${conf})`);
  const ostat = ccText(R.get("owner_status"));
  if (ostat && /^no owner/i.test(ostat)) notes.push(ostat);
  const nRec = Math.max(Number(o.merged_rows || 1), 1 + (o.alt_ids ?? []).length);

  // genuine gaps (core facts only)
  const gaps: string[] = [];
  if (!badge) gaps.push("unit number");
  if (!size && !plotArea) gaps.push("size");
  if (!tx.date && !tx.value && !tx.noConsideration) gaps.push("transaction");
  else { if (!tx.date) gaps.push("transaction date"); if (!tx.value && !tx.noConsideration) gaps.push("transaction value"); }
  const nat = F.nat.length ? F.nat.map((x) => x.v).join(" · ") : null; // two countries on one row: show both, never pick one
  if (!nat) gaps.push("nationality");

  return {
    name: oneS("name"), community, building, badge, lines, size, plotArea, beds: oneS("beds"), ptype: oneS("ptype"), tx, nat,
    email: oneS("email"), more, notes, nRec, gaps, unreadable, pMatch: R.get("matched_on") === "p_number",
  };
}

/** proposal 25 C: what counts as "a property record" — the same notion the card uses. */
export function hasPropertyDetails(m: CcModel): boolean {
  return !!(m.badge || m.lines.length || m.size || m.plotArea || m.tx.date || m.tx.value);
}

/* =================================================================== explodeProperties */

/* Before a clone gets one property's values, every exact alias of every
   per-property field is blanked, so a card can never show one property's
   P-number / DM pair / plot / size next to another property's unit. */
const CC_PER_PROPERTY: FieldName[] = ["unit", "villa", "propno", "regno", "prereg", "plot", "land", "landsub", "munno", "pnumber", "size", "sizeSqft", "sizeUnk", "plotArea", "beds", "ptype", "txDate", "txProc", "txValue", "party", "building"];
function ccBlankPropertyKeys(raw: RawData): RawData {
  const want = new Set(["dmno", "dmsubno", "municipality no", "municipality sub no", "plot code", "_shared_codes", "matched_on", "matched_value", "transactions on this property", "floor", "parking number", "parking", "balcony area"]);
  for (const g of CC_PER_PROPERTY) for (const a of CC_FIELDS[g].raw) want.add(a);
  const out: RawData = {};
  for (const k of Object.keys(raw ?? {})) if (!want.has(k.toLowerCase().trim())) out[k] = raw[k];
  return out;
}

/**
 * collapsePeople merges every property one owner ever transacted on into one
 * row, the rest sitting in raw_data.properties. One card claiming to be a
 * person who owns 70 units is worse than 70 honest cards.
 */
export function explodeProperties(o: OwnerRow): OwnerRow[] {
  const raw = o.raw_data;
  const props = raw && Array.isArray(raw.properties) ? (raw.properties as Record<string, string | null>[]) : null;
  if (!props || props.length < 2) return [o];
  return props.map((p, i) => ({
    ...o,
    raw_data: {
      ...ccBlankPropertyKeys(raw!),
      project: p.project, community: p.community, unit: p["plot / unit"],
      unitnumber: p["plot / unit"], size: p["size sqm"], price: p["price aed"],
      date: p.date, type: p.type, role: p.role,
      reg_no: p.reg_no, registration: p.reg_no, registrationnumber: p.reg_no, regno: p.reg_no,
      "property number": p.reg_no, propertynumber: p.reg_no, propertyno: p.reg_no,
      "plot pre reg no": null, plotpreregno: null,
      landnumber: p.land_number, "land number": p.land_number,
      "plot number": p.land_number, plotnumber: p.land_number,
    },
    community_clean: p.community || o.community_clean,
    unit_clean: p["plot / unit"] || null,
    unit: p["plot / unit"] || null,
    project_name: p.project || o.project_name,
    role: p.role || o.role,
    // Never the most-recent property's building on another property's card.
    building: p.building || null,
    prop_idx: i,
  }));
}

/* =================================================================== sold banners */

function blOf(o: OwnerRow): string {
  const cand: unknown[] = [o.unit, o.unit_clean, o.building, fromRaw(o, ["villanumber", "villano"]), fromRaw(o, ["propertynumber", "propertyno"]), fromRaw(o, ["plotpreregno"]), fromRaw(o, ["unitnumber", "unitno"])];
  const rd = o.raw_data ?? {};
  for (const k in rd) { const v = rd[k]; if (v) cand.push(v); }
  for (const c of cand) {
    if (!c || typeof c === "object") continue;
    const m = /BL[\s-]?(\d{2,4})\b/i.exec(String(c));
    if (m) return "BL" + m[1];
  }
  return "";
}
/** BL codes repeat across unrelated projects: only a Portofino / Damac Lagoons record counts. */
function isLagoonsUnit(o: OwnerRow): boolean {
  const hay = [o.community_clean, o.project_name, o.building, fromRaw(o, ["masterproject", "masterprojecten"]), fromRaw(o, ["projectnameen", "projectname"]), fromRaw(o, ["buildingnameen", "buildingname"]), fromRaw(o, ["areanameen", "areaname"])]
    .map((x) => String(x ?? "").toLowerCase()).join(" ");
  return /portofino|lagoon/.test(hay);
}
export interface SoldBanner { unit: string; date: string; price: number | null; gain: number | null; stale: boolean }
export function soldBanner(o: OwnerRow): SoldBanner | null {
  const u = blOf(o);
  const s = u ? SOLD_UNITS[u] : undefined;
  if (!s || !isLagoonsUnit(o)) return null;
  const recRaw = first(fromRaw(o, ["instancedate", "transactiondate", "registrationdate", "regisdate", "regis", "purchasedate", "contractdate", "date"]));
  const recD = Date.parse(recRaw ?? ""), soldD = Date.parse(s[0]);
  return { unit: u, date: s[0], price: s[1], gain: s[2], stale: Number.isFinite(recD) && Number.isFinite(soldD) && recD < soldD - 86_400_000 };
}

/** The page's _unitKey(): separators stripped on purpose — fam_sold_units() hands its key back in this form. */
export const soldUnitKey = (s: unknown) => String(s ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

/* =================================================================== server-side data notes */

/** db-api's detectDataNotes(): source files that point at a different property. */
export function detectDataNotes(o: OwnerRow): string[] {
  const notes: string[] = [];
  const rd = o.raw_data ?? {};
  const proj = String(o.project_name || "").toLowerCase();
  const bld = String(o.building || "").toLowerCase();
  const conflict = rd["data_conflict"];
  if (conflict) notes.push(String(conflict));
  const mpl = String(rd["master project land"] || "").trim();
  if (mpl && !proj.includes(mpl.toLowerCase()) && !mpl.toLowerCase().includes(proj) && mpl.toLowerCase() !== proj) {
    notes.push(`raw data also references "${mpl}" (differs from ${o.project_name || "unknown"} shown below) — likely a different property`);
  }
  const plot = String(rd["plot"] || "");
  if (/^DL-/i.test(plot) && !proj.includes("lagoons") && !bld.includes("lagoons")) {
    notes.push(`raw data includes a DAMAC Lagoons plot code "${plot}" not matching the project below — likely a different property`);
  }
  const wordsOf = (s: string) => s.split(/[^a-z0-9]+/).filter((w) => w.length >= 3);
  if (bld && proj && bld !== proj) {
    const bw = wordsOf(bld), pw = wordsOf(proj);
    if (bw.length >= 2 && pw.length && !bw.some((w) => pw.includes(w)) && !bld.includes(proj) && !proj.includes(bld)) {
      notes.push(`building "${o.building}" shares no name overlap with community "${o.project_name}" shown below — source files disagree on which community this building is in; verify before treating as fact`);
    }
  }
  const unitRaw = String(o.unit_clean || o.unit || "").toLowerCase();
  if (unitRaw && proj) {
    const uw = wordsOf(unitRaw), pw = wordsOf(proj);
    if (uw.length >= 3 && pw.length && !uw.some((w) => pw.includes(w)) && !unitRaw.includes(proj) && !proj.includes(unitRaw)) {
      notes.push(`unit field reads "${o.unit_clean || o.unit}" — names a different community than "${o.project_name}" shown below; the source file's project column looks wrong on this row, verify before treating as fact`);
    }
  }
  return notes;
}

/** db-api's canonicalPlace(): one chip per community, however the files spell it. */
export function canonicalPlace(raw: string): string {
  let s = String(raw || "").trim();
  if (!s || /^owners?[_ ]unspecified[_ ]role$/i.test(s)) return "";
  s = s.replace(/\s*\(\s*\d+\s*\)/g, " ").replace(/\bconsolidated\b/gi, " ").replace(/\s+\d{3,}\s*$/, "").replace(/\s+/g, " ").trim();
  return s ? s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "";
}

