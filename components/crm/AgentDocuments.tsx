"use client";

import { useState } from "react";
import { Upload, Trash2, FileText } from "lucide-react";
import { DOC_KINDS, DOC_KIND_LABEL, type CrmAgentDocument } from "@/lib/crm";
import { shortDate, INPUT, BTN, Label, Card, Empty } from "./shared";
import type { Table } from "./useTable";

/** Link-based "upload": paste a share link (Drive/Dropbox/etc.) rather than hosting files ourselves.
    An admin's GET returns every agent's documents (needed elsewhere for team management), so this
    "My documents" view filters to just the signed-in person's own rows via `onlyUserId`. */
export function AgentDocuments({ t, onlyUserId }: { t: Table<CrmAgentDocument>; onlyUserId?: string }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", url: "", kind: "other" });
  const rows = onlyUserId ? t.rows.filter((d) => d.user_id === onlyUserId) : t.rows;

  async function upload() {
    const saved = await t.create(form);
    if (saved) { setForm({ title: "", url: "", kind: "other" }); setAdding(false); }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">My documents</h3>
        <button onClick={() => setAdding((v) => !v)} className={BTN}><Upload size={14} /> Upload</button>
      </div>

      {adding && (
        <div className="mb-4 space-y-2.5 rounded-lg border border-[var(--hairline)] p-3">
          <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} className={INPUT}>
            {DOC_KINDS.map((k) => <option key={k} value={k}>{DOC_KIND_LABEL[k]}</option>)}
          </select>
          <input placeholder="Title, e.g. Passport copy" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={INPUT} />
          <input placeholder="Share link (Drive, Dropbox…)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className={INPUT} />
          <p className="text-[11px] text-[var(--text-muted)]">No file storage yet — paste a link to where the file already lives.</p>
          <button onClick={upload} disabled={!form.title.trim() || !/^https?:\/\//.test(form.url)} className={BTN}>Save</button>
        </div>
      )}

      {t.error && <p className="mb-2 text-[12px] text-[#e0645f]">{t.error === "url_and_title_required" ? "Enter a title and a valid link." : t.error}</p>}

      {rows.length === 0 ? <Empty>No documents uploaded yet.</Empty> : (
        <ul className="space-y-1.5">
          {rows.map((d) => (
            <li key={d.id} className="flex items-center gap-2.5 rounded-lg border border-[var(--hairline)] px-3 py-2">
              <FileText size={14} className="shrink-0 text-[var(--text-muted)]" />
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--accent)] hover:underline">{d.title}</a>
              <span className="shrink-0 text-[10.5px] capitalize text-[var(--text-muted)]">{DOC_KIND_LABEL[d.kind]}</span>
              <span className="shrink-0 text-[10.5px] text-[var(--text-muted)]">{shortDate(d.created_at)}</span>
              <button onClick={() => t.remove(d.id)} aria-label="Delete" className="shrink-0 text-[var(--text-muted)] hover:text-[#e0645f]"><Trash2 size={13} /></button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
