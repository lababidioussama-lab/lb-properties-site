"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { History } from "lucide-react";

import { Card, Empty } from "../shared";
import { aed, ds, dsError, fullDate, type DsUnitResult, type DsUsage } from "./api";

export function DsUnit({ initial, onExpired, onUsage, onOpenOwner }: {
  initial: { code: string; place?: string | null } | null;
  onExpired: () => void;
  onUsage: (u: DsUsage, s?: { endsAt: number }) => void;
  onOpenOwner: (ref: string) => void;
}) {
  const [code, setCode] = useState(initial?.code ?? "");
  const [unit, setUnit] = useState<DsUnitResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBanks, setShowBanks] = useState(false);

  const look = useCallback(async (c: string, place?: string | null) => {
    if (!c.trim()) return;
    setBusy(true); setError(null);
    const r = await ds<{ unit: DsUnitResult }>("POST", "unit", { code: c.trim(), place: place ?? null });
    setBusy(false);
    if (!r.ok) {
      if (r.error === "ds_signin_required") return onExpired();
      return setError(r.error === "daily_limit" ? "You have used all your searches for today." : dsError(r.error));
    }
    setUnit(r.unit);
  }, [onExpired]);

  // Opened from an owner card: look the unit up straight away, in that building.
  useEffect(() => { if (initial?.code) void look(initial.code, initial.place); }, [initial, look]);

  const events = (unit?.events ?? []).filter((e) => showBanks || e.role !== "Mortgage");
  const banks = (unit?.events ?? []).filter((e) => e.role === "Mortgage").length;

  return (
    <div className="space-y-4">
      <form onSubmit={(e: FormEvent) => { e.preventDefault(); void look(code); }} className="flex h-[52px] overflow-hidden rounded-xl border border-[rgb(11_42_74/0.3)] bg-white">
        <label className="flex flex-1 items-center gap-3 px-4">
          <History size={18} className="text-[var(--accent)]" />
          <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={40} placeholder="Unit or plot code — e.g. 1405, BL474, DH2-XH101B" className="h-full flex-1 bg-transparent text-[14px] outline-none" aria-label="Unit or plot code" />
        </label>
        <button disabled={busy} className="bg-[var(--accent-solid)] px-7 text-[13px] font-semibold text-white disabled:opacity-60">{busy ? "Looking…" : "Look up"}</button>
      </form>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-[var(--bad)]">{error}</p>}
      {busy && <div className="h-56 animate-pulse rounded-xl bg-[rgb(15_23_42/0.06)]" />}

      {unit && !busy && !unit.chosen && (
        <Card className="p-5">
          {unit.places.length === 0 ? <Empty>No unit found for “{unit.code}”.</Empty> : (
            <>
              <h2 className="text-[14px] font-bold">Unit {unit.code} exists in {unit.places.length} places. Which one?</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {unit.places.map((p) => <button key={p} onClick={() => look(unit.code, p)} className="rounded-full border border-[var(--hairline-strong)] bg-white px-3.5 py-1.5 text-[13px] font-medium hover:border-[var(--accent)] hover:text-[var(--accent)]">{p}</button>)}
              </div>
            </>
          )}
        </Card>
      )}

      {unit && !busy && unit.chosen && (
        <div className="grid items-start gap-5 lg:grid-cols-[1.15fr_1fr]">
          <Card className="p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--violet)]">{unit.chosen}</p>
            <h2 className="mt-1 font-[family-name:var(--font-display)] text-[32px] font-semibold leading-none">Unit {unit.code}</h2>
            {unit.places.length > 1 && <button onClick={() => look(unit.code)} className="mt-2 text-[12.5px] font-semibold text-[var(--accent)] hover:underline">Different building</button>}

            <div className="mt-5 flex items-baseline justify-between"><h3 className="text-[13.5px] font-bold">Ownership, newest first</h3><span className="text-[12px] text-[var(--text-muted)]">Records to 30 Dec 2024</span></div>
            {events.length === 0 ? <Empty>No transactions recorded for this unit.</Empty> : (
              <ol className="mt-3">
                {events.map((e, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className={`mt-1 h-3.5 w-3.5 rounded-full border-[3px] ${e.role === "Buyer" && i === 0 ? "border-[var(--ok-bg)] bg-[var(--ok)]" : "border-[var(--neutral-bg)] bg-[var(--text-muted)]"}`} />
                      {i < events.length - 1 && <span className="w-0.5 flex-1 bg-[rgb(15_23_42/0.1)]" />}
                    </div>
                    <div className="flex-1 pb-5">
                      <div className="flex items-center justify-between gap-3"><strong className="text-[14px]">{e.name}</strong><span className="figure text-[12.5px] text-[var(--text-secondary)]">{fullDate(e.date) ?? "No date"}</span></div>
                      <div className="mt-1 flex items-center gap-2 text-[12.5px] text-[var(--text-secondary)]">
                        <span className="rounded-full border border-[var(--neutral-bd)] bg-[var(--neutral-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--neutral)]">{e.role === "Buyer" ? "Bought" : e.role === "Seller" ? "Sold" : e.role === "Mortgage" ? "Bank (mortgage)" : "Side not recorded"}</span>
                        {e.amount ? <span className="figure">{aed(e.amount)}</span> : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {banks > 0 && <button onClick={() => setShowBanks(!showBanks)} className="text-[12.5px] text-[var(--text-muted)] underline">{showBanks ? "Hide" : "Show"} {banks} bank record{banks > 1 ? "s" : ""} (mortgages). A bank is never shown as the owner.</button>}
          </Card>

          <Card className="p-5">
            <h3 className="text-[13.5px] font-bold">Owner now</h3>
            {!unit.current ? <Empty>unit_current_owner has no owner for this unit.</Empty> : (
              <>
                <div className="mt-3 text-[18px] font-bold">{unit.current.names.join(" & ") || "Name not recorded"}</div>
                <span className={`mt-2 inline-block rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold ${unit.current.confidence === "confirmed" ? "border-[var(--ok-bd)] bg-[var(--ok-bg)] text-[var(--ok)]" : "border-[var(--info-bd)] bg-[var(--info-bg)] text-[var(--info)]"}`}>
                  {unit.current.confidence === "confirmed" ? `Confirmed by sale${unit.current.date ? `, ${fullDate(unit.current.date)}` : ""}` : "Likely current — no dated sale to check against"}
                </span>
                <dl className="mt-4 space-y-2 text-[13px]">
                  {unit.current.amount ? <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Last price</dt><dd className="figure font-semibold">{aed(unit.current.amount)}</dd></div> : null}
                  {unit.current.landNumber ? <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Land number</dt><dd className="figure font-semibold">{unit.current.landNumber}</dd></div> : null}
                  <div className="flex justify-between"><dt className="text-[var(--text-secondary)]">Transactions on record</dt><dd className="figure font-semibold">{unit.current.transactions}</dd></div>
                </dl>
                {unit.current.ref && <button onClick={() => onOpenOwner(unit.current!.ref!)} className="mt-5 h-10 w-full rounded-lg bg-[var(--accent-solid)] text-[13px] font-semibold text-white hover:bg-[var(--accent-solid-hover)]">Open the owner</button>}
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
