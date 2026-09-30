"use client";

import { useState, type FormEvent } from "react";
import { MessageCircle, Phone, UserPlus } from "lucide-react";

import { ds, dsError } from "./api";

interface Contact { phone: string | null; dial: string | null; company: string | null; brn: string | null }
interface Broker { name: string; company: string | null; nationality: string | null; brn: string | null; contactCount: number; contacts: Contact[] }

const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/**
 * DB Search's Agents tab: licensed brokers from the register. One card per
 * person — the same broker often holds several numbers across branches, and
 * a card each made them look like different people.
 */
export function DsBrokers({ onExpired }: { onExpired: () => void }) {
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState("");
  const [rows, setRows] = useState<Broker[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(e: FormEvent) {
    e.preventDefault();
    if (q.trim().length < 2) return setError("Type at least 2 letters of a name.");
    setBusy(true); setError(null);
    const r = await ds<{ brokers: Broker[] }>("POST", "brokers", { q: q.trim() });
    setBusy(false);
    if (!r.ok) return r.error === "ds_signin_required" ? onExpired() : setError(dsError(r.error));
    setAsked(q.trim()); setRows(r.brokers);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={run} className="flex h-[52px] overflow-hidden rounded-xl border border-[rgb(11_42_74/0.3)] bg-white shadow-[0_0_0_4px_rgb(11_42_74/0.05)]">
        <label className="flex flex-1 items-center gap-3 px-4"><UserPlus size={18} className="text-[var(--accent)]" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Agent name" maxLength={120} className="h-full flex-1 bg-transparent text-[14px] outline-none" aria-label="Agent name" /></label>
        <button disabled={busy} className="bg-[var(--accent-solid)] px-7 text-[13px] font-semibold text-white disabled:opacity-60">{busy ? "Searching…" : "Search"}</button>
      </form>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-[var(--bad)]">{error}</p>}
      {busy && <div className="h-40 animate-pulse rounded-xl bg-[rgb(15_23_42/0.06)]" />}
      {rows && !busy && (rows.length === 0
        ? <p className="rounded-xl border border-dashed border-[var(--hairline-strong)] bg-white px-6 py-8 text-center text-[13.5px] text-[var(--text-muted)]">No agent found for “{asked}”.</p>
        : (
          <>
            <p className="text-[12.5px] font-semibold text-[var(--text-secondary)]">{rows.length} agent{rows.length > 1 ? "s" : ""} found</p>
            <div className="grid items-start gap-3 xl:grid-cols-2">
              {rows.map((a, i) => (
                <article key={i} className="flex gap-3 rounded-xl border border-[var(--hairline)] bg-white p-4">
                  <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[var(--info-bg)] text-[12.5px] font-bold text-[var(--accent)]">{initials(a.name)}</div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[15px] font-semibold">{a.name}</h3>
                    {a.company && <p className="text-[12.5px] text-[var(--text-muted)]">{a.company}</p>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {a.nationality && <span className="rounded-md border border-[var(--hairline-strong)] px-2 py-[3px] text-[11.5px] font-semibold">{a.nationality}</span>}
                      {a.brn && <span className="rounded-md border border-[var(--hairline-strong)] bg-[var(--surface-sunken)] px-2 py-[3px] text-[11.5px] font-semibold text-[var(--text-muted)]">BRN {a.brn}</span>}
                      {a.contactCount > 1 && <span className="rounded-md border border-[var(--info-bd)] bg-[var(--info-bg)] px-2 py-[3px] text-[11.5px] font-semibold text-[var(--info)]">{a.contactCount} numbers</span>}
                    </div>
                    <div className="mt-2 divide-y divide-[var(--hairline)] border-t border-[var(--hairline)]">
                      {a.contacts.map((c, j) => (
                        <div key={j} className="flex flex-wrap items-center gap-2 py-2">
                          <span className="figure text-[13.5px] font-semibold">{c.phone ?? "—"}</span>
                          {c.dial && <>
                            <a href={`tel:+${c.dial}`} className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--hairline-strong)] px-2 text-[12px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"><Phone size={12} /> Call</a>
                            <a href={`https://wa.me/${c.dial}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--ok-bd)] bg-[var(--ok-bg)] px-2 text-[12px] font-semibold text-[var(--ok)]"><MessageCircle size={12} /> WhatsApp</a>
                          </>}
                          {a.contacts.length > 1 && c.company && <span className="basis-full text-[11.5px] text-[var(--text-muted)]">{c.company}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        ))}
      <p className="text-[12px] text-[var(--text-muted)]">Licensed brokers' business numbers from the broker register. Searches are recorded like every DB Search lookup.</p>
    </div>
  );
}
