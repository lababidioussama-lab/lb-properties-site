"use client";

import { useState } from "react";
import { Lightbulb, Star, Timer } from "lucide-react";
import {
  LOST_REASONS, MEDIUMS, PROPERTY_TYPES, whatNext,
  type CrmLead, type CrmListing,
} from "@/lib/crm";
import { money, whatsapp, INPUT, BTN, BTN_GHOST, Label } from "./shared";

export function WhatNext({ lead }: { lead: CrmLead }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-[var(--glass-border-lit)] bg-[var(--accent-wash)] p-3">
      <Lightbulb size={16} className="mt-0.5 shrink-0 text-[var(--accent)]" />
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">What next?</div>
        <p className="mt-0.5 text-[13px] text-[var(--text-primary)]">{whatNext(lead)}</p>
      </div>
    </div>
  );
}

export function Clock({ expiresAt }: { expiresAt: string | null }) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  const hours = Math.max(0, Math.floor(ms / 3_600_000));
  const urgent = hours < 12;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${urgent ? "bg-red-50 text-red-700" : "bg-[var(--accent-wash)] text-[var(--text-secondary)]"}`}>
      <Timer size={12} /> {hours > 48 ? `${Math.round(hours / 24)}d` : `${hours}h`} left to update
    </span>
  );
}

export function StarButton({ starred, onToggle }: { starred: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} aria-label={starred ? "Unstar lead" : "Star lead"} className={BTN_GHOST}>
      <Star size={14} className={starred ? "fill-amber-300 text-amber-700" : ""} /> {starred ? "Starred" : "Star"}
    </button>
  );
}

export function Requirements({ lead, onSave }: { lead: CrmLead; onSave: (patch: Record<string, unknown>) => void }) {
  const blur = (k: keyof CrmLead) => (e: { target: { value: string } }) => {
    const value = e.target.value;
    if (value !== String(lead[k] ?? "")) onSave({ [k]: value || null });
  };
  return (
    <section>
      <Label>Requirements</Label>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <select defaultValue={lead.deal_kind ?? ""} onChange={blur("deal_kind")} className={INPUT} aria-label="Sale or rent">
          <option value="">Sale or rent?</option><option value="sale">Buy</option><option value="rent">Rent</option>
        </select>
        <select defaultValue={lead.property_type ?? ""} onChange={blur("property_type")} className={INPUT} aria-label="Property type">
          <option value="">Type</option>
          {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <input defaultValue={lead.beds ?? ""} onBlur={blur("beds")} placeholder="Beds (e.g. 2BR)" className={INPUT} />
        <input type="number" defaultValue={lead.budget_aed ?? ""} onBlur={blur("budget_aed")} placeholder="Budget AED" className={`${INPUT} figure`} />
        <input defaultValue={lead.location ?? ""} onBlur={blur("location")} placeholder="Location / project" className={INPUT} />
        <select defaultValue={lead.ready_status ?? ""} onChange={blur("ready_status")} className={INPUT} aria-label="Ready or off-plan">
          <option value="">Ready / off-plan?</option><option value="ready">Ready</option><option value="offplan">Off-plan</option><option value="any">Either</option>
        </select>
        <select defaultValue={lead.medium ?? ""} onChange={blur("medium")} className={`${INPUT} col-span-2 sm:col-span-1`} aria-label="Contacted via">
          <option value="">Contacted via</option>
          {MEDIUMS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </section>
  );
}

/** Available listings that fit the lead's requirements. */
export function matchListings(lead: CrmLead, listings: CrmListing[]) {
  if (!lead.deal_kind && !lead.location && !lead.beds && !lead.budget_aed) return [];
  const area = (lead.location ?? "").trim().toLowerCase();
  return listings.filter((l) =>
    l.status === "available" &&
    (!lead.deal_kind || l.purpose === lead.deal_kind) &&
    (!area || `${l.community ?? ""} ${l.building ?? ""}`.toLowerCase().includes(area)) &&
    (!lead.beds || (l.bedrooms ?? "").toLowerCase() === lead.beds.toLowerCase()) &&
    (!lead.budget_aed || !l.price_aed || Number(l.price_aed) <= Number(lead.budget_aed) * 1.15),
  );
}

export function Matches({ lead, listings }: { lead: CrmLead; listings: CrmListing[] }) {
  const found = matchListings(lead, listings).slice(0, 6);
  const canSend = !!lead.phone && !lead.phone.includes("•");
  const first = lead.full_name.split(" ")[0];
  const line = (l: CrmListing) =>
    `• ${l.title}${l.community ? `, ${l.community}` : ""}${l.bedrooms ? ` (${l.bedrooms})` : ""}: ${money(l.price_aed)}${l.purpose === "rent" ? "/year" : ""}`;
  const send = (ls: CrmListing[]) =>
    `${whatsapp(lead.phone)}?text=${encodeURIComponent(
      `Hi ${first}, based on what you are looking for, ${ls.length > 1 ? "these match" : "this matches"} your brief:\n\n${ls.map(line).join("\n")}\n\nWould you like to arrange a viewing? - Lababidi Properties`,
    )}`;

  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between">
        <Label>Matched listings ({found.length})</Label>
        {found.length > 1 && canSend && (
          <a href={send(found)} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-emerald-700 hover:underline">Send all on WhatsApp</a>
        )}
      </div>
      {found.length === 0 ? (
        <p className="text-[12.5px] text-[var(--text-muted)]">
          {lead.deal_kind || lead.location ? "No available listing fits yet." : "Add requirements above to see matching listings."}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {found.map((l) => (
            <li key={l.id} className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 text-[12.5px]">
              <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">{l.title} <span className="text-[var(--text-muted)]">· {[l.bedrooms, l.community].filter(Boolean).join(", ")}</span></span>
              <span className="figure shrink-0 text-[var(--text-secondary)]">{money(l.price_aed)}</span>
              {canSend && (
                <a href={send([l])} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-md bg-white px-2 py-1 text-[11.5px] font-semibold text-emerald-700 shadow-sm hover:bg-emerald-100">Send</a>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Mandatory reason + note, used for both "release to pool" and "disqualify". */
export function ReasonForm({ mode, onSubmit, onCancel }: {
  mode: "release" | "lost";
  onSubmit: (reason: string, note: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const reasons = mode === "lost" ? LOST_REASONS : ["Can't handle this area", "Manager asked", "Too many leads", ...LOST_REASONS.slice(0, 3)];
  return (
    <div className="space-y-2.5 rounded-lg border border-red-200 bg-red-50/60 p-3">
      <div className="text-[13px] font-medium text-[var(--text-primary)]">
        {mode === "lost" ? "Disqualify this lead" : "Release this lead to the open pool"}
      </div>
      <select value={reason} onChange={(e) => setReason(e.target.value)} className={INPUT}>
        <option value="">Choose a reason</option>
        {reasons.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (required): what happened?" className={`${INPUT} resize-none`} />
      <div className="flex gap-2">
        <button onClick={() => onSubmit(reason, note.trim())} disabled={!reason || !note.trim()} className={BTN}>Confirm</button>
        <button onClick={onCancel} className={BTN_GHOST}>Cancel</button>
      </div>
    </div>
  );
}

const HOUR = 3_600_000;
const OUTCOMES = [
  { key: "spoke", label: "Spoke to client", kind: "call", body: "Called — spoke with the client", followUpH: 48, stage: null },
  { key: "no_answer", label: "No answer", kind: "call", body: "Called — no answer", followUpH: 3, stage: null },
  { key: "whatsapp", label: "WhatsApp sent", kind: "whatsapp", body: "Sent a WhatsApp message", followUpH: 24, stage: null },
  { key: "viewing", label: "Viewing booked", kind: "meeting", body: "Viewing booked", followUpH: 24, stage: "viewing" },
] as const;

/** One-tap lead update: logs the outcome, moves New → Contacted, sets the next follow-up, restarts the 48h clock. */
export function QuickUpdate({ lead, listings, highlight, onLog, onSave, onLost, onBookViewing, onDone }: {
  lead: CrmLead;
  listings: CrmListing[];
  highlight?: boolean;
  onLog: (kind: string, body: string) => Promise<void>;
  onSave: (patch: Record<string, unknown>) => Promise<void>;
  onLost: () => void;
  onBookViewing: (startsAt: string, listingId: string, location: string) => Promise<void>;
  onDone?: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const matched = matchListings(lead, listings);
  const [viewing, setViewing] = useState({ at: "", listing: matched[0]?.id ?? "", location: "" });

  async function record(o: Omit<(typeof OUTCOMES)[number], "body"> & { body: string }, at?: string) {
    setBusy(o.key);
    await onLog(o.kind, note.trim() ? `${o.body}: ${note.trim()}` : o.body);
    const stage = o.stage ?? (lead.stage === "new" ? "contacted" : null);
    const next = at ? new Date(new Date(at).getTime() + 2 * HOUR).toISOString() : new Date(Date.now() + o.followUpH * HOUR).toISOString();
    await onSave({ next_follow_up_at: next, ...(stage && stage !== lead.stage ? { stage } : {}) });
    setBusy(null);
    setNote("");
    setDone(`Logged. Next follow-up ${new Date(next).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })}.`);
    setTimeout(() => setDone(null), 4000);
    onDone?.();
  }

  async function bookViewing() {
    const o = OUTCOMES.find((x) => x.key === "viewing")!;
    const listing = listings.find((l) => l.id === viewing.listing);
    await onBookViewing(new Date(viewing.at).toISOString(), viewing.listing, viewing.location || [listing?.building, listing?.community].filter(Boolean).join(", "));
    setBooking(false);
    await record({ ...o, body: `Viewing booked for ${new Date(viewing.at).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}${listing ? ` at ${listing.title}` : ""}` }, viewing.at);
  }

  return (
    <section className={`rounded-xl border bg-white p-4 shadow-[var(--shadow-card)] transition ${highlight ? "border-[var(--accent)] ring-4 ring-[rgb(11_42_74/0.12)]" : "border-[var(--accent-dim)]"}`}>
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">{highlight ? "How did it go?" : "Update this lead"}</span>
        <span className="text-[11.5px] text-[var(--text-muted)]">Each update keeps the lead yours for 48h</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {OUTCOMES.map((o) => (
          <button key={o.key} disabled={!!busy} onClick={() => (o.key === "viewing" ? setBooking((v) => !v) : record(o))} className={`${BTN_GHOST} !h-10 !justify-center !px-2 text-[12.5px] ${busy === o.key ? "opacity-60" : ""}`}>
            {busy === o.key ? "Saving…" : o.label}
          </button>
        ))}
        <button disabled={!!busy} onClick={onLost} className={`${BTN_GHOST} !h-10 !px-2 text-[12.5px] hover:!border-red-300 hover:!text-red-700`}>Not interested</button>
      </div>
      {booking && (
        <div className="mt-3 grid gap-2 rounded-lg border border-[var(--hairline)] bg-[var(--surface-sunken)] p-3 sm:grid-cols-2">
          <label className="block"><Label>Date & time</Label><input type="datetime-local" value={viewing.at} onChange={(e) => setViewing({ ...viewing, at: e.target.value })} className={INPUT} /></label>
          <label className="block"><Label>Listing</Label>
            <select value={viewing.listing} onChange={(e) => setViewing({ ...viewing, listing: e.target.value })} className={INPUT}>
              <option value="">No specific listing</option>
              {matched.length > 0 && <optgroup label="Matches">{matched.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</optgroup>}
              <optgroup label="All listings">{listings.filter((l) => !matched.includes(l)).map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</optgroup>
            </select>
          </label>
          <label className="block sm:col-span-2"><Label>Location (optional)</Label><input value={viewing.location} onChange={(e) => setViewing({ ...viewing, location: e.target.value })} placeholder="Defaults to the listing's building" className={INPUT} /></label>
          <div className="flex gap-2 sm:col-span-2">
            <button onClick={bookViewing} disabled={!viewing.at || !!busy} className={BTN}>Book viewing</button>
            <button onClick={() => setBooking(false)} className={BTN_GHOST}>Cancel</button>
          </div>
        </div>
      )}
      <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note, e.g. wants 2BR in Marina, budget 2M" className={`${INPUT} mt-2.5`} />
      {done && <p className="mt-2 text-[12px] font-medium text-emerald-700">{done}</p>}
    </section>
  );
}
