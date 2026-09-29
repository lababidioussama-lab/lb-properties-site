/**
 * Read-only check of DB Search in the CRM against the real database.
 * Prints counts and shares only — never a name, phone, email or ID.
 * Nothing here writes: it calls the same read functions the CRM API uses.
 *
 *   npx tsx scripts/ds-realdata-check.ts <path-to-.env.local>
 */
import { readFileSync } from "node:fs";

const envFile = process.argv[2];
for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
  const m = /^\s*([A-Z_]+)\s*=\s*(.*)\s*$/.exec(line);
  if (m && ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"].includes(m[1])) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
process.env.SESSION_SECRET ||= "local-check-only-".padEnd(40, "x");

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

async function main() {
  const { getSupabaseAdmin } = await import("../lib/supabase");
  const { searchOwners, ownerDetail, unitLookup } = await import("../lib/dbsearch/search");
  const { readRef } = await import("../lib/dbsearch/guard");
  const tools = await import("../lib/dbsearch/tools");
  const db = getSupabaseAdmin();
  if (!db) throw new Error("no database config");
  const viewer = { id: "00000000-0000-0000-0000-000000000000" };

  for (const q of ["Marina Gate 2", "BL474", "Malta", "HUSSAIN DAWOOD", "0501234567"]) {
    const t = Date.now();
    const r = await searchOwners(db, viewer, q);
    const by = (s: string) => r.hits.filter((h) => h.status === s).length;
    const withPhone = r.hits.filter((h) => h.phones.length).length;
    const withUnit = r.hits.filter((h) => h.property.unit).length;
    const masked = r.hits.every((h) => h.phones.every((p) => p.masked.includes("•")));
    console.log(`search "${q.replace(/\d{4,}/g, "…")}": ${r.total} matched, ${r.hits.length} returned in ${Date.now() - t} ms | confirmed ${by("confirmed")}, likely ${by("likely")}, previous ${by("previous")}, bought ${by("bought")}, sold ${by("sold")}, unknown ${by("unknown")} | with phone ${pct(withPhone, r.hits.length)}, with unit ${pct(withUnit, r.hits.length)}, in CRM ${r.hits.filter((h) => h.inCrm).length} | all numbers masked: ${masked}`);
    if (q === "Marina Gate 2" && r.hits[0]) {
      const ids = readRef(r.hits[0].ref, viewer.id)!;
      const o = await ownerDetail(db, viewer, ids);
      console.log(`  owner card: ${o?.properties.length} properties linked by phone, ${o?.phones.length} numbers (masked: ${o?.phones.every((p) => p.masked.includes("•"))})`);
    }
  }

  const u = await unitLookup(db, viewer, "1405");
  console.log(`unit 1405: exists in ${u.places.length} places (the CRM asks which one)`);
  if (u.places.length) {
    const u2 = await unitLookup(db, viewer, "1405", u.places[0]);
    console.log(`  one place: ${u2.events.length} events, current owner ${u2.current ? u2.current.confidence : "none"}`);
  }

  const m = await tools.marketOverview(db, "Marina", 12) as { data?: { deals: number; monthly: unknown[] } };
  console.log(`market "Marina" 12m: ${m.data?.deals} sales, ${m.data?.monthly.length} months`);
  const v = await tools.valuation(db, "community", "Dubai Marina", 1200, 2022, false) as { data?: { error?: string; comps?: { total: number }; confidence?: { score: string } } };
  console.log(`valuation Dubai Marina 1,200 sq ft: ${v.data?.error ?? `${v.data?.comps?.total} comps, confidence ${v.data?.confidence?.score}`}`);
  const rn = await tools.rentals(db, "Marsa Dubai", "") as { data?: { totals?: { contracts: number } } };
  console.log(`rents Marsa Dubai: ${rn.data?.totals?.contracts} contracts`);
  const p = await tools.portfolioOwners(db, 10);
  console.log(`portfolio owners with 10+ units: ${p.length}`);
  const a = await tools.areaOwners(db, viewer, "Marina Gate 2");
  console.log(`area "Marina Gate 2": ${a.total} owners with a number, ${a.hits.filter((h) => h.optedOut).length} opted out, all masked: ${a.hits.every((h) => h.phones.every((x) => x.masked.includes("•")))}`);
  const b = await tools.brokers(db, "Betterhomes");
  console.log(`brokers "Betterhomes": ${b.length}`);
}

main().catch((e) => { console.error("check failed:", e instanceof Error ? e.message : e); process.exit(1); });
