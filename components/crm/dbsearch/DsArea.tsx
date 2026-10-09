"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { MapPin, Send } from "lucide-react";

import { Card, Empty, BTN } from "../shared";
import { STATUS_LABEL, STATUS_STYLE, ds, dsError, monthYear, type DsHit, type DsUsage } from "./api";

type AreaHit = DsHit & { optedOut: boolean };

/** A building or community as a calling list: pick owners, send them to Temp leads with numbers still hidden. */
export function DsArea({ onExpired, onUsage, onOpenOwner }: { onExpired: () => void; onUsage: (u: DsUsage, s?: { endsAt: number }) => void; onOpenOwner: (ref: string) => void }) {
  const [q, setQ] = useState("");
  const [suggestions, setSuggestions] = useState<{ name: string; meta: string }[]>([]);
  const [area, setArea] = useState<string | null>(null);
  const [data, setData] = useState<{ total: number; hits: AreaHit[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notInCrm, setNotInCrm] = useState(true);
  const [abroad, setAbroad] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [list, setList] = useState("");
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) { setSuggestions([]); return; }
    const t = window.setTimeout(async () => {
      const r = await ds<{ items: { name: string; meta: string }[] }>("POST", "suggest", { kind: "community", q });
      if (r.ok) setSuggestions(r.items);
    }, 250);
    return () => window.clearTimeout(t);
  }, [q]);

  async function load(name: string, e?: FormEvent) {
    e?.preventDefault();
    if (name.trim().length < 3) return setError(dsError("query_too_short"));
    setArea(name); setSuggestions([]); setBusy(true); setError(null); setResult(null); setPicked(new Set());
    const r = await ds<{ total: number; hits: AreaHit[] }>("POST", "area", { area: name });
    setBusy(false);
    if (!r.ok) return r.error === "ds_signin_required" ? onExpired() : setError(dsError(r.error));
    setData(r);
    setList(`${name} · ${new Date().toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`);
  }

  const shown = useMemo(() => (data?.hits ?? []).filter((h) =>
    !h.optedOut && (!notInCrm || !h.inCrm) && (!abroad || h.phones.some((p) => p.region === "abroad"))), [data, notInCrm, abroad]);

  function toggle(ref: string) {
    setPicked((s) => { const n = new Set(s); if (n.has(ref)) n.delete(ref); else n.add(ref); return n; });
  }

  async function send() {
    setBusy(true); setError(null);
    const r = await ds<{ added: number; skipped: number; capped: number; usage: DsUsage }>("POST", "area_send", { refs: [...picked], list });
    setBusy(false);
    if (!r.ok) return r.error === "ds_signin_required" ? onExpired() : setError(r.error === "daily_limit" ? `You have sent your ${r.limit} owners for today. The limit resets at midnight.` : dsError(r.error));
    onUsage(r.usage, r.session);
    setResult(`${r.added} owner${r.added === 1 ? "" : "s"} added to Temp leads${r.skipped ? `, ${r.skipped} skipped (already in the CRM, on the do-not-contact list, or no number)` : ""}${r.capped ? `, ${r.capped} not sent: daily limit reached` : ""}.`);
    setPicked(new Set());
  }

  return (
    <div className="space-y-4">
      <form onSubmit={(e) => load(q, e)} className="relative">
        <div className="flex h-[52px] overflow-hidden rounded-xl border border-[rgb(11_42_74/0.3)] bg-white">
          <label className="flex flex-1 items-center gap-3 px-4"><MapPin size={18} className="text-[var(--accent)]" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Community or building — e.g. Marina Gate 2, Damac Lagoons" className="h-full flex-1 bg-transparent text-[14px] outline-none" aria-label="Community or building" /></label>
          <button disabled={busy} className="bg-[var(--accent-solid)] px-7 text-[13px] font-semibold text-white disabled:opacity-60">{busy ? "Loading…" : "Show owners"}</button>
        </div>
        {suggestions.length > 0 && (
          <ul className="absolute inset-x-0 top-[56px] z-10 overflow-hidden rounded-xl border border-[var(--hairline)] bg-white shadow-[var(--shadow-lift)]">
            {suggestions.map((s) => <li key={s.name}><button type="button" onClick={() => { setQ(s.name); void load(s.name); }} className="flex w-full justify-between px-4 py-2.5 text-start text-[13px] hover:bg-[var(--accent-wash)]"><span className="font-medium">{s.name}</span><span className="text-[var(--text-muted)]">{s.meta}</span></button></li>)}
          </ul>
        )}
      </form>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-[var(--bad)]">{error}</p>}
      {result && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">{result}</p>}
      {busy && !data && <div className="h-64 animate-pulse rounded-xl bg-[rgb(15_23_42/0.06)]" />}

      {data && area && (
        <div className="grid items-start gap-5 lg:grid-cols-[1fr_300px]">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-4 px-4 py-3 text-[13px]">
              <strong>{shown.length} owners with a number</strong>
              <span className="text-[var(--text-muted)]">in {area} · {data.total} found · opted-out numbers never shown</span>
              <label className="ms-auto flex items-center gap-2"><input type="checkbox" checked={notInCrm} onChange={(e) => setNotInCrm(e.target.checked)} /> Not in the CRM</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={abroad} onChange={(e) => setAbroad(e.target.checked)} /> Number outside the UAE</label>
            </div>
            {shown.length === 0 ? <Empty>No owners to call here with these filters.</Empty> : (
              <div className="max-h-[560px] overflow-y-auto">
                <table className="w-full text-[13px]">
                  <thead className="sticky top-0 bg-[var(--surface-sunken)]"><tr className="text-left text-[11.5px] text-[var(--text-muted)]">
                    <th className="w-10 px-4 py-2.5"><input type="checkbox" aria-label="Select all shown" checked={shown.length > 0 && shown.every((h) => picked.has(h.ref))} onChange={(e) => setPicked(e.target.checked ? new Set(shown.slice(0, 100).map((h) => h.ref)) : new Set())} /></th>
                    <th className="px-2 py-2.5 font-semibold">Owner</th><th className="px-2 py-2.5 font-semibold">Unit</th><th className="px-2 py-2.5 font-semibold">Since</th><th className="px-2 py-2.5 font-semibold">Phone</th><th />
                  </tr></thead>
                  <tbody>
                    {shown.map((h) => (
                      <tr key={h.ref} className="border-t border-[var(--hairline)]">
                        <td className="px-4 py-2.5"><input type="checkbox" aria-label={`Select ${h.name}`} checked={picked.has(h.ref)} onChange={() => toggle(h.ref)} /></td>
                        <td className="px-2 py-2.5"><div className="font-semibold">{h.name}</div><span className={`mt-0.5 inline-block rounded-full border px-2 py-0.5 text-[10.5px] font-semibold ${STATUS_STYLE[h.status]}`}>{STATUS_LABEL[h.status]}</span></td>
                        <td className="figure px-2 py-2.5">{h.property.unit ?? "—"}<div className="text-[11.5px] text-[var(--text-muted)]">{h.property.building ?? ""}</div></td>
                        <td className="figure whitespace-nowrap px-2 py-2.5">{monthYear(h.statusDate) ?? <span className="text-[var(--text-muted)]">No date</span>}</td>
                        <td className="figure whitespace-nowrap px-2 py-2.5 tracking-wide">{h.phones[0]?.masked}</td>
                        <td className="px-2 py-2.5 text-end"><button onClick={() => onOpenOwner(h.ref)} className="text-[12.5px] font-semibold text-[var(--accent)] hover:underline">Open</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card className="space-y-4 p-5">
            <div><p className="text-[12px] font-medium text-[var(--violet)]">Send to Temp leads</p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-[24px] font-semibold leading-tight">Make a calling list</h2></div>
            <label className="block"><span className="mb-1.5 block text-[12px] font-semibold text-[var(--text-secondary)]">List name</span>
              <input value={list} onChange={(e) => setList(e.target.value)} maxLength={80} className="h-10 w-full rounded-lg border border-[var(--hairline-strong)] px-3 text-[13px] outline-none focus:border-[var(--accent)]" /></label>
            <p className="rounded-lg bg-[var(--surface-sunken)] px-3 py-2.5 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">Owners already in the CRM or on the do-not-contact list are skipped. Each one counts towards your daily list limit.</p>
            <button onClick={send} disabled={busy || picked.size === 0} className={`${BTN} w-full`}><Send size={15} /> Send {picked.size || ""} to Temp leads</button>
          </Card>
        </div>
      )}
    </div>
  );
}
