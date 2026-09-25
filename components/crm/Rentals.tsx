"use client";

import { useMemo, useState } from "react";
import { Plus, MessageCircle, Trash2, CalendarClock, Wand2 } from "lucide-react";
import { daysLeft, type Cheque, type CrmContact, type CrmDeal, type CrmListing, type CrmTenancy, type CrmUser } from "@/lib/crm";
import { money, shortDate, whatsapp, INPUT, BTN, BTN_GHOST, Label, Card, SidePanel, Empty } from "./shared";
import type { Table } from "./useTable";

const today = () => new Date().toISOString().slice(0, 10);
const addMonths = (iso: string, n: number) => {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
};

const CHEQUE_TONE: Record<Cheque["status"], string> = {
  pending: "bg-zinc-100 text-zinc-600", deposited: "bg-sky-50 text-sky-700", cleared: "bg-emerald-50 text-emerald-700", bounced: "bg-red-50 text-red-700",
};

/** Renewal urgency: RERA requires 90 days' notice of any change to the tenancy terms. */
export function renewalState(t: Pick<CrmTenancy, "end_date" | "status" | "renewal_notice_sent_at">) {
  const d = daysLeft(t.end_date);
  if (t.status === "renewed" || t.status === "ended") return { d, tone: "bg-zinc-100 text-zinc-500", label: t.status === "renewed" ? "Renewed" : "Ended", urgent: false };
  if (d < 0) return { d, tone: "bg-red-50 text-red-700", label: `Expired ${-d}d ago`, urgent: true };
  if (d <= 90 && !t.renewal_notice_sent_at) return { d, tone: "bg-red-50 text-red-700", label: `${d}d left — send notice`, urgent: true };
  if (d <= 120) return { d, tone: "bg-amber-50 text-amber-700", label: `${d}d left`, urgent: !t.renewal_notice_sent_at };
  return { d, tone: "bg-emerald-50 text-emerald-700", label: `${d}d left`, urgent: false };
}

export function RentalsView({ t, isAdmin, users, contacts, listings, deals, userName }: {
  t: Table<CrmTenancy>;
  isAdmin: boolean;
  users: CrmUser[];
  contacts: CrmContact[];
  listings: CrmListing[];
  deals: CrmDeal[];
  userName: (id: string | null) => string;
}) {
  const [editing, setEditing] = useState<CrmTenancy | "new" | null>(null);
  const [prefill, setPrefill] = useState<Partial<CrmTenancy> | null>(null);
  const [filter, setFilter] = useState<"active" | "renewals" | "all">("active");

  const rows = useMemo(() => t.rows.filter((x) =>
    filter === "all" ? true : filter === "renewals" ? renewalState(x).urgent || (x.status === "active" && daysLeft(x.end_date) <= 120) : x.status === "active" || x.status === "renewing",
  ), [t.rows, filter]);

  const active = t.rows.filter((x) => x.status === "active" || x.status === "renewing");
  const bounced = active.flatMap((x) => x.cheques.filter((c) => c.status === "bounced"));
  const nextCheques = active.flatMap((x) => x.cheques.filter((c) => c.status === "pending" && daysLeft(c.date) <= 14 && daysLeft(c.date) >= -3));
  const kpis = [
    { label: "Active tenancies", value: String(active.length) },
    { label: "Renewals in 90 days", value: String(active.filter((x) => daysLeft(x.end_date) <= 90).length) },
    { label: "No Ejari", value: String(active.filter((x) => !x.ejari_no).length) },
    { label: "Cheques due in 14 days", value: String(nextCheques.length) },
    { label: "Bounced cheques", value: String(bounced.length) },
  ];

  const hasTenancy = new Set(t.rows.map((x) => x.deal_id).filter(Boolean));
  const rentDeals = deals.filter((d) => d.deal_type === "rent" && !hasTenancy.has(d.id));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {(["active", "renewals", "all"] as const).map((k) => (
          <button key={k} onClick={() => setFilter(k)} className={`h-9 rounded-full border px-3.5 text-[12.5px] font-medium ${filter === k ? "border-[var(--accent)] bg-[var(--accent-wash)] text-[var(--accent)]" : "border-[var(--hairline)] text-[var(--text-secondary)]"}`}>
            {k === "active" ? "Active" : k === "renewals" ? "Renewals due" : "All"}
          </button>
        ))}
        <button onClick={() => { setPrefill(null); setEditing("new"); }} className={`${BTN} ms-auto`}><Plus size={14} /> New tenancy</button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{k.label}</div>
            <div className="figure mt-2 text-[22px] font-semibold leading-none text-[var(--accent)]">{k.value}</div>
          </Card>
        ))}
      </div>

      {rentDeals.length > 0 && (
        <Card className="p-4">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Rental deals without a tenancy record</h3>
          <div className="flex flex-wrap gap-2">
            {rentDeals.slice(0, 6).map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  const start = d.closed_at;
                  setPrefill({
                    deal_id: d.id, listing_id: d.listing_id, tenant_contact_id: d.contact_id, agent_id: d.agent_id, annual_rent_aed: d.price_aed,
                    property_label: listings.find((l) => l.id === d.listing_id)?.title ?? d.title, start_date: start, end_date: new Date(new Date(addMonths(start, 12)).getTime() - 86_400_000).toISOString().slice(0, 10),
                  });
                  setEditing("new");
                }}
                className={`${BTN_GHOST} !h-8`}
              >
                <Plus size={13} /> {d.title}
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--hairline)] text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {["Property", "Tenant", "Rent / year", "Ends", "Renewal", "Ejari", "Cheques", ...(isAdmin ? ["Agent"] : [])].map((h) => <th key={h} className="px-3 py-3 text-start font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => {
              const r = renewalState(x);
              const cleared = x.cheques.filter((c) => c.status === "cleared").length;
              const bad = x.cheques.filter((c) => c.status === "bounced").length;
              return (
                <tr key={x.id} onClick={() => setEditing(x)} className="cursor-pointer border-b border-[var(--hairline)] last:border-0 hover:bg-[var(--surface)]">
                  <td className="px-3 py-2.5 font-medium">{x.property_label}</td>
                  <td className="px-3 py-2.5 text-[var(--text-secondary)]">{contacts.find((c) => c.id === x.tenant_contact_id)?.full_name ?? "—"}</td>
                  <td className="figure px-3 py-2.5">{money(x.annual_rent_aed)}</td>
                  <td className="px-3 py-2.5 text-[var(--text-muted)]">{shortDate(x.end_date)}</td>
                  <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${r.tone}`}>{r.label}</span>{x.renewal_notice_sent_at && <span className="ms-1 text-[10.5px] text-[var(--text-muted)]">notice {shortDate(x.renewal_notice_sent_at)}</span>}</td>
                  <td className="px-3 py-2.5">{x.ejari_no ? <span className="figure text-emerald-700">{x.ejari_no}</span> : <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10.5px] font-semibold text-red-700">Missing</span>}</td>
                  <td className="px-3 py-2.5">
                    <span className="figure">{cleared}/{x.cheques.length || x.cheques_count || 0}</span>
                    {bad > 0 && <span className="ms-1.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">{bad} bounced</span>}
                  </td>
                  {isAdmin && <td className="px-3 py-2.5 text-[var(--text-secondary)]">{userName(x.agent_id)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>No tenancies here yet.</Empty>}
      </Card>

      {editing && (
        <TenancyForm
          tenancy={editing === "new" ? null : editing}
          prefill={prefill}
          isAdmin={isAdmin}
          users={users}
          contacts={contacts}
          listings={listings}
          error={t.error}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            const saved = editing === "new" ? await t.create(body) : await t.update(editing.id, body);
            if (saved) setEditing(saved);
          }}
          onDelete={editing === "new" ? undefined : async () => { await t.remove(editing.id); setEditing(null); }}
        />
      )}
    </div>
  );
}

function TenancyForm({ tenancy, prefill, isAdmin, users, contacts, listings, error, onClose, onSave, onDelete }: {
  tenancy: CrmTenancy | null;
  prefill: Partial<CrmTenancy> | null;
  isAdmin: boolean;
  users: CrmUser[];
  contacts: CrmContact[];
  listings: CrmListing[];
  error: string | null;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
  onDelete?: () => void;
}) {
  const src: Partial<CrmTenancy> = tenancy ?? prefill ?? {};
  const s = (v: unknown) => (v == null ? "" : String(v));
  const [f, setF] = useState({
    property_label: s(src.property_label), listing_id: s(src.listing_id), deal_id: s(src.deal_id),
    landlord_contact_id: s(src.landlord_contact_id), tenant_contact_id: s(src.tenant_contact_id), agent_id: s(src.agent_id),
    start_date: s(src.start_date) || today(), end_date: s(src.end_date), annual_rent_aed: s(src.annual_rent_aed),
    cheques_count: s(src.cheques_count ?? 4), security_deposit_aed: s(src.security_deposit_aed), ejari_no: s(src.ejari_no),
    ejari_expiry: s(src.ejari_expiry), status: s(src.status) || "active", renewal_notice_sent_at: s(src.renewal_notice_sent_at), notes: s(src.notes),
  });
  const [cheques, setCheques] = useState<Cheque[]>(src.cheques ?? []);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const tenant = contacts.find((c) => c.id === f.tenant_contact_id);
  const landlord = contacts.find((c) => c.id === f.landlord_contact_id);
  const r = f.end_date ? renewalState({ end_date: f.end_date, status: f.status as CrmTenancy["status"], renewal_notice_sent_at: f.renewal_notice_sent_at || null }) : null;

  function generate() {
    const n = Math.max(1, Math.min(12, Number(f.cheques_count) || 1));
    const each = Math.round((Number(f.annual_rent_aed) || 0) / n);
    setCheques(Array.from({ length: n }, (_, i) => ({ no: "", bank: "", date: addMonths(f.start_date, Math.round((12 / n) * i)), amount: each, status: "pending" as const })));
  }

  const body = (extra: Record<string, unknown> = {}) => ({
    ...f, listing_id: f.listing_id || null, deal_id: f.deal_id || null, landlord_contact_id: f.landlord_contact_id || null,
    tenant_contact_id: f.tenant_contact_id || null, ejari_expiry: f.ejari_expiry || f.end_date || null,
    renewal_notice_sent_at: f.renewal_notice_sent_at || null, cheques, ...(isAdmin ? { agent_id: f.agent_id || null } : {}), ...extra,
  });
  const msg = (who: string) => encodeURIComponent(`Dear ${who.split(" ")[0]}, the tenancy for ${f.property_label} ends on ${f.end_date}. Please let us know by reply whether you would like to renew, and we will arrange the new contract and Ejari. — Lababidi Properties`);

  return (
    <SidePanel title={tenancy ? f.property_label : "New tenancy"} subtitle={r ? <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.tone}`}>{r.label}</span> : "Tenancy details"} onClose={onClose}>
      <label className="block"><Label>Property *</Label><input value={f.property_label} onChange={set("property_label")} placeholder="e.g. Marina Gate 2, unit 2304" className={INPUT} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label><Label>Tenant</Label>
          <select value={f.tenant_contact_id} onChange={set("tenant_contact_id")} className={INPUT}><option value="">—</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select>
        </label>
        <label><Label>Landlord</Label>
          <select value={f.landlord_contact_id} onChange={set("landlord_contact_id")} className={INPUT}><option value="">—</option>{contacts.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select>
        </label>
        <label><Label>Listing</Label>
          <select value={f.listing_id} onChange={set("listing_id")} className={INPUT}><option value="">—</option>{listings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}</select>
        </label>
        {isAdmin ? (
          <label><Label>Agent</Label>
            <select value={f.agent_id} onChange={set("agent_id")} className={INPUT}><option value="">Me</option>{users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}</select>
          </label>
        ) : <span />}
        <label><Label>Start *</Label><input type="date" value={f.start_date} onChange={set("start_date")} className={INPUT} /></label>
        <label><Label>End *</Label><input type="date" value={f.end_date} onChange={set("end_date")} className={INPUT} /></label>
        <label><Label>Annual rent (AED)</Label><input type="number" value={f.annual_rent_aed} onChange={set("annual_rent_aed")} className={`${INPUT} figure`} /></label>
        <label><Label>Security deposit (AED)</Label><input type="number" value={f.security_deposit_aed} onChange={set("security_deposit_aed")} className={`${INPUT} figure`} /></label>
        <label><Label>Ejari no.</Label><input value={f.ejari_no} onChange={set("ejari_no")} className={`${INPUT} figure`} /></label>
        <label><Label>Status</Label>
          <select value={f.status} onChange={set("status")} className={INPUT}>
            <option value="active">Active</option><option value="renewing">Renewing</option><option value="renewed">Renewed</option><option value="ended">Ended</option>
          </select>
        </label>
      </div>
      {!f.ejari_no && <p className="rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">Register the contract on Ejari — without it the tenant cannot connect DEWA and the contract is not enforceable at the RDC.</p>}

      <section>
        <div className="mb-2 flex items-center gap-2">
          <Label>Cheque schedule</Label>
          <input type="number" min={1} max={12} value={f.cheques_count} onChange={set("cheques_count")} className={`${INPUT} figure !h-8 !w-16`} aria-label="Number of cheques" />
          <button onClick={generate} disabled={!f.annual_rent_aed} className={`${BTN_GHOST} ms-auto !h-8`}><Wand2 size={13} /> Build schedule</button>
        </div>
        <ul className="space-y-1.5">
          {cheques.map((c, i) => {
            const upd = (patch: Partial<Cheque>) => setCheques(cheques.map((x, j) => (j === i ? { ...x, ...patch } : x)));
            return (
              <li key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-1.5">
                <input type="date" value={c.date} onChange={(e) => upd({ date: e.target.value })} className={INPUT} />
                <input type="number" value={c.amount || ""} onChange={(e) => upd({ amount: Number(e.target.value) })} className={`${INPUT} figure`} aria-label="Amount" />
                <input value={c.no} onChange={(e) => upd({ no: e.target.value })} placeholder="Cheque no." className={INPUT} />
                <select value={c.status} onChange={(e) => upd({ status: e.target.value as Cheque["status"] })} className={`${INPUT} ${CHEQUE_TONE[c.status]}`}>
                  <option value="pending">Pending</option><option value="deposited">Deposited</option><option value="cleared">Cleared</option><option value="bounced">Bounced</option>
                </select>
                <button onClick={() => setCheques(cheques.filter((_, j) => j !== i))} aria-label="Remove" className="text-[var(--text-muted)] hover:text-[#c0392b]"><Trash2 size={13} /></button>
              </li>
            );
          })}
        </ul>
        {cheques.length > 0 && <p className="mt-1.5 text-[11.5px] text-[var(--text-muted)]">Total {money(cheques.reduce((t, c) => t + Number(c.amount || 0), 0))} of {money(Number(f.annual_rent_aed) || 0)}</p>}
      </section>

      {tenancy && r && r.d <= 120 && f.status !== "renewed" && f.status !== "ended" && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="flex items-center gap-2 text-[12.5px] font-semibold text-amber-800"><CalendarClock size={15} /> Renewal: {r.d} days left</p>
          <p className="mt-1 text-[12px] text-amber-800">Any change to rent or terms must be notified at least 90 days before the end date. Contact both parties now.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {tenant?.phone && <a href={`${whatsapp(tenant.phone)}?text=${msg(tenant.full_name)}`} target="_blank" rel="noopener noreferrer" className={`${BTN_GHOST} !h-8`}><MessageCircle size={13} /> Tenant</a>}
            {landlord?.phone && <a href={`${whatsapp(landlord.phone)}?text=${msg(landlord.full_name)}`} target="_blank" rel="noopener noreferrer" className={`${BTN_GHOST} !h-8`}><MessageCircle size={13} /> Landlord</a>}
            {!f.renewal_notice_sent_at && <button onClick={() => onSave(body({ renewal_notice_sent_at: today(), status: "renewing" }))} className={`${BTN} !h-8`}>Mark notice sent</button>}
          </div>
        </section>
      )}

      <label className="block"><Label>Notes</Label><textarea rows={2} value={f.notes} onChange={set("notes")} className={`${INPUT} resize-none`} /></label>
      {error && <p className="text-[12px] text-[#c0392b]">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onSave(body())} disabled={!f.property_label.trim() || !f.start_date || !f.end_date} className={BTN}>Save tenancy</button>
        {onDelete && <button onClick={() => window.confirm("Delete this tenancy?") && onDelete()} className={BTN_GHOST}>Delete</button>}
      </div>
    </SidePanel>
  );
}
