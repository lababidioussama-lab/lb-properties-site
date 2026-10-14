"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Building2, Filter, Hash, MapPin, Ruler, Search, Users } from "lucide-react";

import { ds, dsError, type DsCard, type DsCommunityResult, type DsResults, type DsUsage } from "./api";
import { DS_GO, DS_INPUT, DsBox } from "./ui";
import { DsResultsList } from "./DsResultsList";
import type { CardActions } from "./DsCardView";

/**
 * DB Search's "Filter by Area" page, as on dbsearchdubai.com: pick a community,
 * optionally narrow it by size (sq m) and by what the unit or plot code
 * contains, then Show Records. A premises number (DM no-sub no, e.g. 591-3019)
 * is looked up on its own, without a community, exactly as the original does.
 */

const DM = /^\s*\d{1,6}[-/]\d{1,6}\s*$/;
const SQFT_PER_SQM = 10.7639;

/** A card's size in square metres, whichever unit the record used. */
function sqm(c: DsCard): number | null {
  const s = c.model.size ?? c.model.plotArea;
  if (!s || !Number.isFinite(s.v)) return null;
  return /ft/i.test(s.u) ? s.v / SQFT_PER_SQM : s.v;
}

/** Keep only the records that pass, in both of DB Search's views (strict and "show anyway"). */
function narrow(data: DsResults, keep: (c: DsCard) => boolean): DsResults {
  const ok = (e: { c: number }) => keep(data.cards[e.c]);
  return { ...data, strict: { ...data.strict, entries: data.strict.entries.filter(ok) }, loose: { ...data.loose, entries: data.loose.entries.filter(ok) } };
}

export function DsFilter({ onExpired, onUsage, onOpenLead, onCallingList }: CardActions & { onCallingList: () => void }) {
  const [area, setArea] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [sugg, setSugg] = useState<{ name: string; meta?: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [unit, setUnit] = useState("");
  const [dm, setDm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ title: string; data: DsResults; query: string | null } | null>(null);
  const typing = useRef(false);

  useEffect(() => {
    if (!typing.current || area.trim().length < 2 || picked === area) { setSugg([]); return; }
    const t = window.setTimeout(async () => {
      const r = await ds<{ items: { name: string; meta?: string }[] }>("POST", "suggest", { kind: "community", q: area.trim() });
      if (r.ok) { setSugg(r.items.slice(0, 12)); setOpen(true); }
    }, 220);
    return () => window.clearTimeout(t);
  }, [area, picked]);

  async function show(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    // A premises number is looked up on its own: it finds the building or plot even when the community is not known.
    if (DM.test(dm)) {
      setBusy(true);
      const r = await ds<DsResults & { usage: DsUsage }>("POST", "search", { q: dm.trim(), includeEmpty: false });
      setBusy(false);
      if (!r.ok) return r.error === "ds_signin_required" ? onExpired() : setError(dsError(r.error));
      if (r.usage) onUsage(r.usage, r.session);
      return setResult({ title: `Premises number ${dm.trim()}`, data: r, query: dm.trim() });
    }
    if (dm.trim()) return setError("A premises number looks like 591-3019: two numbers joined by a dash.");
    if (!picked) return setError("Type an area above and tap a suggestion first, or enter a premises number instead.");
    setBusy(true);
    const r = await ds<DsCommunityResult & { usage: DsUsage }>("POST", "community", { name: picked, includeEmpty: false });
    setBusy(false);
    if (!r.ok) return r.error === "ds_signin_required" ? onExpired() : setError(dsError(r.error));
    if (r.usage) onUsage(r.usage, r.session);
    setResult({ title: picked, data: r, query: null });
  }

  /* Size and unit narrow what the community returned, instantly, as the original does on the page. */
  const shown = useMemo(() => {
    if (!result) return null;
    const lo = parseFloat(min), hi = parseFloat(max), u = unit.trim().toLowerCase();
    if (!Number.isFinite(lo) && !Number.isFinite(hi) && !u) return result.data;
    return narrow(result.data, (c) => {
      if (Number.isFinite(lo) || Number.isFinite(hi)) {
        const s = sqm(c);
        if (s == null || (Number.isFinite(lo) && s < lo) || (Number.isFinite(hi) && s > hi)) return false;
      }
      if (u) {
        const codes = [c.model.badge?.v, ...c.model.lines.flatMap((l) => l.parts.map((p) => p.v))].filter(Boolean).join(" ").toLowerCase();
        if (!codes.includes(u)) return false;
      }
      return true;
    });
  }, [result, min, max, unit]);

  const label = "mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--text-muted)]";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="display flex items-center gap-2 text-[28px] leading-tight text-[var(--text-primary)]"><Filter size={20} className="text-[var(--accent)]" /> Filter by area</h2>
        <p className="mt-1 text-[13px] text-[var(--text-muted)]">Pick a community to see exactly what we have there.</p>
      </div>

      <DsBox label="Filter" icon={<Filter size={13} />}>
        <form onSubmit={show} className="space-y-3.5">
          <div className="relative">
            <p className={label}><MapPin size={12} /> Area or community: start typing</p>
            <input value={area} autoComplete="off" spellCheck={false} placeholder="Damac Hills, Marina, JVC…" className={DS_INPUT} aria-label="Area or community"
              onChange={(e) => { typing.current = true; setArea(e.target.value); setPicked(null); }}
              onFocus={() => setOpen(sugg.length > 0)} onBlur={() => setTimeout(() => setOpen(false), 180)} />
            {open && sugg.length > 0 && (
              <ul role="listbox" className="absolute inset-x-0 top-[74px] z-30 max-h-72 overflow-y-auto rounded-[10px] border border-[var(--hairline)] bg-[var(--surface-solid)] py-1 shadow-[var(--shadow-pop)]">
                {sugg.map((s) => (
                  <li key={s.name}>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { typing.current = false; setArea(s.name); setPicked(s.name); setOpen(false); setError(null); }}
                      className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-[13.5px] hover:bg-[var(--surface-hover)]">
                      <span className="font-medium text-[var(--text-primary)]">{s.name}</span>{s.meta && <span className="text-[12px] text-[var(--text-muted)]">{s.meta}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {picked && <p className="mt-1.5 text-[12px] font-semibold text-[var(--ok)]">Selected: {picked}. Now tap Show records.</p>}
          </div>

          <div>
            <p className={label}><Ruler size={12} /> Size, sq m (optional)</p>
            <div className="grid grid-cols-2 gap-2">
              <input inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Min" className={DS_INPUT} aria-label="Minimum size in square metres" />
              <input inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value.replace(/[^\d.]/g, ""))} placeholder="Max" className={DS_INPUT} aria-label="Maximum size in square metres" />
            </div>
          </div>

          <div>
            <p className={label}><Building2 size={12} /> Unit or plot contains (optional)</p>
            <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="V-7, 501, BL661" className={DS_INPUT} aria-label="Unit or plot contains" />
          </div>

          <div>
            <p className={label}><Hash size={12} /> Premises number, DM no-sub no (optional)</p>
            <input value={dm} onChange={(e) => setDm(e.target.value)} placeholder="591-3019" className={DS_INPUT} aria-label="Premises number" />
          </div>

          {error && <p role="alert" className="rounded-[10px] border border-[var(--bad-bd)] bg-[var(--bad-bg)] px-3 py-2 text-[13px] text-[var(--bad)]">{error}</p>}

          <div className="flex flex-col gap-2 sm:flex-row">
            <button disabled={busy} className={`${DS_GO} flex-1 justify-center`}><Search size={15} /> {busy ? "Loading…" : "Show records"}</button>
            <button type="button" onClick={onCallingList} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[10px] border border-[var(--hairline)] px-4 text-[13px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"><Users size={14} /> Calling list for an area</button>
          </div>
        </form>
      </DsBox>

      {busy && !result && <div className="h-64 animate-pulse rounded-xl bg-[var(--surface-hover)]" />}
      {result && shown && (
        <DsResultsList key={`${result.title}`} data={shown} query={result.query} actions={{ onExpired, onUsage, onOpenLead }}
          summary={<p className="text-[15px] font-bold text-[var(--text-primary)]"><MapPin size={14} className="me-1 inline text-[var(--accent)]" />{result.title}</p>}
          emptyText={<><p className="text-[14px] font-semibold">No records match these filters</p><p className="mt-1 text-[12.5px] text-[var(--text-muted)]">Widen the size range or clear the unit filter.</p></>} />
      )}
    </div>
  );
}
