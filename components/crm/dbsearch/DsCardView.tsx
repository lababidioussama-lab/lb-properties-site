"use client";

import { useState, type ReactNode } from "react";
import { AlertTriangle, Building2, Check, Copy, FileStack, Globe2, Hash, Landmark, Link2, Mail, MapPin, MessageCircle, Phone, Plus, Search, Tag, User } from "lucide-react";

import { REASONS, ds, dsError, type DsCard, type DsCrmLink, type DsRevealed, type DsSoldFlag, type DsUsage } from "./api";

/**
 * One result card, laid out and worded as DB Search's ownerCard(): owner tag,
 * badges, numbers, why-it-matched, sold banners, the record's lines, email.
 * The one difference is the numbers: they stay hidden until the agent picks
 * a reason, and the reveal is recorded.
 */

export interface CardActions {
  onExpired: () => void;
  onUsage: (u: DsUsage, s?: { endsAt: number }) => void;
  onOpenLead: (id: string) => void;
}

const fmtNum = (v: number | string) => {
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n.toLocaleString("en-US") : String(v);
};
const monLabel = (d: string | null) => {
  if (!d) return "";
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? String(d) : t.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
};
const fmtM = (n: number | null) => {
  if (!n || n <= 0) return "";
  return n >= 1e6 ? `AED ${(n / 1e6).toFixed(2).replace(/\.?0+$/, "")}M` : `AED ${Math.round(n).toLocaleString("en-US")}`;
};

const BADGE = "inline-flex items-center gap-1 rounded-md border px-2 py-[3px] text-[11.5px] font-semibold leading-none";
const MUTED = "text-[var(--text-muted)]";

function SharedTag({ s }: { s?: { n_units: number | null; level?: string | null } | null }) {
  if (!s) return null;
  const n = s.n_units ? `${Number(s.n_units).toLocaleString("en-US")} units` : "other units in these results";
  const lvl = s.level === "several community labels" ? "shared across community labels" : s.level;
  return <span className={`font-normal ${MUTED}`}> · shared by {n}{lvl ? ` (${lvl})` : ""}</span>;
}

function CrmTag({ link, onOpenLead }: { link: DsCrmLink; onOpenLead: (id: string) => void }) {
  const kind = link.kind === "lead" ? "Lead" : link.kind === "contact" ? "Contact" : "Temp lead";
  const who = link.mine ? "yours" : link.ownerName ?? "unassigned";
  return link.kind === "lead"
    ? <button onClick={() => onOpenLead(link.id)} className={`${BADGE} border-[var(--violet-bd)] bg-[var(--violet-bg)] text-[var(--violet)] hover:underline`}>In CRM · {kind} · {who}</button>
    : <span className={`${BADGE} border-[var(--violet-bd)] bg-[var(--violet-bg)] text-[var(--violet)]`}>In CRM · {kind} · {who}</span>;
}

/** The reason picker every reveal goes through. */
function ReasonPicker({ what, busy, onPick, onCancel }: { what: string; busy: boolean; onPick: (r: string) => void; onCancel: () => void }) {
  return (
    <div className="rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-sunken)] p-2.5">
      <p className="mb-2 text-[12px] font-semibold text-[var(--text-secondary)]">Why do you need {what}? It is recorded with your name.</p>
      <div className="flex flex-wrap gap-1.5">
        {REASONS.map((r) => (
          <button key={r.id} disabled={busy} onClick={() => onPick(r.id)}
            className="h-8 rounded-full border border-[var(--hairline-strong)] bg-white px-3 text-[12px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50">{r.label}</button>
        ))}
        <button onClick={onCancel} className={`h-8 px-2 text-[12px] font-semibold ${MUTED} hover:text-[var(--text-primary)]`}>Cancel</button>
      </div>
    </div>
  );
}

export function DsCardView({ card, also, soldFlag, actions }: { card: DsCard; also?: string[]; soldFlag?: DsSoldFlag | null; actions: CardActions }) {
  const m = card.model;
  const [asking, setAsking] = useState<"phones" | "email" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numbers, setNumbers] = useState<DsRevealed[] | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [added, setAdded] = useState<Record<number, string>>({});
  const [copied, setCopied] = useState(false);

  async function reveal(kind: "phones" | "email", reason: string) {
    setBusy(true); setError(null);
    const r = await ds<{ numbers?: DsRevealed[]; value?: string; usage?: DsUsage }>("POST", "reveal", { ref: card.ref, kind, reason });
    setBusy(false);
    if (!r.ok) {
      if (r.error === "ds_signin_required") return actions.onExpired();
      return setError(r.error === "daily_limit" ? `You have used all ${r.limit} reveals for today. They reset at midnight.` : dsError(r.error));
    }
    setAsking(null);
    if (r.usage) actions.onUsage(r.usage, r.session);
    if (kind === "email") setEmail(r.value ?? null);
    else setNumbers(r.numbers ?? []);
  }

  async function add(index: number, as: "lead" | "contact" | "temp") {
    setError(null);
    const r = await ds<{ created: { as: string; id: string } }>("POST", "add", { ref: card.ref, index, as });
    if (!r.ok) {
      if (r.error === "ds_signin_required") return actions.onExpired();
      if (r.error === "already_in_crm") return setAdded((a) => ({ ...a, [index]: "Already in the CRM" }));
      return setError(dsError(r.error));
    }
    setAdded((a) => ({ ...a, [index]: as === "lead" ? "Added as a lead" : as === "contact" ? "Added as a contact" : "Added to Temp leads" }));
    if (as === "lead" && r.created.id) actions.onOpenLead(r.created.id);
  }

  const side = m.tx.party;
  const dLbl = m.tx.date ? ` · ${m.tx.date}` : "";
  const ownerTag = side === "buyer" ? <span className={`${BADGE} border-[var(--ok-bd)] bg-[var(--ok-bg)] text-[var(--ok)]`}>BOUGHT{dLbl}</span>
    : side === "seller" ? <span className={`${BADGE} border-[var(--neutral-bd)] bg-[var(--neutral-bg)] text-[var(--neutral)]`}>SOLD{dLbl}</span>
    : side === "mortgagee" ? <span className={`${BADGE} border-[var(--neutral-bd)] bg-[var(--neutral-bg)] text-[var(--neutral)]`}><Landmark size={11} /> MORTGAGEE{dLbl}</span>
    : null;
  const noUnit = <span className={MUTED}> (unit not stated in source)</span>;
  const noDetails = !m.badge && !m.lines.length && !m.size && !m.plotArea && !m.tx.date && !m.tx.value;
  const txBits: ReactNode[] = [];
  if (m.tx.date && !ownerTag) txBits.push(<b key="d">{m.tx.date}</b>);
  if (m.tx.proc) txBits.push(<span key="p">{m.tx.proc}</span>);
  if (m.tx.value) txBits.push(<span key="v">{m.tx.label ? `${m.tx.label} ` : ""}<b className="text-[var(--accent)]">AED {fmtNum(m.tx.value)}</b></span>);
  else if (m.tx.noConsideration) txBits.push(<span key="n" className={MUTED}>No consideration (transfer / gift)</span>);

  return (
    <article className="flex flex-col gap-2.5 rounded-xl border border-[var(--hairline)] bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04)]">
      {/* title */}
      <div className="flex items-start gap-2">
        {card.buildingRecord ? <Building2 size={16} className="mt-0.5 shrink-0 text-[var(--text-muted)]" /> : <User size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />}
        <h3 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">{card.name}</h3>
      </div>

      {/* owner tag + badges */}
      <div className="flex flex-wrap gap-1.5">
        {card.buildingRecord && <span className={`${BADGE} border-[var(--neutral-bd)] bg-[var(--neutral-bg)] text-[var(--neutral)]`}>NO OWNER ON RECORD — property entry</span>}
        {ownerTag}
        {m.pMatch && <span className={`${BADGE} border-[var(--hairline-strong)] bg-white`} title="Found by its P-number"><Search size={11} /> P-number match</span>}
        {m.community && <span className={`${BADGE} border-[var(--info-bd)] bg-[var(--info-bg)] text-[var(--info)]`}><MapPin size={11} /> {m.community}</span>}
        {m.building && <span className={`${BADGE} border-[var(--hairline-strong)] bg-white`}><Building2 size={11} /> {m.building}</span>}
        {m.badge && <span className={`${BADGE} border-[var(--violet-bd)] bg-[var(--violet-bg)] text-[var(--violet)]`}><Hash size={11} /> {m.badge.label} {m.badge.v}</span>}
        {m.nat && <span className={`${BADGE} border-[var(--hairline-strong)] bg-white`}><Globe2 size={11} /> {m.nat}</span>}
        {m.nRec > 1 && <span className={`${BADGE} border-[var(--hairline-strong)] bg-white`} title={`Same person + same unit found in ${m.nRec} source records`}><FileStack size={11} /> {m.nRec} records</span>}
        {card.inCrm && <CrmTag link={card.inCrm} onOpenLead={actions.onOpenLead} />}
      </div>

      {/* numbers */}
      {numbers ? (
        numbers.length === 0
          ? <p className={`text-[12.5px] ${MUTED}`}>No number on this record</p>
          : <div className="divide-y divide-[var(--hairline)] rounded-lg border border-[var(--hairline)]">
              {numbers.map((n) => (
                <div key={n.index} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className="figure text-[14px] font-semibold tracking-wide">{n.value}</span>
                  {n.dnc ? <span className={`${BADGE} border-[var(--bad-bd)] bg-[var(--bad-bg)] text-[var(--bad)]`}>Do not contact</span> : (
                    <>
                      <a href={`tel:+${n.dial}`} className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--hairline-strong)] px-2 text-[12px] font-semibold hover:border-[var(--accent)] hover:text-[var(--accent)]"><Phone size={12} /> Call</a>
                      <a href={`https://api.whatsapp.com/send?phone=${n.dial}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-7 items-center gap-1 rounded-md border border-[var(--ok-bd)] bg-[var(--ok-bg)] px-2 text-[12px] font-semibold text-[var(--ok)] hover:bg-[var(--ok-bg)]"><MessageCircle size={12} /> WhatsApp</a>
                      {n.inCrm ? <CrmTag link={n.inCrm} onOpenLead={actions.onOpenLead} />
                        : added[n.index] ? <span className={`${BADGE} border-[var(--ok-bd)] bg-[var(--ok-bg)] text-[var(--ok)]`}><Check size={11} /> {added[n.index]}</span>
                        : (
                          <span className="ms-auto inline-flex items-center gap-1 text-[12px]">
                            <Plus size={12} className={MUTED} />
                            <button onClick={() => add(n.index, "lead")} className="font-semibold text-[var(--accent)] hover:underline">Lead</button>
                            <span className={MUTED}>·</span>
                            <button onClick={() => add(n.index, "contact")} className="font-semibold text-[var(--accent)] hover:underline">Contact</button>
                            <span className={MUTED}>·</span>
                            <button onClick={() => add(n.index, "temp")} className="font-semibold text-[var(--accent)] hover:underline">Temp lead</button>
                          </span>
                        )}
                    </>
                  )}
                </div>
              ))}
            </div>
      ) : card.phoneCount > 0 ? (
        asking === "phones"
          ? <ReasonPicker what={card.phoneCount > 1 ? "these numbers" : "this number"} busy={busy} onPick={(r) => reveal("phones", r)} onCancel={() => setAsking(null)} />
          : <button onClick={() => { setAsking("phones"); setError(null); }} className="inline-flex h-9 w-fit items-center gap-2 rounded-lg bg-[var(--accent-solid)] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[var(--accent-solid-hover)]">
              <Phone size={14} /> Show {card.phoneCount} number{card.phoneCount > 1 ? "s" : ""}
            </button>
      ) : (
        <p className={`text-[12.5px] ${MUTED}`}>{card.buildingRecord ? "This is a property record from a building price list — it never had an owner name or contact." : "No phones on file"}</p>
      )}
      {error && <p role="alert" className="rounded-md bg-red-50 px-2.5 py-1.5 text-[12.5px] text-[var(--bad)]">{error}</p>}

      {/* why it matched */}
      {card.match && (
        <p className="flex items-center gap-1.5 rounded-lg border border-[var(--info-bd)] bg-[var(--info-bg)] px-2.5 py-1.5 text-[12.5px] font-semibold text-[var(--info)]">
          <Link2 size={13} /> Matched {card.match.name} — also named on this record{card.match.more > 0 ? ` (+${card.match.more} more)` : ""}
        </p>
      )}

      {/* Portofino sold list */}
      {card.sold && (
        <p className="rounded-lg border border-[var(--bad-bd)] bg-[var(--bad-bg)] px-2.5 py-1.5 text-[12.5px] font-semibold text-[var(--bad)]">
          UNIT {card.sold.unit} SOLD {monLabel(card.sold.date)}{card.sold.price ? ` for ${fmtM(card.sold.price)}${card.sold.gain != null ? ` (${card.sold.gain >= 0 ? "+" : ""}${Math.round(card.sold.gain * 100)}%)` : ""}` : ""}
          {card.sold.stale ? <> — this person is likely <u>NOT the owner anymore</u></> : " — unit recently transacted"}
        </p>
      )}
      {/* registered sales (Damac Lagoons) */}
      {!card.sold && soldFlag && (
        <p className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold ${soldFlag.confidence === "medium" ? "border-[var(--warn-bd)] bg-[var(--warn-bg)] text-[var(--warn)]" : "border-[var(--bad-bd)] bg-[var(--bad-bg)] text-[var(--bad)]"}`}>
          <Tag size={13} /> UNIT {soldFlag.unit ?? m.badge?.v} ALREADY SOLD
          <span className="font-normal"> — {[soldFlag.project, monLabel(soldFlag.date), fmtM(soldFlag.price), soldFlag.payment === "cash" ? "cash" : soldFlag.payment === "mortgage" ? "mortgaged" : ""].filter(Boolean).join(" · ")}</span>
        </p>
      )}

      {/* the record */}
      <div className="space-y-1 border-t border-[var(--hairline)] pt-2.5 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
        {m.lines.map((l) => (
          <div key={l.k}>
            • {l.label}: <b className="text-[var(--text-primary)]">{l.parts.map((p) => `${p.pre ?? ""}${p.v}`).join("  ·  ")}</b>
            <SharedTag s={l.parts.find((p) => p.shared)?.shared} />
            {l.multi && <span className={`font-normal ${MUTED}`}> (this record holds {l.parts.length} values — verify)</span>}
          </div>
        ))}
        {m.size && <div>• Size: <b className="text-[var(--text-primary)]">{fmtNum(m.size.v)}{m.size.u ? ` ${m.size.u}` : ""}</b>{m.size.u ? null : noUnit}</div>}
        {m.plotArea && <div>• Plot area: <b className="text-[var(--text-primary)]">{fmtNum(m.plotArea.v)}{m.plotArea.u ? ` ${m.plotArea.u}` : ""}</b>{m.plotArea.u ? null : noUnit}</div>}
        {(m.beds || m.ptype) && (
          <div>• {m.beds && <>Bedrooms: <b className="text-[var(--text-primary)]">{m.beds}</b></>}{m.beds && m.ptype ? "  ·  " : ""}{m.ptype && <>Type: <b className="text-[var(--text-primary)]">{m.ptype}</b></>}</div>
        )}
        {txBits.length > 0 && <div>• Transaction: {txBits.map((b, i) => <span key={i}>{i > 0 ? "  ·  " : ""}{b}</span>)}</div>}
        {m.more.length > 0 && <div className={`text-[12px] ${MUTED}`}>{m.more.map((x) => `${x.label} ${typeof x.v === "number" ? x.v.toLocaleString("en-US") : x.v}${x.suffix}`).join(" · ")}</div>}
        {also && also.length > 0 && <div className={`text-[12px] ${MUTED}`}>Also contacted regarding: {also.join(", ")} (no unit on file)</div>}
        {m.notes.map((n, i) => (
          <div key={i} className="flex gap-1.5 text-[12px] text-[var(--warn)]" title={n}><AlertTriangle size={12} className="mt-[3px] shrink-0" /> {n.length > 160 ? `${n.slice(0, 157)}…` : n}</div>
        ))}
        {m.unreadable.length > 0 && <div className={`text-[12px] ${MUTED}`}>Unreadable in source (Excel converted the value): {m.unreadable.join(", ")}</div>}
        {noDetails
          ? <div className={MUTED}>No property details on this record</div>
          : m.gaps.length > 0 && <div className={`text-[12px] ${MUTED}`}>Not on record: {m.gaps.join(" · ")}</div>}
      </div>

      {/* email */}
      {card.email && (
        email ? (
          <div className="flex items-center gap-2 text-[12.5px]">
            <Mail size={13} className={MUTED} /> <span className="font-semibold">{email}</span>
            <button onClick={() => { void navigator.clipboard.writeText(email); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="inline-flex items-center gap-1 text-[12px] font-semibold text-[var(--accent)] hover:underline">
              {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
            </button>
          </div>
        ) : asking === "email"
          ? <ReasonPicker what="this email" busy={busy} onPick={(r) => reveal("email", r)} onCancel={() => setAsking(null)} />
          : (
            <div className="flex items-center gap-2 text-[12.5px]">
              <Mail size={13} className={MUTED} /> <span className="figure">{card.email}</span>
              <button onClick={() => { setAsking("email"); setError(null); }} className="text-[12px] font-semibold text-[var(--accent)] hover:underline">Show</button>
            </div>
          )
      )}
    </article>
  );
}
