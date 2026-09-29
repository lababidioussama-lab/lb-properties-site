"use client";

import { useCallback, useEffect, useState } from "react";
import { Info } from "lucide-react";

import { Card, Empty } from "../shared";
import { ds, dsError, type DsUsage } from "./api";

/** People who own several units — the investors. */
export function DsPortfolio({ onExpired, onSearchName }: { onExpired: () => void; onUsage: (u: DsUsage, s?: { endsAt: number }) => void; onSearchName: (name: string) => void }) {
  const [min, setMin] = useState(5);
  const [owners, setOwners] = useState<{ name: string; units: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = useCallback(async (m: number) => {
    setOwners(null); setError(null);
    const r = await ds<{ owners: { name: string; units: number }[] }>("POST", "portfolio", { min: m });
    if (r.ok) setOwners(r.owners);
    else if (r.error === "ds_signin_required") onExpired();
    else setError(dsError(r.error));
  }, [onExpired]);
  useEffect(() => { void load(min); }, [load, min]);

  const shown = (owners ?? []).filter((o) => !filter || o.name.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[13px] font-semibold text-[var(--text-secondary)]">Owns at least</span>
        {[3, 5, 10, 20].map((m) => (
          <button key={m} onClick={() => setMin(m)} className={`h-9 rounded-full border px-4 text-[13px] font-semibold ${min === m ? "border-[var(--accent-solid)] bg-[var(--accent-solid)] text-white" : "border-[var(--hairline-strong)] bg-white"}`}>{m} units</button>
        ))}
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name" className="ms-auto h-9 w-56 rounded-lg border border-[var(--hairline-strong)] bg-white px-3 text-[13px] outline-none focus:border-[var(--accent)]" />
      </div>
      <div className="flex gap-2.5 rounded-xl border border-[var(--hairline)] bg-[var(--surface-sunken)] px-4 py-3 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
        <Info size={15} className="mt-0.5 shrink-0" />
        Counted by <strong>name</strong>, so two different people with the same name are added together. Open one to see the units linked by the same phone number — that is the reliable picture.
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-[#a3261e]">{error}</p>}
      {!owners && !error && <div className="h-64 animate-pulse rounded-xl bg-[rgb(15_23_42/0.06)]" />}
      {owners && (
        <Card className="overflow-hidden">
          {shown.length === 0 ? <Empty>No owners match.</Empty> : (
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-[11.5px] text-[var(--text-muted)]"><th className="px-4 py-2.5 font-semibold">Owner</th><th className="px-4 py-2.5 font-semibold">Units on record</th><th /></tr></thead>
              <tbody>
                {shown.slice(0, 150).map((o) => (
                  <tr key={o.name} className="border-t border-[var(--hairline)]">
                    <td className="px-4 py-2.5 font-semibold">{o.name}</td>
                    <td className="figure px-4 py-2.5">{o.units}</td>
                    <td className="px-4 py-2.5 text-end"><button onClick={() => onSearchName(o.name)} className="rounded-lg border border-[var(--hairline-strong)] bg-white px-3 py-1.5 text-[12.5px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]">Search this name</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
