"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, BedDouble, Ruler, BadgeCheck, ShieldAlert, ShieldCheck, Key } from "lucide-react";
import { LISTING_STATUSES, PROPERTY_TYPES, KEY_STATUSES, complianceIssues, adTitleIssues, type CrmContact, type CrmListing, type CrmUser } from "@/lib/crm";
import { money, INPUT, BTN, BTN_GHOST, Label, Card, SidePanel, Empty } from "./shared";
import type { Table } from "./useTable";

const STATUS_STYLE: Record<string, string> = {
  available: "bg-emerald-500/15 text-emerald-300",
  reserved: "bg-amber-500/15 text-amber-300",
  sold: "bg-zinc-500/20 text-zinc-300",
  rented: "bg-sky-500/15 text-sky-300",
  off_market: "bg-zinc-500/15 text-zinc-400",
};

const BLANK = {
  title: "", purpose: "sale", property_type: "apartment", community: "", building: "", unit: "",
  bedrooms: "", size_sqft: "", price_aed: "", permit_no: "", status: "available", description: "",
  photo: "", agent_id: "", owner_contact_id: "",
  form_a_start: "", form_a_end: "", permit_status: "none", key_status: "", exclusive: "",
  off_market: "", low_performing: "",
};

const APPROVAL_STYLE: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-300",
  approved: "bg-emerald-500/15 text-emerald-300",
  rejected: "bg-red-500/15 text-red-300",
};

export function ListingsView({ t, isAdmin, users, contacts, userName, prefill, onPrefillUsed }: {
  t: Table<CrmListing>;
  isAdmin: boolean;
  users: CrmUser[];
  contacts: CrmContact[];
  userName: (id: string | null) => string;
  prefill?: Record<string, string> | null;
  onPrefillUsed?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<CrmListing | "new" | null>(null);

  useEffect(() => {
    if (prefill) setEditing("new");
  }, [prefill]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return t.rows.filter((l) =>
      (status === "all" || l.status === status) &&
      (!q || `${l.title} ${l.community ?? ""} ${l.building ?? ""} ${l.permit_no ?? ""}`.toLowerCase().includes(q)),
    );
  }, [t.rows, query, status]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of t.rows) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [t.rows]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, community, building, permit" className={`${INPUT} ps-8`} />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${INPUT} w-auto`}>
          <option value="all">All statuses ({t.rows.length})</option>
          {LISTING_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")} ({counts[s] ?? 0})</option>)}
        </select>
        <button onClick={() => setEditing("new")} className={BTN}><Plus size={14} /> New listing</button>
      </div>

      {rows.length === 0 ? (
        <Card><Empty>No listings yet. Add your first property.</Empty></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((l) => (
            <button key={l.id} onClick={() => setEditing(l)} className="overflow-hidden rounded-xl border border-[var(--hairline)] bg-[var(--surface-raised)] text-start transition-colors hover:border-[var(--accent)]">
              <div className="relative aspect-[16/10] bg-[var(--surface-sunken)]">
                {l.photos?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={l.photos[0]} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full place-items-center text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">No photo</div>
                )}
                <span className={`absolute start-3 top-3 rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize ${STATUS_STYLE[l.status]}`}>
                  {l.status.replace("_", " ")}
                </span>
                <span className="absolute end-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-[10.5px] font-semibold uppercase text-white">
                  For {l.purpose}
                </span>
                <span className={`absolute bottom-3 start-3 rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize ${APPROVAL_STYLE[l.approval]}`}>
                  {l.approval}
                </span>
                {l.off_market && <span className="absolute bottom-3 end-3 rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10.5px] font-semibold text-zinc-300">Off-market</span>}
              </div>
              <div className="p-4">
                <div className="figure text-[17px] text-[var(--text-primary)]">
                  {money(l.price_aed)}{l.purpose === "rent" && <span className="text-[11px] text-[var(--text-muted)]"> / year</span>}
                </div>
                <div className="mt-1 truncate text-[13.5px] font-medium text-[var(--text-primary)]">{l.title}</div>
                <div className="truncate text-[12px] text-[var(--text-muted)]">{[l.building, l.community].filter(Boolean).join(", ") || "—"}</div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-[11.5px] text-[var(--text-secondary)]">
                  {l.bedrooms && <span className="flex items-center gap-1"><BedDouble size={13} /> {l.bedrooms}</span>}
                  {l.size_sqft && <span className="flex items-center gap-1"><Ruler size={13} /> {Number(l.size_sqft).toLocaleString()} sqft</span>}
                  <span className="capitalize">{l.property_type}</span>
                  {l.permit_no && <span className="flex items-center gap-1 text-emerald-300"><BadgeCheck size={13} /> Permit</span>}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[var(--hairline)] pt-2 text-[11px] text-[var(--text-muted)]">
                  <span>{l.ref_code ?? "Agent:"} {!l.ref_code && userName(l.agent_id)}</span>
                  {complianceIssues(l).length > 0
                    ? <span className="flex items-center gap-1 text-amber-300"><ShieldAlert size={12} /> {complianceIssues(l).length} to fix</span>
                    : <span className="flex items-center gap-1 text-emerald-300"><ShieldCheck size={12} /> Compliant</span>}
                </div>
                {(l.low_performing || l.price_reduced_at) && (
                  <div className="border-t border-[var(--hairline)] px-0 pt-2 text-[10.5px]">
                    {l.low_performing && <span className="me-2 text-amber-300">Low performing</span>}
                    {l.price_reduced_at && <span className="text-sky-300">Price cut {money(l.price_was_aed)} → {money(l.price_aed)}</span>}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {editing && (
        <ListingForm
          listing={editing === "new" ? null : editing}
          prefill={editing === "new" ? prefill : undefined}
          isAdmin={isAdmin}
          users={users}
          contacts={contacts}
          error={t.error}
          onClose={() => { setEditing(null); onPrefillUsed?.(); }}
          onSave={async (body) => {
            const saved = editing === "new" ? await t.create(body) : await t.update(editing.id, body);
            if (saved) { setEditing(null); onPrefillUsed?.(); }
          }}
          onDelete={editing === "new" ? undefined : async () => { await t.remove(editing.id); setEditing(null); }}
          onApprove={editing === "new" ? undefined : async (approval, note) => { const saved = await t.update(editing.id, { approval, approval_note: note || null }); if (saved) setEditing(null); }}
        />
      )}
    </div>
  );
}

function ListingForm({ listing, prefill, isAdmin, users, contacts, error, onClose, onSave, onDelete, onApprove }: {
  listing: CrmListing | null;
  prefill?: Record<string, string> | null;
  isAdmin: boolean;
  users: CrmUser[];
  contacts: CrmContact[];
  error: string | null;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
  onDelete?: () => void;
  onApprove?: (approval: "approved" | "rejected", note: string) => void;
}) {
  const [f, setF] = useState(() => listing
    ? { ...BLANK, ...Object.fromEntries(Object.entries(listing).map(([k, v]) => [k, v == null ? "" : String(v)])), photo: listing.photos.join("\n") }
    : { ...BLANK, ...prefill });
  const set = (k: keyof typeof BLANK) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const [rejectNote, setRejectNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [exclusive, setExclusive] = useState(() => listing?.exclusive ?? false);
  const [offMarket, setOffMarket] = useState(() => listing?.off_market ?? false);
  const [lowPerforming, setLowPerforming] = useState(() => listing?.low_performing ?? false);
  const [priceCut, setPriceCut] = useState(false);

  function submit() {
    const { photo, exclusive: _ex, off_market: _om, low_performing: _lp, ...rest } = f;
    const priceExtras = priceCut && listing
      ? { price_was_aed: listing.price_aed, price_reduced_at: new Date().toISOString() }
      : {};
    onSave({ ...rest, photos: photo.split(/\s+/).filter(Boolean), exclusive, off_market: offMarket, low_performing: lowPerforming, ...priceExtras });
  }

  const issues = listing ? complianceIssues(listing) : [];
  const titleIssues = f.title ? adTitleIssues(f.title, f.building, f.community) : [];

  return (
    <SidePanel title={listing ? listing.title : "New listing"} subtitle={listing ? `Added ${new Date(listing.created_at).toLocaleDateString("en-GB")}` : "Property details"} onClose={onClose}>
      <label className="block"><Label>Title *</Label><input value={f.title} onChange={set("title")} placeholder="e.g. Upgraded 2BR with Marina view" className={INPUT} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label><Label>Purpose</Label><select value={f.purpose} onChange={set("purpose")} className={INPUT}><option value="sale">Sale</option><option value="rent">Rent</option></select></label>
        <label><Label>Type</Label><select value={f.property_type} onChange={set("property_type")} className={INPUT}>{PROPERTY_TYPES.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
        <label><Label>Community</Label><input value={f.community} onChange={set("community")} className={INPUT} /></label>
        <label><Label>Building</Label><input value={f.building} onChange={set("building")} className={INPUT} /></label>
        <label><Label>Unit</Label><input value={f.unit} onChange={set("unit")} className={INPUT} /></label>
        <label><Label>Bedrooms</Label><input value={f.bedrooms} onChange={set("bedrooms")} placeholder="Studio, 1BR…" className={INPUT} /></label>
        <label><Label>Size (sqft)</Label><input type="number" value={f.size_sqft} onChange={set("size_sqft")} className={`${INPUT} figure`} /></label>
        <label><Label>{f.purpose === "rent" ? "Rent / year (AED)" : "Price (AED)"}</Label><input type="number" value={f.price_aed} onChange={set("price_aed")} className={`${INPUT} figure`} /></label>
        <label><Label>Trakheesi permit no.</Label><input value={f.permit_no} onChange={set("permit_no")} className={`${INPUT} figure`} /></label>
        <label><Label>Status</Label><select value={f.status} onChange={set("status")} className={INPUT}>{LISTING_STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select></label>
        <label><Label>Owner (landlord / seller)</Label>
          <select value={f.owner_contact_id} onChange={set("owner_contact_id")} className={INPUT}>
            <option value="">—</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </label>
        {isAdmin && (
          <label><Label>Agent</Label>
            <select value={f.agent_id} onChange={set("agent_id")} className={INPUT}>
              <option value="">Me</option>
              {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </label>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label><Label>Form A start</Label><input type="date" value={f.form_a_start} onChange={set("form_a_start")} className={INPUT} /></label>
        <label><Label>Form A end</Label><input type="date" value={f.form_a_end} onChange={set("form_a_end")} className={INPUT} /></label>
        <label><Label>Permit status</Label>
          <select value={f.permit_status} onChange={set("permit_status")} className={INPUT}>
            <option value="none">None</option><option value="under_process">Under process</option><option value="approved">Approved</option><option value="expired">Expired</option>
          </select>
        </label>
        <label><Label>Key status</Label>
          <select value={f.key_status} onChange={set("key_status")} className={INPUT}>
            <option value="">—</option>
            {KEY_STATUSES.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label className="col-span-2 flex items-center gap-2 pt-1">
          <input type="checkbox" checked={exclusive} onChange={(e) => setExclusive(e.target.checked)} className="h-4 w-4 accent-[var(--accent-solid)]" />
          <span className="text-[12.5px] text-[var(--text-secondary)]">Exclusive listing (Form A signed exclusively with us)</span>
        </label>
        <label className="flex items-center gap-2 pt-1">
          <input type="checkbox" checked={offMarket} onChange={(e) => setOffMarket(e.target.checked)} className="h-4 w-4 accent-[var(--accent-solid)]" />
          <span className="text-[12.5px] text-[var(--text-secondary)]">Off-market (hide from the public site)</span>
        </label>
        <label className="flex items-center gap-2 pt-1">
          <input type="checkbox" checked={lowPerforming} onChange={(e) => setLowPerforming(e.target.checked)} className="h-4 w-4 accent-[var(--accent-solid)]" />
          <span className="text-[12.5px] text-[var(--text-secondary)]">Flag as low performing</span>
        </label>
        {listing && f.price_aed && (
          <label className="col-span-2 flex items-center gap-2 pt-1">
            <input type="checkbox" checked={priceCut} onChange={(e) => setPriceCut(e.target.checked)} className="h-4 w-4 accent-[var(--accent-solid)]" />
            <span className="text-[12.5px] text-[var(--text-secondary)]">This save includes a price reduction (log {money(listing.price_aed)} as the previous price)</span>
          </label>
        )}
      </div>

      {titleIssues.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-[12px] text-amber-200">
          <div className="font-medium">Ad title needs work before publishing</div>
          <ul className="mt-1 list-disc ps-4">{titleIssues.map((t) => <li key={t}>{t}</li>)}</ul>
        </div>
      )}

      <label className="block"><Label>Photo links (one per line)</Label><textarea rows={3} value={f.photo} onChange={set("photo")} placeholder="https://…" className={`${INPUT} resize-none`} /></label>
      <label className="block"><Label>Description</Label><textarea rows={5} value={f.description} onChange={set("description")} className={`${INPUT} resize-none`} /></label>
      {error && <p className="text-[12px] text-[#e0645f]">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button onClick={submit} disabled={!f.title.trim()} className={BTN}>Save listing</button>
        {onDelete && <button onClick={() => window.confirm("Delete this listing?") && onDelete()} className={BTN_GHOST}>Delete</button>}
      </div>

      {isAdmin && listing && listing.approval === "pending" && (
        <section className="rounded-lg border border-[var(--hairline)] p-3">
          <Label>Manager approval</Label>
          {issues.length > 0 && (
            <div className="mt-1.5 flex items-start gap-2 text-[12px] text-amber-300"><ShieldAlert size={14} className="mt-0.5 shrink-0" /> Cannot approve yet: {issues.join(", ")}</div>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={() => onApprove?.("approved", "")} disabled={issues.length > 0} className={BTN}><ShieldCheck size={14} /> Approve</button>
            <button onClick={() => setRejecting(true)} className={BTN_GHOST}>Reject</button>
          </div>
          {rejecting && (
            <div className="mt-2 space-y-2">
              <textarea rows={2} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="Why is it rejected?" className={`${INPUT} resize-none`} />
              <button onClick={() => onApprove?.("rejected", rejectNote)} disabled={!rejectNote.trim()} className={BTN}>Confirm reject</button>
            </div>
          )}
        </section>
      )}
      {listing?.approval === "rejected" && listing.approval_note && (
        <p className="text-[12px] text-red-300">Rejected: {listing.approval_note}</p>
      )}
      {listing && (
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]"><Key size={12} /> {listing.key_status || "Key status not set"}</div>
      )}
    </SidePanel>
  );
}
