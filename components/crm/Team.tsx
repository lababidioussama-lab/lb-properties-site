"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { CrmUser } from "@/lib/crm";
import { api, INPUT, BTN, BTN_GHOST, Card } from "./shared";
import { Avatar } from "./Avatar";

export function TeamView({ users, meId, onUser }: {
  users: CrmUser[];
  meId: string;
  onUser: (u: CrmUser) => void;
}) {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "agent" });
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setError(null);
    const r = await api<{ user: CrmUser }>("POST", "users", form);
    if (r.user) {
      onUser(r.user as CrmUser);
      setForm({ full_name: "", email: "", password: "", role: "agent" });
    } else setError(r.error === "email_exists" ? "That email already has an account." : "Name, email and a password of 10+ characters are required.");
  }

  async function patch(id: string, change: Record<string, unknown>) {
    setError(null);
    const r = await api<{ user: CrmUser }>("PATCH", "users", { id, ...change });
    if (r.user) onUser(r.user as CrmUser);
    else setError(r.error === "cannot_demote_self" ? "You cannot remove your own admin access." : "Could not save.");
  }

  async function resetPassword(u: CrmUser) {
    const password = window.prompt(`New password for ${u.full_name} (10+ characters)`);
    if (password) await patch(u.id, { password });
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="mb-3 text-[13px] font-semibold text-[var(--text-primary)]">Add a team member</h3>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className={INPUT} />
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={INPUT} />
          <input placeholder="Temporary password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={INPUT} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={INPUT}>
            <option value="agent">Agent: own leads only</option>
            <option value="admin">Admin: everything</option>
          </select>
          <button onClick={create} className={BTN}><Plus size={14} /> Add</button>
        </div>
        {error && <p className="mt-2 text-[12px] text-[#c0392b]">{error}</p>}
      </Card>

      <Card className="divide-y divide-[var(--hairline)]">
        {users.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <Avatar name={u.full_name} url={u.avatar_url} />
            <div className="min-w-[180px] flex-1">
              <div className="text-[13px] font-medium text-[var(--text-primary)]">
                {u.full_name} {u.id === meId && <span className="text-[11px] text-[var(--text-muted)]">(you)</span>}
              </div>
              <div className="text-[12px] text-[var(--text-muted)]">{u.email}</div>
            </div>
            <select value={u.role} onChange={(e) => patch(u.id, { role: e.target.value })} className={`${INPUT} !w-auto`}>
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
            <label className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
              Slab
              <input
                type="number" defaultValue={u.slab_pct ?? 50} onBlur={(e) => patch(u.id, { slab_pct: e.target.value })}
                className={`${INPUT} figure !w-16`}
              />%
            </label>
            <label className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
              Target/qtr
              <input
                type="number" defaultValue={u.quarterly_target_aed ?? ""} placeholder="AED" onBlur={(e) => patch(u.id, { quarterly_target_aed: e.target.value })}
                className={`${INPUT} figure !w-24`}
              />
            </label>
            <button onClick={() => patch(u.id, { active: !u.active })} className={BTN_GHOST}>
              {u.active ? "Active" : "Disabled"}
            </button>
            <button onClick={() => resetPassword(u)} className={BTN_GHOST}>Reset password</button>
          </div>
        ))}
      </Card>
    </div>
  );
}
