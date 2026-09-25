"use client";

import { useState } from "react";
import { Upload, Trash2, FileText, Paperclip } from "lucide-react";
import { DOC_KINDS, DOC_KIND_LABEL, type CrmAgentDocument } from "@/lib/crm";
import { shortDate, uploadFile, INPUT, BTN, Card, Empty } from "./shared";
import type { Table } from "./useTable";

/** Real file upload into private CRM storage. An admin's GET returns every agent's documents
    (needed for team management), so "My documents" filters to the signed-in person via `onlyUserId`. */
export function AgentDocuments({ t, onlyUserId }: { t: Table<CrmAgentDocument>; onlyUserId?: string }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ title: "", kind: "id" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rows = onlyUserId ? t.rows.filter((d) => d.user_id === onlyUserId) : t.rows;

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    const up = await uploadFile(file, "doc");
    if (!up.url) { setError(up.error ?? "Upload failed."); setBusy(false); return; }
    const saved = await t.create({ ...form, title: form.title.trim() || file.name, url: up.url });
    setBusy(false);
    if (saved) { setForm({ title: "", kind: "id" }); setFile(null); setAdding(false); }
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
          <label className={`flex cursor-pointer items-center gap-3 rounded-lg border border-dashed px-3 py-4 text-[12.5px] ${file ? "border-emerald-300 bg-emerald-50/60" : "border-[var(--hairline-strong)] hover:border-[var(--accent)]"}`}>
            <Paperclip size={16} className="shrink-0 text-[var(--text-muted)]" />
            <span className="min-w-0 flex-1 truncate">{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : "Choose a file or take a photo — PDF, JPG, PNG, HEIC, up to 5 MB"}</span>
            <input type="file" accept="application/pdf,image/jpeg,image/png,image/webp,image/heic" hidden onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); }} />
          </label>
          <input placeholder="Title (optional), e.g. Passport copy" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={INPUT} />
          <p className="text-[11px] text-[var(--text-muted)]">Stored privately. Only you and the admin can open it.</p>
          <button onClick={upload} disabled={!file || busy} className={BTN}>{busy ? "Uploading…" : "Upload document"}</button>
        </div>
      )}

      {(error || t.error) && <p className="mb-2 text-[12px] text-[#c0392b]">{error ?? t.error}</p>}

      {rows.length === 0 ? <Empty>No documents uploaded yet.</Empty> : (
        <ul className="space-y-1.5">
          {rows.map((d) => (
            <li key={d.id} className="flex items-center gap-2.5 rounded-lg border border-[var(--hairline)] px-3 py-2">
              <FileText size={14} className="shrink-0 text-[var(--text-muted)]" />
              <a href={d.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-[12.5px] text-[var(--accent)] hover:underline">{d.title}</a>
              <span className="shrink-0 text-[10.5px] capitalize text-[var(--text-muted)]">{DOC_KIND_LABEL[d.kind]}</span>
              <span className="shrink-0 text-[10.5px] text-[var(--text-muted)]">{shortDate(d.created_at)}</span>
              <button onClick={() => window.confirm(`Delete "${d.title}"?`) && t.remove(d.id)} aria-label="Delete" className="shrink-0 text-[var(--text-muted)] hover:text-[#c0392b]"><Trash2 size={13} /></button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
