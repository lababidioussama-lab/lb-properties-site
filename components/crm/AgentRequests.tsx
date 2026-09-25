"use client";

import { useState } from "react";
import { Plus, Smartphone, Video, FileText, HelpCircle } from "lucide-react";
import { REQUEST_KINDS, REQUEST_KIND_LABEL, REQUEST_STATUSES, REQUEST_STATUS_TONE, type CrmAgentRequest, type CrmListing } from "@/lib/crm";
import { shortDate, INPUT, BTN, Label, Card, Empty } from "./shared";
import type { Table } from "./useTable";

const ICON: Record<string, typeof Smartphone> = { sim_esim: Smartphone, video_shoot: Video, document: FileText, other: HelpCircle };
const BLANK = { kind: "sim_esim", title: "", details: "", listing_id: "" };

/** An agent's own requests — new SIM/eSIM, a property video shoot, a document. */
export function MyRequests({ t, listings, onlyUserId }: { t: Table<CrmAgentRequest>; listings: CrmListing[]; onlyUserId?: string }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(BLANK);
  const rows = onlyUserId ? t.rows.filter((r) => r.user_id === onlyUserId) : t.rows;

  async function create() {
    const title = form.title.trim() || REQUEST_KIND_LABEL[form.kind];
    const saved = await t.create({ ...form, title, listing_id: form.listing_id || null });
    if (saved) { setForm(BLANK); setAdding(false); }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">My requests</h3>
        <button onClick={() => setAdding((v) => !v)} className={BTN}><Plus size={14} /> New request</button>
      </div>

      {adding && (
        <div className="mb-4 space-y-2.5 rounded-lg border border-[var(--hairline)] p-3">
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={INPUT}>
            {REQUEST_KINDS.map((k) => <option key={k} value={k}>{REQUEST_KIND_LABEL[k]}</option>)}
          </select>
          {form.kind === "video_shoot" && (
            <select value={form.listing_id} onChange={(e) => setForm({ ...form, listing_id: e.target.value })} className={INPUT}>
              <option value="">Which listing?</option>
              {listings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          )}
          <input placeholder="Short title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={INPUT} />
          <textarea rows={2} placeholder="Details" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} className={`${INPUT} resize-none`} />
          <button onClick={create} className={BTN}>Submit</button>
        </div>
      )}

      {rows.length === 0 ? <Empty>No requests yet.</Empty> : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const Icon = ICON[r.kind];
            return (
              <li key={r.id} className="flex items-start gap-2.5 rounded-lg border border-[var(--hairline)] p-3">
                <Icon size={15} className="mt-0.5 shrink-0 text-[var(--text-muted)]" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[var(--text-primary)]">{r.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${REQUEST_STATUS_TONE[r.status]}`}>{r.status}</span>
                  </div>
                  {r.details && <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">{r.details}</p>}
                  {r.admin_note && <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">Admin: {r.admin_note}</p>}
                  <span className="text-[10.5px] text-[var(--text-muted)]">{shortDate(r.created_at)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** Admin-only queue of every agent's requests. */
export function RequestsQueue({ t, userName }: { t: Table<CrmAgentRequest>; userName: (id: string | null) => string }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-[var(--hairline)] text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {["Agent", "Type", "Title", "Details", "Status", "Added"].map((h) => <th key={h} className="px-4 py-3 text-start font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((r) => (
            <tr key={r.id} className="border-b border-[var(--hairline)] last:border-0">
              <td className="px-4 py-3 text-[var(--text-primary)]">{userName(r.user_id)}</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">{REQUEST_KIND_LABEL[r.kind]}</td>
              <td className="px-4 py-3 text-[var(--text-secondary)]">{r.title}</td>
              <td className="px-4 py-3 text-[var(--text-muted)]">{r.details ?? "—"}</td>
              <td className="px-4 py-3">
                <select value={r.status} onChange={(e) => t.update(r.id, { status: e.target.value })} className={`rounded-full border-0 px-2 py-0.5 text-[10.5px] font-medium ${REQUEST_STATUS_TONE[r.status]}`}>
                  {REQUEST_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td className="px-4 py-3 text-[var(--text-muted)]">{shortDate(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {t.rows.length === 0 && <Empty>No requests from the team yet.</Empty>}
    </Card>
  );
}
