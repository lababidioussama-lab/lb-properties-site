"use client";

import { useEffect, useState } from "react";
import { Eye, History, Mail, Phone, Plus, Users, X } from "lucide-react";

import { SidePanel, BTN, BTN_GHOST } from "../shared";
import { REGION_LABEL, STATUS_LABEL, STATUS_STYLE, aed, ds, dsError, fullDate, placeText, sizeText, type DsCrmLink, type DsOwner, type DsUsage } from "./api";

const REASONS = [
  ["owner_outreach", "Selling: owner outreach"],
  ["buyer_followup", "Buyer follow-up"],
  ["listing_check", "Checking a listing"],
] as const;

type Revealed = { kind: "phone" | "email"; index: number; value: string; dial?: string; reason: string; at: string };

export function DsOwnerPanel({ refId, onClose, onExpired, onUsage, onOpenLead, onUnit }: {
  refId: string;
  onClose: () => void;
  onExpired: () => void;
  onUsage: (u: DsUsage, s?: { endsAt: number }) => void;
  onOpenOwner: (ref: string) => void;
  onOpenLead: (id: string) => void;
  onUnit: (code: string, place: string | null) => void;
}) {
  const [owner, setOwner] = useState<DsOwner | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState<{ kind: "phone" | "email"; index: number } | null>(null);
  const [revealed, setRevealed] = useState<Revealed[]>([]);
  const [added, setAdded] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void ds<{ owner: DsOwner }>("POST", "owner", { ref: refId }).then((r) => {
      if (r.ok) setOwner(r.owner);
      else if (r.error === "ds_signin_required") onExpired();
      else setError(dsError(r.error));
    });
  }, [refId, onExpired]);

  async function add(as: "lead" | "contact" | "temp") {
    setBusy(true); setError(null);
    const r = await ds<{ created: { as: string; id: string } }>("POST", "add", { ref: refId, as, index: 0 });
    setBusy(false);
    if (r.ok) return setAdded(as === "lead" ? "Lead created and assigned to you." : as === "contact" ? "Added to your contacts." : "Added to your Temp leads calling list.");
    if (r.error === "ds_signin_required") return onExpired();
    if (r.error === "already_in_crm") {
      const link = r.link as DsCrmLink;
      return setError(`Already in the CRM as a ${link.kind === "temp" ? "temp lead" : link.kind}${link.ownerName ? `, handled by ${link.mine ? "you" : link.ownerName}` : ""}.`);
    }
    setError(dsError(r.error));
  }

  const shown = (kind: "phone" | "email", index: number) => revealed.find((r) => r.kind === kind && r.index === index);
  const link = owner?.inCrm;

  return (
    <SidePanel
      title={owner?.name ?? "Owner"}
      subtitle={owner ? [owner.nationality, `${owner.properties.length} propert${owner.properties.length === 1 ? "y" : "ies"} linked by phone`].filter(Boolean).join(" · ") : "Loading…"}
      onClose={onClose}
    >
      {!owner && !error && <div className="h-48 animate-pulse rounded-xl bg-[rgb(15_23_42/0.06)]" />}
      {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-[var(--bad)]">{error}</p>}
      {added && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800">{added}</p>}

      {owner && (
        <>
          <div className="flex flex-wrap gap-1.5">
            <span className={`rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold ${STATUS_STYLE[owner.properties[0]?.status ?? "unknown"]}`}>
              {STATUS_LABEL[owner.properties[0]?.status ?? "unknown"]}{owner.properties[0]?.statusDate ? ` · ${fullDate(owner.properties[0].statusDate)}` : ""}
            </span>
          </div>

          {link && (
            <div className="flex items-center gap-3 rounded-xl border border-[var(--violet-bd)] bg-[var(--violet-bg)] px-4 py-3 text-[12.5px] text-[var(--violet)]">
              <Users size={16} className="shrink-0" />
              <span className="flex-1">Already in the CRM: {link.kind === "temp" ? "temp lead" : link.kind} <strong>{link.name}</strong>{link.stage ? `, ${link.stage}` : ""}{link.ownerName ? `, handled by ${link.mine ? "you" : link.ownerName}` : ""}.</span>
              {link.kind === "lead" && (link.mine || link.ownerName == null) && <button onClick={() => { onClose(); onOpenLead(link.id); }} className="font-bold underline">Open lead</button>}
            </div>
          )}

          <section className="rounded-xl border border-[var(--hairline)] bg-white p-4">
            <div className="mb-1 flex items-baseline justify-between"><h3 className="text-[13.5px] font-bold">Contact</h3><span className="text-[11.5px] text-[var(--text-muted)]">Each reveal is recorded against your name</span></div>
            {owner.phones.length === 0 && !owner.hasEmail && <p className="py-3 text-[13px] text-[var(--text-muted)]">No usable phone number or email on record.</p>}
            {owner.phones.map((p, i) => {
              const r = shown("phone", i);
              return (
                <div key={i} className="flex items-center gap-3 border-t border-[var(--hairline)] py-3 first-of-type:border-t-0">
                  <Phone size={15} className="shrink-0 text-[var(--text-muted)]" />
                  <span className="flex-1">
                    <span className={`figure text-[14px] ${r ? "font-bold text-[var(--text-primary)]" : "tracking-wide text-[var(--text-secondary)]"}`}>{r ? r.value : p.masked}</span>
                    <span className="ms-2 text-[12px] text-[var(--text-muted)]">{REGION_LABEL[p.region]}</span>
                  </span>
                  {r ? (
                    <span className="flex gap-1.5">
                      <a href={`tel:+${r.dial}`} className={`${BTN} !h-8 !px-3 !text-[12px]`}>Call</a>
                      <a href={`https://wa.me/${r.dial}`} target="_blank" rel="noopener noreferrer" className={`${BTN} !h-8 !bg-[var(--ok)] !px-3 !text-[12px]`}>WhatsApp</a>
                    </span>
                  ) : (
                    <button onClick={() => setAsking({ kind: "phone", index: i })} className={`${BTN_GHOST} !h-8 !px-3 !text-[12px]`}><Eye size={14} /> Reveal</button>
                  )}
                </div>
              );
            })}
            {owner.hasEmail && (() => {
              const r = shown("email", 0);
              return (
                <div className="flex items-center gap-3 border-t border-[var(--hairline)] py-3">
                  <Mail size={15} className="shrink-0 text-[var(--text-muted)]" />
                  <span className={`flex-1 text-[14px] ${r ? "font-semibold" : "tracking-wide text-[var(--text-secondary)]"}`}>{r ? r.value : "•••••••@•••••"}</span>
                  {r ? <a href={`mailto:${r.value}`} className={`${BTN_GHOST} !h-8 !px-3 !text-[12px]`}>Email</a>
                    : <button onClick={() => setAsking({ kind: "email", index: 0 })} className={`${BTN_GHOST} !h-8 !px-3 !text-[12px]`}><Eye size={14} /> Reveal</button>}
                </div>
              );
            })()}
            {revealed.length > 0 && <p className="mt-2 text-[11.5px] text-[var(--text-muted)]">Revealed {revealed.map((r) => r.at).join(", ")} · shown to you only, for this session.</p>}
          </section>

          <section className="space-y-2.5">
            <h3 className="text-[13.5px] font-bold">Properties <span className="font-medium text-[var(--text-muted)]">· {owner.properties.length}</span></h3>
            {owner.properties.map((pr, i) => (
              <div key={pr.ref + i} className={`flex items-center gap-3 rounded-xl border border-[var(--hairline)] bg-white px-4 py-3 ${i === 0 ? "shadow-[inset_3px_0_0_var(--accent-solid)]" : ""}`}>
                <div className="min-w-0 flex-1">
                  <div className="text-[13.5px] font-bold">{placeText(pr.property)}</div>
                  <div className="mt-0.5 text-[12.5px] text-[var(--text-secondary)]">{[pr.property.type, pr.property.beds, sizeText(pr.property.size)].filter(Boolean).join(" · ") || "Details not recorded"}</div>
                  <div className="figure mt-0.5 text-[12px] text-[var(--text-muted)]">
                    {[pr.property.date && `Bought ${fullDate(pr.property.date)}`, pr.property.price && aed(pr.property.price), pr.property.dmNo && `Permit no. ${pr.property.dmNo}`, pr.property.plot && `Plot ${pr.property.plot}`].filter(Boolean).join(" · ") || "No sale date on record"}
                  </div>
                  {i > 0 && <span className={`mt-1.5 inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLE[pr.status]}`}>{STATUS_LABEL[pr.status]}</span>}
                </div>
                {pr.property.unit && <button onClick={() => onUnit(pr.property.unit!, pr.property.building ?? pr.property.community)} className={`${BTN_GHOST} !h-8 !px-3 !text-[12px]`}><History size={14} /> History</button>}
              </div>
            ))}
          </section>

          <section className="flex flex-wrap gap-2 border-t border-[var(--hairline)] pt-4">
            <button disabled={busy || !owner.phones.length || !!link} onClick={() => add("lead")} className={BTN}><Plus size={15} /> Create lead</button>
            <button disabled={busy || !owner.phones.length || !!link} onClick={() => add("contact")} className={BTN_GHOST}>Add to contacts</button>
            <button disabled={busy || !owner.phones.length || !!link} onClick={() => add("temp")} className={BTN_GHOST}>Add to Temp leads</button>
            <p className="w-full text-[11.5px] leading-relaxed text-[var(--text-muted)]">Creating a lead or contact saves the first number to it and counts as a reveal. Temp leads count towards your daily list limit.</p>
          </section>
        </>
      )}

      {asking && owner && (
        <RevealDialog
          owner={owner}
          target={asking}
          onCancel={() => setAsking(null)}
          onDone={(r) => { setRevealed((all) => [...all, r]); setAsking(null); }}
          onExpired={onExpired}
          onUsage={onUsage}
        />
      )}
    </SidePanel>
  );
}

function RevealDialog({ owner, target, onCancel, onDone, onExpired, onUsage }: {
  owner: DsOwner;
  target: { kind: "phone" | "email"; index: number };
  onCancel: () => void;
  onDone: (r: Revealed) => void;
  onExpired: () => void;
  onUsage: (u: DsUsage, s?: { endsAt: number }) => void;
}) {
  const [reason, setReason] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reveal() {
    setBusy(true); setError(null);
    const r = await ds<{ kind: "phone" | "email"; value: string; dial?: string; usage?: DsUsage }>("POST", "reveal", { ref: owner.ref, index: target.index, kind: target.kind, reason });
    setBusy(false);
    if (!r.ok) {
      if (r.error === "ds_signin_required") return onExpired();
      return setError(r.error === "daily_limit" ? `You have revealed ${r.limit} numbers today, your daily limit. It resets at midnight.` : dsError(r.error));
    }
    if (r.usage) onUsage(r.usage, r.session);
    onDone({ kind: r.kind, index: target.index, value: r.value, dial: r.dial, reason, at: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) });
  }

  const p = owner.phones[target.index];
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[rgb(11_26_43/0.45)] px-4" role="dialog" aria-modal="true" aria-labelledby="ds-reveal-title">
      <div className="crm-pop w-full max-w-[480px] rounded-xl border border-[var(--hairline)] bg-white p-6 shadow-[0_30px_70px_-20px_rgb(15_23_42/0.45)]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[12px] font-medium text-[var(--violet)]">Reveal {target.kind === "email" ? "an email" : "a number"}</p>
            <h2 id="ds-reveal-title" className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-semibold">Reveal this {target.kind === "email" ? "email" : "number"}?</h2>
          </div>
          <button onClick={onCancel} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-sunken)]"><X size={16} /></button>
        </div>
        <p className="mt-1 text-[13px] text-[var(--text-secondary)]">{owner.name} · {placeText(owner.properties[0]?.property ?? { community: null, building: null, unit: null, propertyNo: null, plot: null, dmNo: null, type: null, beds: null, size: null, price: null, date: null })}{p ? ` · ${p.masked}` : ""}</p>

        <label className="mt-5 block">
          <span className="mb-1.5 block text-[12px] font-semibold text-[var(--text-secondary)]">Why do you need it?</span>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="h-11 w-full rounded-lg border border-[var(--hairline-strong)] bg-white px-3 text-[14px] outline-none focus:border-[var(--accent)]">
            <option value="">Choose a reason</option>
            {REASONS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </label>
        <ul className="mt-4 space-y-1.5 text-[12.5px] text-[var(--text-secondary)]">
          <li>· Numbers on the do-not-contact list are refused automatically.</li>
          <li>· The reveal, the reason and the time are recorded against your name.</li>
          <li>· It counts towards your daily reveal limit.</li>
        </ul>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[12.5px] text-[var(--bad)]">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onCancel} className={BTN_GHOST}>Cancel</button>
          <button onClick={reveal} disabled={!reason || busy} className={BTN}><Eye size={15} /> {busy ? "Revealing…" : `Reveal ${target.kind === "email" ? "email" : "number"}`}</button>
        </div>
      </div>
    </div>
  );
}
