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
  const { ownerDetail, unitLookup } = await import("../lib/dbsearch/search");
  const { searchFull, phoneList, communityList } = await import("../lib/dbsearch/results");
  const { readRef } = await import("../lib/dbsearch/guard");
  const tools = await import("../lib/dbsearch/tools");
  const db = getSupabaseAdmin();
  if (!db) throw new Error("no database config");
  const viewer = { id: "00000000-0000-0000-0000-000000000000" };

  // The browser payload must never carry a phone-like run of digits or an unmasked email.
  const leaks = (payload: unknown) => {
    const text = JSON.stringify(payload);
    return { digits: (text.match(/\d{9,}/g) ?? []).length, emails: (text.match(/[^\s"@•]{2,}@[a-z0-9-]+\.[a-z]{2,}/gi) ?? []).length };
  };

  for (const q of ["Marina Gate 2", "BL474", "Malta", "HUSSAIN DAWOOD", "DL-J116"]) {
    const t = Date.now();
    const r = await searchFull(db, viewer, q);
    const notes = r.strict.notes.map((n) => `${n.kind}:${n.n}`).join(" ") || "none";
    const withPhone = r.cards.filter((c) => c.phoneCount > 0).length;
    console.log(`search "${q}": ${r.strict.entries.length} shown (${r.loose.entries.length} with "show anyway"), ${r.cards.length} cards, ${r.communities.length} chips, ${r.hiddenEmpty} empty hidden, ${r.damac.length} Lagoons sales | notes ${notes} | with phone ${pct(withPhone, r.cards.length)} | ${Date.now() - t} ms | leaks ${JSON.stringify(leaks(r))}`);
    if (q === "Marina Gate 2" && r.cards[0]) {
      const ids = readRef(r.cards[0].ref, viewer.id)!;
      const o = await ownerDetail(db, viewer, ids);
      console.log(`  owner panel: ${o?.properties.length ?? 0} properties linked by phone`);
      const c = await communityList(db, viewer, r.communities[0]?.community ?? "Marina Gate");
      console.log(`  chip "${r.communities[0]?.community}": ${c.strict.entries.length} shown, ${c.hiddenEmpty} empty hidden, leaks ${JSON.stringify(leaks(c))}`);
    }
  }
  const ph = await phoneList(db, viewer, "0501234567");
  console.log(`phone lookup: ${ph.strict.entries.length} records, broker ${ph.agent ? "yes" : "no"}, leaks ${JSON.stringify(leaks({ cards: ph.cards }))}`);

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
