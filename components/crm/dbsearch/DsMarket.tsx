"use client";

import { useEffect, useState, type FormEvent } from "react";
import { TrendingUp } from "lucide-react";

import { Card, Empty } from "../shared";
import { aed, ds, dsError, fullDate } from "./api";

export type MarketMode = "sales" | "rents" | "valuation";

/* DLD records price per square METRE; agents quote per square foot. Both shown. */
const SQFT_PER_SQM = 10.7639;
const psf = (ppsm: number | null | undefined) => (ppsm ? Math.round(ppsm / SQFT_PER_SQM) : null);
const n = (v: number | null | undefined) => (v == null ? "—" : new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v));

interface Overview {
  deals: number; median_price: number | null; median_ppsm: number | null; total_value: number | null; date_from: string | null; date_to: string | null;
  monthly: { m: string; deals: number; ppsm: number }[];
  areas: { area: string; deals: number; ppsm: number; price: number }[];
  offplan: { k: string; deals: number; ppsm: number }[];
  beds: { k: string; deals: number; price: number }[];
}
interface Rentals {
  totals: { contracts: number; med_annual_rent: number | null; med_rent_psf: number | null; new: number; renewed: number; renewal_rate: number | null; span: string | null; days: number };
  areas: { area: string; contracts: number; med_rent: number; med_psf: number }[];
  types: { type: string; contracts: number; med_rent: number }[];
}
interface Valuation {
  error?: string;
  subject: { scope: string; name: string; sqft: number };
  comps: { total: number; similar: number; basis: string; basis_n: number; latest: string; since: number; matched: string[] };
  psf: { p25: number; median: number; p75: number; adjusted_to: string };
  estimate: { low: number; mid: number; high: number };
  benchmark: { community: string | null; community_med_psf: number | null; premium_pct: number | null };
  trend: { year: number; n: number; med_psf: number }[];
  recent: { date: string; unit: string | null; building: string | null; price: number; sqft: number; psf: number }[];
  confidence: { score: "high" | "medium" | "low"; reasons: string[] };
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card className="px-4 py-3.5">
      <div className="text-[12px] font-medium text-[var(--text-secondary)]">{label}</div>
      <div className="figure mt-1.5 text-[21px] font-semibold leading-none text-[var(--accent)]">{value}</div>
      {note && <div className="mt-1 text-[11.5px] text-[var(--text-muted)]">{note}</div>}
    </Card>
  );
}

function useSuggest(kind: string, q: string, scope?: string) {
  const [items, setItems] = useState<{ name: string; meta: string }[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) { setItems([]); return; }
    const t = window.setTimeout(async () => {
      const r = await ds<{ items: { name: string; meta: string }[] }>("POST", "suggest", { kind, q, scope });
      if (r.ok) setItems(r.items);
    }, 250);
    return () => window.clearTimeout(t);
  }, [kind, q, scope]);
  return [items, setItems] as const;
}

export function DsMarket({ mode, onMode, onExpired }: { mode: MarketMode; onMode: (m: MarketMode) => void; onExpired: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {([["sales", "Sales & prices"], ["rents", "Rents & yields"], ["valuation", "Valuation"]] as const).map(([m, label]) => (
          <button key={m} onClick={() => onMode(m)} className={`h-9 rounded-full border px-4 text-[13px] font-semibold ${mode === m ? "border-[var(--accent-solid)] bg-[var(--accent-solid)] text-white" : "border-[var(--hairline-strong)] bg-white text-[var(--text-secondary)]"}`}>{label}</button>
        ))}
      </div>
      {mode === "sales" && <Sales onExpired={onExpired} />}
      {mode === "rents" && <Rents onExpired={onExpired} />}
      {mode === "valuation" && <Value onExpired={onExpired} />}
    </div>
  );
}

function Picker({ value, onChange, onPick, placeholder, items, busy, action }: {
  value: string; onChange: (v: string) => void; onPick: (v: string) => void; placeholder: string;
  items: { name: string; meta: string }[]; busy: boolean; action: string;
}) {
  return (
    <form onSubmit={(e: FormEvent) => { e.preventDefault(); onPick(value); }} className="relative">
      <div className="flex h-[52px] overflow-hidden rounded-xl border border-[rgb(11_42_74/0.3)] bg-white">
        <label className="flex flex-1 items-center gap-3 px-4"><TrendingUp size={18} className="text-[var(--accent)]" />
          <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="h-full flex-1 bg-transparent text-[14px] outline-none" aria-label={placeholder} /></label>
        <button disabled={busy} className="bg-[var(--accent-solid)] px-7 text-[13px] font-semibold text-white disabled:opacity-60">{busy ? "Loading…" : action}</button>
      </div>
      {items.length > 0 && (
        <ul className="absolute inset-x-0 top-[56px] z-10 overflow-hidden rounded-xl border border-[var(--hairline)] bg-white shadow-[var(--shadow-lift)]">
          {items.map((s) => <li key={s.name}><button type="button" onClick={() => onPick(s.name)} className="flex w-full justify-between px-4 py-2.5 text-start text-[13px] hover:bg-[var(--accent-wash)]"><span className="font-medium">{s.name}</span><span className="text-[var(--text-muted)]">{s.meta}</span></button></li>)}
        </ul>
      )}
    </form>
  );
}

/* ------------------------------------------------------------ sales */

function Sales({ onExpired }: { onExpired: () => void }) {
  const [area, setArea] = useState("");
  const [months, setMonths] = useState(12);
  const [data, setData] = useState<Overview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(a: string, m = months) {
    setBusy(true); setError(null);
    const r = await ds<{ data: Overview; error?: string }>("POST", "market", { area: a, months: m });
    setBusy(false);
    if (!r.ok) return r.error === "ds_signin_required" ? onExpired() : setError(dsError(r.error));
    if (r.error) return setError(r.error);
    setData(r.data);
  }
  useEffect(() => { void load(""); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const max = Math.max(1, ...(data?.monthly ?? []).map((x) => x.deals));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-[280px] flex-1"><Picker value={area} onChange={setArea} onPick={(v) => { setArea(v); void load(v); }} placeholder="Area — leave empty for all of Dubai" items={[]} busy={busy} action="Show" /></div>
        {[6, 12, 24].map((m) => <button key={m} onClick={() => { setMonths(m); void load(area, m); }} className={`h-9 rounded-full border px-3.5 text-[12.5px] font-semibold ${months === m ? "border-[var(--accent-solid)] bg-[var(--accent-solid)] text-white" : "border-[var(--hairline-strong)] bg-white"}`}>{m} months</button>)}
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-[var(--bad)]">{error}</p>}
      {busy && !data && <div className="h-64 animate-pulse rounded-xl bg-[rgb(15_23_42/0.06)]" />}
      {data && (
        <>
          <p className="text-[12.5px] text-[var(--text-muted)]">Registered sales {data.date_from ? `from ${fullDate(data.date_from)} to ${fullDate(data.date_to)}` : ""}{area ? ` in areas matching “${area}”` : " across Dubai"}. Source: DLD transactions.</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Sales" value={n(data.deals)} />
            <Stat label="Median price" value={aed(data.median_price, true)} />
            <Stat label="Median price per sq ft" value={`AED ${n(psf(data.median_ppsm))}`} note={`AED ${n(data.median_ppsm)} per sq m`} />
            <Stat label="Total value" value={aed(data.total_value, true)} />
          </div>
          <div className="grid items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
            <Card className="p-5">
              <h3 className="text-[13.5px] font-bold">Sales per month</h3>
              {data.monthly.length === 0 ? <Empty>No sales in this period.</Empty> : (
                <div className="mt-4 flex h-44 items-end gap-1.5 border-b border-[var(--hairline-strong)]">
                  {data.monthly.map((x) => (
                    <div key={x.m} className="group relative flex flex-1 flex-col items-center justify-end" style={{ height: "100%" }}>
                      <span className="w-full rounded-t bg-[var(--info-bg)] transition-colors group-hover:bg-[var(--accent-solid)]" style={{ height: `${(x.deals / max) * 100}%` }} title={`${x.m}: ${x.deals} sales, AED ${psf(x.ppsm)} per sq ft`} />
                    </div>
                  ))}
                </div>
              )}
              <div className="figure mt-1.5 flex justify-between text-[11px] text-[var(--text-muted)]"><span>{data.monthly[0]?.m}</span><span>{data.monthly.at(-1)?.m}</span></div>
            </Card>
            <Card className="overflow-hidden">
              <h3 className="px-5 pt-4 text-[13.5px] font-bold">Busiest areas</h3>
              <table className="mt-2 w-full text-[12.5px]">
                <thead><tr className="text-left text-[11px] text-[var(--text-muted)]"><th className="px-5 py-2 font-semibold">Area</th><th className="px-2 py-2 font-semibold">Sales</th><th className="px-2 py-2 font-semibold">Per sq ft</th><th className="px-5 py-2 font-semibold">Median</th></tr></thead>
                <tbody>{data.areas.slice(0, 10).map((a) => (
                  <tr key={a.area} className="border-t border-[var(--hairline)]"><td className="px-5 py-2 font-medium">{a.area}</td><td className="figure px-2 py-2">{n(a.deals)}</td><td className="figure px-2 py-2">{n(psf(a.ppsm))}</td><td className="figure px-5 py-2">{aed(a.price, true)}</td></tr>
                ))}</tbody>
              </table>
            </Card>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="p-5"><h3 className="mb-3 text-[13.5px] font-bold">By bedrooms</h3>
              {data.beds.map((b) => <div key={b.k} className="flex justify-between border-t border-[var(--hairline)] py-2 text-[12.5px] first:border-t-0"><span>{b.k}</span><span className="figure">{n(b.deals)} sales · {aed(b.price, true)}</span></div>)}
            </Card>
            <Card className="p-5"><h3 className="mb-3 text-[13.5px] font-bold">Off-plan or ready</h3>
              {data.offplan.map((o) => <div key={o.k} className="flex justify-between border-t border-[var(--hairline)] py-2 text-[12.5px] first:border-t-0"><span>{o.k}</span><span className="figure">{n(o.deals)} sales · AED {n(psf(o.ppsm))} / sq ft</span></div>)}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ rents */

function Rents({ onExpired }: { onExpired: () => void }) {
  const [area, setArea] = useState("");
  const [items, setItems] = useSuggest("rentals", area);
  const [data, setData] = useState<Rentals | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(a: string) {
    setItems([]); setBusy(true); setError(null);
    const r = await ds<{ data: Rentals; error?: string }>("POST", "rentals", { area: a });
    setBusy(false);
    if (!r.ok) return r.error === "ds_signin_required" ? onExpired() : setError(dsError(r.error));
    if (r.error) return setError(r.error);
    setData(r.data);
  }
  useEffect(() => { void load(""); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const t = data?.totals;
  return (
    <div className="space-y-4">
      <Picker value={area} onChange={setArea} onPick={(v) => { setArea(v); void load(v); }} placeholder="Area — e.g. Dubai Marina" items={items} busy={busy} action="Show rents" />
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-[var(--bad)]">{error}</p>}
      {t && (
        <>
          <p className="text-[12.5px] text-[var(--text-muted)]">Registered Ejari contracts{t.span ? `, ${t.span}` : ""}. Coverage is partial — {n(t.days)} days of contracts — so treat these as a guide, not a full-year picture.</p>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Contracts" value={n(t.contracts)} />
            <Stat label="Median yearly rent" value={aed(t.med_annual_rent)} />
            <Stat label="Rent per sq ft" value={t.med_rent_psf ? `AED ${t.med_rent_psf}` : "—"} note="per year" />
            <Stat label="Renewals" value={t.renewal_rate != null ? `${t.renewal_rate}%` : "—"} note={`${n(t.renewed)} renewed · ${n(t.new)} new`} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="overflow-hidden"><h3 className="px-5 pt-4 text-[13.5px] font-bold">By area</h3>
              <table className="mt-2 w-full text-[12.5px]"><tbody>{data!.areas.map((a) => (
                <tr key={a.area} className="border-t border-[var(--hairline)]"><td className="px-5 py-2 font-medium">{a.area}</td><td className="figure px-2 py-2 text-[var(--text-muted)]">{n(a.contracts)}</td><td className="figure px-5 py-2 text-end">{aed(a.med_rent)}</td></tr>
              ))}</tbody></table>
            </Card>
            <Card className="overflow-hidden"><h3 className="px-5 pt-4 text-[13.5px] font-bold">By property type</h3>
              <table className="mt-2 w-full text-[12.5px]"><tbody>{data!.types.map((x) => (
                <tr key={x.type} className="border-t border-[var(--hairline)]"><td className="px-5 py-2 font-medium">{x.type}</td><td className="figure px-2 py-2 text-[var(--text-muted)]">{n(x.contracts)}</td><td className="figure px-5 py-2 text-end">{aed(x.med_rent)}</td></tr>
              ))}</tbody></table>
            </Card>
          </div>
          <p className="text-[12px] text-[var(--text-muted)]">Gross yield ≈ yearly rent ÷ price. Use Sales &amp; prices for the same area to compare.</p>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ valuation */

function Value({ onExpired }: { onExpired: () => void }) {
  const [scope, setScope] = useState<"building" | "project" | "community">("building");
  const [name, setName] = useState("");
  const [sqft, setSqft] = useState("1200");
  const [since, setSince] = useState(2022);
  const [items, setItems] = useSuggest("valuation", name, scope);
  const [data, setData] = useState<Valuation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(nm = name) {
    setItems([]); setBusy(true); setError(null);
    const r = await ds<{ data: Valuation; error?: string }>("POST", "valuation", { scope, name: nm, sqft: Number(sqft), since, exact: true });
    setBusy(false);
    if (!r.ok) return r.error === "ds_signin_required" ? onExpired() : setError(dsError(r.error));
    if (r.error) return setError(r.error);
    if (r.data?.error) return setError(r.data.error === "no_comps" ? `No registered sales found for “${nm}” since ${since}. Try a community instead, or pick a name from the list.` : r.data.error);
    setData(r.data);
  }

  const conf = data?.confidence.score;
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[340px_1fr]">
      <Card className="space-y-4 p-5">
        <div className="flex gap-1.5">
          {(["building", "project", "community"] as const).map((s) => <button key={s} onClick={() => setScope(s)} className={`h-8 flex-1 rounded-full border text-[12px] font-semibold capitalize ${scope === s ? "border-[var(--accent-solid)] bg-[var(--accent-solid)] text-white" : "border-[var(--hairline-strong)] bg-white"}`}>{s}</button>)}
        </div>
        <div className="relative">
          <label className="block"><span className="mb-1.5 block text-[12px] font-semibold text-[var(--text-secondary)]">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder={scope === "building" ? "e.g. Marina Gate 2" : scope === "project" ? "e.g. Dubai Hills Estate" : "e.g. Dubai Marina"} className="h-10 w-full rounded-lg border border-[var(--hairline-strong)] px-3 text-[13px] outline-none focus:border-[var(--accent)]" /></label>
          {items.length > 0 && (
            <ul className="absolute inset-x-0 top-[66px] z-10 overflow-hidden rounded-xl border border-[var(--hairline)] bg-white shadow-[var(--shadow-lift)]">
              {items.map((s) => <li key={s.name}><button type="button" onClick={() => { setName(s.name); setItems([]); }} className="flex w-full justify-between px-3 py-2 text-start text-[12.5px] hover:bg-[var(--accent-wash)]"><span className="font-medium">{s.name}</span><span className="text-[var(--text-muted)]">{s.meta}</span></button></li>)}
            </ul>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="mb-1.5 block text-[12px] font-semibold text-[var(--text-secondary)]">Size, sq ft</span>
            <input inputMode="numeric" value={sqft} onChange={(e) => setSqft(e.target.value.replace(/\D/g, ""))} className="figure h-10 w-full rounded-lg border border-[var(--hairline-strong)] px-3 text-[13px] outline-none focus:border-[var(--accent)]" /></label>
          <label className="block"><span className="mb-1.5 block text-[12px] font-semibold text-[var(--text-secondary)]">Sales since</span>
            <select value={since} onChange={(e) => setSince(Number(e.target.value))} className="h-10 w-full rounded-lg border border-[var(--hairline-strong)] bg-white px-2 text-[13px]">{[2019, 2020, 2021, 2022, 2023, 2024].map((y) => <option key={y}>{y}</option>)}</select></label>
        </div>
        <button onClick={() => run()} disabled={busy || name.trim().length < 2} className="h-10 w-full rounded-lg bg-[var(--accent-solid)] text-[13px] font-semibold text-white disabled:opacity-50">{busy ? "Valuing…" : "Estimate value"}</button>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[12.5px] text-[var(--bad)]">{error}</p>}
      </Card>

      {!data ? <Card className="p-8 text-center text-[13.5px] text-[var(--text-secondary)]">Pick a building, project or community and a size. The range comes from registered sales, adjusted to today's price level.</Card> : (
        <div className="space-y-4">
          <div className="rounded-xl bg-[var(--accent-solid)] p-6 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">Estimated value · {data.subject.name} · {n(data.subject.sqft)} sq ft</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-[40px] font-semibold leading-none">{aed(data.estimate.low, true)} – {aed(data.estimate.high, true)}</p>
            <p className="mt-2 text-[13px] text-white/75">Middle {aed(data.estimate.mid)} · AED {n(data.psf.median)} per sq ft · from {data.comps.basis_n} {data.comps.basis === "size-similar" ? "similar-size" : ""} sales, adjusted to {data.psf.adjusted_to ? fullDate(data.psf.adjusted_to) : "the latest quarter"}</p>
            <span className={`mt-4 inline-block rounded-full px-3 py-1 text-[12px] font-semibold ${conf === "high" ? "bg-[var(--ok-bg)] text-[var(--ok)]" : conf === "medium" ? "bg-[var(--violet-bg)] text-[var(--violet)]" : "bg-[var(--bad-bg)] text-[var(--bad)]"}`}>
              {conf === "high" ? "High confidence" : conf === "medium" ? "Medium confidence" : "Low confidence"}{data.confidence.reasons.length ? ` — ${data.confidence.reasons.join("; ")}` : ""}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat label="Comparable sales" value={n(data.comps.total)} note={`${data.comps.similar} of similar size`} />
            <Stat label="Newest sale" value={data.comps.latest ? fullDate(data.comps.latest) ?? "—" : "—"} />
            <Stat label={`vs ${data.benchmark.community ?? "community"}`} value={data.benchmark.premium_pct != null ? `${data.benchmark.premium_pct > 0 ? "+" : ""}${data.benchmark.premium_pct}%` : "—"} note={data.benchmark.community_med_psf ? `community AED ${n(data.benchmark.community_med_psf)} / sq ft` : undefined} />
          </div>
          <Card className="overflow-hidden">
            <h3 className="px-5 pt-4 text-[13.5px] font-bold">Latest comparable sales</h3>
            <table className="mt-2 w-full text-[12.5px]">
              <thead><tr className="text-left text-[11px] text-[var(--text-muted)]"><th className="px-5 py-2 font-semibold">Date</th><th className="px-2 py-2 font-semibold">Unit</th><th className="px-2 py-2 font-semibold">Size</th><th className="px-2 py-2 font-semibold">Price</th><th className="px-5 py-2 font-semibold">Per sq ft</th></tr></thead>
              <tbody>{data.recent.map((r, i) => (
                <tr key={i} className="border-t border-[var(--hairline)]"><td className="figure px-5 py-2">{fullDate(r.date)}</td><td className="px-2 py-2">{[r.unit, r.building].filter(Boolean).join(" · ") || "—"}</td><td className="figure px-2 py-2">{n(r.sqft)}</td><td className="figure px-2 py-2">{aed(r.price)}</td><td className="figure px-5 py-2">{n(r.psf)}</td></tr>
              ))}</tbody>
            </table>
          </Card>
          <p className="text-[12px] text-[var(--text-muted)]">An estimate to start a conversation, not a valuation. Condition, view, floor and service charges are not in it.</p>
        </div>
      )}
    </div>
  );
}
