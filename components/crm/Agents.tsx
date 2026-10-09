"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Check, ExternalLink, FileText, MessageCircle, Newspaper, ShieldCheck, X } from "lucide-react";
import type { CrmLead, CrmListing } from "@/lib/crm";
import { api, BTN, BTN_GHOST, Card, CardHead, Chip, Empty, INPUT, stamp, type Tone } from "./shared";

/* ----------------------------------------------------------------- types */

type Kind = "reply" | "listing" | "briefing";
interface Proposal {
  id: string; created_at: string; kind: Kind; title: string;
  target: { type: string; id: string | null; label: string };
  draft: Record<string, unknown>; facts: Record<string, unknown>;
  tokens: { in: number; out: number }; by: string | null;
  decision?: { outcome: "approved" | "rejected"; at: string; by: string | null; final?: Record<string, unknown>; applied?: string; note?: string };
}
interface Desk {
  configured: boolean; model: string; waiting: Proposal[]; decided: Proposal[];
  usage: { drafts_today: number; cap: number; tokens_24h: { in: number; out: number } };
}

const WHO: Record<Kind, { name: string; icon: typeof Bot; tone: Tone }> = {
  reply: { name: "Reply helper", icon: MessageCircle, tone: "info" },
  listing: { name: "Listing agent", icon: FileText, tone: "ok" },
  briefing: { name: "Daily briefing", icon: Newspaper, tone: "warn" },
};

const ERRORS: Record<string, string> = {
  daily_cap: "The agents have reached today's limit of drafts. It resets at midnight, Dubai time.",
  do_not_contact: "This person asked not to be contacted, so no draft is made for them.",
  not_configured: "The AI key is not set on this server yet (ANTHROPIC_API_KEY).",
  upstream: "Claude did not answer. Wait a moment and try again.",
  empty: "Claude gave an empty answer. Try again.",
  not_found: "That item no longer exists.",
  already_decided: "This draft has already been decided.",
};
const explain = (e?: string) => ERRORS[e ?? ""] ?? `Something went wrong (${e ?? "unknown"}). Try again.`;

const ago = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago`;
};
const text = (v: unknown) => (typeof v === "string" ? v : "");

/* ----------------------------------------------------------------- view */

/** Everything the AI agents have prepared, waiting for the owner. Nothing here has happened yet. */
export function AgentsView({ leads, listings, userName, onChanged }: {
  leads: CrmLead[]; listings: CrmListing[]; userName: (id: string | null) => string; onChanged: () => void;
}) {
  const [desk, setDesk] = useState<Desk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; link?: string } | null>(null);

  const load = useCallback(async () => {
    const r = await api<Desk>("GET", "agents");
    if (r.ok) { setDesk(r as Desk); setError(null); } else setError(r.error ?? "unknown");
  }, []);
  useEffect(() => { void load(); }, [load]);
  const changed = useCallback(() => { void load(); onChanged(); }, [load, onChanged]);

  if (error && !desk) return <Card className="p-4 text-[13px] text-[var(--bad)]">Could not load the agents ({error}).</Card>;
  if (!desk) return <div className="panel h-64 animate-pulse" />;

  return (
    <div className="space-y-6">
      <Card className="flex items-start gap-3 p-5">
        <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[var(--ok)]" />
        <div className="text-[13.5px] leading-relaxed">
          <div className="font-bold text-[var(--text-primary)]">The agents only prepare. You decide.</div>
          <p className="mt-0.5 text-[var(--text-secondary)]">
            Each agent writes a draft from facts already in the CRM and puts it here. Nothing is sent to anyone, published or changed until you read it, edit it if you like and press Approve.
            Reject throws it away. Every decision is recorded.
          </p>
        </div>
      </Card>

      {!desk.configured && <Card className="p-4 text-[13px] text-[var(--warn)]">{explain("not_configured")}</Card>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Waiting for you" value={String(desk.waiting.length)} alert={desk.waiting.length > 0} />
        <Stat label="Drafts today" value={`${desk.usage.drafts_today} of ${desk.usage.cap}`} />
        <Stat label="Claude, last 24 h" value={`${Math.round((desk.usage.tokens_24h.in + desk.usage.tokens_24h.out) / 1000)}k tokens`} hint="The exact spend is on the Anthropic console." />
      </div>

      <Ask leads={leads} listings={listings} disabled={!desk.configured} onDone={changed} />

      {notice && (
        <Card className="flex flex-wrap items-center gap-3 !border-[var(--ok-bd)] p-4 text-[13px]">
          <Check size={16} className="text-[var(--ok)]" />
          <span className="min-w-0 flex-1">{notice.text}</span>
          {notice.link && <a href={notice.link} target="_blank" rel="noopener noreferrer" className={BTN}><MessageCircle size={14} /> Open WhatsApp to send it</a>}
          <button onClick={() => setNotice(null)} className={BTN_GHOST}>Dismiss</button>
        </Card>
      )}

      <section aria-label="Waiting for your decision" className="space-y-3">
        <h2 className="ds-label">waiting for your decision</h2>
        {desk.waiting.length === 0
          ? <Card><Empty icon={<Bot size={18} />}>Nothing is waiting. Ask an agent above to prepare something.</Empty></Card>
          : desk.waiting.map((p) => <ProposalCard key={p.id} p={p} onDone={(n) => { setNotice(n); changed(); }} />)}
      </section>

      <Card>
        <CardHead title="Decided" count={desk.decided.length ? `last ${desk.decided.length}` : undefined} />
        {desk.decided.length === 0 ? <Empty>No decisions yet.</Empty> : (
          <ul>
            {desk.decided.map((p) => {
              const d = p.decision!;
              const shown = text(d.final?.reply) || text(d.final?.briefing) || text(d.final?.description_en);
              return (
                <li key={p.id} className="border-b border-[var(--hairline-soft)] px-5 py-3 text-[13px] last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={d.outcome === "approved" ? "ok" : "neutral"}>{d.outcome === "approved" ? "Approved" : "Rejected"}</Chip>
                    <span className="min-w-0 flex-1 truncate font-medium">{p.title}</span>
                    <span className="figure text-[11.5px] text-[var(--text-muted)]">{stamp(d.at)} · {userName(d.by)}</span>
                  </div>
                  {d.applied && <p className="mt-1 text-[12px] text-[var(--text-secondary)]">{d.applied}</p>}
                  {shown && <p className="mt-1 line-clamp-2 text-[12px] text-[var(--text-muted)]">{shown}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Stat({ label, value, alert, hint }: { label: string; value: string; alert?: boolean; hint?: string }) {
  return (
    <Card className="px-5 py-4" >
      <div className="text-[12px] font-medium text-[var(--text-secondary)]">{label}</div>
      <div className={`figure mt-2 text-[16px] font-semibold leading-none sm:text-[24px] ${alert ? "text-[var(--warn)]" : "text-[var(--accent)]"}`}>{value}</div>
      {hint && <div className="mt-1.5 text-[11px] text-[var(--text-muted)]">{hint}</div>}
    </Card>
  );
}

/* ------------------------------------------------------------ asking */

function Ask({ leads, listings, disabled, onDone }: { leads: CrmLead[]; listings: CrmListing[]; disabled: boolean; onDone: () => void }) {
  const [lead, setLead] = useState("");
  const [goal, setGoal] = useState("");
  const [listing, setListing] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function run(which: string, body: Record<string, unknown>) {
    setBusy(which); setMsg(null);
    const r = await api("POST", "agents", body);
    setBusy(null);
    if (r.ok) onDone(); else setMsg(explain(r.error));
  }

  const openLeads = leads.filter((l) => !["won", "lost"].includes(l.stage)).sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 80);
  const recentListings = [...listings].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 80);

  return (
    <section aria-label="Ask an agent" className="space-y-3">
      <h2 className="ds-label">ask an agent</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-[14px] font-bold"><MessageCircle size={16} /> Reply helper</div>
          <p className="text-[12.5px] text-[var(--text-secondary)]">Drafts a short WhatsApp reply to someone who contacted you. You send it yourself.</p>
          <select value={lead} onChange={(e) => setLead(e.target.value)} className={INPUT} aria-label="Lead">
            <option value="">Choose a lead…</option>
            {openLeads.map((l) => <option key={l.id} value={l.id}>{l.full_name} · {l.stage}</option>)}
          </select>
          <input value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={300} placeholder="What should the reply achieve? (optional)" className={INPUT} />
          <button disabled={disabled || !lead || busy !== null} onClick={() => run("reply", { action: "draft_reply", lead_id: lead, goal })} className={BTN}>
            {busy === "reply" ? "Drafting…" : "Draft a reply"}
          </button>
        </Card>
        <Card className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-[14px] font-bold"><FileText size={16} /> Listing agent</div>
          <p className="text-[12.5px] text-[var(--text-secondary)]">Writes the advert title and the English and Arabic description from the listing's facts.</p>
          <select value={listing} onChange={(e) => setListing(e.target.value)} className={INPUT} aria-label="Listing">
            <option value="">Choose a listing…</option>
            {recentListings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
          <button disabled={disabled || !listing || busy !== null} onClick={() => run("listing", { action: "draft_listing", listing_id: listing })} className={BTN}>
            {busy === "listing" ? "Drafting…" : "Draft the advert text"}
          </button>
        </Card>
        <Card className="space-y-3 p-5">
          <div className="flex items-center gap-2 text-[14px] font-bold"><Newspaper size={16} /> Daily briefing</div>
          <p className="text-[12.5px] text-[var(--text-secondary)]">Reads the CRM now and writes what to do first today. You choose whether it is emailed to you.</p>
          <button disabled={disabled || busy !== null} onClick={() => run("briefing", { action: "briefing" })} className={BTN}>
            {busy === "briefing" ? "Preparing…" : "Prepare today's briefing"}
          </button>
        </Card>
      </div>
      {msg && <p role="alert" className="text-[12.5px] text-[var(--bad)]">{msg}</p>}
    </section>
  );
}

/* ---------------------------------------------------------- one draft */

function ProposalCard({ p, onDone }: { p: Proposal; onDone: (n: { text: string; link?: string }) => void }) {
  const who = WHO[p.kind];
  const [reply, setReply] = useState(text(p.draft.reply));
  const [title, setTitle] = useState(text(p.draft.title));
  const [en, setEn] = useState(text(p.draft.description_en));
  const [ar, setAr] = useState(text(p.draft.description_ar));
  const [brief, setBrief] = useState(text(p.draft.briefing));
  const [email, setEmail] = useState(false);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const final = p.kind === "reply" ? { reply } : p.kind === "listing" ? { title, description_en: en, description_ar: ar } : { briefing: brief };
  const empty = p.kind === "reply" ? !reply.trim() : p.kind === "listing" ? !en.trim() : !brief.trim();
  const check = Array.isArray(p.draft.check) ? (p.draft.check as unknown[]).map(String) : [];

  async function decide(decision: "approve" | "reject") {
    setBusy(decision); setError(null);
    const r = await api<{ applied: string; whatsapp: string | null; outcome: string }>("POST", "agents", { action: "decide", id: p.id, decision, final, send_email: email });
    setBusy(null);
    if (!r.ok) return setError(explain(r.error));
    onDone({ text: decision === "reject" ? `Rejected: ${p.title}. Nothing was changed.` : `Approved: ${p.title}. ${r.applied ?? ""}`, link: r.whatsapp ?? undefined });
  }

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--hairline)] px-5 py-3">
        <Chip tone={who.tone}><who.icon size={12} /> {who.name}</Chip>
        <h3 className="min-w-0 flex-1 truncate text-[14px] font-bold">{p.title}</h3>
        <span className="figure text-[11.5px] text-[var(--text-muted)]">{ago(p.created_at)}</span>
      </div>
      <div className="space-y-3 px-5 py-4">
        {p.kind === "reply" && (
          <>
            <label className="block"><span className="ds-label mb-1.5 block">draft reply to {p.target.label} — edit before approving</span>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={5} dir={text(p.draft.language) === "ar" ? "rtl" : "ltr"} className={`${INPUT} !h-auto py-2.5 leading-relaxed`} /></label>
            {text(p.draft.next_step) && <p className="text-[12.5px] text-[var(--text-secondary)]"><b className="text-[var(--text-primary)]">After you send it:</b> {text(p.draft.next_step)}</p>}
          </>
        )}
        {p.kind === "listing" && (
          <>
            <label className="block"><span className="ds-label mb-1.5 block">title</span><input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} className={INPUT} /></label>
            <label className="block"><span className="ds-label mb-1.5 block">description, English</span><textarea value={en} onChange={(e) => setEn(e.target.value)} rows={6} className={`${INPUT} !h-auto py-2.5 leading-relaxed`} /></label>
            <label className="block"><span className="ds-label mb-1.5 block">description, Arabic</span><textarea value={ar} onChange={(e) => setAr(e.target.value)} rows={6} dir="rtl" className={`${INPUT} !h-auto py-2.5 leading-relaxed`} /></label>
            {check.length > 0 && <div className="rounded-[10px] border border-[var(--warn-bd)] bg-[var(--warn-bg)] px-3 py-2 text-[12.5px] text-[var(--warn)]"><b>Check before publishing:</b> {check.join(" · ")}</div>}
            <p className="text-[12px] text-[var(--text-muted)]">Approving updates this listing's title and description in the CRM only. Nothing goes to Bayut, Property Finder or Dubizzle.</p>
          </>
        )}
        {p.kind === "briefing" && (
          <>
            <label className="block"><span className="ds-label mb-1.5 block">briefing</span><textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={7} className={`${INPUT} !h-auto py-2.5 leading-relaxed`} /></label>
            <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} /> Email this to me when I approve</label>
          </>
        )}

        <details className="text-[12px] text-[var(--text-muted)]">
          <summary className="cursor-pointer select-none">What the agent was given</summary>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-[8px] bg-[var(--surface-sunken)] p-3 text-[11.5px] leading-relaxed">{JSON.stringify(p.facts, null, 2)}</pre>
        </details>

        {error && <p role="alert" className="text-[12.5px] text-[var(--bad)]">{error}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button disabled={busy !== null || empty} onClick={() => decide("approve")} className={BTN}><Check size={14} /> {busy === "approve" ? "Approving…" : "Approve"}</button>
          <button disabled={busy !== null} onClick={() => decide("reject")} className={BTN_GHOST}><X size={14} /> {busy === "reject" ? "Rejecting…" : "Reject"}</button>
          {p.kind === "reply" && <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--text-muted)]"><ExternalLink size={12} /> Approving does not send anything.</span>}
        </div>
      </div>
    </Card>
  );
}
