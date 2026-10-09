"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Info } from "lucide-react";

import { DS_GO, DS_INPUT, DsBox } from "./ui";
import { ds, dsError, type DsUsage } from "./api";

const PAGE = 50;
const SERVER_CAP = 300; // owners_by_min_properties()'s own LIMIT

const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length ? (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() : "?";
};

/**
 * DB Search's Portfolio finder: owners holding several units at once — an
 * investor still buying, not a resident — ranked by how many they hold.
 * A leaderboard, not a card: tap a name to search it.
 */
export function DsPortfolio({ onExpired, onSearchName }: { onExpired: () => void; onUsage: (u: DsUsage, s?: { endsAt: number }) => void; onSearchName: (name: string) => void }) {
  const [minText, setMinText] = useState("4");
  const [owners, setOwners] = useState<{ name: string; units: number }[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [visible, setVisible] = useState(PAGE);
  const [asked, setAsked] = useState(4);

  const load = useCallback(async (min: number) => {
    setBusy(true); setError(null); setFilter(""); setVisible(PAGE);
    const r = await ds<{ owners: { name: string; units: number }[] }>("POST", "portfolio", { min });
    setBusy(false);
    if (r.ok) { setOwners(r.owners); setAsked(min); }
    else if (r.error === "ds_signin_required") onExpired();
    else setError(dsError(r.error));
  }, [onExpired]);
  useEffect(() => { void load(4); }, [load]);

  function find(e: FormEvent) {
    e.preventDefault();
    const min = Math.max(2, Math.min(50, parseInt(minText, 10) || 4));
    setMinText(String(min));
    void load(min);
  }

  const rows = (owners ?? []).filter((o) => !filter || o.name.toLowerCase().includes(filter.trim().toLowerCase()));
  const shown = rows.slice(0, visible);
  const remaining = rows.length - shown.length;

  return (
    <div className="space-y-4">
      <DsBox label="Portfolio finder">
        <form onSubmit={find} className="flex flex-wrap items-center gap-2">
          <input type="number" min={2} max={50} value={minText} onChange={(e) => setMinText(e.target.value)} aria-label="Minimum properties" placeholder="Minimum properties"
            className={`${DS_INPUT} !w-44`} />
          <button disabled={busy} className={DS_GO}>{busy ? "Finding…" : "Find"}</button>
        </form>
        {owners && owners.length > 0 && (
          <input value={filter} onChange={(e) => { setFilter(e.target.value); setVisible(PAGE); }} placeholder="Filter these results by name"
            className={`${DS_INPUT} mt-2`} />
        )}
      </DsBox>
      {error && <p role="alert" className="rounded-[10px] border border-[var(--bad-bd)] bg-[var(--bad-bg)] px-3 py-2 text-[13px] text-[var(--bad)]">{error}</p>}
      {busy && <div className="h-64 animate-pulse rounded-xl bg-[rgb(15_23_42/0.06)]" />}
      {owners && !busy && (
        owners.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--hairline-strong)] bg-white px-6 py-8 text-center text-[13.5px] text-[var(--text-muted)]">No owner holds {asked}+ properties. Try a lower minimum.</p> : (
          <div className="space-y-2">
            {owners.length >= SERVER_CAP && (
              <p className="flex gap-2 rounded-lg border border-[var(--hairline)] bg-[var(--surface-sunken)] px-3 py-2 text-[12.5px] text-[var(--text-secondary)]"><Info size={14} className="mt-0.5 shrink-0" /> Capped at the top {SERVER_CAP} by portfolio size. Raise the minimum to narrow this down.</p>
            )}
            <div className="flex justify-between text-[12px] text-[var(--text-muted)]"><span>Ranked by portfolio size</span><span><b className="text-[var(--text-primary)]">{shown.length}</b> of {rows.length} shown</span></div>
            {rows.length === 0 ? <p className="rounded-xl border border-dashed border-[var(--hairline-strong)] bg-white px-6 py-6 text-center text-[13px] text-[var(--text-muted)]">No name matches that filter.</p> : (
              <div className="overflow-hidden rounded-xl border border-[var(--hairline)] bg-white">
                {shown.map((o, i) => (
                  <button key={`${o.name}-${i}`} onClick={() => onSearchName(o.name)} title="Open in Search"
                    className={`flex w-full items-center gap-3 border-t border-[var(--hairline)] px-4 py-2.5 text-left first:border-t-0 hover:bg-[var(--surface-sunken)] ${i === 0 && !filter ? "bg-[var(--violet-bg)]" : ""}`}>
                    <span className="figure w-7 text-[12.5px] font-bold text-[var(--text-muted)]">{i + 1}</span>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--info-bg)] text-[11.5px] font-bold text-[var(--accent)]">{initials(o.name)}</span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{o.name}</span>
                    <span className="text-end"><span className="figure block text-[15px] font-bold text-[var(--accent)]">{o.units}</span><span className="text-[12px] font-medium tracking-wide text-[var(--text-muted)]">units</span></span>
                  </button>
                ))}
              </div>
            )}
            {remaining > 0 && (
              <button onClick={() => setVisible((v) => v + PAGE)} className="h-10 rounded-lg border border-[var(--hairline-strong)] bg-white px-4 text-[13px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]">
                Load {Math.min(PAGE, remaining)} more ({remaining} left)
              </button>
            )}
            <p className="text-[12px] text-[var(--text-muted)]">Counted by name, so two different people with the same name are added together.</p>
          </div>
        )
      )}
    </div>
  );
}
