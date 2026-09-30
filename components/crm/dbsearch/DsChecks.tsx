"use client";

import { useState, type FormEvent } from "react";
import { ExternalLink, Hash, MonitorSmartphone, ShieldCheck } from "lucide-react";

import { Card, Empty } from "../shared";
import { aed, ds, dsError, fullDate } from "./api";

export type CheckMode = "permit" | "listed" | "pnumber";

interface Permit { permit_number: string; bayut_listing_id: string | null; zone_name_en: string | null; property_type_name_en: string | null; developer_name_en: string | null; authority_name_en: string | null; property_name_en: string | null; property_value: number | null; validation_url: string | null; fetched_at: string }
interface PRow { ref: string | null; name: string; side: string; date: string | null; amount: number | null; place: string; numbers: { plot: string | null; reg: string | null; property: string | null }; phones: { masked: string }[] }
interface Listing { title: string; price: number | null; agency: string | null; agent: string | null; url: string | null; beds: string | number | null }

const MODES: { id: CheckMode; label: string; icon: typeof Hash; placeholder: string }[] = [
  { id: "permit", label: "DLD permit", icon: ShieldCheck, placeholder: "Permit number or Bayut listing ID" },
  { id: "listed", label: "Listed right now?", icon: MonitorSmartphone, placeholder: "Building and unit — e.g. Marina Gate 2 1405" },
  { id: "pnumber", label: "Plot & property number", icon: Hash, placeholder: "Property, plot or registration number" },
];

export function DsChecks({ mode, onMode, onExpired, onOpenOwner }: { mode: CheckMode; onMode: (m: CheckMode) => void; onExpired: () => void; onOpenOwner: (ref: string) => void }) {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permits, setPermits] = useState<{ permits: Permit[]; tabu: { tabu_ref: string; verification_status: string; fetched_at: string } | null } | null>(null);
  const [rows, setRows] = useState<PRow[] | null>(null);
  const [listings, setListings] = useState<Listing[] | null>(null);

  const m = MODES.find((x) => x.id === mode)!;

  async function run(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true); setError(null); setPermits(null); setRows(null); setListings(null);
    const r = await ds<Record<string, unknown>>("POST", mode, { q: q.trim() });
    setBusy(false);
    if (!r.ok) return r.error === "ds_signin_required" ? onExpired() : setError(dsError(r.error));
    if (mode === "permit") setPermits({ permits: (r.permits as Permit[]) ?? [], tabu: (r.tabu as never) ?? null });
    if (mode === "pnumber") setRows((r.rows as PRow[]) ?? []);
    if (mode === "listed") {
      if (r.error === "not_configured") return setError("The RapidAPI key could not be found, so live listings are unavailable right now.");
      if (typeof r.error === "string") return setError(`The listings provider did not answer (${r.error}).`);
      setListings((r.listings as Listing[]) ?? []);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {MODES.map((x) => <button key={x.id} onClick={() => { onMode(x.id); setError(null); }} className={`inline-flex h-9 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold ${mode === x.id ? "border-[var(--accent-solid)] bg-[var(--accent-solid)] text-white" : "border-[var(--hairline-strong)] bg-white text-[var(--text-secondary)]"}`}><x.icon size={14} /> {x.label}</button>)}
      </div>
      <form onSubmit={run} className="flex h-[52px] overflow-hidden rounded-xl border border-[rgb(11_42_74/0.3)] bg-white">
        <label className="flex flex-1 items-center gap-3 px-4"><m.icon size={18} className="text-[var(--accent)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.placeholder} maxLength={120} className="h-full flex-1 bg-transparent text-[14px] outline-none" aria-label={m.placeholder} /></label>
        <button disabled={busy} className="bg-[var(--accent-solid)] px-7 text-[13px] font-semibold text-white disabled:opacity-60">{busy ? "Checking…" : "Check"}</button>
      </form>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-[var(--bad)]">{error}</p>}
      {busy && <div className="h-40 animate-pulse rounded-xl bg-[rgb(15_23_42/0.06)]" />}

      {mode === "permit" && permits && (
        <div className="space-y-3">
          {permits.permits.length === 0 && !permits.tabu && <Card className="p-5"><Empty>No permit on file for this number. Only permits the DLD lookup has already fetched are stored; a new live check runs from the office desktop.</Empty></Card>}
          {permits.permits.map((p) => (
            <Card key={p.permit_number} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--violet)]">Trakheesi permit</p><p className="figure mt-1 text-[22px] font-semibold">{p.permit_number}</p></div>
                {p.validation_url && <a href={p.validation_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[var(--accent)] hover:underline">Verify on DLD <ExternalLink size={13} /></a>}
              </div>
              <dl className="mt-4 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
                {[["Property", p.property_name_en], ["Area", p.zone_name_en], ["Type", p.property_type_name_en], ["Developer", p.developer_name_en], ["Authority", p.authority_name_en], ["Value on permit", p.property_value ? aed(p.property_value) : null], ["Bayut listing", p.bayut_listing_id], ["Checked", fullDate(p.fetched_at)]].filter(([, v]) => v).map(([k, v]) => (
                  <div key={k as string} className="flex justify-between gap-4 border-t border-[var(--hairline)] pt-2"><dt className="text-[var(--text-secondary)]">{k}</dt><dd className="text-end font-medium">{v}</dd></div>
                ))}
              </dl>
            </Card>
          ))}
          {permits.tabu && (
            <Card className="p-5 text-[13px]"><strong>Bayut Tabu reference:</strong> <span className="figure">{permits.tabu.tabu_ref}</span> · {permits.tabu.verification_status} · checked {fullDate(permits.tabu.fetched_at)}</Card>
          )}
        </div>
      )}

      {mode === "pnumber" && rows && (
        <Card className="overflow-hidden">
          {rows.length === 0 ? <Empty>No unit carries this number.</Empty> : (
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-[11.5px] text-[var(--text-muted)]"><th className="px-4 py-2.5 font-semibold">Person</th><th className="px-2 py-2.5 font-semibold">Property</th><th className="px-2 py-2.5 font-semibold">Numbers</th><th className="px-2 py-2.5 font-semibold">When</th><th /></tr></thead>
              <tbody>{rows.map((r, i) => (
                <tr key={i} className="border-t border-[var(--hairline)]">
                  <td className="px-4 py-2.5"><div className="font-semibold">{r.name}</div><div className="text-[11.5px] text-[var(--text-muted)]">{r.side}</div></td>
                  <td className="px-2 py-2.5">{r.place || "—"}</td>
                  <td className="figure px-2 py-2.5 text-[12px]">{[r.numbers.property && `Property ${r.numbers.property}`, r.numbers.plot && `Plot ${r.numbers.plot}`, r.numbers.reg && `Reg ${r.numbers.reg}`].filter(Boolean).join(" · ")}</td>
                  <td className="figure whitespace-nowrap px-2 py-2.5">{fullDate(r.date) ?? "—"}<div className="text-[11.5px] text-[var(--text-muted)]">{r.amount ? aed(r.amount, true) : ""}</div></td>
                  <td className="px-2 py-2.5 text-end">{r.ref && <button onClick={() => onOpenOwner(r.ref!)} className="text-[12.5px] font-semibold text-[var(--accent)] hover:underline">Open</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      )}

      {mode === "listed" && listings && (
        <Card className="overflow-hidden">
          {listings.length === 0 ? <Empty>Not listed on the portals right now.</Empty> : listings.map((l, i) => (
            <div key={i} className="flex items-center gap-3 border-t border-[var(--hairline)] px-4 py-3 first:border-t-0">
              <div className="min-w-0 flex-1"><div className="truncate text-[13.5px] font-semibold">{l.title}</div><div className="text-[12px] text-[var(--text-muted)]">{[l.agency, l.agent, l.beds && `${l.beds} BR`].filter(Boolean).join(" · ")}</div></div>
              {l.price && <span className="figure text-[13px] font-semibold">{aed(l.price)}</span>}
              {l.url && <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)]" aria-label="Open listing"><ExternalLink size={15} /></a>}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
