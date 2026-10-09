import type { SupabaseClient } from "@supabase/supabase-js";

import { collapsePeople, dropBarePropertylessRows, dropEmptyRows, dropEntities, dropSellers, usablePhones, rawPhoneValues, type OwnerRow } from "./rows";
import { maskPhone, nameOf, nationalityOf, phoneCore, propertyOf, regionOf, sideOf, toInternational, type DsHit } from "./model";
import { signRef } from "./guard";
import { crmLinks } from "./search";

/**
 * The remaining DB Search tools. Every one of them only READS DB Search's own
 * functions and tables; nothing here writes to them. Market figures are
 * aggregates with no personal data; anything that carries a person goes
 * through the same masking as owner search.
 */

type Db = SupabaseClient;
const clip = (s: unknown, n: number) => String(s ?? "").trim().slice(0, n);

/* ------------------------------------------------------------ portfolio */

/** People who own several units. Grouped by NAME in DB Search's owner_counts, so the UI says so. */
export async function portfolioOwners(db: Db, min: number) {
  const { data } = await db.rpc("owners_by_min_properties", { min_count: Math.min(Math.max(min, 2), 50) });
  return ((data ?? []) as { name_norm: string; full_name: string; property_count: number }[])
    .map((r) => ({ name: r.full_name, units: Number(r.property_count) }))
    .slice(0, 300);
}

/* ------------------------------------------------------------ areas */

export async function communities(db: Db, q: string) {
  const { data } = await db.rpc("list_communities", { q: clip(q, 80) });
  return ((data ?? []) as { community: string; ct: number }[]).slice(0, 12).map((c) => ({ name: c.community, owners: Number(c.ct) }));
}

/** Everyone in a community or building, prepared for a calling list: current owners with a number first. */
export async function areaOwners(db: Db, viewer: { id: string }, area: string) {
  const { data } = await db.rpc("search_by_area_like", { q: clip(area, 120), p_has_phone: true });
  let rows = collapsePeople(dropEntities(dropSellers((data ?? []) as OwnerRow[], ""), ""));

  const ids = [...new Set(rows.flatMap((r) => [r.id, ...(r.alt_ids ?? [])].filter((x) => x != null).map(String)))];
  const byOwner = new Map<string, string[]>();
  for (let i = 0; i < ids.length; i += 300) {
    const { data: ph } = await db.from("phones").select("owner_id, phone_raw").in("owner_id", ids.slice(i, i + 300));
    for (const p of ph ?? []) byOwner.set(String(p.owner_id), [...(byOwner.get(String(p.owner_id)) ?? []), p.phone_raw as string]);
  }
  const phonesOf = new Map<OwnerRow, string[]>();
  for (const r of rows) {
    const mine = [r.id, ...(r.alt_ids ?? [])].filter((x) => x != null).map(String);
    const list = usablePhones([...mine.flatMap((id) => byOwner.get(id) ?? []), ...rawPhoneValues(r.raw_data)]);
    phonesOf.set(r, list);
    r.phone_count = list.length;
  }
  rows = dropBarePropertylessRows(dropEmptyRows(rows, area), area).filter((r) => (r.phone_count ?? 0) > 0);

  const total = rows.length;
  rows = rows.slice(0, 400);
  const cores = rows.flatMap((r) => (phonesOf.get(r) ?? []).map(phoneCore));
  const [links, optedOut] = await Promise.all([
    crmLinks(db, cores, viewer),
    (async () => {
      const intl = [...new Set(rows.flatMap((r) => (phonesOf.get(r) ?? []).map(toInternational)))];
      const out = new Set<string>();
      for (let i = 0; i < intl.length; i += 300) {
        const { data: c } = await db.from("wa_consent").select("phone").in("phone", intl.slice(i, i + 300)).not("opted_out_at", "is", null);
        for (const x of c ?? []) out.add(phoneCore(String(x.phone)));
      }
      return out;
    })(),
  ]);

  const hits: (DsHit & { optedOut: boolean })[] = rows.map((r) => {
    const nums = phonesOf.get(r) ?? [];
    return {
      ref: signRef(viewer.id, [r.id, ...(r.alt_ids ?? [])].filter((x) => x != null).map(String)),
      name: nameOf(r),
      status: sideOf(r),
      statusDate: propertyOf(r).date,
      nationality: nationalityOf(r),
      property: propertyOf(r),
      phones: nums.map((p) => ({ masked: maskPhone(p), region: regionOf(p) })),
      hasEmail: !!String(r.email ?? "").trim(),
      inCrm: nums.map((p) => links.get(phoneCore(p))).find(Boolean) ?? null,
      notes: [],
      optedOut: nums.some((p) => optedOut.has(phoneCore(p))),
    };
  });
  return { total, hits };
}

/* ------------------------------------------------------------ market */

export async function marketOverview(db: Db, area: string, months: number) {
  const { data, error } = await db.rpc("market_overview", { p_area: clip(area, 60), p_months: Math.min(Math.max(months, 1), 60) });
  return error ? { error: error.message } : { data };
}

export async function rentals(db: Db, area: string, version: string) {
  const { data, error } = await db.rpc("market_rentals", {
    p_area: clip(area, 80), p_version: ["New", "Renewed"].includes(version) ? version : "", p_limit: 12, p_usage: "Residential",
  });
  return error ? { error: error.message } : { data };
}

export async function valuation(db: Db, scope: string, name: string, sqft: number, since: number, exact: boolean) {
  const { data, error } = await db.rpc("market_valuation", {
    p_scope: ["building", "project", "community"].includes(scope) ? scope : "building",
    p_name: clip(name, 120),
    p_sqft: Math.min(Math.max(sqft || 1000, 50), 100000),
    p_since: Math.min(Math.max(since || 2022, 2018), 2030),
    p_exact: exact,
  });
  return error ? { error: error.message } : { data };
}

export async function suggest(db: Db, kind: string, q: string, scope?: string) {
  const text = clip(q, 80);
  if (text.length < 2) return [];
  if (kind === "valuation") {
    const { data } = await db.rpc("market_valuation_suggest", { p_scope: ["building", "project", "community"].includes(scope ?? "") ? scope : "building", p_q: text, p_limit: 10 });
    return ((data ?? []) as { name: string; sales: number; med_psf: number }[]).map((r) => ({ name: r.name, meta: `${r.sales} sales` }));
  }
  if (kind === "rentals") {
    const { data } = await db.rpc("market_rentals_areas", { p_q: text, p_limit: 12 });
    return ((data ?? []) as { name: string; contracts: number }[]).map((r) => ({ name: r.name, meta: `${r.contracts} contracts` }));
  }
  return (await communities(db, text)).map((c) => ({ name: c.name, meta: `${c.owners} owners` }));
}

/* ------------------------------------------------------------ checks */

/** Permits the DLD worker has already fetched. The live lookup runs on the office desktop and is not reachable from here. */
export async function permitLookup(db: Db, q: string) {
  const key = clip(q, 60).replace(/\s+/g, "");
  if (!key) return [];
  const cols = "permit_number, bayut_listing_id, zone_name_en, property_type_name_en, developer_name_en, authority_name_en, property_name_en, property_value, validation_url, fetched_at";
  const [byPermit, byListing, tabu] = await Promise.all([
    db.from("dld_permits").select(cols).eq("permit_number", key).limit(10),
    db.from("dld_permits").select(cols).eq("bayut_listing_id", key).limit(10),
    db.from("bayut_tabu_refs").select("bayut_listing_id, tabu_ref, verification_status, fetched_at").eq("bayut_listing_id", key).limit(1),
  ]);
  const seen = new Set<string>();
  const permits = [...(byPermit.data ?? []), ...(byListing.data ?? [])].filter((p) => !seen.has(p.permit_number) && !!seen.add(p.permit_number));
  return { permits, tabu: tabu.data?.[0] ?? null };
}

/** A unit from its property / plot / registration number, in owner_units. Numbers stay masked. */
export async function propertyNumber(db: Db, viewer: { id: string }, q: string) {
  const key = clip(q, 40).replace(/\.0$/, "");
  if (!key) return [];
  const cols = "owner_id, full_name, building, project_raw, master_project, unit_clean, plot_number, reg_no, p_number, party_type, tx_date, amount, phone_raw";
  const [byP, byReg, byPlot] = await Promise.all([
    db.from("owner_units").select(cols).eq("p_number", key).order("tx_date", { ascending: false }).limit(40),
    db.from("owner_units").select(cols).eq("reg_no", key).order("tx_date", { ascending: false }).limit(40),
    db.from("owner_units").select(cols).eq("plot_number", key).order("tx_date", { ascending: false }).limit(40),
  ]);
  type U = { owner_id: number | null; full_name: string; building: string | null; project_raw: string | null; master_project: string | null; unit_clean: string | null; plot_number: string | null; reg_no: string | null; p_number: string | null; party_type: string | null; tx_date: string | null; amount: number | null; phone_raw: string[] | null };
  const rows = [...(byP.data ?? []), ...(byReg.data ?? []), ...(byPlot.data ?? [])] as U[];
  const seen = new Set<string>();
  return rows
    .filter((r) => { const k = `${r.owner_id}|${r.unit_clean}|${r.tx_date}|${r.party_type}`; return !seen.has(k) && !!seen.add(k); })
    .map((r) => ({
      ref: r.owner_id ? signRef(viewer.id, [String(r.owner_id)]) : null,
      name: r.full_name,
      side: /buyer/i.test(r.party_type ?? "") ? "Bought" : /seller/i.test(r.party_type ?? "") ? "Sold" : (r.party_type ?? "Side not recorded"),
      date: r.tx_date,
      amount: r.amount,
      place: [r.unit_clean && `Unit ${r.unit_clean}`, r.building, r.master_project ?? r.project_raw].filter(Boolean).join(" · "),
      numbers: { plot: r.plot_number, reg: r.reg_no, property: r.p_number },
      phones: usablePhones(r.phone_raw ?? []).map((p) => ({ masked: maskPhone(p), region: regionOf(p) })),
    }));
}

/* The RapidAPI key: RAPIDAPI_KEY on the CRM's server if set, otherwise the
   same key DB Search uses, read on the server through get_app_secret (a read;
   DB Search is unchanged). It is held in memory for ten minutes and never
   leaves the server. */
let rapid: { key: string; at: number } | null = null;
async function rapidKey(db: Db): Promise<string | null> {
  if (process.env.RAPIDAPI_KEY) return process.env.RAPIDAPI_KEY;
  if (rapid && Date.now() - rapid.at < 10 * 60_000) return rapid.key;
  const { data } = await db.rpc("get_app_secret", { p_name: "RAPIDAPI_KEY" });
  if (typeof data !== "string" || !data) return null;
  rapid = { key: data, at: Date.now() };
  return data;
}

/** Live portal listings, with the same RapidAPI key DB Search uses. */
export async function listedNow(db: Db, q: string) {
  const key = await rapidKey(db);
  if (!key) return { error: "not_configured" as const };
  const url = new URL("https://uae-real-estate-data-api1.p.rapidapi.com/search-brokers");
  url.searchParams.set("query", clip(q, 120));
  url.searchParams.set("location_id", "50");
  url.searchParams.set("sort", "featured");
  url.searchParams.set("page", "1");
  const res = await fetch(url, { headers: { "x-rapidapi-host": "uae-real-estate-data-api1.p.rapidapi.com", "x-rapidapi-key": key } }).catch(() => null);
  if (!res?.ok) return { error: `provider_${res?.status ?? "unreachable"}` as const };
  const body = (await res.json().catch(() => null)) as unknown;
  // The provider's shape varies by endpoint version; take any array of objects and keep only listing fields.
  const list = findArray(body);
  const pick = (o: Record<string, unknown>, keys: string[]) => keys.map((k) => o[k]).find((v) => v != null && v !== "") ?? null;
  return {
    listings: list.slice(0, 30).map((o) => ({
      title: String(pick(o, ["title", "name", "headline", "property_title"]) ?? "Listing"),
      price: Number(pick(o, ["price", "amount", "rent", "sale_price"])) || null,
      agency: (pick(o, ["agency_name", "agency", "company", "broker_company"]) as string) ?? null,
      agent: (pick(o, ["agent_name", "agent", "broker_name", "contact_name"]) as string) ?? null,
      url: (pick(o, ["url", "link", "share_url", "permalink"]) as string) ?? null,
      beds: (pick(o, ["bedrooms", "beds", "rooms"]) as string | number) ?? null,
    })),
  };
}

function findArray(v: unknown): Record<string, unknown>[] {
  if (Array.isArray(v)) return v.filter((x) => x && typeof x === "object") as Record<string, unknown>[];
  if (v && typeof v === "object") {
    for (const k of ["data", "results", "hits", "listings", "items", "properties"]) {
      const found = findArray((v as Record<string, unknown>)[k]);
      if (found.length) return found;
    }
  }
  return [];
}

/* ------------------------------------------------------------ brokers */

/** Registered brokers: business contacts from public listings, so shown as-is. */
export interface BrokerContact { phone: string | null; dial: string | null; company: string | null; brn: string | null }

/** DB Search's Agents tab: one card per person — a broker often holds several numbers across branches. */
export async function brokers(db: Db, q: string) {
  const text = clip(q, 120);
  if (text.length < 2) return [];
  const { data } = await db.rpc("agents_search", { q: text, lim: 50 });
  type Row = { agent_name: string; company: string | null; mobile_display: string | null; mobile_e164: string | null; nationality: string | null; brn: string | null; contact_count: number | null; contacts?: { mobile_display?: string | null; mobile_e164?: string | null; company?: string | null; brn?: string | null }[] | null };
  return ((data ?? []) as Row[]).map((a) => {
    const cts = a.contacts?.length ? a.contacts : [{ mobile_display: a.mobile_display, mobile_e164: a.mobile_e164, company: a.company, brn: a.brn }];
    return {
      name: a.agent_name, company: a.company, nationality: a.nationality, brn: a.brn, contactCount: Number(a.contact_count ?? cts.length),
      contacts: cts.map((c): BrokerContact => ({ phone: c.mobile_display ?? null, dial: String(c.mobile_e164 ?? "").replace(/\D/g, "") || null, company: c.company ?? null, brn: c.brn ?? null })),
    };
  });
}
