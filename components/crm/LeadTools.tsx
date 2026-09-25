"use client";

import { useState } from "react";
import { LEAD_SOURCES, SOURCE_LABEL, type CrmLead, type CrmUser } from "@/lib/crm";
import { api, INPUT, BTN, Label, SidePanel } from "./shared";

/** Parse pasted rows: "name, phone, email, note" per line (comma or tab separated). */
function parseRows(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.split(/\t|,/).map((c) => c.trim()))
    .filter((cols) => cols[0] && cols[1] && !/^name$/i.test(cols[0]))
    .map(([full_name, phone, email, ...notes]) => ({ full_name, phone, email: email || null, notes: notes.join(", ") || null }));
}

export function ImportLeads({ isAdmin, users, onImported, onClose }: {
  isAdmin: boolean;
  users: CrmUser[];
  onImported: (leads: CrmLead[]) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"one" | "bulk">("one");
  const [source, setSource] = useState("bayut");
  const [owner, setOwner] = useState("");
  const [one, setOne] = useState({ full_name: "", phone: "", email: "", notes: "" });
  const [bulk, setBulk] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = mode === "one" ? (one.full_name && one.phone ? [one] : []) : parseRows(bulk);

  async function submit() {
    setBusy(true);
    setStatus(null);
    const r = await api<{ rows: CrmLead[]; skipped: number }>("POST", "data/leads", {
      rows: rows.map((x) => ({ ...x, source, owner_id: owner || null })),
    });
    setBusy(false);
    if (!r.rows) return setStatus(r.error === "no_valid_rows" ? "Each row needs a name and a phone number." : r.error ?? "Import failed");
    onImported(r.rows as CrmLead[]);
    setStatus(`Added ${(r.rows as CrmLead[]).length} lead(s)${r.skipped ? `, skipped ${r.skipped}` : ""}.`);
    setOne({ full_name: "", phone: "", email: "", notes: "" });
    setBulk("");
  }

  return (
    <SidePanel title="Add leads" subtitle="Log a portal, social or walk-in enquiry, or paste many at once" onClose={onClose}>
      <div className="flex gap-1 rounded-lg border border-[var(--hairline)] p-1">
        {(["one", "bulk"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`flex-1 rounded-md py-1.5 text-[12.5px] ${mode === m ? "bg-[var(--accent-wash)] text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>
            {m === "one" ? "Single lead" : "Paste list"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label><Label>Source</Label>
          <select value={source} onChange={(e) => setSource(e.target.value)} className={INPUT}>
            {LEAD_SOURCES.map((s) => <option key={s} value={s}>{SOURCE_LABEL[s]}</option>)}
          </select>
        </label>
        {isAdmin && (
          <label><Label>Assign to</Label>
            <select value={owner} onChange={(e) => setOwner(e.target.value)} className={INPUT}>
              <option value="">Unassigned</option>
              {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </label>
        )}
      </div>

      {mode === "one" ? (
        <div className="grid grid-cols-2 gap-3">
          <label><Label>Name *</Label><input value={one.full_name} onChange={(e) => setOne({ ...one, full_name: e.target.value })} className={INPUT} /></label>
          <label><Label>Phone *</Label><input value={one.phone} onChange={(e) => setOne({ ...one, phone: e.target.value })} className={`${INPUT} figure`} /></label>
          <label className="col-span-2"><Label>Email</Label><input value={one.email} onChange={(e) => setOne({ ...one, email: e.target.value })} className={INPUT} /></label>
          <label className="col-span-2"><Label>What they asked about</Label><textarea rows={3} value={one.notes} onChange={(e) => setOne({ ...one, notes: e.target.value })} placeholder="Listing reference, budget, area…" className={`${INPUT} resize-none`} /></label>
        </div>
      ) : (
        <label className="block"><Label>One lead per line: name, phone, email, note</Label>
          <textarea rows={10} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={"Ahmed Ali, +971501234567, ahmed@mail.com, 2BR Marina\nSara Khan, +971559876543"} className={`${INPUT} figure resize-none`} />
          <span className="mt-1 block text-[11px] text-[var(--text-muted)]">You can paste straight from Excel or Google Sheets. {rows.length} valid row(s) detected.</span>
        </label>
      )}

      {status && <p className="text-[12.5px] text-[var(--text-secondary)]">{status}</p>}
      <button onClick={submit} disabled={busy || rows.length === 0} className={BTN}>
        {busy ? "Adding…" : `Add ${rows.length || ""} lead${rows.length === 1 ? "" : "s"}`}
      </button>
    </SidePanel>
  );
}

/** Round-robin: hand every unassigned open lead to active agents in turn. */
export async function autoAssign(leads: CrmLead[], users: CrmUser[], onLead: (l: CrmLead) => void) {
  const agents = users.filter((u) => u.active && u.role === "agent");
  const pool = agents.length ? agents : users.filter((u) => u.active);
  const queue = leads.filter((l) => !l.owner_id && l.stage !== "won" && l.stage !== "lost");
  if (!pool.length || !queue.length) return 0;

  // Start with whoever currently holds the fewest open leads.
  const load = new Map(pool.map((u) => [u.id, leads.filter((l) => l.owner_id === u.id && l.stage !== "won" && l.stage !== "lost").length]));
  let done = 0;
  for (const lead of queue) {
    const next = [...load.entries()].sort((a, b) => a[1] - b[1])[0][0];
    const r = await api<{ lead: CrmLead }>("PATCH", "leads", { id: lead.id, owner_id: next });
    if (r.lead) { onLead(r.lead as CrmLead); load.set(next, (load.get(next) ?? 0) + 1); done++; }
  }
  return done;
}
