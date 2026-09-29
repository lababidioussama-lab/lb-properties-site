"use client";

import { useState, type FormEvent } from "react";
import { Briefcase } from "lucide-react";

import { Card, Empty } from "../shared";
import { ds, dsError } from "./api";

interface Broker { name: string; company: string | null; phone: string | null; dial: string | null; nationality: string | null; brn: string | null; listings: number | null }

/** Registered brokers and agencies, from public listings. */
export function DsBrokers({ onExpired }: { onExpired: () => void }) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Broker[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(e: FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return setError(dsError("query_too_short"));
    setBusy(true); setError(null);
    const r = await ds<{ brokers: Broker[] }>("POST", "brokers", { q: q.trim() });
    setBusy(false);
    if (!r.ok) return r.error === "ds_signin_required" ? onExpired() : setError(dsError(r.error));
    setRows(r.brokers);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={run} className="flex h-[52px] overflow-hidden rounded-xl border border-[rgb(11_42_74/0.3)] bg-white">
        <label className="flex flex-1 items-center gap-3 px-4"><Briefcase size={18} className="text-[var(--accent)]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Broker or agency name, BRN or phone" maxLength={120} className="h-full flex-1 bg-transparent text-[14px] outline-none" aria-label="Broker or agency" /></label>
        <button disabled={busy} className="bg-[var(--accent-solid)] px-7 text-[13px] font-semibold text-white disabled:opacity-60">{busy ? "Searching…" : "Search"}</button>
      </form>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-[#a3261e]">{error}</p>}
      {rows && (
        <Card className="overflow-hidden">
          {rows.length === 0 ? <Empty>No broker found.</Empty> : (
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-[11.5px] text-[var(--text-muted)]"><th className="px-4 py-2.5 font-semibold">Broker</th><th className="px-2 py-2.5 font-semibold">Agency</th><th className="px-2 py-2.5 font-semibold">BRN</th><th className="px-2 py-2.5 font-semibold">Listings seen</th><th className="px-4 py-2.5 font-semibold">Phone</th></tr></thead>
              <tbody>{rows.map((b, i) => (
                <tr key={i} className="border-t border-[var(--hairline)]">
                  <td className="px-4 py-2.5"><div className="font-semibold">{b.name}</div><div className="text-[11.5px] text-[var(--text-muted)]">{b.nationality ?? ""}</div></td>
                  <td className="px-2 py-2.5">{b.company ?? "—"}</td>
                  <td className="figure px-2 py-2.5">{b.brn ?? "—"}</td>
                  <td className="figure px-2 py-2.5">{b.listings ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-2.5">{b.phone ? <span className="figure">{b.phone}</span> : "—"}
                    {b.dial && <span className="ms-2 inline-flex gap-2 text-[12px] font-semibold"><a href={`tel:+${b.dial}`} className="text-[var(--accent)] hover:underline">Call</a><a href={`https://wa.me/${b.dial}`} target="_blank" rel="noopener noreferrer" className="text-[#0a6b38] hover:underline">WhatsApp</a></span>}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Card>
      )}
      <p className="text-[12px] text-[var(--text-muted)]">Brokers' business numbers from their public listings. Searches are recorded like every DB Search lookup.</p>
    </div>
  );
}
