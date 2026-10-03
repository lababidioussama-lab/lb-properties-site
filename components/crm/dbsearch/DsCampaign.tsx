"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Check, MessageCircle, Plus, Search, Send, ShieldCheck } from "lucide-react";

import { api } from "../shared";
import type { CrmTemplate } from "@/lib/crm";
import { ds, dsError, type DsCard, type DsSearchResult, type DsUsage } from "./api";
import { DS_CHIP, DS_CLEAR, DS_GO, DS_INPUT, DS_ROW, DsBox } from "./ui";

/**
 * DB Search's WhatsApp campaign, the safe way it recommends: find the people,
 * write one message, then send it one tap per contact from your own WhatsApp.
 * Numbers stay hidden until the tap: each send reveals that one number with
 * the reason "owner outreach", counts towards the daily reveal limit, is
 * recorded, and skips anyone on the do-not-contact list. Nothing is sent
 * automatically.
 *
 * Message placeholders: {name} {community} {building} {unit}, and
 * {Hi|Hello|Hey} gives each person a different variation.
 */
type Recipient = { key: string; ref: string | null; phone: string | null; name: string; community: string; building: string; unit: string; on: boolean };
type Sent = "sent" | "dnc" | "failed";

/* The server locks an agent after 15 numbers in 10 minutes; stay under it. */
const PACE_MAX = 14;
const PACE_MS = 10 * 60_000;

/* First name, written normally: records often carry names in capitals. */
const first = (n: string) => {
  const w = n.trim().split(/\s+/)[0] ?? n;
  return w === w.toUpperCase() ? w.charAt(0) + w.slice(1).toLowerCase() : w;
};
function fill(body: string, r: Recipient, seed: number, agent = "") {
  let i = 0;
  const spun = body.replace(/\{([^{}]*\|[^{}]*)\}/g, (_, alts: string) => {
    const opts = alts.split("|");
    return opts[(seed + i++) % opts.length].trim();
  });
  return spun
    .replaceAll("{name}", r.name ? first(r.name) : "")
    .replaceAll("{agent}", agent)
    .replaceAll("{community}", r.community)
    .replaceAll("{building}", r.building || r.community)
    .replaceAll("{unit}", r.unit)
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
const digitsOf = (s: string) => s.replace(/\D/g, "");
const toDial = (s: string) => {
  const d = digitsOf(s);
  if (d.startsWith("00")) return d.slice(2);
  if (d.startsWith("971")) return d;
  if (d.startsWith("0")) return `971${d.slice(1)}`;
  return d.length === 9 ? `971${d}` : d;
};

const KEEP = "ds:campaign";

export function DsCampaign({ onExpired, onUsage, meName = "" }: { onExpired: () => void; onUsage: (u: DsUsage, s?: { endsAt: number }) => void; /** Fills {agent} in CRM templates. */ meName?: string }) {
  const agent = first(meName);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<Recipient[]>([]);
  const [manual, setManual] = useState("");
  const [templates, setTemplates] = useState<CrmTemplate[]>([]);
  const [msg, setMsg] = useState("{Hi|Hello|Good day} {name}, this is Lababidi Properties. We have buyers asking about {building}. Would you consider an offer on unit {unit}?");
  const [queue, setQueue] = useState<Recipient[] | null>(null);
  const [state, setState] = useState<Record<string, Sent>>({});
  const [working, setWorking] = useState<string | null>(null);
  const sends = useRef<number[]>([]);
  const [, tick] = useState(0);

  /* The campaign survives leaving the page: the list, the message and who
     was already messaged are kept for this browser tab, so going back to
     Search, opening a record or a session timeout does not wipe the work. */
  const restored = useRef(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEEP) ?? "null") as { list: Recipient[]; msg: string; queue: Recipient[] | null; state: Record<string, Sent> } | null;
      if (saved) { setList(saved.list ?? []); if (saved.msg) setMsg(saved.msg); setQueue(saved.queue ?? null); setState(saved.state ?? {}); }
    } catch {}
    restored.current = true;
  }, []);
  useEffect(() => {
    if (!restored.current) return;
    try { sessionStorage.setItem(KEEP, JSON.stringify({ list, msg, queue, state })); } catch {}
  }, [list, msg, queue, state]);

  useEffect(() => {
    void api<{ rows: CrmTemplate[] }>("GET", "data/templates").then((r) => r.ok && setTemplates(r.rows ?? []));
    const t = window.setInterval(() => tick((n) => n + 1), 15_000);
    return () => window.clearInterval(t);
  }, []);

  async function find(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (query.length < 2) return setError("Type a name, building, community or unit.");
    setBusy(true); setError(null);
    const r = await ds<DsSearchResult & { usage: DsUsage }>("POST", "search", { q: query, includeEmpty: false });
    setBusy(false);
    if (!r.ok) return r.error === "ds_signin_required" ? onExpired() : setError(dsError(r.error));
    onUsage(r.usage, r.session);
    const seen = new Set(list.map((x) => x.key));
    const fresh: Recipient[] = [];
    for (const e of r.strict.entries) {
      const c: DsCard | undefined = r.cards[e.c];
      if (!c || c.phoneCount < 1 || seen.has(c.ref)) continue;
      seen.add(c.ref);
      fresh.push({ key: c.ref, ref: c.ref, phone: null, name: c.name, community: c.model.community ?? "", building: c.model.building ?? "", unit: c.model.badge?.v ?? "", on: !c.inCrm });
    }
    if (!fresh.length) setError(`No one with a number for “${query}”.`);
    setList((all) => [...all, ...fresh]);
  }

  async function addNumbers() {
    let nums = manual.split(/[\n,;]+/).map((s) => s.trim()).filter((s) => digitsOf(s).length >= 9);
    if (!nums.length) return setError("Type at least one full number, e.g. 0501234567.");
    setError(null);
    // Hand-typed numbers are checked against the do-not-contact list too.
    const check = await ds<{ blocked: string[] }>("POST", "dnc", { phones: nums.map(toDial) });
    if (!check.ok) return check.error === "ds_signin_required" ? onExpired() : setError(dsError(check.error));
    const blocked = new Set(check.blocked.map((p) => p.slice(-9)));
    const before = nums.length;
    nums = nums.filter((n) => !blocked.has(toDial(n).slice(-9)));
    if (before !== nums.length) setError(`${before - nums.length} number${before - nums.length === 1 ? " is" : "s are"} on the do-not-contact list and ${before - nums.length === 1 ? "was" : "were"} left out.`);
    if (!nums.length) return;
    setList((all) => {
      const have = new Set(all.map((x) => x.key));
      return [...all, ...nums.filter((n) => !have.has(`n:${toDial(n)}`)).map((n) => ({ key: `n:${toDial(n)}`, ref: null, phone: toDial(n), name: "", community: "", building: "", unit: "", on: true }))];
    });
    setManual("");
  }

  const chosen = list.filter((x) => x.on);
  const preview = chosen[0] ? fill(msg, chosen[0], 0, agent) : null;
  const recent = sends.current.filter((t) => Date.now() - t < PACE_MS);
  const waitMin = recent.length >= PACE_MAX ? Math.ceil((PACE_MS - (Date.now() - recent[0])) / 60_000) : 0;

  async function send(r: Recipient, i: number) {
    const text = fill(msg, r, i, agent);
    if (r.phone) {
      window.open(`https://wa.me/${r.phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
      setState((s) => ({ ...s, [r.key]: "sent" }));
      return;
    }
    setWorking(r.key);
    const x = await ds<{ dial: string | null; usage: DsUsage }>("POST", "reveal", { ref: r.ref, index: 0, kind: "phone", reason: "owner_outreach" });
    setWorking(null);
    if (!x.ok) {
      if (x.error === "ds_signin_required") return onExpired();
      if (x.error === "do_not_contact") return setState((s) => ({ ...s, [r.key]: "dnc" }));
      setState((s) => ({ ...s, [r.key]: "failed" }));
      return setError(x.error === "daily_limit" ? `You have used all ${x.limit} reveals for today. They reset at midnight.` : dsError(x.error));
    }
    onUsage(x.usage, x.session);
    sends.current = [...recent, Date.now()];
    if (!x.dial) return setState((s) => ({ ...s, [r.key]: "failed" }));
    window.open(`https://wa.me/${x.dial}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    setState((s) => ({ ...s, [r.key]: "sent" }));
  }

  const place = (r: Recipient) => [r.unit && `Unit ${r.unit}`, r.building, r.community].filter(Boolean).join(", ");
  const done = queue ? queue.filter((r) => state[r.key]).length : 0;

  return (
    <div className="space-y-4">
      <DsBox label="1. Find recipients: name, building, community or unit" icon={<Search size={13} />}>
        <form onSubmit={find} className={DS_ROW}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Ghalia, Damac Lagoons, Binghatti Corner" className={DS_INPUT} aria-label="Find recipients" />
          <button disabled={busy} className={DS_GO}><Search size={15} /> {busy ? "Finding…" : "Find contacts"}</button>
        </form>
        <div className={`${DS_ROW} mt-2`}>
          <textarea value={manual} onChange={(e) => setManual(e.target.value)} rows={1} placeholder="…or type numbers, comma or new line: 0501234567, 971551234567"
            className={`${DS_INPUT} !h-auto min-h-11 py-2.5`} aria-label="Phone numbers" />
          <button type="button" onClick={() => void addNumbers()} className={DS_CLEAR}><Plus size={14} /> Add numbers</button>
        </div>
        {error && <p role="alert" className="mt-2 text-[13px] text-[var(--bad)]">{error}</p>}

        {list.length > 0 && (
          <div className="mt-3 overflow-hidden rounded-[10px] border border-[var(--hairline)]">
            <div className="flex items-center gap-3 border-b border-[var(--hairline)] px-3 py-2 text-[12px] text-[var(--text-muted)]">
              <span className="flex-1"><b className="text-[var(--text-primary)]">{chosen.length}</b> of {list.length} selected. Anyone already in the CRM starts unticked.</span>
              <button onClick={() => setList((l) => l.map((x) => ({ ...x, on: true })))} className="font-semibold text-[var(--accent)] hover:underline">All</button>
              <button onClick={() => setList((l) => l.map((x) => ({ ...x, on: false })))} className="font-semibold text-[var(--accent)] hover:underline">None</button>
              <button onClick={() => { setList([]); setQueue(null); setState({}); try { sessionStorage.removeItem(KEEP); } catch {} }} className="font-semibold text-[var(--text-muted)] hover:underline">Clear list</button>
            </div>
            <ul className="max-h-[280px] overflow-y-auto">
              {list.map((r) => (
                <li key={r.key} className="flex items-center gap-3 border-b border-[var(--hairline-soft)] px-3 py-2 text-[13px] last:border-0">
                  <input type="checkbox" checked={r.on} onChange={() => setList((l) => l.map((x) => (x.key === r.key ? { ...x, on: !x.on } : x)))} className="h-4 w-4 accent-[var(--accent-solid)]" aria-label={`Include ${r.name || r.phone}`} />
                  <span className="min-w-0 flex-1 truncate"><b>{r.name || <span className="figure">+{r.phone}</span>}</b>{place(r) && <span className="text-[var(--text-muted)]"> · {place(r)}</span>}</span>
                  {r.ref && <span className="figure text-[11.5px] text-[var(--text-muted)]">number hidden</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </DsBox>

      <DsBox label="2. Message: {name} {community} {building} {unit}; {Hi|Hello} gives each person a different word" icon={<MessageCircle size={13} />}>
        {templates.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {templates.slice(0, 10).map((t) => <button key={t.id} onClick={() => setMsg(t.body)} className={DS_CHIP}>{t.name}</button>)}
          </div>
        )}
        <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3} className={`${DS_INPUT} !h-auto py-2.5`} aria-label="Message" />
        {preview && (
          <p className="mt-2 rounded-[10px] border border-[var(--hairline)] bg-[var(--input-bg)] px-3 py-2 text-[13px] text-[var(--text-secondary)]">
            <span className="ds-label me-2 !text-[10px]">Preview</span>{preview}
          </p>
        )}
      </DsBox>

      <div className="rounded-[10px] border border-[rgb(31_157_87/0.5)] bg-[rgb(31_157_87/0.08)] px-3.5 py-2.5 text-[12.5px] text-[var(--text-secondary)]">
        <b className="text-[var(--wa)]">Safest way, no ban risk.</b> Each tap opens the chat with your message ready, and you press send yourself, like a normal person.
      </div>
      <button disabled={!chosen.length || !msg.trim()} onClick={() => { setQueue(chosen); setState({}); }}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#1f9d57] text-[14px] font-bold text-white transition hover:brightness-110 disabled:opacity-50">
        <Send size={15} /> Manual send: one tap per contact ({chosen.length})
      </button>

      {queue && (
        <section className="panel overflow-hidden">
          <div className="flex items-center gap-3 border-b border-[var(--hairline)] px-4 py-2.5">
            <p className="ds-label flex-1">Send list</p>
            <span className="figure text-[12px] text-[var(--text-muted)]">{done}/{queue.length} done</span>
          </div>
          {waitMin > 0 && (
            <p className="flex gap-2 border-b border-[var(--hairline)] bg-[var(--warn-bg)] px-4 py-2 text-[12.5px] text-[var(--warn)]">
              <ShieldCheck size={14} className="mt-0.5 shrink-0" /> 14 numbers in 10 minutes. Wait about {waitMin} min before the next one, so DB Search does not lock your account.
            </p>
          )}
          <ul>
            {queue.map((r, i) => {
              const st = state[r.key];
              return (
                <li key={r.key} className="flex items-center gap-3 border-b border-[var(--hairline-soft)] px-4 py-2.5 last:border-0">
                  <span className="figure w-6 text-[12px] text-[var(--text-muted)]">{i + 1}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{r.name || `+${r.phone}`}</span>
                    <span className="block truncate text-[12px] text-[var(--text-muted)]">{fill(msg, r, i, agent)}</span>
                  </span>
                  {st === "sent" ? <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--ok)]"><Check size={14} /> Opened</span>
                    : st === "dnc" ? <span className="text-[12px] font-semibold text-[var(--bad)]">Do not contact</span>
                    : (
                      <button disabled={working === r.key || (!!r.ref && waitMin > 0)} onClick={() => void send(r, i)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-[8px] border border-[rgb(37_211_102/0.34)] bg-[rgb(37_211_102/0.09)] px-3 text-[12px] font-semibold text-[var(--wa)] transition hover:bg-[rgb(37_211_102/0.18)] disabled:opacity-50">
                        <MessageCircle size={13} /> {working === r.key ? "Opening…" : st === "failed" ? "Try again" : "WhatsApp"}
                      </button>
                    )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
