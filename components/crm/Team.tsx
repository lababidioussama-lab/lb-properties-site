"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { licenceAlerts, licenceValid, type CrmUser } from "@/lib/crm";
import { api, INPUT, BTN, BTN_GHOST, Card, Label } from "./shared";
import { Avatar } from "./Avatar";

export function TeamView({ users, meId, onUser }: {
  users: CrmUser[];
  meId: string;
  onUser: (u: CrmUser) => void;
}) {
  const [form, setForm] = useState({ full_name: "", email: "", password: "", role: "agent" });
  const [error, setError] = useState<string | null>(null);

  const [done, setDone] = useState<string | null>(null);

  async function create() {
    setError(null);
    setDone(null);
    if (!form.full_name.trim() || !form.email.trim()) return setError("Enter the agent's full name and email.");
    if (form.password.length < 10) return setError(`The temporary password must be at least 10 characters (this one has ${form.password.length}).`);
    const r = await api<{ user: CrmUser }>("POST", "users", { ...form, email: form.email.trim() });
    if (r.user) {
      onUser(r.user as CrmUser);
      setDone(`${form.full_name} added. Give them their email and this temporary password: ${form.password}`);
      setForm({ full_name: "", email: "", password: "", role: "agent" });
    } else {
      setError(
        r.error === "email_exists" ? "That email already has an account. Use \"Reset password\" on it below instead."
        : r.error === "email_name_and_10char_password_required" ? "Name, email and a password of 10+ characters are required."
        : r.error === "bad_origin" ? "The request was blocked as cross-site. Open the CRM from its own address and try again."
        : `Could not add the agent (${r.error ?? "unknown error"}).`,
      );
    }
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
          <input placeholder="Agent's email" type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={INPUT} />
          <input placeholder="Temporary password (10+ characters)" type="text" autoComplete="off" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={INPUT} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={INPUT}>
            <option value="agent">Agent: own leads only</option>
            <option value="admin">Admin: everything</option>
          </select>
          <button onClick={create} className={BTN}><Plus size={14} /> Add</button>
        </div>
        {error && <p className="mt-2 text-[12px] text-[#c0392b]">{error}</p>}
        {done && <p className="mt-2 text-[12px] font-medium text-emerald-700">{done}</p>}
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
            <div className="basis-full ps-12">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${licenceValid(u) ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                  {licenceValid(u) ? "Licensed" : u.role === "admin" ? "No BRN" : "No valid BRN — gets no leads"}
                </span>
                {licenceAlerts(u).filter((a) => a.level !== "missing").map((a) => (
                  <span key={a.text} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${a.level === "expired" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>{a.text}</span>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-5">
                <label><Label>BRN (broker card)</Label><input defaultValue={u.brn_no ?? ""} onBlur={(e) => e.target.value !== (u.brn_no ?? "") && patch(u.id, { brn_no: e.target.value })} className={INPUT} /></label>
                {([["brn_expiry", "BRN expiry"], ["visa_expiry", "Visa expiry"], ["emirates_id_expiry", "Emirates ID expiry"], ["rera_cert_date", "RERA exam passed"]] as const).map(([k, label]) => (
                  <label key={k}><Label>{label}</Label>
                    <input type="date" defaultValue={u[k] ?? ""} onBlur={(e) => e.target.value !== (u[k] ?? "") && patch(u.id, { [k]: e.target.value || null })} className={INPUT} />
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
