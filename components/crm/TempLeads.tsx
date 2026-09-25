"use client";

import { useState } from "react";
import { Plus, ArrowUpRight } from "lucide-react";
import { TEMP_LEAD_STATUSES, TEMP_LEAD_LABEL, type CrmTempLead, type CrmUser } from "@/lib/crm";
import { api, shortDate, INPUT, BTN, BTN_GHOST, Card, Empty } from "./shared";
import { useTable } from "./useTable";

const BLANK = { full_name: "", phone: "", source: "", notes: "" };
const TONE: Record<string, string> = {
  to_call: "bg-sky-500/15 text-sky-300", call_back: "bg-amber-500/15 text-amber-300",
  called_done: "bg-zinc-500/15 text-zinc-300", interested: "bg-emerald-500/15 text-emerald-300",
  not_interested: "bg-zinc-500/15 text-zinc-400", wrong_number: "bg-red-500/15 text-red-300",
  do_not_call: "bg-red-500/15 text-red-300", it_is_agent: "bg-zinc-500/15 text-zinc-400",
  pre_exist: "bg-zinc-500/15 text-zinc-400", sold_rented: "bg-zinc-500/15 text-zinc-400",
};

export function TempLeadsView({ isAdmin, users, userName, onPromote }: {
  isAdmin: boolean;
  users: CrmUser[];
  userName: (id: string | null) => string;
  onPromote: (t: CrmTempLead) => void;
}) {
  const t = useTable<CrmTempLead>("temp_leads");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(BLANK);

  async function create() {
    const saved = await t.create(form);
    if (saved) { setForm(BLANK); setAdding(false); }
  }

  return (
    <div className="space-y-4">
      <p className="text-[12.5px] text-[var(--text-muted)]">
        A raw calling list — numbers not yet qualified as real leads. Promote one to Leads once they show interest.
      </p>
      <button onClick={() => setAdding((v) => !v)} className={BTN}><Plus size={14} /> Add to call list</button>

      {adding && (
        <Card className="grid gap-2.5 p-4 sm:grid-cols-4">
          <input placeholder="Name *" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={INPUT} />
          <input placeholder="Phone *" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={INPUT} />
          <input placeholder="Source" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className={INPUT} />
          <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={INPUT} />
          <button onClick={create} disabled={!form.full_name.trim() || !form.phone.trim()} className={BTN}>Save</button>
        </Card>
      )}

      <Card className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--hairline)] text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {["Name", "Phone", "Source", "Status", "Agent", "Added", ""].map((h) => <th key={h} className="px-4 py-3 text-start font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((row) => (
              <tr key={row.id} className="border-b border-[var(--hairline)] last:border-0 hover:bg-[var(--surface)]">
                <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{row.full_name}</td>
                <td className="figure px-4 py-3 text-[var(--text-secondary)]">{row.phone}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{row.source ?? "—"}</td>
                <td className="px-4 py-3">
                  <select
                    value={row.status}
                    onChange={(e) => t.update(row.id, { status: e.target.value })}
                    className={`rounded-full border-0 px-2 py-0.5 text-[10.5px] font-medium ${TONE[row.status]}`}
                  >
                    {TEMP_LEAD_STATUSES.map((s) => <option key={s} value={s}>{TEMP_LEAD_LABEL[s]}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{userName(row.owner_id)}</td>
                <td className="px-4 py-3 text-[var(--text-muted)]">{shortDate(row.created_at)}</td>
                <td className="px-4 py-3">
                  {row.status === "interested" && (
                    <button onClick={() => onPromote(row)} className={BTN_GHOST}>Promote <ArrowUpRight size={12} /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {t.rows.length === 0 && <Empty>No numbers on the call list yet.</Empty>}
      </Card>
    </div>
  );
}
