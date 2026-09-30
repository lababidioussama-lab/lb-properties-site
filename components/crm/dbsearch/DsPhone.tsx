"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { BadgeCheck, MessageCircle, Phone } from "lucide-react";

import { ds, dsError, type DsPhoneResult, type DsUsage } from "./api";
import { DsResultsList } from "./DsResultsList";
import type { CardActions } from "./DsCardView";

/**
 * DB Search's Phone tab: reverse-search a number (the whole number, or at
 * least four of its digits) and reach every owner record that carries it.
 * A number on the broker register is flagged first, so nobody calls a broker
 * believing they are an owner.
 */
export function DsPhone({ onExpired, onUsage, onOpenLead, initialQuery = null }: CardActions & {
  initialQuery?: string | null;
  onUsage: (u: DsUsage, s?: { endsAt: number }) => void;
}) {
  const [q, setQ] = useState("");
  const [asked, setAsked] = useState("");
  const [data, setData] = useState<DsPhoneResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = useRef(0);

  async function run(e?: FormEvent, forced?: string) {
    e?.preventDefault();
    const query = (forced ?? q).trim();
    if (query.replace(/\D/g, "").length < 4) return setError("Type at least four digits of the number.");
    if (forced) setQ(forced);
    const my = ++token.current;
    setBusy(true); setError(null);
    const r = await ds<DsPhoneResult & { usage: DsUsage }>("POST", "phone", { q: query });
    if (my !== token.current) return;
    setBusy(false);
    if (!r.ok) {
      if (r.error === "ds_signin_required") return onExpired();
      return setError(r.error === "daily_limit" ? `You have used all ${r.limit} searches for today. They reset at midnight.` : dsError(r.error));
    }
    onUsage(r.usage, r.session);
    setAsked(query); setData(r);
  }

  useEffect(() => {
    if (initialQuery) void run(undefined, initialQuery);
  }, [initialQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const core = asked.replace(/\D/g, "").slice(-9);
  const agent = data?.agent;
  const summary = agent ? (
    <div className="rounded-xl border border-[#e6d5b0] bg-[#f7f0e2] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-solid)] px-2 py-[3px] text-[11.5px] font-semibold text-white"><BadgeCheck size={12} /> Agent</span>
        <b className="text-[15px]">{agent.name}</b>
        {agent.company && <span className="text-[12.5px] text-[var(--text-muted)]">{agent.company}</span>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
        <span className="figure font-semibold">{agent.phone}</span>
        {agent.brn && <span className="rounded-md border border-[var(--hairline-strong)] bg-white px-2 py-[3px] text-[11.5px] font-semibold text-[var(--text-muted)]">BRN {agent.brn}</span>}
        <a href={`https://wa.me/971${core}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-7 items-center gap-1 rounded-md border border-[#bfdcca] bg-[#e8f3ec] px-2 text-[12px] font-semibold text-[#1f6b3f]"><MessageCircle size={12} /> WhatsApp</a>
      </div>
      <p className="mt-2 text-[12px] text-[var(--text-muted)]">This number belongs to a licensed broker, not an owner.</p>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      <form onSubmit={run} role="search" className="flex h-[52px] overflow-hidden rounded-xl border border-[rgb(11_42_74/0.3)] bg-white shadow-[0_0_0_4px_rgb(11_42_74/0.05)]">
        <label className="flex flex-1 items-center gap-3 px-4">
          <Phone size={18} className="text-[var(--accent)]" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} maxLength={30} inputMode="tel"
            placeholder="Phone number — e.g. 050 123 4567, or at least 4 digits"
            className="h-full flex-1 bg-transparent text-[14px] outline-none" aria-label="Phone number" />
        </label>
        <button disabled={busy} className="bg-[var(--accent-solid)] px-7 text-[13px] font-semibold text-white transition hover:bg-[var(--accent-solid-hover)] disabled:opacity-60">
          {busy ? "Searching…" : "Search"}
        </button>
      </form>
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-[#a3261e]">{error}</p>}
      {!data && !busy && (
        <p className="rounded-xl border border-[var(--hairline)] bg-white p-4 text-[12.5px] text-[var(--text-muted)]">Reverse-search any number and reach the owner. Every owner record carrying it is listed.</p>
      )}
      {busy && <div className="h-40 animate-pulse rounded-xl bg-[rgb(15_23_42/0.06)]" />}
      {data && !busy && (
        <DsResultsList key={asked} data={data} query={null} summary={summary} actions={{ onExpired, onUsage, onOpenLead }}
          emptyText={agent ? <p className="text-[13px] text-[var(--text-muted)]">No owner record carries this number.</p> : undefined} />
      )}
    </div>
  );
}
