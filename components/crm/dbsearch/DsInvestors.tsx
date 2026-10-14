"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Bookmark, Building2, Download, Eye, Globe, Info, MapPin, Phone, Plus, Search, Sparkles, X } from "lucide-react";

import { ds, dsError } from "./api";
import { DS_INPUT } from "./ui";

/**
 * Investors: the "Dubai property investors" workbook as a search engine.
 * Ask in plain words ("investors in Palm Jumeirah with 10+ properties worth
 * over 100M"); the engine shows what it understood as conditions in words,
 * each one editable, then ranks the investors. Separate from Portfolio and
 * from DB Search's owner tables; admin only. Numbers stay masked until
 * Reveal, which is recorded.
 */

const GOLD = "#C9A55C";

/* ------------------------------------------------------------------ types */

interface Area { name: string; investors: number; units: number; value: number }
interface Overview {
  investors: number; properties: number; priced_total: number; total_value: number; club50: number;
  areas: Area[]; nationalities: { name: string; investors: number }[];
}
interface Filters {
  q: string; areas: string[]; building: string; nationalities: string[];
  min_props: number | null; max_props: number | null; min_value: number | null; max_value: number | null;
  has_mobile: boolean; has_email: boolean; sort: string; dir: "asc" | "desc";
}
interface InvRow {
  pos: number; rank: number; name: string; properties: number; size_band: string; communities: number; main_community: string | null;
  total_value: number | null; priced_total: number | null; avg_price: number | null; nationality: string | null;
  units_here: number | null; value_here: number | null; coowned: number | null; mobile: string | null; has_email: boolean;
  mix: { c: string; u: number }[] | null;
}
interface Result { total: number; sum_properties: number; sum_value: number; sum_units_here: number; sum_value_here: number; sort: string; dir: string; page: number; size: number; rows: InvRow[] }

const EMPTY: Filters = { q: "", areas: [], building: "", nationalities: [], min_props: null, max_props: null, min_value: null, max_value: null, has_mobile: false, has_email: false, sort: "", dir: "desc" };

/* ---------------------------------------------------------------- format */

const n0 = (v: number | null | undefined) => (v == null ? "-" : Math.round(v).toLocaleString("en-US"));
function short(v: number | null | undefined) {
  if (v == null) return "-";
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(a >= 1e10 ? 1 : 2)}B`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(a >= 1e8 ? 0 : 1)}M`;
  if (a >= 1e3) return `${Math.round(v / 1e3)}K`;
  return String(Math.round(v));
}
const words = (v: number) => (v >= 1e9 ? `${+(v / 1e9).toFixed(2)} billion` : v >= 1e6 ? `${+(v / 1e6).toFixed(1)} million` : n0(v));
const initials = (name: string) => { const p = name.trim().split(/\s+/); return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase() || "?"; };

/* -------------------------------------------------------- the plain words */

/* Spellings people type for the areas the workbook uses. */
const AREA_ALIASES: Record<string, string> = {
  jvc: "Jumeirah Village Circle", jvt: "Jumeirah Village Triangle", jlt: "JLT", "jumeirah lake towers": "JLT", jbr: "JBR",
  downtown: "Downtown Dubai", marina: "Dubai Marina", palm: "Palm Jumeirah", "the palm": "Palm Jumeirah", "dubai hills": "Dubai Hills Estate",
  "creek harbour": "Dubai Creek Harbour", "mbr city": "Meydan & MBR City", meydan: "Meydan & MBR City", tecom: "Barsha Heights (Tecom)",
  "barsha heights": "Barsha Heights (Tecom)", "silicon oasis": "Dubai Silicon Oasis", dso: "Dubai Silicon Oasis", "sports city": "Dubai Sports City",
  "lagoons": "DAMAC Lagoons", "damac hills 2": "DAMAC Hills 2", "akoya": "DAMAC Hills 2", ranches: "Arabian Ranches", "emaar beachfront": "Emaar Beachfront",
  "city walk": "City Walk", difc: "DIFC", "the springs": "Emirates Living", "the meadows": "Emirates Living", "the lakes": "Emirates Living",
};
/* The workbook writes some nationalities several ways; one choice covers them all. */
const NAT_GROUPS: Record<string, string[]> = {
  India: ["India", "Indian"], "United Arab Emirates": ["United Arab Emirates", "UAE National", "Emirati", "UAE"], "Saudi Arabia": ["Saudia", "Saudi Arabia", "Saudi"],
  "United States": ["United States of America", "USA"], China: ["Peoples Republic of China (China)", "China", "Chinese"], Israel: ["ISRAEL", "Israel"],
  "United Kingdom": ["United Kingdom", "British", "UK"], Russia: ["Russia", "Russian Federation", "Russian"],
};
const DEMONYMS: Record<string, string> = {
  indian: "India", emirati: "United Arab Emirates", uae: "United Arab Emirates", russian: "Russia", british: "United Kingdom", english: "United Kingdom",
  pakistani: "Pakistan", saudi: "Saudi Arabia", iranian: "Iran", egyptian: "Egypt", french: "France", canadian: "Canada", jordanian: "Jordan",
  lebanese: "Lebanon", american: "United States", syrian: "Syria", german: "Germany", chinese: "China", iraqi: "Iraq", italian: "Italy", turkish: "Turkey",
  ukrainian: "Ukraine", dutch: "Netherlands", sudanese: "Sudan", nigerian: "Nigeria", kazakh: "Kazakhstan", australian: "Australia", romanian: "Romania",
  kuwaiti: "Kuwait", "south african": "South Africa", algerian: "Algeria", yemeni: "Yemen", spanish: "Spain", belgian: "Belgium", bangladeshi: "Bangladesh",
};
function natValues(label: string, list: { name: string }[]) {
  const group = NAT_GROUPS[label];
  const known = new Set(list.map((n) => n.name));
  const out = (group ?? [label]).filter((v) => known.has(v));
  return out.length ? out : [label];
}

function money(numText: string, unit: string | undefined) {
  const n = parseFloat(numText.replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const u = (unit ?? "").toLowerCase();
  return n * (u.startsWith("b") ? 1e9 : u.startsWith("m") ? 1e6 : u.startsWith("k") ? 1e3 : n < 10000 ? 1e6 : 1);
}

/** Plain words → conditions. Only what it is sure of; the rest is a name search. */
function understand(text: string, ov: Overview | null): Partial<Filters> & { size?: number } {
  let s = ` ${text.toLowerCase().replace(/[’']/g, "")} `;
  const f: Partial<Filters> & { size?: number } = {};
  const areas = new Set<string>();
  const names = [...(ov?.areas ?? []).map((a) => [a.name.toLowerCase(), a.name] as const), ...Object.entries(AREA_ALIASES)]
    .sort((a, b) => b[0].length - a[0].length);
  for (const [k, v] of names) if (s.includes(` ${k} `) || s.includes(` ${k},`) || s.includes(` ${k}.`)) { areas.add(v); s = s.replace(k, " "); }
  if (areas.size) f.areas = [...areas];

  let m = s.match(/between\s+(\d+)\s+and\s+(\d+)\s*(?:properties|units|props|homes|flats)/);
  if (m) { f.min_props = +m[1]; f.max_props = +m[2]; s = s.replace(m[0], " "); }
  m = s.match(/(?:more than|over|above)\s+(\d+)\s*(?:properties|units|props|homes|flats)/);
  if (m) { f.min_props = +m[1] + 1; s = s.replace(m[0], " "); }
  m = s.match(/(?:at least\s+)?(\d+)\s*(?:\+|or more)?\s*(?:properties|units|props|homes|flats|property|unit)/);
  if (m) { f.min_props = +m[1]; s = s.replace(m[0], " "); }

  m = s.match(/(?:under|below|less than|up to)\s*(?:aed\s*)?([\d.,]+)\s*(billion|bn|b|million|mn|m|k)?\b/);
  if (m) { f.max_value = money(m[1], m[2]); s = s.replace(m[0], " "); }
  m = s.match(/(?:worth(?: over| more than)?|over|above|more than|at least|valued? (?:over|at))\s*(?:aed\s*)?([\d.,]+)\s*(billion|bn|b|million|mn|m|k)?\b/);
  if (m) { f.min_value = money(m[1], m[2]); s = s.replace(m[0], " "); }

  const nats = new Set<string>();
  for (const [k, v] of Object.entries(DEMONYMS)) if (s.includes(` ${k} `) || s.includes(` ${k}s `)) { nats.add(v); s = s.replace(k, " "); }
  for (const n of ov?.nationalities ?? []) { const k = n.name.toLowerCase(); if (k.length > 3 && s.includes(` ${k} `)) { nats.add(n.name); s = s.replace(k, " "); } }
  if (nats.size) f.nationalities = [...nats];

  if (/\bwith (?:a )?(?:mobile|phone|number)s?\b|\bhas (?:a )?mobile\b/.test(s)) f.has_mobile = true;
  if (/\bwith (?:an? )?e-?mail\b|\bhas (?:an? )?e-?mail\b/.test(s)) f.has_email = true;
  m = s.match(/\b(?:building|tower)\s+([a-z0-9][a-z0-9 &'-]{2,40}?)(?=\s+(?:with|worth|over|in|and|who)\b|\s*$)/);
  if (m) { f.building = m[1].trim(); s = s.replace(m[0], " "); }
  m = s.match(/\btop\s+(\d{1,3})\b/);
  if (m) f.size = Math.min(200, Math.max(10, +m[1]));
  if (/who owns (?:the )?most|biggest holders|largest holders/.test(s) && f.areas) f.sort = "area_units";
  else if (/most properties|most units|by (?:units|properties)/.test(s)) f.sort = "units";

  const leftover = s.replace(/\b(investors?|owners?|people|show|me|find|list|top|\d+|in|at|with|who|own|owns|the|and|of|a|an|worth|over|properties|units|mobile|phone|email|most|by|value|aed|from|all|portfolio|holders?|biggest|largest|whose|have|has)\b/g, " ").replace(/[^a-z ]/g, " ").trim();
  const nothingElse = !f.areas && !f.min_props && !f.max_props && !f.min_value && !f.max_value && !f.nationalities && !f.building;
  if (nothingElse && leftover.length >= 3) f.q = text.trim();
  return f;
}

/* ------------------------------------------------------------- the engine */

export function DsInvestors({ onExpired, onSearchName }: { onExpired: () => void; onSearchName: (name: string) => void }) {
  const [ov, setOv] = useState<Overview | null>(null);
  const [text, setText] = useState("");
  const [f, setF] = useState<Filters>(EMPTY);
  const [size, setSize] = useState(50);
  const [page, setPage] = useState(1);
  const [res, setRes] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ name: string; f: Filters }[]>([]);
  const seq = useRef(0);

  useEffect(() => {
    void ds<{ overview: Overview }>("POST", "investors", { op: "overview" }).then((r) => {
      if (r.ok) setOv(r.overview);
      else if (r.error === "ds_signin_required") onExpired();
      else setError(dsError(r.error));
    });
    try { setSaved(JSON.parse(localStorage.getItem("lb.investors.saved") ?? "[]")); } catch { /* storage off */ }
  }, [onExpired]);

  const run = useCallback(async (next: Filters, p = 1, sz = size) => {
    const my = ++seq.current;
    setBusy(true); setError(null);
    const r = await ds<{ result: Result }>("POST", "investors", { op: "search", ...next, page: p, size: sz });
    if (my !== seq.current) return;
    setBusy(false);
    if (r.ok) { setRes(r.result); setPage(p); }
    else if (r.error === "ds_signin_required") onExpired();
    else setError(dsError(r.error));
  }, [onExpired, size]);

  useEffect(() => { if (ov) void run(EMPTY); }, [ov]); // eslint-disable-line react-hooks/exhaustive-deps

  const apply = (next: Filters, sz = size) => { setF(next); setSize(sz); void run(next, 1, sz); };

  function ask(e?: FormEvent, value = text) {
    e?.preventDefault();
    const u = understand(value, ov);
    const { size: sz, ...rest } = u;
    apply({ ...EMPTY, ...rest, sort: rest.sort ?? "", dir: "desc" }, sz ?? 50);
  }

  function sortBy(key: string) {
    const same = (res?.sort ?? f.sort) === key;
    apply({ ...f, sort: key, dir: same && f.dir === "desc" ? "asc" : "desc" });
  }

  async function exportCsv() {
    const r = await fetch("/api/ds/investors", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ op: "export", ...f }) });
    if (!r.ok) { setError("The export could not be made."); return; }
    const url = URL.createObjectURL(await r.blob());
    const a = document.createElement("a"); a.href = url; a.download = "investors.csv"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function save() {
    const name = window.prompt("Name this search", conditions(f, ov).map((c) => c.label).join(", ").slice(0, 40) || "My search");
    if (!name) return;
    const next = [...saved.filter((s) => s.name !== name), { name, f }].slice(-12);
    setSaved(next);
    try { localStorage.setItem("lb.investors.saved", JSON.stringify(next)); } catch { /* storage off */ }
  }
  function unsave(name: string) {
    const next = saved.filter((s) => s.name !== name);
    setSaved(next);
    try { localStorage.setItem("lb.investors.saved", JSON.stringify(next)); } catch { /* storage off */ }
  }

  const conds = conditions(f, ov);
  const areaInfo = useMemo(() => (ov?.areas ?? []).filter((a) => f.areas.includes(a.name)), [ov, f.areas]);
  const sort = res?.sort ?? "value";
  const top = res?.rows[0];
  const maxProps = Math.max(1, ...(res?.rows ?? []).map((r) => r.properties));
  const pages = res ? Math.max(1, Math.ceil(res.total / res.size)) : 1;

  return (
    <div className="space-y-4">
      {/* The question */}
      <section className="panel overflow-hidden !p-0">
        <div className="border-b border-[var(--hairline)] px-4 pb-4 pt-4 sm:px-5">
          <p className="ds-label flex items-center gap-1.5" style={{ color: GOLD }}><Sparkles size={12} /> Investor engine</p>
          <h2 className="display mt-1 text-[22px] leading-tight text-[var(--text-primary)]">Dubai property investors</h2>
          <form onSubmit={ask} className="mt-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search size={15} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Investors in Palm Jumeirah with 10+ properties worth over 100M"
                className={`${DS_INPUT} !ps-10`} aria-label="Ask the investor engine" />
            </div>
            <button className="h-11 rounded-[10px] px-6 text-[13.5px] font-semibold" style={{ background: GOLD, color: "#2B1E05" }}>Search</button>
          </form>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {["Top 20 in Business Bay", "Russian investors with 5+ units in JVC", "Worth over 1B", "Who owns most in Dubai Hills", "Indian investors in Downtown with a mobile"].map((x) => (
              <button key={x} onClick={() => { setText(x); ask(undefined, x); }}
                className="rounded-full border border-[var(--hairline)] px-3 py-1 text-[12px] text-[var(--text-muted)] transition-colors hover:border-[var(--accent-dim)] hover:text-[var(--text-primary)]">{x}</button>
            ))}
          </div>
        </div>

        {/* What it understood, in words, each one editable */}
        <div className="px-4 py-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="me-1 text-[12px] text-[var(--text-muted)]">{conds.length ? "Showing" : "Showing every investor"}</span>
            {conds.map((c) => (
              <span key={c.key} className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[12.5px] font-semibold"
                style={{ borderColor: `${GOLD}99`, background: `${GOLD}1A`, color: "var(--text-primary)" }}>
                <button onClick={() => setAdding(c.key)} className="hover:underline">{c.label}</button>
                <button onClick={() => apply(c.remove(f))} aria-label={`Remove ${c.label}`} className="ms-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={12} /></button>
              </span>
            ))}
            <AddMenu onPick={setAdding} />
            {conds.length > 0 && <button onClick={() => { setText(""); apply(EMPTY, 50); }} className="ms-auto text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">Clear all</button>}
          </div>
          {adding && ov && <Editor kind={adding} f={f} ov={ov} onClose={() => setAdding(null)} onApply={(next) => { setAdding(null); apply(next); }} />}
        </div>
      </section>

      {error && <p role="alert" className="rounded-[10px] border border-[var(--bad-bd)] bg-[var(--bad-bg)] px-3 py-2 text-[13px] text-[var(--bad)]">{error}</p>}

      {/* The figures */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {areaInfo.length ? (
          <>
            <Kpi label={areaInfo.length === 1 ? `Investors in ${areaInfo[0].name}` : "Investors in these areas"} value={n0(areaInfo.reduce((t, a) => t + a.investors, 0))} />
            <Kpi label="Properties they hold there" value={n0(areaInfo.reduce((t, a) => t + a.units, 0))} />
            <Kpi label="Value held there (AED)" value={short(areaInfo.reduce((t, a) => t + a.value, 0))} hint="Purchase prices on file plus estimates" />
            <Kpi label="Match your search" value={res ? n0(res.total) : "…"} gold />
          </>
        ) : (
          <>
            <Kpi label={conds.length ? "Investors matching" : "Investors"} value={res ? n0(res.total) : ov ? n0(ov.investors) : "…"} gold={conds.length > 0} />
            <Kpi label="Properties they hold" value={res ? n0(res.sum_properties) : "…"} />
            <Kpi label="Total value (AED)" value={res ? short(res.sum_value) : "…"} hint="Purchase prices on file plus estimates. Not net worth." />
            <Kpi label="50+ property club" value={ov ? n0(ov.club50) : "…"} />
          </>
        )}
      </div>

      {/* Saved searches */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="me-1 flex items-center gap-1 text-[12px] text-[var(--text-muted)]"><Bookmark size={12} /> Saved</span>
        {saved.map((s) => (
          <span key={s.name} className="inline-flex items-center gap-1 rounded-full border border-[var(--hairline)] bg-[var(--surface-hover)] px-3 py-1 text-[12px] font-semibold">
            <button onClick={() => apply(s.f)} className="hover:text-[var(--accent)]">{s.name}</button>
            <button onClick={() => unsave(s.name)} aria-label={`Delete saved search ${s.name}`} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={11} /></button>
          </span>
        ))}
        <button onClick={save} className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--hairline-strong)] px-3 py-1 text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"><Plus size={11} /> Save this search</button>
        <button onClick={() => void exportCsv()} className="ms-auto inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline)] px-3 py-1 text-[12px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"><Download size={12} /> Export to Excel</button>
      </div>

      {/* The ranking */}
      <section className="panel overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-[13px]">
            <thead>
              <tr className="text-left text-[11.5px] text-[var(--text-muted)]" style={{ borderBottom: `1px solid ${GOLD}` }}>
                <th className="w-12 px-3 py-2.5 font-semibold">#</th>
                <Th label="Investor" k="name" sort={sort} dir={f.dir} onSort={sortBy} />
                {f.areas.length > 0 && <Th label="Units here" k="area_units" sort={sort} dir={f.dir} onSort={sortBy} right />}
                <Th label="Properties" k="units" sort={sort} dir={f.dir} onSort={sortBy} />
                <th className="px-3 py-2.5 font-semibold">Where they hold</th>
                <Th label="Total value (AED)" k="value" sort={sort} dir={f.dir} onSort={sortBy} right />
                <th className="px-3 py-2.5 font-semibold">Mobile</th>
              </tr>
            </thead>
            <tbody className={busy ? "opacity-50 transition-opacity" : ""}>
              {res?.rows.map((r) => (
                <tr key={r.rank} onClick={() => setOpen(r.rank)} className="cursor-pointer border-t border-[var(--hairline)] transition-colors hover:bg-[var(--surface-hover)]">
                  <td className="px-3 py-2.5"><Medal pos={r.pos} /></td>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-[var(--text-primary)]">{r.name}</div>
                    <div className="text-[11.5px] text-[var(--text-muted)]">{[r.nationality, `${r.communities} ${r.communities === 1 ? "area" : "areas"}`, `rank ${n0(r.rank)}`].filter(Boolean).join(" · ")}</div>
                  </td>
                  {f.areas.length > 0 && (
                    <td className="px-3 py-2.5 text-right">
                      <div className="figure font-semibold">{n0(r.units_here)}</div>
                      <div className="text-[11px] text-[var(--text-muted)]">{r.units_here && r.properties ? `${Math.round((100 * r.units_here) / r.properties)}% of portfolio` : ""}</div>
                    </td>
                  )}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="block h-1.5 rounded-full" style={{ width: `${Math.max(4, Math.round((64 * r.properties) / maxProps))}px`, background: GOLD }} />
                      <span className="figure font-semibold">{n0(r.properties)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><Mix mix={r.mix} total={r.properties} /></td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="figure font-semibold">{n0(r.total_value)}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">{short(r.total_value)}</div>
                  </td>
                  <td className="figure px-3 py-2.5 text-[12.5px] text-[var(--text-muted)]">{r.mobile ?? "-"}</td>
                </tr>
              ))}
              {res && res.rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-[13.5px] text-[var(--text-muted)]">No investor matches all of these conditions. Remove one to widen the search.</td></tr>
              )}
              {!res && <tr><td colSpan={7}><div className="h-64 animate-pulse bg-[var(--surface-hover)]" /></td></tr>}
            </tbody>
          </table>
        </div>
        {res && res.total > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--hairline)] px-4 py-2.5 text-[12.5px] text-[var(--text-muted)]">
            <span><b className="text-[var(--text-primary)]">{n0((page - 1) * res.size + 1)}-{n0(Math.min(res.total, page * res.size))}</b> of {n0(res.total)} investors{top ? ` · ranked by ${SORT_WORDS[sort] ?? "total value"}` : ""}</span>
            <span className="ms-auto flex gap-1">
              <button disabled={page <= 1 || busy} onClick={() => void run(f, page - 1)} className="h-8 rounded-lg border border-[var(--hairline)] px-3 font-semibold disabled:opacity-40">Previous</button>
              <span className="px-2 leading-8">Page {page} of {n0(pages)}</span>
              <button disabled={page >= pages || busy} onClick={() => void run(f, page + 1)} className="h-8 rounded-lg border border-[var(--hairline)] px-3 font-semibold disabled:opacity-40">Next</button>
            </span>
          </div>
        )}
      </section>

      <p className="flex gap-2 text-[12px] leading-relaxed text-[var(--text-muted)]">
        <Info size={13} className="mt-0.5 shrink-0" />
        Owners of 2 or more properties, from the investors workbook (14 October 2026). Total value is the purchase prices on file plus an estimate
        for units without one (building median price per sq ft). It shows portfolio size, not net worth: old prices are not updated and loans are not deducted.
      </p>

      {open != null && <Profile rank={open} onClose={() => setOpen(null)} onExpired={onExpired} onSearchName={onSearchName} />}
    </div>
  );
}

const SORT_WORDS: Record<string, string> = { value: "total value", units: "number of properties", area_units: "units in the chosen area", area_value: "value in the chosen area", avg: "average price", communities: "number of areas", rank: "workbook rank", name: "name" };

/* --------------------------------------------------- conditions in words */

function conditions(f: Filters, ov: Overview | null) {
  const out: { key: string; label: string; remove: (f: Filters) => Filters }[] = [];
  if (f.areas.length) out.push({ key: "area", label: f.areas.length === 1 ? `In ${f.areas[0]}` : `In ${f.areas.slice(0, -1).join(", ")} or ${f.areas[f.areas.length - 1]}`, remove: (x) => ({ ...x, areas: [], sort: x.sort.startsWith("area") ? "" : x.sort }) });
  if (f.min_props != null || f.max_props != null) out.push({ key: "props", label: f.min_props != null && f.max_props != null ? `${f.min_props} to ${f.max_props} properties` : f.min_props != null ? `At least ${f.min_props} properties` : `Up to ${f.max_props} properties`, remove: (x) => ({ ...x, min_props: null, max_props: null }) });
  if (f.min_value != null || f.max_value != null) out.push({ key: "value", label: f.min_value != null && f.max_value != null ? `Worth AED ${words(f.min_value)} to ${words(f.max_value)}` : f.min_value != null ? `Worth over AED ${words(f.min_value)}` : `Worth under AED ${words(f.max_value!)}`, remove: (x) => ({ ...x, min_value: null, max_value: null }) });
  if (f.nationalities.length) {
    const groups = new Set(f.nationalities.map((n) => Object.entries(NAT_GROUPS).find(([, v]) => v.includes(n))?.[0] ?? n));
    out.push({ key: "nat", label: `${[...groups].join(" or ")}`, remove: (x) => ({ ...x, nationalities: [] }) });
  }
  if (f.building) out.push({ key: "building", label: `Owns in "${f.building}"`, remove: (x) => ({ ...x, building: "" }) });
  if (f.q) out.push({ key: "name", label: `Name contains "${f.q}"`, remove: (x) => ({ ...x, q: "" }) });
  if (f.has_mobile) out.push({ key: "mobile", label: "Has a mobile", remove: (x) => ({ ...x, has_mobile: false }) });
  if (f.has_email) out.push({ key: "email", label: "Has an email", remove: (x) => ({ ...x, has_email: false }) });
  void ov;
  return out;
}

function AddMenu({ onPick }: { onPick: (k: string) => void }) {
  const [open, setOpen] = useState(false);
  const items: [string, string, ReactNode][] = [["area", "Area", <MapPin key="a" size={13} />], ["props", "Number of properties", <Building2 key="b" size={13} />], ["value", "Total value", <span key="c" className="text-[11px] font-bold">AED</span>], ["nat", "Nationality", <Globe key="d" size={13} />], ["building", "Building or tower", <Building2 key="e" size={13} />], ["name", "Name", <Search key="f" size={13} />], ["mobile", "Has a mobile", <Phone key="g" size={13} />], ["email", "Has an email", <span key="h" className="text-[11px] font-bold">@</span>]];
  return (
    <span className="relative">
      <button onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--hairline-strong)] px-3 py-1 text-[12.5px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"><Plus size={12} /> Add condition</button>
      {open && (
        <div role="menu" className="crm-pop absolute start-0 top-9 z-30 w-56 overflow-hidden rounded-[12px] border border-[var(--hairline)] bg-[var(--surface-solid)] py-1 shadow-[var(--shadow-pop)]">
          {items.map(([k, label, icon]) => (
            <button key={k} role="menuitem" onClick={() => { setOpen(false); onPick(k); }} className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[13px] hover:bg-[var(--surface-hover)]">
              <span className="flex w-4 justify-center text-[var(--text-muted)]">{icon}</span>{label}
            </button>
          ))}
        </div>
      )}
    </span>
  );
}

/** One condition at a time, edited in words: never "≥" or "is". */
function Editor({ kind, f, ov, onApply, onClose }: { kind: string; f: Filters; ov: Overview; onApply: (f: Filters) => void; onClose: () => void }) {
  const [areas, setAreas] = useState<string[]>(f.areas);
  const [areaQ, setAreaQ] = useState("");
  const [minP, setMinP] = useState(f.min_props?.toString() ?? "");
  const [maxP, setMaxP] = useState(f.max_props?.toString() ?? "");
  const [minV, setMinV] = useState(f.min_value ? String(f.min_value / 1e6) : "");
  const [maxV, setMaxV] = useState(f.max_value ? String(f.max_value / 1e6) : "");
  const [nat, setNat] = useState<string>(() => { const n = f.nationalities[0]; return n ? Object.entries(NAT_GROUPS).find(([, v]) => v.includes(n))?.[0] ?? n : ""; });
  const [bld, setBld] = useState(f.building);
  const [name, setName] = useState(f.q);

  const natList = useMemo(() => {
    const seen = new Map<string, number>();
    for (const n of ov.nationalities) { const g = Object.entries(NAT_GROUPS).find(([, v]) => v.includes(n.name))?.[0] ?? n.name; seen.set(g, (seen.get(g) ?? 0) + n.investors); }
    return [...seen.entries()].sort((a, b) => b[1] - a[1]);
  }, [ov]);
  useEffect(() => { if (kind === "mobile") onApply({ ...f, has_mobile: true }); if (kind === "email") onApply({ ...f, has_email: true }); }, [kind]); // eslint-disable-line react-hooks/exhaustive-deps
  if (kind === "mobile" || kind === "email") return null;

  const box = "mt-3 rounded-[12px] border border-[var(--hairline)] bg-[var(--input-bg)] p-3";
  const foot = (next: Filters) => (
    <div className="mt-3 flex gap-2">
      <button onClick={() => onApply(next)} className="h-9 rounded-[9px] px-4 text-[13px] font-semibold" style={{ background: GOLD, color: "#2B1E05" }}>Apply</button>
      <button onClick={onClose} className="h-9 rounded-[9px] border border-[var(--hairline)] px-4 text-[13px] font-semibold text-[var(--text-muted)]">Cancel</button>
    </div>
  );
  const chip = (on: boolean) => `rounded-full border px-3 py-1 text-[12px] font-semibold ${on ? "border-transparent text-[#2B1E05]" : "border-[var(--hairline)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`;

  if (kind === "area") {
    const list = ov.areas.filter((a) => !areaQ || a.name.toLowerCase().includes(areaQ.toLowerCase())).slice(0, 40);
    return (
      <div className={box}>
        <p className="text-[12.5px] font-semibold">Areas: investors who own in any of these</p>
        <input value={areaQ} onChange={(e) => setAreaQ(e.target.value)} placeholder="Find an area" className={`${DS_INPUT} mt-2 !h-9 !text-[13.5px]`} />
        <div className="mt-2 grid max-h-56 grid-cols-1 gap-1 overflow-y-auto sm:grid-cols-2">
          {list.map((a) => {
            const on = areas.includes(a.name);
            return (
              <label key={a.name} className={`flex cursor-pointer items-center justify-between gap-2 rounded-[8px] px-2.5 py-1.5 text-[13px] ${on ? "bg-[var(--accent-wash)]" : "hover:bg-[var(--surface-hover)]"}`}>
                <span className="flex items-center gap-2"><input type="checkbox" checked={on} onChange={() => setAreas(on ? areas.filter((x) => x !== a.name) : [...areas, a.name])} />{a.name}</span>
                <span className="figure text-[11.5px] text-[var(--text-muted)]">{n0(a.investors)} investors</span>
              </label>
            );
          })}
        </div>
        {foot({ ...f, areas, sort: areas.length ? f.sort || "area_units" : f.sort.startsWith("area") ? "" : f.sort })}
      </div>
    );
  }
  if (kind === "props") return (
    <div className={box}>
      <p className="text-[12.5px] font-semibold">Number of properties</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[2, 3, 5, 10, 20, 50, 100].map((n) => <button key={n} onClick={() => { setMinP(String(n)); setMaxP(""); }} className={chip(minP === String(n) && !maxP)} style={minP === String(n) && !maxP ? { background: GOLD } : undefined}>{n} or more</button>)}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[13px]">From <input inputMode="numeric" value={minP} onChange={(e) => setMinP(e.target.value.replace(/\D/g, ""))} className={`${DS_INPUT} !h-9 !w-24`} /> to <input inputMode="numeric" value={maxP} onChange={(e) => setMaxP(e.target.value.replace(/\D/g, ""))} placeholder="any" className={`${DS_INPUT} !h-9 !w-24`} /> properties</div>
      {foot({ ...f, min_props: minP ? +minP : null, max_props: maxP ? +maxP : null })}
    </div>
  );
  if (kind === "value") return (
    <div className={box}>
      <p className="text-[12.5px] font-semibold">Total value of the portfolio</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[[10, "10 million"], [50, "50 million"], [100, "100 million"], [500, "500 million"], [1000, "1 billion"]].map(([v, l]) => <button key={v} onClick={() => { setMinV(String(v)); setMaxV(""); }} className={chip(minV === String(v) && !maxV)} style={minV === String(v) && !maxV ? { background: GOLD } : undefined}>Over {l}</button>)}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">Between AED <input inputMode="decimal" value={minV} onChange={(e) => setMinV(e.target.value.replace(/[^\d.]/g, ""))} className={`${DS_INPUT} !h-9 !w-24`} /> and <input inputMode="decimal" value={maxV} onChange={(e) => setMaxV(e.target.value.replace(/[^\d.]/g, ""))} placeholder="any" className={`${DS_INPUT} !h-9 !w-24`} /> million</div>
      {foot({ ...f, min_value: minV ? +minV * 1e6 : null, max_value: maxV ? +maxV * 1e6 : null })}
    </div>
  );
  if (kind === "nat") return (
    <div className={box}>
      <p className="text-[12.5px] font-semibold">Nationality</p>
      <select value={nat} onChange={(e) => setNat(e.target.value)} className={`${DS_INPUT} mt-2 !h-10`}>
        <option value="">Any nationality</option>
        {natList.map(([g, n]) => <option key={g} value={g}>{g} ({n0(n)})</option>)}
      </select>
      {foot({ ...f, nationalities: nat ? natValues(nat, ov.nationalities) : [] })}
    </div>
  );
  if (kind === "building") return (
    <div className={box}>
      <p className="text-[12.5px] font-semibold">Owns at least one unit in a building or cluster named</p>
      <input value={bld} onChange={(e) => setBld(e.target.value)} placeholder="The Skyscraper" className={`${DS_INPUT} mt-2 !h-10`} />
      {foot({ ...f, building: bld.trim() })}
    </div>
  );
  if (kind === "name") return (
    <div className={box}>
      <p className="text-[12.5px] font-semibold">Name contains</p>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Alattar" className={`${DS_INPUT} mt-2 !h-10`} />
      {foot({ ...f, q: name.trim() })}
    </div>
  );
  return null;
}

/* ------------------------------------------------------------- the parts */

function Kpi({ label, value, hint, gold }: { label: string; value: string; hint?: string; gold?: boolean }) {
  return (
    <div className="panel !px-4 !py-3" title={hint}>
      <p className="text-[11.5px] text-[var(--text-muted)]">{label}</p>
      <p className="figure mt-0.5 text-[21px] font-bold leading-tight" style={gold ? { color: GOLD } : undefined}>{value}</p>
    </div>
  );
}

function Th({ label, k, sort, dir, onSort, right }: { label: string; k: string; sort: string; dir: string; onSort: (k: string) => void; right?: boolean }) {
  const on = sort === k;
  return (
    <th className={`px-3 py-2.5 font-semibold ${right ? "text-right" : ""}`}>
      <button onClick={() => onSort(k)} className={`inline-flex items-center gap-1 ${on ? "text-[var(--text-primary)]" : "hover:text-[var(--text-primary)]"}`}>
        {label}{on ? (dir === "asc" ? <ArrowUp size={12} style={{ color: GOLD }} /> : <ArrowDown size={12} style={{ color: GOLD }} />) : null}
      </button>
    </th>
  );
}

function Medal({ pos }: { pos: number }) {
  const c = pos === 1 ? [GOLD, "#3B2A08"] : pos === 2 ? ["#C7CCD6", "#2C3240"] : pos === 3 ? ["#C98B5C", "#3B1F08"] : null;
  if (!c) return <span className="figure text-[12.5px] font-semibold text-[var(--text-muted)]">{n0(pos)}</span>;
  return <span className="figure inline-flex h-6 w-6 items-center justify-center rounded-full text-[11.5px] font-bold" style={{ background: c[0], color: c[1] }}>{pos}</span>;
}

const MIX_COLORS = ["var(--accent)", "color-mix(in srgb, var(--accent) 60%, transparent)", "color-mix(in srgb, var(--accent) 35%, transparent)", "color-mix(in srgb, var(--accent) 18%, transparent)"];
function Mix({ mix, total }: { mix: { c: string; u: number }[] | null; total: number }) {
  if (!mix?.length) return <span className="text-[var(--text-muted)]">-</span>;
  return (
    <div className="min-w-[140px]" title={mix.map((m) => `${m.c}: ${m.u}`).join("\n")}>
      <div className="flex h-1.5 w-[140px] overflow-hidden rounded-full bg-[var(--surface-hover)]">
        {mix.map((m, i) => <span key={m.c} style={{ width: `${(100 * m.u) / Math.max(1, total)}%`, background: MIX_COLORS[i] }} />)}
      </div>
      <div className="mt-1 truncate text-[11.5px] text-[var(--text-muted)]">{mix[0].c} {n0(mix[0].u)}{mix.length > 1 ? ` · ${mix[1].c} ${n0(mix[1].u)}` : ""}</div>
    </div>
  );
}

/* ------------------------------------------------------------ the profile */

interface Prop { community: string | null; building: string | null; unit: string | null; block: string | null; property_type: string | null; beds: string | null; size_sqft: number | null; bought_on: string | null; purchase_price: number | null; estimated_value: number | null; value_used: number | null; estimate_basis: string | null; coowned: string | null }
interface Detail {
  investor: Record<string, unknown> & { rank: number; name: string; properties: number; total_value: number | null; priced_total: number | null; avg_price: number | null; priced_count: number | null; estimated_count: number | null; estimated_value: number | null; no_value_count: number | null; coowned_count: number | null; nationality: string | null; communities: number; mobiles: number; mobile: string | null; has_email: boolean; matched_by: string | null; other_spellings: string | null; uncounted: number | null };
  holdings: { community: string; units: number; value: number }[];
  buildings: { building: string; community: string; units: number }[];
  properties: Prop[];
}

function Profile({ rank, onClose, onExpired, onSearchName }: { rank: number; onClose: () => void; onExpired: () => void; onSearchName: (name: string) => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contacts, setContacts] = useState<{ mobiles: { value: string; dial: string | null; dnc: boolean }[]; email: string | null } | null>(null);
  const [area, setArea] = useState("");

  useEffect(() => {
    void ds<{ detail: Detail }>("POST", "investors", { op: "detail", rank }).then((r) => {
      if (r.ok) setD(r.detail); else if (r.error === "ds_signin_required") onExpired(); else setError(dsError(r.error));
    });
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [rank, onClose, onExpired]);

  async function reveal() {
    const r = await ds<{ contacts: typeof contacts }>("POST", "investors", { op: "contacts", rank });
    if (r.ok) setContacts(r.contacts); else setError(dsError(r.error));
  }

  const i = d?.investor;
  const maxH = Math.max(1, ...(d?.holdings ?? []).map((h) => h.units));
  const props = (d?.properties ?? []).filter((p) => !area || p.community === area);

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/50" onClick={onClose}>
      <aside onClick={(e) => e.stopPropagation()} className="h-full w-full max-w-[760px] overflow-y-auto border-s border-[var(--hairline)] bg-[var(--surface-solid)] shadow-[var(--shadow-pop)]">
        <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--hairline)] bg-[var(--surface-solid)] px-5 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold" style={{ background: `${GOLD}26`, color: GOLD }}>{i ? initials(i.name) : ""}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-bold text-[var(--text-primary)]">{i?.name ?? "Loading…"}</p>
            <p className="text-[12px] text-[var(--text-muted)]">{i ? [`Rank ${n0(i.rank)} of 75,061`, i.nationality, `${i.communities} areas`].filter(Boolean).join(" · ") : ""}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--surface-hover)]"><X size={16} /></button>
        </div>

        {error && <p className="m-5 rounded-[10px] border border-[var(--bad-bd)] bg-[var(--bad-bg)] px-3 py-2 text-[13px] text-[var(--bad)]">{error}</p>}
        {!d && !error && <div className="m-5 h-64 animate-pulse rounded-xl bg-[var(--surface-hover)]" />}

        {d && i && (
          <div className="space-y-5 p-5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Kpi label="Properties" value={n0(i.properties)} gold />
              <Kpi label="Total value (AED)" value={short(i.total_value)} hint={n0(i.total_value)} />
              <Kpi label="Price on file (AED)" value={short(i.priced_total)} hint={`${n0(i.priced_count)} properties with a price on file`} />
              <Kpi label="Average price (AED)" value={short(i.avg_price)} />
            </div>
            <p className="text-[12px] text-[var(--text-muted)]">
              {n0(i.priced_count)} with a purchase price on file · {n0(i.estimated_count)} valued by estimate (AED {short(i.estimated_value)}) · {n0(i.no_value_count)} with no value · {n0(i.coowned_count)} co-owned
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="ds-label mb-2">Where they hold</p>
                <div className="space-y-2">
                  {d.holdings.map((h) => (
                    <button key={h.community} onClick={() => setArea(area === h.community ? "" : h.community)} className={`block w-full rounded-[8px] px-2 py-1 text-left ${area === h.community ? "bg-[var(--accent-wash)]" : "hover:bg-[var(--surface-hover)]"}`}>
                      <div className="flex justify-between text-[12.5px]"><span className="font-semibold">{h.community}</span><span className="figure text-[var(--text-muted)]">{n0(h.units)} · AED {short(h.value)}</span></div>
                      <div className="mt-1 h-1.5 rounded-full bg-[var(--surface-hover)]"><div className="h-1.5 rounded-full" style={{ width: `${(100 * h.units) / maxH}%`, background: GOLD }} /></div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="ds-label mb-2">Largest buildings</p>
                <div className="divide-y divide-[var(--hairline)] rounded-[10px] border border-[var(--hairline)]">
                  {d.buildings.slice(0, 8).map((b) => (
                    <div key={`${b.community}-${b.building}`} className="flex justify-between px-3 py-1.5 text-[12.5px]"><span className="truncate"><b className="font-semibold">{b.building || "-"}</b> <span className="text-[var(--text-muted)]">{b.community}</span></span><span className="figure ps-2 font-semibold">{n0(b.units)}</span></div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[12px] border border-[var(--hairline)] p-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="ds-label flex-1">Contacts</p>
                {!contacts && (i.mobiles > 0 || i.has_email) && <button onClick={() => void reveal()} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--hairline)] px-3 text-[12.5px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"><Eye size={13} /> Reveal</button>}
              </div>
              {!contacts ? (
                <p className="mt-1 text-[13px] text-[var(--text-muted)]">{i.mobiles > 0 ? `${i.mobile ?? ""}${i.mobiles > 1 ? ` and ${i.mobiles - 1} more` : ""}` : "No mobile on file"}{i.has_email ? " · email on file" : ""}. Revealing is recorded.</p>
              ) : (
                <div className="mt-2 space-y-1 text-[13.5px]">
                  {contacts.mobiles.map((m) => (
                    <div key={m.value} className="flex items-center gap-2">
                      <Phone size={13} className="text-[var(--text-muted)]" />
                      <span className="figure font-semibold">{m.value}</span>
                      {m.dnc ? <span className="text-[11.5px] text-[var(--bad)]">asked not to be contacted</span> : m.dial && <a href={`https://wa.me/${m.dial}`} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-[var(--wa)] hover:underline">WhatsApp</a>}
                    </div>
                  ))}
                  {contacts.email && <div className="text-[13px]"><span className="text-[var(--text-muted)]">Email </span><span className="font-semibold">{contacts.email}</span></div>}
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="ds-label flex-1">Properties {area ? `in ${area}` : ""} ({n0(props.length)}{d.properties.length >= 1500 ? "+" : ""})</p>
                {area && <button onClick={() => setArea("")} className="text-[12px] font-semibold text-[var(--accent)]">Show all areas</button>}
              </div>
              <div className="max-h-[420px] overflow-auto rounded-[10px] border border-[var(--hairline)]">
                <table className="w-full min-w-[640px] text-[12.5px]">
                  <thead className="sticky top-0 bg-[var(--surface-solid)] text-left text-[11px] text-[var(--text-muted)]">
                    <tr><th className="px-2.5 py-2">Building</th><th className="px-2.5 py-2">Unit</th><th className="px-2.5 py-2">Type</th><th className="px-2.5 py-2 text-right">Size (sq ft)</th><th className="px-2.5 py-2">Bought</th><th className="px-2.5 py-2 text-right">Value (AED)</th></tr>
                  </thead>
                  <tbody>
                    {props.map((p, idx) => (
                      <tr key={idx} className="border-t border-[var(--hairline)]">
                        <td className="px-2.5 py-1.5"><div className="font-semibold">{p.building || "-"}</div><div className="text-[11px] text-[var(--text-muted)]">{p.community}</div></td>
                        <td className="figure px-2.5 py-1.5">{p.unit || "-"}</td>
                        <td className="px-2.5 py-1.5">{[p.property_type, p.beds ? `${p.beds} bed` : null].filter(Boolean).join(" · ") || "-"}</td>
                        <td className="figure px-2.5 py-1.5 text-right">{n0(p.size_sqft)}</td>
                        <td className="figure px-2.5 py-1.5">{p.bought_on ?? "-"}</td>
                        <td className="px-2.5 py-1.5 text-right" title={p.estimate_basis ?? undefined}><span className="figure font-semibold">{n0(p.value_used)}</span>{p.estimated_value != null && p.purchase_price == null ? <span className="ms-1 text-[10.5px] text-[var(--text-muted)]">est.</span> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {(i.other_spellings || i.matched_by) && (
              <p className="text-[12px] leading-relaxed text-[var(--text-muted)]">Counted as one investor by: {i.matched_by ?? "-"}.{i.other_spellings ? ` Other spellings on file: ${i.other_spellings}.` : ""}{i.uncounted ? ` ${n0(i.uncounted)} other records not counted (no unit code).` : ""}</p>
            )}
            <button onClick={() => { onClose(); onSearchName(i.name); }} className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-[var(--hairline)] px-4 text-[13px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"><Search size={14} /> Search this name in DB Search</button>
          </div>
        )}
      </aside>
    </div>
  );
}
