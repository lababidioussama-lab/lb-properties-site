"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, MapPin, Palmtree, Phone, Search } from "lucide-react";

import { ds, dsError, type DsCommunityResult, type DsSearchResult, type DsUsage } from "./api";
import { DsResultsList } from "./DsResultsList";
import type { CardActions } from "./DsCardView";

/**
 * DB Search's Search tab: one box for a name, building, unit, villa or plot
 * code; "what we found" community chips; the Damac Lagoons sale history; the
 * count of empty records left out. A chip opens every record of that
 * community, exactly as tapping it does in DB Search.
 */

/* The twelve area chips DB Search offers under its search box. */
const AREAS: [string, string][] = [
  ["Damac Hills", "Damac Hills"], ["JVC", "Jumeirah Village Circle"], ["Business Bay", "Business Bay"], ["Marina", "Dubai Marina"],
  ["Palm", "Palm Jumeirah"], ["Downtown", "Downtown Dubai"], ["Dubai Hills", "Dubai Hills Estate"], ["Damac Hills 2", "Damac Hills 2"],
  ["Arabian Ranches", "Arabian Ranches"], ["JBR", "Jumeirah Beach Residence"], ["Creek Harbour", "Dubai Creek Harbour"], ["JLT", "Jumeirah Lake Towers"],
];

type Mode = { kind: "search"; q: string; includeEmpty: boolean } | { kind: "community"; name: string; includeEmpty: boolean; from: string | null };
type Result = { kind: "search"; data: DsSearchResult } | { kind: "community"; data: DsCommunityResult };

const chipCls = "inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--hairline-strong)] bg-white px-3 text-[12.5px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]";

export function DsSearch({ onExpired, onUsage, onOpenLead, onPhone, initialQuery = null }: CardActions & {
  initialQuery?: string | null;
  onUsage: (u: DsUsage, s?: { endsAt: number }) => void;
  /** Hand a number over to the Phone tab: smart_search does not search phone numbers. */
  onPhone: (q: string) => void;
}) {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sugg, setSugg] = useState<string[]>([]);
  const [suggOpen, setSuggOpen] = useState(false);
  const token = useRef(0);
  const suggSeq = useRef(0);
  const suggCache = useRef(new Map<string, string[]>());
  const typedRef = useRef(false);

  async function load(next: Mode) {
    const my = ++token.current;
    // A search drops any suggestion still on its way: it would reopen the box over the results.
    typedRef.current = false; suggSeq.current++;
    setMode(next); setBusy(true); setError(null); setSuggOpen(false);
    const r = next.kind === "search"
      ? await ds<DsSearchResult & { usage: DsUsage }>("POST", "search", { q: next.q, includeEmpty: next.includeEmpty })
      : await ds<DsCommunityResult & { usage: DsUsage }>("POST", "community", { name: next.name, includeEmpty: next.includeEmpty });
    if (my !== token.current) return; // a newer search started — drop this stale answer
    setBusy(false);
    if (!r.ok) {
      if (r.error === "ds_signin_required") return onExpired();
      return setError(r.error === "daily_limit" ? `You have used all ${r.limit} searches for today. They reset at midnight.` : dsError(r.error));
    }
    onUsage(r.usage, r.session);
    setResult(next.kind === "search" ? { kind: "search", data: r as unknown as DsSearchResult } : { kind: "community", data: r as unknown as DsCommunityResult });
  }

  function run(e?: FormEvent, forced?: string) {
    e?.preventDefault();
    const query = (forced ?? q).trim();
    if (query.length < 2) return setError(dsError("query_too_short"));
    if (forced) setQ(forced);
    void load({ kind: "search", q: query, includeEmpty: false });
  }

  // Opened from another tool with a name to look up: search it straight away.
  useEffect(() => {
    if (initialQuery) run(undefined, initialQuery);
  }, [initialQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Community suggestions while typing: 160 ms debounce, cached per query,
     a late answer for an older query is dropped. No counts: they come from a
     cached view that drifts from the live table. */
  useEffect(() => {
    const text = q.trim();
    if (!typedRef.current || text.length < 2) { suggSeq.current++; setSugg([]); return; }
    const t = setTimeout(async () => {
      if (!typedRef.current) return;
      const seq = ++suggSeq.current, key = text.toLowerCase();
      let items = suggCache.current.get(key);
      if (!items) {
        const r = await ds<{ items: { name: string }[] }>("POST", "suggest", { kind: "community", q: text });
        items = r.ok ? r.items.map((i) => i.name).slice(0, 12) : [];
        suggCache.current.set(key, items);
      }
      if (seq !== suggSeq.current) return;
      setSugg(items);
      setSuggOpen(items.length > 0);
    }, 160);
    return () => clearTimeout(t);
  }, [q]);

  const actions: CardActions = { onExpired, onUsage, onOpenLead };
  const isDigits = (s: string) => /^[\d+\s()-]{4,}$/.test(s.trim());

  const summary = (() => {
    if (!result || !mode) return null;
    if (result.kind === "community" && mode.kind === "community") {
      return (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#d3dde9] bg-[#eef2f7] px-4 py-3">
          <MapPin size={16} className="text-[#3d5a7a]" />
          <span className="text-[14px] font-semibold text-[#2c4561]">{mode.name}</span>
          {mode.from && <button onClick={() => { setQ(mode.from!); void load({ kind: "search", q: mode.from!, includeEmpty: false }); }} className="ms-auto inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--accent)] hover:underline"><ArrowLeft size={13} /> Back to “{mode.from}”</button>}
        </div>
      );
    }
    if (result.kind !== "search" || mode.kind !== "search") return null;
    const d = result.data;
    return (
      <div className="space-y-3">
        {d.communities.length > 0 && (
          <div className="rounded-xl border border-[var(--hairline)] bg-white p-3.5">
            <p className="mb-2 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">What we found — tap a community for all its records</p>
            <div className="flex flex-wrap gap-1.5">
              {d.communities.slice(0, 12).map((c) => (
                <button key={c.community} title={`${(c.ct || 0).toLocaleString("en-US")} records`} aria-label={`${c.community}, ${(c.ct || 0).toLocaleString("en-US")} records`} onClick={() => void load({ kind: "community", name: c.community, includeEmpty: false, from: mode.q })} className={chipCls}>
                  <MapPin size={12} /> {c.community}
                </button>
              ))}
            </div>
          </div>
        )}
        {d.damac.length > 0 && (
          <div className="rounded-xl border border-[var(--hairline)] bg-white p-3.5">
            <p className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]"><Palmtree size={13} /> Damac Lagoons — sale history</p>
            <div className="space-y-1 text-[12.5px] text-[var(--text-secondary)]">
              {d.damac.map((t, i) => (
                <div key={i}>
                  <b className="text-[var(--text-primary)]">{t.villa}</b> — {[t.sub_project, t.sale_type, t.sale_date, t.price != null ? `AED ${Number(t.price).toLocaleString("en-US")}` : "—",
                    t.bua_sqft != null ? `${Number(t.bua_sqft).toLocaleString("en-US")} sqft BUA` : null,
                    t.payment_method === "cash" ? "Cash" : t.mortgage_amount != null ? `Mortgage AED ${Number(t.mortgage_amount).toLocaleString("en-US")}` : null].filter(Boolean).join(" · ")}
                  {(t.times_sold ?? 0) > 1 && <b> (sold {t.times_sold}x)</b>}
                </div>
              ))}
            </div>
          </div>
        )}
        {d.hiddenEmpty > 0 && !mode.includeEmpty && (
          <p className="text-[12.5px] text-[var(--text-muted)]">{d.hiddenEmpty.toLocaleString("en-US")} record{d.hiddenEmpty === 1 ? "" : "s"} with no phone, email or unit not listed · <button onClick={() => void load({ ...mode, includeEmpty: true })} className="font-semibold text-[var(--accent)] hover:underline">show them</button></p>
        )}
      </div>
    );
  })();

  const shownQuery = mode?.kind === "search" ? mode.q : null;

  return (
    <div className="space-y-4">
      <div className="relative">
        <form onSubmit={run} role="search" className="flex h-[52px] overflow-hidden rounded-xl border border-[rgb(11_42_74/0.3)] bg-white shadow-[0_0_0_4px_rgb(11_42_74/0.05)]">
          <label className="flex flex-1 items-center gap-3 px-4">
            <Search size={18} className="text-[var(--accent)]" />
            <input autoFocus value={q} maxLength={120} autoComplete="off"
              onChange={(e) => { typedRef.current = true; setQ(e.target.value); }}
              onBlur={() => setTimeout(() => setSuggOpen(false), 200)}
              onFocus={() => setSuggOpen(sugg.length > 0)}
              placeholder="Name, building, unit, villa or plot code — e.g. DL-J439"
              className="h-full flex-1 bg-transparent text-[14px] outline-none" aria-label="Search owners" />
          </label>
          <button disabled={busy} className="bg-[var(--accent-solid)] px-7 text-[13px] font-semibold text-white transition hover:bg-[var(--accent-solid-hover)] disabled:opacity-60">
            {busy ? "Searching…" : "Search"}
          </button>
        </form>
        {suggOpen && sugg.length > 0 && (
          <ul role="listbox" className="absolute inset-x-0 top-[56px] z-20 overflow-hidden rounded-xl border border-[var(--hairline)] bg-white py-1 shadow-[0_12px_32px_rgb(15_23_42/0.14)]">
            {sugg.map((s) => (
              <li key={s}>
                <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => { typedRef.current = false; setSugg([]); run(undefined, s); }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-[13.5px] hover:bg-[var(--surface-sunken)]"><MapPin size={13} className="text-[var(--text-muted)]" /> {s}</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-[#a3261e]">{error}</p>}

      {!result && !busy && (
        <div className="rounded-xl border border-[var(--hairline)] bg-white p-4">
          <p className="mb-2.5 flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text-secondary)]"><MapPin size={13} /> Popular areas</p>
          <div className="flex flex-wrap gap-1.5">
            {AREAS.map(([label, full]) => <button key={label} onClick={() => run(undefined, full)} className={chipCls}>{label}</button>)}
          </div>
          <p className="mt-3 text-[12.5px] text-[var(--text-muted)]">Numbers stay hidden until you choose why you need them. Every search and reveal is recorded.</p>
        </div>
      )}

      {busy && (
        <div role="status" aria-live="polite" className="grid gap-3 xl:grid-cols-2">
          <span className="sr-only">Searching…</span>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2.5 rounded-xl border border-[var(--hairline)] bg-white p-4">
              <div className="h-4 w-2/5 animate-pulse rounded bg-[rgb(15_23_42/0.07)]" />
              <div className="flex gap-1.5">{[0, 1, 2].map((j) => <div key={j} className="h-5 w-20 animate-pulse rounded bg-[rgb(15_23_42/0.06)]" />)}</div>
              <div className="h-3 w-3/5 animate-pulse rounded bg-[rgb(15_23_42/0.06)]" />
            </div>
          ))}
        </div>
      )}

      {result && !busy && (
        <DsResultsList key={`${mode?.kind}:${mode?.kind === "search" ? mode.q : mode?.name}:${mode?.includeEmpty}`}
          data={result.data} query={shownQuery} summary={summary} actions={actions}
          emptyText={shownQuery && isDigits(shownQuery) ? (
            <>
              <p className="text-[14px] font-semibold">No records match “{shownQuery}”</p>
              <p className="mt-1 text-[12.5px] text-[var(--text-muted)]">Search looks at names, places and unit codes. To find who a number belongs to, use the Phone tab.</p>
              <button onClick={() => onPhone(shownQuery)} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent-solid)] px-3.5 text-[12.5px] font-semibold text-white"><Phone size={13} /> Search this number</button>
            </>
          ) : undefined} />
      )}
    </div>
  );
}
