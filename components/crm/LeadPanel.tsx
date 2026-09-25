"use client";

import { useState } from "react";
import { Phone, Mail, MessageCircle, UserPlus, ExternalLink, AlertTriangle, Hand, Undo2 } from "lucide-react";
import { STAGES, STAGE_LABEL, SOURCE_LABEL, sourceKey, fillTemplate, type CrmListing, type CrmTemplate, type CrmContact, type CrmLead, type CrmTask, type CrmUser, type Stage } from "@/lib/crm";
import { api, stamp, toInputDate, whatsapp, INPUT, BTN, BTN_GHOST, Label, SidePanel } from "./shared";
import { WhatNext, Clock, StarButton, Requirements, Matches, ReasonForm, QuickUpdate } from "./LeadLifecycle";
import { CloseDealForm } from "./CloseDeal";
import { Timeline } from "./Timeline";
import { NewTask, TaskRow } from "./TaskList";

const SERVICE_LABEL: Record<string, string> = {
  advisory: "Investor Advisory",
  netRoi: "Net ROI",
  relocation: "Relocation",
  maintenance: "Maintenance",
  fitout: "Fit-Out",
  construction: "Construction",
  mortgage: "Mortgage",
  holidayHomes: "Holiday Homes (retired)",
};
export const serviceLabel = (s: string) => SERVICE_LABEL[s] ?? s;

export function LeadPanel({ lead, listings, templates, duplicates, isAdmin, users, contact, tasks, userName, onLead, onContact, onTask, onRemoveTask, onOpenContact, onClose, onDeal }: {
  lead: CrmLead;
  onDeal?: () => void;
  listings: CrmListing[];
  templates: CrmTemplate[];
  duplicates: string[];
  isAdmin: boolean;
  users: CrmUser[];
  contact: CrmContact | null;
  tasks: CrmTask[];
  userName: (id: string | null) => string;
  onLead: (l: CrmLead) => void;
  onContact: (c: CrmContact) => void;
  onTask: (t: CrmTask) => void;
  onRemoveTask: (id: string) => void;
  onOpenContact: (id: string) => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(lead.internal_notes ?? "");
  const [refresh, setRefresh] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ask, setAsk] = useState<"release" | "lost" | null>(null);
  const [closingDeal, setClosingDeal] = useState(false);
  const [nudge, setNudge] = useState(false);
  const isPool = !lead.owner_id && !isAdmin;
  const closed = lead.stage === "won" || lead.stage === "lost";
  const agentSplitPct = users.find((u) => u.id === lead.owner_id)?.slab_pct ?? 50;

  const MESSAGES: Record<string, string> = {
    star_limit: "You can star at most 10 leads. Unstar one first.",
    already_claimed: "Another agent claimed this lead first.",
    reason_and_note_required: "A reason and a note are required.",
  };

  async function save(patch: Record<string, unknown>) {
    setError(null);
    const r = await api<{ lead: CrmLead }>("PATCH", "leads", { id: lead.id, ...patch });
    if (r.lead) {
      onLead(r.lead as CrmLead);
      setAsk(null);
      setRefresh((n) => n + 1);
    } else setError(MESSAGES[r.error ?? ""] ?? r.error ?? "Could not save");
  }

  if (isPool) {
    return (
      <SidePanel title={lead.full_name} subtitle={<>Open pool · {serviceLabel(lead.service)} · received {stamp(lead.created_at)}</>} onClose={onClose}>
        <p className="text-[13px] text-[var(--text-secondary)]">
          This lead is unassigned. Claim it to see the client&apos;s contact details. It becomes yours for 48 hours, and each update restarts the clock.
        </p>
        <div className="figure text-[14px] text-[var(--text-muted)]">{lead.phone}</div>
        {lead.notes && <p className="rounded-lg border border-[var(--hairline)] bg-[var(--surface)] p-3 text-[13px]">{lead.notes}</p>}
        {error && <p className="text-[12px] text-[#c0392b]">{error}</p>}
        <button onClick={() => save({ claim: true })} className={BTN}><Hand size={14} /> Claim this lead</button>
      </SidePanel>
    );
  }

  async function makeContact() {
    const r = await api<{ contact: CrmContact }>("POST", "contacts", {
      full_name: lead.full_name, phone: lead.phone, email: lead.email,
      notes: lead.notes, lead_id: lead.id, owner_id: lead.owner_id,
    });
    if (r.contact) {
      onContact(r.contact as CrmContact);
      onLead({ ...lead, contact_id: (r.contact as CrmContact).id });
    }
  }

  const details = Object.entries(lead.payload ?? {}).filter(([, v]) => v !== null && v !== "" && typeof v !== "object");

  return (
    <SidePanel
      title={lead.full_name}
      subtitle={<><span className="me-1.5 rounded-full bg-[var(--accent-wash)] px-2 py-0.5 text-[11px] font-semibold text-[var(--accent)]">{SOURCE_LABEL[sourceKey(lead.source)]}</span>{serviceLabel(lead.service)} · received {stamp(lead.created_at)} · {lead.locale.toUpperCase()}</>}
      onClose={onClose}
    >
      <div className="flex flex-wrap items-center gap-2">
        <StarButton starred={lead.starred} onToggle={() => save({ starred: !lead.starred })} />
        <Clock expiresAt={lead.expires_at} />
        {!lead.owner_id && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">In the open pool</span>}
        {lead.stage === "lost" && lead.lost_reason && <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">Lost: {lead.lost_reason}</span>}
        {lead.owner_id && !closed && (
          <button onClick={() => setAsk("release")} className={`${BTN_GHOST} ms-auto`}><Undo2 size={14} /> Release</button>
        )}
      </div>

      {(lead.notes || details.length > 0) && (
        <section className="rounded-lg border border-[var(--hairline)] bg-[var(--surface)] p-4">
          <Label>What they submitted</Label>
          {lead.notes && <p className="whitespace-pre-wrap text-[13px] text-[var(--text-primary)]">{lead.notes}</p>}
          {details.length > 0 && (
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px]">
              {details.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-[var(--text-muted)]">{k}</dt>
                  <dd className="figure text-[var(--text-secondary)]">{String(v)}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      )}

      <WhatNext lead={lead} />
      {!closed && lead.owner_id && (
        <QuickUpdate
          lead={lead}
          listings={listings}
          highlight={nudge}
          onBookViewing={async (startsAt, listingId, location) => {
            await api("POST", "data/events", {
              title: `Viewing: ${lead.full_name}`, kind: "viewing", status: "scheduled", starts_at: startsAt,
              lead_id: lead.id, listing_id: listingId || null, agent_id: lead.owner_id, location: location || null,
            });
          }}
          onLog={async (kind, body) => { await api("POST", "activities", { kind, body, lead_id: lead.id }); setRefresh((n) => n + 1); }}
          onSave={save}
          onLost={() => setAsk("lost")}
          onDone={() => setNudge(false)}
        />
      )}
      {ask && (
        <ReasonForm
          mode={ask}
          onCancel={() => setAsk(null)}
          onSubmit={(reason, note) => save(ask === "lost" ? { stage: "lost", lost_reason: reason, note } : { release: true, reason, note })}
        />
      )}
      {closingDeal && (
        <CloseDealForm
          lead={lead}
          listings={listings}
          agentSplitPct={agentSplitPct}
          onSkip={() => { setClosingDeal(false); save({ stage: "won" }); }}
          onDone={() => { setClosingDeal(false); save({ stage: "won" }); onDeal?.(); }}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <a href={whatsapp(lead.phone)} onClick={() => setNudge(true)} target="_blank" rel="noopener noreferrer" className={BTN_GHOST}><MessageCircle size={14} /> WhatsApp</a>
        {templates.length > 0 && (
          <select
            value=""
            onChange={(e) => {
              const tpl = templates.find((x) => x.id === e.target.value);
              if (!tpl) return;
              const text = fillTemplate(tpl.body, lead.full_name, userName(lead.owner_id));
              window.open(`${whatsapp(lead.phone)}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
              void api("POST", "activities", { kind: "whatsapp", body: `Sent template: ${tpl.name}`, lead_id: lead.id }).then(() => setRefresh((n) => n + 1));
            }}
            className={`${INPUT} !w-auto`}
          >
            <option value="">WhatsApp template…</option>
            {templates.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        )}
        <a href={`tel:${lead.phone}`} onClick={() => setNudge(true)} className={BTN_GHOST}><Phone size={14} /> <span className="figure">{lead.phone}</span></a>
        {lead.email && <a href={`mailto:${lead.email}`} className={BTN_GHOST}><Mail size={14} /> Email</a>}
      </div>

      {duplicates.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12.5px] text-amber-700">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>Possible duplicate: this phone number is also on {duplicates.join(", ")}.</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label><Label>Stage</Label>
          <select
            value={lead.stage}
            onChange={(e) => {
              if (e.target.value === "lost") return setAsk("lost");
              if (e.target.value === "won" && lead.stage !== "won") return setClosingDeal(true);
              save({ stage: e.target.value as Stage });
            }}
            className={INPUT}
          >
            {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </select>
        </label>
        <label><Label>Agent</Label>
          {isAdmin ? (
            <select value={lead.owner_id ?? ""} onChange={(e) => save({ owner_id: e.target.value || null })} className={INPUT}>
              <option value="">Unassigned</option>
              {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          ) : <div className={INPUT}>{userName(lead.owner_id)}</div>}
        </label>
        <label><Label>Next follow-up</Label>
          <input key={lead.next_follow_up_at ?? "none"} type="datetime-local" defaultValue={toInputDate(lead.next_follow_up_at)}
            onBlur={(e) => save({ next_follow_up_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
            className={INPUT} />
        </label>
        <label><Label>Deal value (AED)</Label>
          <input type="number" min={0} defaultValue={lead.deal_value_aed ?? ""}
            onBlur={(e) => save({ deal_value_aed: e.target.value })} className={`${INPUT} figure`} />
        </label>
      </div>
      {error && <p className="text-[12px] text-[#c0392b]">{error}</p>}

      <Requirements lead={lead} onSave={save} />
      <Matches lead={lead} listings={listings} />

      <section className="rounded-lg border border-[var(--hairline)] p-3">
        <Label>Partnership (co-broker)</Label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <label><Label>Partner agency</Label>
            <input defaultValue={lead.partner_agency ?? ""} onBlur={(e) => save({ partner_agency: e.target.value || null })} placeholder="e.g. Metro Homes" className={INPUT} />
          </label>
          <label><Label>Their split %</Label>
            <input type="number" min={0} max={100} defaultValue={lead.partner_split_pct ?? ""} onBlur={(e) => save({ partner_split_pct: e.target.value })} className={`${INPUT} figure`} />
          </label>
        </div>
        {lead.partner_agency && isAdmin && (
          <label className="mt-2 flex items-center gap-2">
            <input type="checkbox" checked={lead.partner_approved} onChange={(e) => save({ partner_approved: e.target.checked })} className="h-4 w-4 accent-[var(--accent-solid)]" />
            <span className="text-[12.5px] text-[var(--text-secondary)]">Split approved</span>
          </label>
        )}
        {lead.partner_agency && !lead.partner_approved && (
          <p className="mt-1.5 text-[11px] text-amber-700">Not yet approved{isAdmin ? "" : " by an admin"}.</p>
        )}
      </section>

      <section>
        <Label>Client</Label>
        {contact ? (
          <button onClick={() => onOpenContact(contact.id)} className={BTN_GHOST}>
            <ExternalLink size={14} /> Open contact: {contact.full_name}
          </button>
        ) : (
          <button onClick={makeContact} className={BTN_GHOST}><UserPlus size={14} /> Save as contact</button>
        )}
      </section>

      <label className="block"><Label>Internal notes</Label>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
          onBlur={() => notes !== (lead.internal_notes ?? "") && save({ internal_notes: notes })}
          className={`${INPUT} resize-none`} />
      </label>

      <section>
        <Label>Tasks</Label>
        <NewTask users={users} isAdmin={isAdmin} link={{ lead_id: lead.id }} onCreated={onTask} />
        <ul className="mt-2">
          {tasks.map((t) => (
            <TaskRow key={t.id} task={t} onChange={onTask} onRemove={onRemoveTask} userName={userName} showAssignee={isAdmin} />
          ))}
        </ul>
      </section>

      <Timeline leadId={lead.id} userName={userName} refreshKey={refresh} />
    </SidePanel>
  );
}
