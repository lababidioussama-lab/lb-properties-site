"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import type { CrmTask, CrmUser } from "@/lib/crm";
import { api, shortDate, isOverdue, INPUT, BTN, Empty } from "./shared";

export function TaskRow({ task, onChange, onRemove, userName, showAssignee }: {
  task: CrmTask;
  onChange: (t: CrmTask) => void;
  onRemove: (id: string) => void;
  userName: (id: string | null) => string;
  showAssignee: boolean;
}) {
  const done = !!task.done_at;

  async function toggle() {
    const r = await api<{ task: CrmTask }>("PATCH", "tasks", { id: task.id, done: !done });
    if (r.task) onChange(r.task as CrmTask);
  }
  async function remove() {
    const r = await api("DELETE", "tasks", undefined, `id=${task.id}`);
    if (r.ok) onRemove(task.id);
  }

  return (
    <li className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--surface)]">
      <input type="checkbox" checked={done} onChange={toggle} className="h-4 w-4 accent-[var(--accent-solid)]" />
      <span className={`flex-1 text-[13px] ${done ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]"}`}>
        {task.title}
      </span>
      {showAssignee && <span className="text-[11px] text-[var(--text-muted)]">{userName(task.assignee_id)}</span>}
      <span className={`figure text-[11px] ${!done && isOverdue(task.due_at) ? "text-[#c0392b]" : "text-[var(--text-muted)]"}`}>
        {shortDate(task.due_at)}
      </span>
      <button onClick={remove} aria-label="Delete task" className="text-[var(--text-muted)] opacity-0 transition-opacity hover:text-[#c0392b] group-hover:opacity-100">
        <Trash2 size={14} />
      </button>
    </li>
  );
}

/** Add-task form. `link` attaches the task to a lead or contact. */
export function NewTask({ onCreated, users, isAdmin, link }: {
  onCreated: (t: CrmTask) => void;
  users: CrmUser[];
  isAdmin: boolean;
  link?: { lead_id?: string; contact_id?: string };
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [assignee, setAssignee] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!title.trim()) return;
    setBusy(true);
    const r = await api<{ task: CrmTask }>("POST", "tasks", {
      title,
      due_at: due ? new Date(due).toISOString() : null,
      assignee_id: assignee || null,
      ...link,
    });
    setBusy(false);
    if (r.task) {
      onCreated(r.task as CrmTask);
      setTitle("");
      setDue("");
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <input value={title} onChange={(e) => setTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && create()} placeholder="New follow-up task" className={`${INPUT} min-w-[180px] flex-1`} />
      <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className={`${INPUT} !w-auto`} />
      {isAdmin && (
        <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className={`${INPUT} !w-auto`}>
          <option value="">Assign to me</option>
          {users.filter((u) => u.active).map((u) => (
            <option key={u.id} value={u.id}>{u.full_name}</option>
          ))}
        </select>
      )}
      <button onClick={create} disabled={busy || !title.trim()} className={BTN}>Add</button>
    </div>
  );
}

export function TaskGroup({ title, tasks, ...row }: {
  title: string;
  tasks: CrmTask[];
  onChange: (t: CrmTask) => void;
  onRemove: (id: string) => void;
  userName: (id: string | null) => string;
  showAssignee: boolean;
}) {
  return (
    <div>
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
        {title} <span className="text-[var(--text-secondary)]">{tasks.length}</span>
      </h3>
      {tasks.length === 0 ? <Empty>Nothing here.</Empty> : (
        <ul>{tasks.map((t) => <TaskRow key={t.id} task={t} {...row} />)}</ul>
      )}
    </div>
  );
}
