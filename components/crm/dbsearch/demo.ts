/**
 * Sample-data DB Search for the local preview (/admin?demo). Every name and
 * number here is invented; nothing touches the owner database.
 */
import type { CcModel, DsCard, DsHit, DsOwner, DsResults, DsUnitResult } from "./api";

let signedIn = false;
const usage = { searches: 23, reveals: 7, lists: 25 };
const limits = { searches: 200, reveals: 40, lists: 50 };
const endsAt = () => Date.now() + 98 * 60_000;

const p = (unit: string, beds: string, size: number, price: number | null, date: string | null) => ({
  community: "Dubai Marina", building: "Marina Gate 2", unit, propertyNo: null, plot: null, dmNo: "392-6789",
  type: "Apartment", beds, size: { value: size, unit: "sq ft" as const }, price, date,
});

const HITS: DsHit[] = [
  { ref: "d1", name: "Khalid Rahman", status: "confirmed", statusDate: "2019-03-14", nationality: "United Kingdom", property: p("1405", "2 BR", 1284, 2100000, "2019-03-14"), phones: [{ masked: "+971 50 ••• ••12", region: "uae_mobile" }, { masked: "+447 ••• ••03", region: "abroad" }], hasEmail: true, inCrm: { kind: "lead", id: "l3", name: "Khalid Rahman", stage: "offer", ownerName: "Omar Nasser", mine: false }, notes: [] },
  { ref: "d2", name: "Elena Petrova", status: "confirmed", statusDate: "2021-06-02", nationality: "Russia", property: p("2203", "2 BR", 1318, 2360000, "2021-06-02"), phones: [{ masked: "+7916 ••• ••88", region: "abroad" }], hasEmail: false, inCrm: null, notes: [] },
  { ref: "d3", name: "Rashid Al Suwaidi", status: "likely", statusDate: null, nationality: "United Arab Emirates", property: p("0908", "2 BR", 1290, null, null), phones: [{ masked: "+971 55 ••• ••40", region: "uae_mobile" }], hasEmail: false, inCrm: null, notes: [] },
  { ref: "d4", name: "Priya Sharma", status: "confirmed", statusDate: "2022-11-20", nationality: "India", property: p("3110", "2 BR", 1301, 2480000, "2022-11-20"), phones: [], hasEmail: true, inCrm: null, notes: [] },
  { ref: "d5", name: "Chen Wei", status: "confirmed", statusDate: "2020-02-11", nationality: "China", property: p("2605", "2 BR", 1322, 2050000, "2020-02-11"), phones: [{ masked: "+86138 ••• ••21", region: "abroad" }], hasEmail: false, inCrm: null, notes: [] },
  { ref: "d6", name: "Mohammed Faisal", status: "likely", statusDate: null, nationality: "Jordan", property: p("1712", "2 BR", 1284, null, null), phones: [{ masked: "+971 52 ••• ••07", region: "uae_mobile" }], hasEmail: false, inCrm: null, notes: [] },
  { ref: "d7", name: "Sara Al Hashimi", status: "confirmed", statusDate: "2023-08-09", nationality: "United Arab Emirates", property: p("0412", "2 BR", 1276, 2610000, "2023-08-09"), phones: [{ masked: "+971 56 ••• ••63", region: "uae_mobile" }], hasEmail: false, inCrm: { kind: "contact", id: "c9", name: "Sara Al Hashimi", stage: null, ownerName: "Sara Haddad", mine: true }, notes: [] },
  { ref: "d8", name: "James Whitmore", status: "previous", statusDate: "2019-03-14", nationality: "United Kingdom", property: p("1405", "2 BR", 1284, 1850000, "2016-06-22"), phones: [{ masked: "+447 ••• ••51", region: "abroad" }], hasEmail: false, inCrm: null, notes: [] },
];

const OWNER: DsOwner = {
  ref: "d1", name: "Khalid Rahman", nationality: "United Kingdom",
  phones: HITS[0].phones, hasEmail: true, inCrm: HITS[0].inCrm,
  properties: [
    { ref: "d1", status: "confirmed", statusDate: "2019-03-14", property: HITS[0].property },
    { ref: "d1b", status: "confirmed", statusDate: "2017-10-02", property: { community: "Dubai Hills Estate", building: "Maple 1", unit: "Villa 44", propertyNo: null, plot: "6457", dmNo: null, type: "Townhouse", beds: "3 BR", size: { value: 2410, unit: "sq ft" }, price: 2650000, date: "2017-10-02" } },
    { ref: "d1c", status: "likely", statusDate: null, property: { community: "Jumeirah Village Circle", building: "District 12", unit: "305", propertyNo: null, plot: null, dmNo: null, type: "Apartment", beds: "1 BR", size: { value: 742, unit: "sq ft" }, price: null, date: null } },
  ],
};

const UNIT: DsUnitResult = {
  code: "1405", places: ["Marina Gate 2"], chosen: "Marina Gate 2",
  current: { names: ["Khalid Rahman"], ref: "d1", confidence: "confirmed", date: "2019-03-14", amount: 2100000, landNumber: "392", transactions: 3 },
  events: [
    { name: "Khalid Rahman", date: "2019-03-14", amount: 2100000, role: "Buyer" },
    { name: "James Whitmore", date: "2019-03-14", amount: 2100000, role: "Seller" },
    { name: "Sample Bank PJSC", date: "2019-03-20", amount: 1470000, role: "Mortgage" },
    { name: "James Whitmore", date: "2016-06-22", amount: 1850000, role: "Buyer" },
  ],
};

/* ---------------- DB Search's own Search tab, in its card format */

const model = (m: Partial<CcModel>): CcModel => ({
  community: null, building: null, badge: null, lines: [], size: null, plotArea: null, beds: null, ptype: null,
  tx: { date: null, proc: null, value: null, party: null, label: "", noConsideration: false },
  nat: null, more: [], notes: [], nRec: 1, gaps: [], unreadable: [], pMatch: false, ...m,
});
const tx = (date: string | null, value: number | null, party: "buyer" | "seller" | "owner" | null, proc = "Sell") =>
  ({ date, proc, value, party, label: party === "buyer" ? "Bought for" : party === "seller" ? "Sold for" : "", noConsideration: false });
const card = (c: Partial<DsCard> & { name: string; model: CcModel }): DsCard => ({
  ref: `c-${c.name}`, buildingRecord: false, email: null, phoneCount: 0, inCrm: null, match: null, sold: null,
  comm: c.model.community ?? "", find: [c.name, c.model.badge?.v, c.model.building, c.model.community].join(" | ").toLowerCase(), ...c,
});

const CARDS: DsCard[] = [
  card({ name: "KHALID RAHMAN", phoneCount: 2, email: "k•••@example.com", inCrm: HITS[0].inCrm,
    model: model({ community: "Dubai Marina", building: "Marina Gate 2", badge: { k: "unit", label: "Unit", v: "1405" }, nat: "United Kingdom", nRec: 2,
      lines: [{ k: "dm", label: "DM no / sub no", parts: [{ v: "392-6789", shared: null }] }],
      size: { v: 119.3, u: "sqm" }, beds: "2 B/R", ptype: "Flat", tx: tx("2019-03-14", 2100000, "buyer"), more: [{ label: "Floor", v: "14", suffix: "" }, { label: "Parking", v: "B2-118", suffix: "" }] }) }),
  card({ name: "ELENA PETROVA", phoneCount: 1,
    model: model({ community: "Dubai Marina", building: "Marina Gate 2", badge: { k: "unit", label: "Unit", v: "2203" }, nat: "Russia",
      size: { v: 1318, u: "sq ft" }, beds: "2 B/R", ptype: "Flat", tx: tx("2021-06-02", 2360000, "buyer"), gaps: [] }) }),
  card({ name: "RASHID AL SUWAIDI", phoneCount: 1,
    model: model({ community: "Dubai Marina", building: "Marina Gate 2", badge: { k: "unit", label: "Unit", v: "908" }, nat: "United Arab Emirates",
      lines: [{ k: "plotcode", label: "Building / plot code", parts: [{ v: "392-6789", shared: { n_units: null } }] }],
      beds: "2 B/R", tx: tx(null, null, "owner"), gaps: ["size", "transaction"] }) }),
  card({ name: "PRIYA SHARMA", phoneCount: 0, email: "p•••@example.com",
    model: model({ community: "Dubai Marina", building: "Marina Gate 2", badge: { k: "unit", label: "Unit", v: "3110" }, nat: "India",
      size: { v: 120.9, u: "sqm" }, tx: tx("2022-11-20", 2480000, "buyer"), notes: ["Other unit values on this record: 3111 — source columns disagree, verify"] }) }),
  card({ name: "CHEN WEI", phoneCount: 3,
    model: model({ community: "Dubai Marina", building: "Marina Gate 2", badge: { k: "unit", label: "Unit", v: "2605" }, nat: "China",
      size: { v: 1322, u: "" }, tx: tx("2020-02-11", 2050000, "buyer"), gaps: ["transaction value"] }) }),
  card({ name: "JAMES WHITMORE", phoneCount: 1,
    model: model({ community: "Dubai Marina", building: "Marina Gate 2", badge: { k: "unit", label: "Unit", v: "1405" }, nat: "United Kingdom",
      size: { v: 119.3, u: "sqm" }, tx: tx("2019-03-14", 2100000, "seller") }) }),
  card({ name: "SAMPLE OWNER SEVEN", phoneCount: 1, sold: { unit: "BL474", date: "2026-05-15", price: 3300000, gain: 0.22, stale: true },
    model: model({ community: "Damac Lagoons", building: "Portofino", badge: { k: "villa", label: "Villa no", v: "BL474" }, nat: "Egypt",
      lines: [{ k: "plotland", label: "Plot / Land no", parts: [{ pre: "Plot ", v: "DL-P474" }, { pre: "Land ", v: "6734-1201" }] }],
      plotArea: { v: 2952, u: "sq ft" }, beds: "4 B/R", ptype: "Villa", tx: tx("2022-08-10", 2720000, "buyer") }) }),
  card({ name: "MARINA GATE 2", buildingRecord: true,
    model: model({ community: "Dubai Marina", badge: { k: "unit", label: "Unit", v: "4501" }, size: { v: 3380, u: "sq ft" }, ptype: "Penthouse", gaps: ["transaction", "nationality"] }) }),
];

const DEMO_RESULTS: DsResults = {
  cards: CARDS,
  strict: { entries: CARDS.map((_, i) => (i === 0 ? { c: i, also: ["Jumeirah Village Circle", "Business Bay"] } : { c: i })), notes: [{ kind: "contact_only", n: 37 }], capped: 0 },
  loose: { entries: CARDS.map((_, i) => ({ c: i })), notes: [{ kind: "showing_all", n: 8, hidden: 0 }], capped: 0 },
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ok = (b: Record<string, unknown>) => ({ ok: true, ...b, session: { endsAt: endsAt(), idleMinutes: 20 } });

export async function demoDs(method: string, action: string, body?: Record<string, unknown>) {
  await wait(action === "search" ? 450 : 200);
  if (action === "session" && method === "GET") return ok({ signedIn, user: { name: "Oussama Lababidi", role: "admin" }, limits, usage: signedIn ? usage : null });
  if (action === "session" && method === "DELETE") { signedIn = false; return { ok: true }; }
  if (action === "demo_signin") { signedIn = true; return { ok: true }; }
  if (!signedIn) return { ok: false, error: "ds_signin_required" };

  switch (action) {
    case "search": usage.searches++; return ok({ ...DEMO_RESULTS, communities: [{ community: "Dubai Marina", ct: 212 }, { community: "Marina Gate", ct: 96 }, { community: "Damac Lagoons", ct: 4 }], hiddenEmpty: 58, damac: String(body?.q ?? "").toUpperCase().includes("BL") ? [{ villa: "BL474", sub_project: "Portofino", sale_type: "Title Deed", sale_date: "2026-05-15", price: 3300000, bua_sqft: 2952, payment_method: "cash", mortgage_amount: null, times_sold: 2 }] : [], usage });
    case "community": usage.searches++; return ok({ ...DEMO_RESULTS, hiddenEmpty: 12, usage });
    case "phone": usage.searches++; return ok({ cards: CARDS.slice(0, 1), strict: { entries: [{ c: 0 }], notes: [], capped: 0 }, loose: { entries: [{ c: 0 }], notes: [], capped: 0 }, agent: String(body?.q ?? "").endsWith("0000") ? { name: "Sample Broker", company: "Sample Realty LLC", phone: "+971 50 000 0000", nationality: "United Kingdom", brn: "00000" } : null, usage });
    case "sold": return ok({ found: [] });
    case "stats": return ok({ stats: { owners: 16742311, properties: 1015530, projects: 4210, phones: 9120442 } });
    case "owner": return ok({ owner: body?.ref === "d1" ? OWNER : { ...OWNER, ...HITS.find((h) => h.ref === body?.ref), properties: [{ ref: String(body?.ref), status: HITS.find((h) => h.ref === body?.ref)?.status ?? "likely", statusDate: null, property: HITS.find((h) => h.ref === body?.ref)?.property ?? OWNER.properties[0].property }] } });
    case "dnc": return ok({ blocked: ((body?.phones as string[]) ?? []).filter((p) => String(p).endsWith("0000")) });
    case "reveal":
      if (!body?.reason) return { ok: false, error: "reason_required" };
      usage.reveals++;
      if (body.kind === "email") return ok({ kind: "email", value: "sample.owner@example.com", usage });
      if (body.kind === "phones") return ok({ kind: "phones", usage, numbers: [
        { index: 0, value: "+971 50 555 0112", dial: "971505550112", dnc: false, inCrm: null },
        { index: 1, value: "+971 55 ••• ••40", dial: null, dnc: true, inCrm: null },
      ] });
      return ok({ kind: "phone", value: "+971 50 555 0112", dial: "971505550112", usage });
    case "unit": usage.searches++; return ok({ unit: UNIT });
    case "add": return body?.ref === "d1" ? { ok: false, error: "already_in_crm", link: HITS[0].inCrm } : ok({ created: { as: body?.as, id: "new" } });
    case "portfolio": return ok({ owners: [
      { name: "Sample Investor One", units: 14 }, { name: "Sample Investor Two", units: 9 }, { name: "Khalid Rahman", units: 3 },
      { name: "Sample Holdings Owner", units: 7 }, { name: "Sample Family Trust Owner", units: 5 },
    ] });
    case "suggest": return ok({ items: String(body?.q ?? "").length < 2 ? [] : [
      { name: "Marina Gate 2", meta: "212 owners" }, { name: "Marina Gate 1", meta: "198 owners" }, { name: "Dubai Marina", meta: "18,400 owners" },
    ] });
    case "area": return ok({ total: 164, hits: HITS.filter((h) => h.phones.length).map((h) => ({ ...h, optedOut: false })) });
    case "area_send": usage.lists += (body?.refs as string[] | undefined)?.length ?? 0; return ok({ added: (body?.refs as string[]).length, skipped: 0, capped: 0, usage });
    case "market": return ok({ data: {
      deals: 1146, median_price: 2310000, median_ppsm: 19270, total_value: 3120000000, date_from: "2024-01-02", date_to: "2024-12-30",
      monthly: ["01","02","03","04","05","06","07","08","09","10","11","12"].map((m, i) => ({ m: `2024-${m}`, deals: 70 + ((i * 37) % 60), ppsm: 18000 + i * 120 })),
      areas: [{ area: "Marsa Dubai", deals: 820, ppsm: 19500, price: 2350000 }, { area: "Jumeirah Beach Residence", deals: 326, ppsm: 21100, price: 2600000 }],
      offplan: [{ k: "Ready", deals: 790, ppsm: 18800 }, { k: "Off-Plan", deals: 356, ppsm: 20300 }],
      beds: [{ k: "1 B/R", deals: 410, price: 1450000 }, { k: "2 B/R", deals: 380, price: 2310000 }, { k: "Studio", deals: 190, price: 890000 }],
    } });
    case "rentals": return ok({ data: {
      totals: { contracts: 6210, med_annual_rent: 158000, med_rent_psf: 118.5, new: 2400, renewed: 3810, renewal_rate: 61.4, span: "Jan–Sep 2024", days: 270 },
      areas: [{ area: "Marsa Dubai", contracts: 5100, med_rent: 155000, med_psf: 117 }, { area: "Jumeirah Beach Residence", contracts: 1110, med_rent: 172000, med_psf: 124 }],
      types: [{ type: "Flat", contracts: 5900, med_rent: 156000 }, { type: "Villa", contracts: 310, med_rent: 410000 }],
    } });
    case "valuation": return ok({ data: {
      subject: { scope: "building", name: String(body?.name), sqft: Number(body?.sqft) || 1200 },
      comps: { total: 38, similar: 14, basis: "size-similar", basis_n: 14, latest: "2024-12-28", since: 2022, matched: ["Marina Gate 2"] },
      psf: { p25: 1720, median: 1820, p75: 1910, adjusted_to: "2024-10-01" },
      estimate: { low: 2064000, mid: 2184000, high: 2292000 },
      benchmark: { community: "Dubai Marina", community_med_psf: 1790, premium_pct: 1.7 },
      trend: [{ year: 2022, n: 9, med_psf: 1480 }, { year: 2023, n: 15, med_psf: 1650 }, { year: 2024, n: 14, med_psf: 1820 }],
      recent: [{ date: "2024-12-28", unit: "3110", building: "Marina Gate 2", price: 2420000, sqft: 1301, psf: 1860 }, { date: "2024-11-19", unit: "1712", building: "Marina Gate 2", price: 2310000, sqft: 1284, psf: 1799 }],
      confidence: { score: "high", reasons: [] },
    } });
    case "permit": return ok({ permits: [{ permit_number: "7117000000", bayut_listing_id: "10000001", zone_name_en: "Marsa Dubai", property_type_name_en: "Unit", developer_name_en: "Sample Developer", authority_name_en: "DLD", property_name_en: "Marina Gate 2", property_value: 2450000, validation_url: null, fetched_at: "2026-09-20T10:00:00Z" }], tabu: null });
    case "pnumber": return ok({ rows: [{ ref: "d1", name: "Khalid Rahman", side: "Bought", date: "2019-03-14", amount: 2100000, place: "Unit 1405 · Marina Gate 2 · Dubai Marina", numbers: { plot: "392", reg: null, property: String(body?.q) }, phones: [{ masked: "+971 50 ••• ••12" }] }] });
    case "listed": return ok({ listings: [{ title: "2 BR · Marina Gate 2 · high floor, sea view", price: 2450000, agency: "Sample Realty LLC", agent: "Sample Broker", url: null, beds: 2 }] });
    case "brokers": return ok({ brokers: [
      { name: "Sample Broker", company: "Sample Realty LLC", nationality: "United Kingdom", brn: "00000", contactCount: 2, contacts: [
        { phone: "+971 50 000 0000", dial: "971500000000", company: "Sample Realty LLC — Marina", brn: "00000" },
        { phone: "+971 55 000 0000", dial: "971550000000", company: "Sample Realty LLC — Downtown", brn: "00000" }] },
      { name: "Another Sample Agent", company: "Example Homes", nationality: "India", brn: null, contactCount: 1, contacts: [{ phone: "+971 52 000 0000", dial: "971520000000", company: null, brn: null }] },
    ] });
    case "admin":
      if (method === "PATCH") return ok({ updated: body });
      return ok({
        users: [
          { id: "u1", full_name: "Oussama Lababidi", email: "owner@example.com", role: "admin", active: true, ds_access: true, ds_searches_per_day: 200, ds_reveals_per_day: 40, ds_lists_per_day: 50, ds_locked_at: null, ds_lock_reason: null, usage },
          { id: "u2", full_name: "Sara Haddad", email: "sara@example.com", role: "agent", active: true, ds_access: true, ds_searches_per_day: 200, ds_reveals_per_day: 40, ds_lists_per_day: 50, ds_locked_at: null, ds_lock_reason: null, usage: { searches: 41, reveals: 12, lists: 25 } },
          { id: "u3", full_name: "Omar Nasser", email: "omar@example.com", role: "agent", active: true, ds_access: true, ds_searches_per_day: 150, ds_reveals_per_day: 30, ds_lists_per_day: 25, ds_locked_at: new Date(Date.now() - 40 * 60_000).toISOString(), ds_lock_reason: "More than 15 numbers revealed within 10 minutes", usage: { searches: 88, reveals: 30, lists: 0 } },
        ],
        activity: [
          { id: 1, created_at: new Date(Date.now() - 4 * 60_000).toISOString(), user_id: "u2", action: "reveal", query: null, target: "d1", detail: { reason: "owner_outreach" } },
          { id: 2, created_at: new Date(Date.now() - 6 * 60_000).toISOString(), user_id: "u2", action: "search", query: "Marina Gate 2", target: null, detail: null },
          { id: 3, created_at: new Date(Date.now() - 40 * 60_000).toISOString(), user_id: "u3", action: "locked", query: null, target: null, detail: { reason: "More than 15 numbers revealed within 10 minutes" } },
          { id: 4, created_at: new Date(Date.now() - 55 * 60_000).toISOString(), user_id: "u3", action: "search", query: "BL474", target: null, detail: null },
          { id: 5, created_at: new Date(Date.now() - 70 * 60_000).toISOString(), user_id: "u2", action: "signin", query: null, target: null, detail: { device: "Chrome on Windows" } },
        ],
      });
  }
  return { ok: false, error: "not_found" };
}
