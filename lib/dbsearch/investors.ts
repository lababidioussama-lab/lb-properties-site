import type { SupabaseClient } from "@supabase/supabase-js";

import { formatPhone, maskPhone, toInternational } from "./model";

/**
 * Investors: the "Dubai property investors" workbook (owners of 2 or more
 * properties), loaded into its own tables (inv_investors, inv_properties,
 * inv_holdings). Separate from DB Search's owner tables and from Portfolio;
 * everything here only reads them, through the lb_inv_* database functions.
 * Numbers leave the server masked; the full ones only through contacts(),
 * which the route records.
 */

type Db = SupabaseClient;
type Row = Record<string, unknown>;

const num = (v: unknown) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export interface InvQuery {
  q?: string; areas?: string[]; building?: string; nationalities?: string[];
  min_props?: number | null; max_props?: number | null; min_value?: number | null; max_value?: number | null;
  has_mobile?: boolean; has_email?: boolean; sort?: string; dir?: string; page?: number; size?: number;
}

/** Only known fields, trimmed and bounded, reach the database. */
export function cleanQuery(b: Row): InvQuery {
  return {
    q: text(b.q, 80),
    areas: (Array.isArray(b.areas) ? b.areas : []).slice(0, 12).map((a) => text(a, 80)).filter(Boolean),
    building: text(b.building, 80),
    nationalities: (Array.isArray(b.nationalities) ? b.nationalities : []).slice(0, 20).map((a) => text(a, 80)).filter(Boolean),
    min_props: num(b.min_props), max_props: num(b.max_props), min_value: num(b.min_value), max_value: num(b.max_value),
    has_mobile: b.has_mobile === true, has_email: b.has_email === true,
    sort: text(b.sort, 20), dir: b.dir === "asc" ? "asc" : "desc",
    page: Math.max(1, Math.min(2000, Number(b.page) || 1)), size: Math.max(10, Math.min(200, Number(b.size) || 50)),
  };
}

const masked = (raw: unknown) => (typeof raw === "string" && raw.replace(/\D/g, "").length >= 7 ? maskPhone(raw) : null);

export async function overview(db: Db) {
  const { data, error } = await db.rpc("lb_inv_overview");
  if (error) throw new Error(error.message);
  return data as Row;
}

export async function search(db: Db, q: InvQuery) {
  const { data, error } = await db.rpc("lb_inv_search", { p: q });
  if (error) throw new Error(error.message);
  const r = (data ?? {}) as Row & { rows?: Row[] };
  r.rows = (r.rows ?? []).map(({ mobile1, ...row }) => ({ ...row, mobile: masked(mobile1) }));
  return r;
}

export async function detail(db: Db, rank: number) {
  const { data, error } = await db.rpc("lb_inv_detail", { p_rank: rank });
  if (error) throw new Error(error.message);
  if (!data) return null;
  const d = data as { investor: Row };
  const { mobile1, ...inv } = d.investor;
  return { ...d, investor: { ...inv, mobile: masked(mobile1) } };
}

/** The full numbers and email of one investor, with any do-not-contact number held back. */
export async function contacts(db: Db, rank: number) {
  const { data, error } = await db.rpc("lb_inv_contacts", { p_rank: rank });
  if (error) throw new Error(error.message);
  if (!data) return null;
  const c = data as { name: string; mobiles: string[] | null; email: string | null };
  const list = (c.mobiles ?? []).filter((m) => m.replace(/\D/g, "").length >= 7);
  const { data: out } = list.length
    ? await db.from("wa_consent").select("phone").in("phone", list.map(toInternational)).not("opted_out_at", "is", null)
    : { data: [] as { phone: string }[] };
  const blocked = new Set((out ?? []).map((x) => String(x.phone)));
  return {
    name: c.name,
    email: c.email,
    mobiles: list.map((m) => blocked.has(toInternational(m))
      ? { value: maskPhone(m), dial: null, dnc: true }
      : { value: formatPhone(m), dial: toInternational(m), dnc: false }),
  };
}

/** The filtered list as CSV for Excel, without contact details (those stay one reveal at a time). */
export async function exportCsv(db: Db, q: InvQuery): Promise<{ csv: string; rows: number }> {
  const head = ["Rank", "Investor", "Properties owned", "Portfolio size", "Communities", "Main community", "Units in selected areas", "Total value (AED)", "Purchase price on file (AED)", "Average purchase price (AED)", "Nationality"];
  const out: string[] = [head.join(",")];
  let rows = 0;
  for (let page = 1; page <= 25 && rows < 5000; page++) {
    const r = await search(db, { ...q, page, size: 200 });
    const list = (r.rows ?? []) as Row[];
    for (const x of list) {
      const cells = [x.rank, x.name, x.properties, x.size_band, x.communities, x.main_community, x.units_here ?? "", x.total_value ?? "", x.priced_total ?? "", x.avg_price ?? "", x.nationality];
      out.push(cells.map((c) => { const s = String(c ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }).join(","));
      rows++;
    }
    if (list.length < 200) break;
  }
  return { csv: "﻿" + out.join("\r\n"), rows };
}
