"use client";

import { useMemo, useState } from "react";
import { Search, CalendarClock, Plus, Shuffle, Timer, Star, Hand } from "lucide-react";
import { STAGES, STAGE_LABEL, SOURCE_LABEL, sourceKey, type CrmLead, type CrmTask, type CrmUser, type Stage } from "@/lib/crm";
import { api, money, shortDate, isOverdue, STAGE_STYLE, INPUT, BTN, BTN_GHOST, Card } from "./shared";
import { ImportLeads, autoAssign } from "./LeadTools";
import { serviceLabel } from "./LeadPanel";

export function Pipeline({ leads, tasks, users, isAdmin, userName, onLead, onOpen }: {
  leads: CrmLead[];
  tasks: CrmTask[];
  users: CrmUser[];
  isAdmin: boolean;
  userName: (id: string | null) => string;
  onLead: (l: CrmLead) => void;
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("all");
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<Stage | null>(null);
  const [adding, setAdding] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const unassigned = leads.filter((l) => !l.owner_id && l.stage !== "won" && l.stage !== "lost").length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((l) =>
      (owner === "all" || (owner === "none" ? !l.owner_id : owner === "starred" ? l.starred : l.owner_id === owner)) &&
      (!q || `${l.full_name} ${l.phone} ${l.email ?? ""}`.toLowerCase().includes(q)),
    );
  }, [leads, query, owner]);

  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 86_400_000;
    const open = visible.filter((l) => l.stage !== "won" && l.stage !== "lost");
    return [
      { label: "New this week", value: String(visible.filter((l) => new Date(l.created_at).getTime() > weekAgo).length) },
      { label: "Open deals", value: String(open.length) },
      { label: "Pipeline value", value: money(open.reduce((s, l) => s + (Number(l.deal_value_aed) || 0), 0)) },
      { label: "Won value", value: money(visible.filter((l) => l.stage === "won").reduce((s, l) => s + (Number(l.deal_value_aed) || 0), 0)) },
      { label: "Overdue follow-ups", value: String(open.filter((l) => isOverdue(l.next_follow_up_at)).length + tasks.filter((t) => !t.done_at && isOverdue(t.due_at)).length) },
    ];
  }, [visible, tasks]);

  async function move(id: string, stage: Stage) {
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.stage === stage) return;
    onLead({ ...lead, stage });
    const r = await api<{ lead: CrmLead }>("PATCH", "leads", { id, stage });
    onLead(r.lead ? (r.lead as CrmLead) : lead);
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label} className="px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{s.label}</div>
            <div className="figure mt-2 text-[24px] font-semibold leading-none text-[var(--accent)]">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, email" className={`${INPUT} ps-8`} />
        </div>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} className={`${INPUT} !w-auto`}>
          <option value="all">{isAdmin ? "All agents" : "All my leads + pool"}</option>
          <option value="none">Open pool ({unassigned})</option>
          <option value="starred">Starred</option>
          {isAdmin && users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        {isAdmin && unassigned > 0 && (
          <button
            onClick={async () => setNote(`Assigned ${await autoAssign(leads, users, onLead)} lead(s) to agents in turn.`)}
            className={BTN_GHOST}
          >
            <Shuffle size={14} /> Auto-assign {unassigned}
          </button>
        )}
        <button onClick={() => setAdding(true)} className={BTN}><Plus size={14} /> Add leads</button>
      </div>

      {note && <p className="text-[12.5px] text-[var(--text-secondary)]">{note}</p>}

      <div className="grid min-h-0 flex-1 auto-cols-[minmax(240px,1fr)] grid-flow-col gap-3 overflow-x-auto pb-2">
        {STAGES.map((stage) => {
          const column = visible.filter((l) => l.stage === stage);
          return (
            <section
              key={stage}
              onDragOver={(e) => { e.preventDefault(); setOver(stage); }}
              onDragLeave={() => setOver(null)}
              onDrop={() => { if (dragging) void move(dragging, stage); setDragging(null); setOver(null); }}
              className={`flex min-h-[300px] flex-col rounded-xl border p-2 transition-colors ${over === stage ? "border-[var(--accent)] bg-[var(--accent-wash)]" : "border-[var(--hairline)] bg-[var(--surface-sunken)]"}`}
            >
              <header className="flex items-center justify-between px-2 py-1.5">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${STAGE_STYLE[stage]}`}>{STAGE_LABEL[stage]}</span>
                <span className="figure text-[11px] text-[var(--text-muted)]">{column.length}</span>
              </header>
              <div className="flex flex-col gap-2 overflow-y-auto">
                {column.map((l) => (
                  <button
                    key={l.id}
                    draggable
                    onDragStart={() => setDragging(l.id)}
                    onClick={() => onOpen(l.id)}
                    className="rounded-lg border border-[var(--hairline)] bg-[var(--surface-raised)] p-3 text-start transition-colors hover:border-[var(--accent)]"
                  >
                    <div className="flex items-center gap-1.5">
                      {l.starred && <Star size={12} className="shrink-0 fill-amber-300 text-amber-700" />}
                      <span className="truncate text-[13px] font-medium text-[var(--text-primary)]">{l.full_name}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{SOURCE_LABEL[sourceKey(l.source)]} · {serviceLabel(l.service)} · {shortDate(l.created_at)}</div>
                    {l.stage === "new" && Date.now() - new Date(l.created_at).getTime() > 3_600_000 && (
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-[#c0392b]">
                        <Timer size={12} /> No reply for {Math.floor((Date.now() - new Date(l.created_at).getTime()) / 3_600_000)}h
                      </div>
                    )}
                    {!l.owner_id && !isAdmin && (
                      <div className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-700"><Hand size={12} /> Open pool: claim it</div>
                    )}
                    {l.expires_at && (
                      <div className={`mt-1.5 flex items-center gap-1 text-[11px] ${new Date(l.expires_at).getTime() - Date.now() < 12 * 3_600_000 ? "text-[#c0392b]" : "text-[var(--text-muted)]"}`}>
                        <Timer size={12} /> {Math.max(0, Math.floor((new Date(l.expires_at).getTime() - Date.now()) / 3_600_000))}h to update
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-[var(--text-secondary)]">{userName(l.owner_id)}</span>
                      {l.deal_value_aed != null && <span className="figure text-[var(--text-secondary)]">{money(l.deal_value_aed)}</span>}
                    </div>
                    {l.next_follow_up_at && (
                      <div className={`mt-1.5 flex items-center gap-1 text-[11px] ${isOverdue(l.next_follow_up_at) ? "text-[#c0392b]" : "text-[var(--text-muted)]"}`}>
                        <CalendarClock size={12} /> {shortDate(l.next_follow_up_at)}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      {adding && <ImportLeads isAdmin={isAdmin} users={users} onImported={(rows) => rows.forEach(onLead)} onClose={() => setAdding(false)} />}
    </div>
  );
}
