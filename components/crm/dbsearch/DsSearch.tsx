"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Search } from "lucide-react";

import { Card, Empty } from "../shared";
import { STATUS_LABEL, STATUS_STYLE, aed, ds, dsError, monthYear, sizeText, type DsHit, type DsUsage } from "./api";

type Who = "current" | "confirmed" | "all";
const PAGE = 25;

export function DsSearch({ onExpired, onUsage, onOpenOwner, initialQuery = null }: {
  initialQuery?: string | null;
  onExpired: () => void;
  onUsage: (u: DsUsage, s?: { endsAt: number }) => void;
  onOpenOwner: (ref: string) => void;
}) {
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ hits: DsHit[]; total: number; hiddenPast: number } | null>(null);
  const [who, setWho] = useState<Who>("current");
  const [hasPhone, setHasPhone] = useState(false);
  const [abroad, setAbroad] = useState(false);
  const [notInCrm, setNotInCrm] = useState(false);
  const [hideConflicts, setHideConflicts] = useState(true);
  const [beds, setBeds] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  // Opened from another tool with a name to look up: search it straight away.
  useEffect(() => {
    if (initialQuery) { setQ(initialQuery); void run(undefined, initialQuery); }
  }, [initialQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(e?: FormEvent, forced?: string) {
    e?.preventDefault();
    const query = (forced ?? q).trim();
    if (query.length < 2) return setError(dsError("query_too_short"));
    setBusy(true); setError(null);
    const r = await ds<{ hits: DsHit[]; total: number; hiddenPast: number; usage: DsUsage }>("POST", "search", { q: query });
    setBusy(false);
    if (!r.ok) {
      if (r.error === "ds_signin_required") return onExpired();
      return setError(r.error === "daily_limit" ? `You have used all ${r.limit} searches for today. They reset at midnight.` : dsError(r.error));
    }
    setAsked(query); setData(r); setPage(0); setBeds(null);
    onUsage(r.usage, r.session);
  }

  const bedOptions = useMemo(() => [...new Set((data?.hits ?? []).map((h) => h.property.beds).filter((b): b is string => !!b))].sort(), [data]);

  const shown = useMemo(() => (data?.hits ?? []).filter((h) => {
    if (who === "confirmed" && h.status !== "confirmed") return false;
    if (who === "current" && (h.status === "previous" || h.status === "sold")) return false;
    if (hasPhone && !h.phones.length) return false;
    if (abroad && !h.phones.some((p) => p.region === "abroad")) return false;
    if (notInCrm && h.inCrm) return false;
    if (hideConflicts && h.notes.length) return false;
    if (beds && h.property.beds !== beds) return false;
    return true;
  }), [data, who, hasPhone, abroad, notInCrm, beds, hideConflicts]);
  const conflicting = (data?.hits ?? []).filter((h) => h.notes.length).length;

  const pages = Math.max(1, Math.ceil(shown.length / PAGE));
  const slice = shown.slice(page * PAGE, page * PAGE + PAGE);

  const chip = (on: boolean) => `h-8 rounded-full border px-3 text-[12.5px] font-medium transition ${on ? "border-[var(--accent-solid)] bg-[var(--accent-solid)] text-white" : "border-[var(--hairline-strong)] bg-white text-[var(--text-secondary)] hover:border-[var(--accent)]"}`;

  return (
    <div className="space-y-4">
      <form onSubmit={run} role="search" className="flex h-[52px] overflow-hidden rounded-xl border border-[rgb(11_42_74/0.3)] bg-white shadow-[0_0_0_4px_rgb(11_42_74/0.05)]">
        <label className="flex flex-1 items-center gap-3 px-4">
          <Search size={18} className="text-[var(--accent)]" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} maxLength={120}
            placeholder="Name, phone, unit, plot or building — e.g. Marina Gate 2 1405"
            className="h-full flex-1 bg-transparent text-[14px] outline-none" aria-label="Search owners" />
        </label>
        <button disabled={busy} className="bg-[var(--accent-solid)] px-7 text-[13px] font-semibold text-white transition hover:bg-[var(--accent-solid-hover)] disabled:opacity-60">
          {busy ? "Searching…" : "Search"}
        </button>
      </form>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-[#a3261e]">{error}</p>}

      {!data && !busy && (
        <Card className="p-8 text-center text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
          Search a <strong>name</strong>, a <strong>phone number</strong>, a <strong>unit or plot code</strong> (1405, BL474, 394-2829) or a <strong>building</strong>.
          <br />Numbers stay hidden until you open an owner and reveal one.
        </Card>
      )}
      {busy && <div className="h-64 animate-pulse rounded-xl bg-[rgb(15_23_42/0.06)]" />}

      {data && !busy && (
        <div className="grid items-start gap-5 lg:grid-cols-[240px_1fr]">
          <Card className="space-y-5 p-4">
            <div>
              <p className="mb-2 text-[12px] font-semibold text-[var(--text-secondary)]">Who to show</p>
              {([["current", "Current and likely owners"], ["confirmed", "Confirmed current only"], ["all", "Include past owners"]] as const).map(([v, label]) => (
                <label key={v} className="flex items-center gap-2 py-1 text-[13px]"><input type="radio" name="who" checked={who === v} onChange={() => { setWho(v); setPage(0); }} /> {label}</label>
              ))}
            </div>
            {bedOptions.length > 1 && (
              <div>
                <p className="mb-2 text-[12px] font-semibold text-[var(--text-secondary)]">Bedrooms</p>
                <div className="flex flex-wrap gap-1.5">
                  {bedOptions.map((b) => <button key={b} onClick={() => { setBeds(beds === b ? null : b); setPage(0); }} className={chip(beds === b)}>{b}</button>)}
                </div>
              </div>
            )}
            <div className="space-y-2 text-[13px]">
              <label className="flex items-center gap-2"><input type="checkbox" checked={hasPhone} onChange={(e) => { setHasPhone(e.target.checked); setPage(0); }} /> Has a phone number</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={abroad} onChange={(e) => { setAbroad(e.target.checked); setPage(0); }} /> Number outside the UAE</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={notInCrm} onChange={(e) => { setNotInCrm(e.target.checked); setPage(0); }} /> Not already in the CRM</label>
              <label className="flex items-start gap-2"><input type="checkbox" className="mt-1" checked={hideConflicts} onChange={(e) => { setHideConflicts(e.target.checked); setPage(0); }} /> <span>Hide records whose files disagree{conflicting ? <span className="text-[var(--text-muted)]"> ({conflicting})</span> : null}</span></label>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[13.5px]">
              <div>
                <strong className="figure">{shown.length}</strong> shown for “{asked}”
                <span className="text-[var(--text-muted)]"> · {data.total} records matched{data.total > data.hits.length ? `, first ${data.hits.length} loaded` : ""}{who !== "all" && data.hiddenPast ? ` · ${data.hiddenPast} past owners hidden` : ""}</span>
              </div>
            </div>
            {slice.length === 0 ? <Empty>No owners match these filters.</Empty> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-[13px]">
                  <thead><tr className="text-left text-[11.5px] text-[var(--text-muted)]">
                    <th className="px-4 py-2.5 font-semibold">Owner</th><th className="px-4 py-2.5 font-semibold">Unit</th><th className="px-4 py-2.5 font-semibold">Property</th>
                    <th className="px-4 py-2.5 font-semibold">Bought</th><th className="px-4 py-2.5 font-semibold">Phone</th><th className="px-4 py-2.5" />
                  </tr></thead>
                  <tbody>
                    {slice.map((h) => (
                      <tr key={h.ref} className="border-t border-[var(--hairline)] align-middle">
                        <td className="px-4 py-3">
                          <div className="font-semibold">{h.name}</div>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[h.status]}`}>{STATUS_LABEL[h.status]}</span>
                            {h.notes.length > 0 && <span title={h.notes.join(" ")} className="rounded-full border border-[#e6d5b0] bg-[#fff7e6] px-2 py-0.5 text-[11px] font-semibold text-[#8a5a00]">Records disagree</span>}
                            {h.inCrm && <span className="rounded-full border border-[#e6d5b0] bg-[#f7f0e2] px-2 py-0.5 text-[11px] font-semibold text-[#7a5c26]">{h.inCrm.kind === "lead" ? "Lead" : h.inCrm.kind === "contact" ? "Contact" : "Temp lead"} · {h.inCrm.mine ? "you" : h.inCrm.ownerName ?? "unassigned"}</span>}
                          </div>
                        </td>
                        <td className="figure px-4 py-3"><strong>{h.property.unit ?? "—"}</strong><div className="text-[12px] text-[var(--text-muted)]">{h.property.building ?? h.property.community ?? ""}</div></td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{[h.property.beds, h.property.type, sizeText(h.property.size)].filter(Boolean).join(" · ") || "—"}</td>
                        <td className="figure whitespace-nowrap px-4 py-3">{monthYear(h.statusDate ?? h.property.date) ?? <span className="text-[var(--text-muted)]">No date</span>}<div className="text-[12px] text-[var(--text-muted)]">{h.property.price ? aed(h.property.price, true) : ""}</div></td>
                        <td className="whitespace-nowrap px-4 py-3">{h.phones[0] ? <span className="figure tracking-wide">{h.phones[0].masked}{h.phones.length > 1 && <span className="ms-1 text-[11.5px] text-[var(--text-muted)]">+{h.phones.length - 1}</span>}</span> : <span className="text-[12.5px] text-[var(--text-muted)]">No number</span>}</td>
                        <td className="px-4 py-3 text-end"><button onClick={() => onOpenOwner(h.ref)} className="rounded-lg border border-[var(--hairline-strong)] bg-white px-3 py-1.5 text-[12.5px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]">Open</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-[var(--hairline)] px-4 py-3 text-[12.5px]">
              <span className="text-[var(--text-muted)]">Phone numbers stay hidden until you open an owner and reveal one.</span>
              {pages > 1 && (
                <span className="figure flex items-center gap-2">
                  {page * PAGE + 1}–{Math.min(shown.length, (page + 1) * PAGE)} of {shown.length}
                  <button disabled={page === 0} onClick={() => setPage(page - 1)} className={chip(false)}>Previous</button>
                  <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className={chip(false)}>Next</button>
                </span>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
