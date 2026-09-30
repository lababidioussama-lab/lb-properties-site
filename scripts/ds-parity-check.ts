/**
 * Parity check: DB Search's own page code vs the CRM's port (lib/dbsearch/card.ts).
 *
 * Loads the card, filter and phone functions straight out of DB Search's
 * index.html into a sandbox, runs both on the same rows, and prints any
 * difference. Read-only; no database.
 *
 *   npx tsx scripts/ds-parity-check.ts <path-to-DBproperties/public/index.html>
 */
import { readFileSync } from "node:fs";
import vm from "node:vm";

import { ccModel, explodeProperties, gatherPhones, rowMatches, hasPropertyDetails } from "../lib/dbsearch/card";
import type { OwnerRow } from "../lib/dbsearch/rows";

const html = readFileSync(process.argv[2], "utf8");
const start = html.indexOf("function esc(t){");
const end = html.indexOf("// ===== Live \"already sold\" flags");
if (start < 0 || end < 0) throw new Error("could not find DB Search's card code");
const sandbox: Record<string, unknown> = { document: { addEventListener() {}, getElementById() { return null; } }, window: {}, console };
vm.createContext(sandbox);
vm.runInContext(html.slice(start, end) + "\n;globalThis.__x={ccModel,rowMatches,gatherPhones,explodeProperties};", sandbox);
const orig = sandbox.__x as { ccModel: (o: unknown) => Record<string, unknown>; rowMatches: (o: unknown, q: string) => boolean; gatherPhones: (o: unknown) => string[]; explodeProperties: (o: unknown) => unknown[] };

const rows: OwnerRow[] = [
  { id: 1, full_name: "KHALID RAHMAN", community_clean: "Dubai Marina", building: "Marina Gate 2", unit_clean: "1405", unit: "1405", role: "Buyer", email: "k.rahman@example.com",
    raw_data: { "ProcedurePartyTypeNameEn": "Buyer", "procedurevalue": "2100000", "instancedate": "2019-03-14", "actual area": "119.3", "roomsdescriptionen": "2 B/R", "propertytypeen": "Flat", "countrynameen": "BRITISH", "dmno": "392", "dmsubno": "6789", "mobile": "0501234567", "idnumber": "784198012345678", floor: "14" } },
  { id: 2, full_name: "ELENA PETROVA", community_clean: "Dubai Marina", building: "Dubai Marina", unit_clean: "2203", role: "Seller",
    raw_data: { "bua": "1318", "procedurenameen": "Sell", "procedurevalue": "2,360,000", "regis": "44895", "nationality": "Russian Federation", "email": "000@000.com", "p number": "1.2E+11", "phone": "971|0000000000" } },
  { id: 3, full_name: "RASHID AL SUWAIDI", community_clean: "Damac Lagoons", project_name: "DAMAC LAGOONS", unit_clean: "DL-J116", role: "Owner (Unspecified)",
    raw_data: { "plot pre reg no": "DL-J116", "villa number": "J116", "plot area": "2952", "built up": "2952", "nationality": "UAE", "plot code": "676-5407", "mobile no": "0551234567", "whatsapp": "+971 55 123 4567" } },
  { id: 4, full_name: "PRIYA SHARMA", community_clean: "Business Bay", building: "Executive Towers", unit_clean: "B-1203", unit: "1203",
    raw_data: { "unitnumber": "1203.0", "unit": "1204", "size sqm": "88", "transactiondate": "13/02/2021", "procedurepartytypenameen": "Seller", "role": "Buyer", "nationality": "12345678", "registration": "XP1208B", "_shared_codes": [{ value: "BB.A01.001", kind: "plot_number", key: "plot number", n_units: 76, level: "building" }] } },
  { id: 5, full_name: "CHEN WEI", community_clean: "Jumeirah Village Circle", unit_clean: null,
    raw_data: { "project": "JVC", "contact": "00861391234567", "passport": "E12345678" } },
  { id: 6, full_name: "SAMPLE MULTI OWNER", community_clean: "Arjan", building: "Society House", unit_clean: "718", alt_ids: [61, 62], merged_rows: 3,
    raw_data: { properties: [
      { project: "Damac Hills 2", community: "Damac Hills 2", "plot / unit": "217", "size sqm": "150", "price aed": "900000", date: "2020-01-01", type: "Villa", role: "Buyer", reg_no: "DH2-XH217B", land_number: "6457" },
      { project: "Arjan", community: "Arjan", "plot / unit": "718", "size sqm": "70", "price aed": "650000", date: "2021-05-05", type: "Flat", role: "Buyer", reg_no: null, land_number: null, building: "Society House" },
    ], "p-number": "P123", "dmno": "676", "dmsubno": "5407", "municipality number": "6765407", "procedurenameen": "Mortgage Registration", "procedurevalue": "400000", "procedurepartytypenameen": "Mortgagee" } },
  { id: 7, full_name: "MARINA GATE 2", community_clean: "Dubai Marina", building: "Marina Gate 2", unit_clean: "4501",
    raw_data: { "size": "3380", "propertytypeen": "Penthouse", "procedurenameen": "Ownership Transfer" } },
  { id: 8, full_name: "YASAMAN ZEINAL AZIZIAN", community_clean: "Palm Jumeirah", unit_clean: "A-12",
    raw_data: { "buyer name": "KIMIYA HASSAN NAJAFI", "name": "YASAMAN ZEINAL AZIZIAN", "parking": "B1-20", "view": "Sea", "completion status": "Completed", "land": "825-0", "landsubnumber": "3" } },
];

const queries = ["Marina Gate 2", "1405", "DL-J116", "J116", "0501234567", "khalid rahman", "XP1208B", "6765407", "676-5407", "zeinal", "Society House", "b1203"];

let diffs = 0;
const norm = (m: Record<string, unknown>): Record<string, unknown> => { const { F, filled, name, email, ...rest } = m; void F; void filled; return { name, email, ...rest }; };
const show = (x: unknown) => JSON.stringify(x);

for (const r of rows) {
  const a = norm(orig.ccModel(structuredClone(r)));
  const mine = ccModel(structuredClone(r)) as unknown as Record<string, unknown>;
  const b: Record<string, unknown> = { name: mine.name, email: mine.email, ...Object.fromEntries(Object.entries(mine).filter(([k]) => k !== "name" && k !== "email")) };
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (show(a[k]) !== show(b[k])) { diffs++; console.log(`ccModel #${r.id} .${k}\n  DB Search: ${show(a[k])}\n  CRM:       ${show(b[k])}`); }
  }
  const ga = orig.gatherPhones(structuredClone(r)), gb = gatherPhones(structuredClone(r));
  if (show(ga) !== show(gb)) { diffs++; console.log(`gatherPhones #${r.id}: ${show(ga)} vs ${show(gb)}`); }
  for (const q of queries) {
    const x = orig.rowMatches(structuredClone(r), q), y = rowMatches(structuredClone(r), q);
    if (x !== y) { diffs++; console.log(`rowMatches #${r.id} "${q}": DB Search ${x}, CRM ${y}`); }
  }
  const ea = orig.explodeProperties(structuredClone(r)).map((o) => norm(orig.ccModel(o)));
  const eb = explodeProperties(structuredClone(r)).map((o) => ccModel(o) as unknown as Record<string, unknown>);
  if (ea.length !== eb.length) { diffs++; console.log(`explode #${r.id}: ${ea.length} vs ${eb.length} cards`); }
  else ea.forEach((m, i) => {
    for (const k of ["badge", "lines", "size", "tx", "building", "community", "gaps"]) {
      if (show(m[k]) !== show((eb[i] as Record<string, unknown>)[k])) { diffs++; console.log(`explode #${r.id}[${i}] .${k}\n  DB Search: ${show(m[k])}\n  CRM:       ${show((eb[i] as Record<string, unknown>)[k])}`); }
    }
  });
  void hasPropertyDetails;
}
console.log(diffs ? `\n${diffs} difference(s)` : `\nNo differences across ${rows.length} rows, ${queries.length} queries.`);
