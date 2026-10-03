"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { BadgeCheck, MessageCircle, Phone } from "lucide-react";
import { DS_CLEAR, DS_GO, DS_INPUT, DS_ROW, DsBox } from "./ui";
import type { DsFound } from "./DsSearch";

import { ds, dsError, type DsPhoneResult, type DsUsage } from "./api";
import { DsResultsList } from "./DsResultsList";
import type { CardActions } from "./DsCardView";

/**
 * DB Search's Phone tab: reverse-search a number (the whole number, or at
 * least four of its digits) and reach every owner record that carries it.
 * A number on the broker register is flagged first, so nobody calls a broker
 * believing they are an owner.
 */
export function DsPhone({ onExpired, onUsage, onOpenLead, initialQuery = null, hideForm = false, onFound }: CardActions & {
  /** Smart search runs the lookup itself and shows only the results. */
  hideForm?: boolean;
  /** Told what the lookup found, once it has. */
  onFound?: (f: DsFound & { agent: string | null }) => void;
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
    onFound?.({ shown: r.strict.entries.length, withPhone: r.strict.entries.length, communities: [], agent: r.agent?.name ?? null });
  }

  useEffect(() => {
    if (initialQuery) void run(undefined, initialQuery);
  }, [initialQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const core = asked.replace(/\D/g, "").slice(-9);
  const agent = data?.agent;
  const summary = agent ? (
    <div className="rounded-xl border border-[var(--violet-bd)] bg-[var(--violet-bg)] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-md bg-[var(--accent-solid)] px-2 py-[3px] text-[11.5px] font-semibold text-white"><BadgeCheck size={12} /> Agent</span>
        <b className="text-[15px]">{agent.name}</b>
        {agent.company && <span className="text-[12.5px] text-[var(--text-muted)]">{agent.company}</span>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px]">
        <span className="figure font-semibold">{agent.phone}</span>
        {agent.brn && <span className="rounded-md border border-[var(--hairline-strong)] bg-white px-2 py-[3px] text-[11.5px] font-semibold text-[var(--text-muted)]">BRN {agent.brn}</span>}
        <a href={`https://wa.me/971${core}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--ok-bd)] bg-[var(--ok-bg)] px-2 text-[12px] font-semibold text-[var(--ok)]"><MessageCircle size={12} /> WhatsApp</a>
      </div>
      <p className="mt-2 text-[12px] text-[var(--text-muted)]">This number belongs to a licensed broker, not an owner.</p>
    </div>
  ) : null;

  return (
    <div className="space-y-4">
      {!hideForm && (
        <DsBox label="Phone number" icon={<Phone size={13} />}>
          <form onSubmit={run} className={DS_ROW}>
            <input type="tel" inputMode="tel" autoFocus value={q} onChange={(e) => setQ(e.target.value)} maxLength={24}
              placeholder="e.g. 050 123 4567 or +971 50 123 4567" className={DS_INPUT} aria-label="Phone number" />
            <button disabled={busy} className={DS_GO}><Phone size={15} /> {busy ? "Searching…" : "Search phone"}</button>
            <button type="button" onClick={() => { token.current++; setQ(""); setData(null); setAsked(""); setError(null); setBusy(false); }} className={DS_CLEAR}>Clear</button>
          </form>
        </DsBox>
      )}
      {error && <p role="alert" className="rounded-[10px] border border-[var(--bad-bd)] bg-[var(--bad-bg)] px-3 py-2 text-[13px] text-[var(--bad)]">{error}</p>}
      {busy && <div className="h-40 animate-pulse rounded-xl bg-[rgb(15_23_42/0.06)]" />}
      {data && !busy && (
        <DsResultsList key={asked} data={data} query={null} summary={summary} actions={{ onExpired, onUsage, onOpenLead }}
          emptyText={agent ? <p className="text-[13px] text-[var(--text-muted)]">No record carries this number.</p> : undefined} />
      )}
    </div>
  );
}
