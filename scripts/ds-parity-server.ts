/**
 * Parity check: DB Search's db-api row rules vs the CRM's port (lib/dbsearch/rows.ts,
 * card.ts). Loads db-api's helper block (exactNameFirst … detectDataNotes) out of its
 * index.ts into a sandbox and runs both on the same rows. Read-only; no database.
 *
 *   npx tsx scripts/ds-parity-server.ts <path-to-DBproperties/supabase/functions/db-api/index.ts>
 */
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

import { collapsePeople, demotePlotLevelCodes, dropBarePropertylessRows, dropCodeMismatches, dropEmptyRows, dropEntities, dropSellers, exactNameFirst, type OwnerRow } from "../lib/dbsearch/rows";
import { canonicalPlace, detectDataNotes } from "../lib/dbsearch/card";

const src = readFileSync(process.argv[2], "utf8");
const start = src.indexOf("const nameKey = (s: any) =>");
const end = src.indexOf("const STOP_WORDS = new Set([");
if (start < 0 || end < 0) throw new Error("could not find db-api's row rules");
const js = ts.transpileModule(src.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
const box: Record<string, unknown> = { console };
vm.createContext(box);
vm.runInContext(`${js}\n;globalThis.__x={collapsePeople,demotePlotLevelCodes,dropBarePropertylessRows,dropCodeMismatches,dropEmptyRows,dropEntities,dropSellers,exactNameFirst,canonicalPlace,detectDataNotes};`, box);
type Fn = (...a: unknown[]) => unknown;
const o = box.__x as Record<string, Fn>;

const rd = (x: Record<string, unknown>) => x;
const rows: OwnerRow[] = [
  { id: 1, full_name: "KHALID RAHMAN", community_clean: "Dubai Marina", building: "Marina Gate 2", unit_clean: "1405", role: "Buyer", email: "", raw_data: rd({ "property number": "", idnumber: "784-1", size: "119.3" }) },
  { id: 2, full_name: "khalid rahman", community_clean: "Dubai Marina", building: null, unit_clean: "1405", role: "Buyer", email: "k@x.com", raw_data: rd({ idnumber: "784-1", "actual area sqm": "119.5" }) },
  { id: 3, full_name: "KHALID RAHMAN", community_clean: "Dubai Marina", building: "Marina Gate 1", unit_clean: "1405", role: "Buyer", raw_data: rd({ idnumber: "999" }) },
  { id: 4, full_name: "EMAAR PROPERTIES PJSC", community_clean: "Downtown Dubai", unit_clean: "3301", role: "Seller", raw_data: rd({}) },
  { id: 5, full_name: "JAMES WHITMORE", community_clean: "Dubai Marina", building: "Marina Gate 2", unit_clean: "1405", role: "Seller", raw_data: rd({ dmno: "392", dmsubno: "6789" }) },
  { id: 6, full_name: "A OWNER", community_clean: "Dubai Marina", building: "Marina Gate 2", unit_clean: "2203", raw_data: rd({ dmno: "392", dmsubno: "6789", "plot pre reg no": "DL-X1" }) },
  { id: 7, full_name: "B OWNER", community_clean: "Damac Lagoons", project_name: "DAMAC LAGOONS - MALTA", unit_clean: "DL-J116", raw_data: rd({ "plot pre reg no": "DL-J116", plot: "DL-J116" }) },
  { id: 8, full_name: "C OWNER", community_clean: "Arjan", project_name: "Arjan", building: "Burj Khalifa Views", unit_clean: "Jumeirah Village Circle Tower", raw_data: rd({ "master project land": "Palm Jumeirah", plot: "DL-Q1" }) },
  { id: 9, full_name: "null", community_clean: "Arjan", unit_clean: "", raw_data: rd({}) },
  { id: null, ou_key: "k1", full_name: "D OWNER", community_clean: "Consolidated Dubai Hills (2) 1234", building: "12", unit_clean: "", raw_data: rd({ phone_raw: ["0501"] }) },
  { id: 11, full_name: "D OWNER", community_clean: "Dubai Hills Estate", building: "Maple 1", unit_clean: "", email: "d@x.com", raw_data: rd({}) },
];

const queries = ["Marina Gate 2", "khalid rahman", "1405", "DL-J116", "J116", "392-6789", "Emaar Properties PJSC", "784198012345678"];
let diffs = 0;
const clone = () => structuredClone(rows);
const ids = (x: unknown) => JSON.stringify((x as OwnerRow[]).map((r) => [r.id ?? r.ou_key, r.alt_ids ?? [], r.building ?? null, r.email ?? null, r.merged_rows ?? null]));
const same = (label: string, a: unknown, b: unknown) => {
  const x = JSON.stringify(a), y = JSON.stringify(b);
  if (x !== y) { diffs++; console.log(`${label}\n  db-api: ${x}\n  CRM:    ${y}`); }
};

for (const q of queries) {
  same(`dropSellers "${q}"`, ids(o.dropSellers(clone(), q)), ids(dropSellers(clone(), q)));
  same(`dropEntities "${q}"`, ids(o.dropEntities(clone(), q)), ids(dropEntities(clone(), q)));
  same(`exactNameFirst "${q}"`, ids(o.exactNameFirst(clone(), q)), ids(exactNameFirst(clone(), q)));
  same(`dropCodeMismatches "${q}"`, ids(o.dropCodeMismatches(clone(), q)), ids(dropCodeMismatches(clone(), q)));
  const withCounts = () => clone().map((r, i) => ({ ...r, phone_count: i % 3 === 0 ? 1 : 0 }));
  same(`dropEmptyRows "${q}"`, ids(o.dropEmptyRows(withCounts(), false, q)), ids(dropEmptyRows(withCounts(), q)));
  same(`dropBarePropertylessRows "${q}"`, ids(o.dropBarePropertylessRows(clone(), q)), ids(dropBarePropertylessRows(clone(), q)));
}
same("collapsePeople", ids(o.collapsePeople(clone())), ids(collapsePeople(clone())));
{
  const a = o.demotePlotLevelCodes(clone()) as OwnerRow[], b = demotePlotLevelCodes(clone());
  same("demotePlotLevelCodes", a.map((r) => r.raw_data), b.map((r) => r.raw_data));
}
for (const r of rows) same(`detectDataNotes #${r.id}`, o.detectDataNotes(structuredClone(r)), detectDataNotes(structuredClone(r)));
for (const s of ["Consolidated Dubai Hills (2) 1234", "owners_unspecified_role", "DAMAC LAGOONS - MALTA", "dubai marina"]) same(`canonicalPlace "${s}"`, o.canonicalPlace(s), canonicalPlace(s));

console.log(diffs ? `\n${diffs} difference(s)` : `\nNo differences across ${rows.length} rows and ${queries.length} queries.`);
