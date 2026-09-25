"use client";

import { useMemo, useState } from "react";
import { Plus, Phone, ArrowRight } from "lucide-react";
import { OWNER_REQUEST_STATUSES, OWNER_REQUEST_LABEL, OWNER_REQUEST_TONE, type CrmOwnerRequest, type CrmUser } from "@/lib/crm";
import { money, shortDate, whatsapp, INPUT, BTN, BTN_GHOST, Label, Card, SidePanel, Empty } from "./shared";
import { useTable } from "./useTable";

const BLANK = { owner_name: "", phone: "", email: "", purpose: "sale", property_type: "", community: "", building: "", asking_price_aed: "", notes: "" };

export function OwnerRequestsView({ isAdmin, users, userName, onCreateListing }: {
  isAdmin: boolean;
  users: CrmUser[];
  userName: (id: string | null) => string;
  onCreateListing: (request: CrmOwnerRequest) => void;
}) {
  const t = useTable<CrmOwnerRequest>("owner_requests");
  const [status, setStatus] = useState("all");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(BLANK);

  const rows = status === "all" ? t.rows : t.rows.filter((r) => r.status === status);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of t.rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [t.rows]);

  async function create() {
    const saved = await t.create({ ...form, asking_price_aed: form.asking_price_aed || null });
    if (saved) { setForm(BLANK); setAdding(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={`${INPUT} !w-auto`}>
          <option value="all">All statuses ({t.rows.length})</option>
          {OWNER_REQUEST_STATUSES.map((s) => <option key={s} value={s}>{OWNER_REQUEST_LABEL[s]} ({counts[s] ?? 0})</option>)}
        </select>
        <button onClick={() => setAdding((v) => !v)} className={`${BTN} ms-auto`}><Plus size={14} /> New owner request</button>
      </div>

      {adding && (
        <Card className="grid gap-2.5 p-4 sm:grid-cols-3">
          <input placeholder="Owner name *" value={form.owner_name} onChange={(e) => setForm({ ...form, owner_name: e.target.value })} className={INPUT} />
          <input placeholder="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={INPUT} />
          <select value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} className={INPUT}>
            <option value="sale">Wants to sell</option><option value="rent">Wants to rent out</option>
          </select>
          <input placeholder="Property type" value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value })} className={INPUT} />
          <input placeholder="Community" value={form.community} onChange={(e) => setForm({ ...form, community: e.target.value })} className={INPUT} />
          <input placeholder="Building" value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} className={INPUT} />
          <input placeholder="Asking price AED" type="number" value={form.asking_price_aed} onChange={(e) => setForm({ ...form, asking_price_aed: e.target.value })} className={`${INPUT} figure`} />
          <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={`${INPUT} sm:col-span-2`} />
          <button onClick={create} disabled={!form.owner_name.trim() || !form.phone.trim()} className={BTN}>Save</button>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--hairline)] text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {["Owner", "Wants to", "Property", "Asking", "Status", "Agent", "Added", ""].map((h) => <th key={h} className="px-4 py-3 text-start font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[var(--hairline)] last:border-0 hover:bg-[var(--surface)]">
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{r.owner_name}</td>
                <td className="px-4 py-3 capitalize text-[var(--text-secondary)]">{r.purpose}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{[r.property_type, r.community].filter(Boolean).join(" · ") || "—"}</td>
                <td className="figure px-4 py-3 text-[var(--text-secondary)]">{money(r.asking_price_aed)}</td>
                <td className="px-4 py-3">
                  <select
                    value={r.status}
                    onChange={(e) => t.update(r.id, { status: e.target.value })}
                    className={`rounded-full border-0 px-2 py-0.5 text-[10.5px] font-medium ${OWNER_REQUEST_TONE[r.status]}`}
                  >
                    {OWNER_REQUEST_STATUSES.map((s) => <option key={s} value={s}>{OWNER_REQUEST_LABEL[s]}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{userName(r.owner_id)}</td>
                <td className="px-4 py-3 text-[var(--text-muted)]">{shortDate(r.created_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <a href={whatsapp(r.phone)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="text-[var(--text-muted)] hover:text-[var(--accent)]"><Phone size={14} /></a>
                    {!r.listing_id && (
                      <button onClick={() => onCreateListing(r)} className={BTN_GHOST}>Create listing <ArrowRight size={12} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>No owner requests yet.</Empty>}
      </Card>
    </div>
  );
}
