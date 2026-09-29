"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, Unlock } from "lucide-react";

import { Card, Empty } from "../shared";
import { ds, dsError, type DsUsage } from "./api";

interface AccessRow {
  id: string; full_name: string; email: string; role: "admin" | "agent"; active: boolean;
  ds_access: boolean; ds_searches_per_day: number; ds_reveals_per_day: number; ds_lists_per_day: number;
  ds_locked_at: string | null; ds_lock_reason: string | null; usage: DsUsage;
}
interface Activity { id: number; created_at: string; user_id: string; action: string; query: string | null; target: string | null; detail: Record<string, unknown> | null }

const ACTION_LABEL: Record<string, string> = {
  signin: "signed in to DB Search", signout: "left DB Search", search: "searched", open: "opened an owner", reveal: "revealed a number",
  unit: "looked up unit", to_lead: "created a lead", to_contact: "added a contact", to_temp: "added a temp lead",
  denied: "was refused (do-not-contact)", locked: "was locked automatically", admin: "changed access",
};

export function DsAccess({ onExpired }: { onExpired: () => void }) {
  const [users, setUsers] = useState<AccessRow[] | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await ds<{ users: AccessRow[]; activity: Activity[] }>("GET", "admin");
    if (r.ok) { setUsers(r.users); setActivity(r.activity); }
    else if (r.error === "ds_signin_required") onExpired();
    else setError(dsError(r.error));
  }, [onExpired]);
  useEffect(() => { void load(); }, [load]);

  async function change(userId: string, patch: Record<string, unknown>) {
    setUsers((all) => all?.map((u) => (u.id === userId ? { ...u, ...patch, ...(patch.unlock ? { ds_locked_at: null, ds_lock_reason: null } : {}), ...(patch.lock ? { ds_locked_at: new Date().toISOString(), ds_lock_reason: "Locked by the admin" } : {}) } : u)) ?? null);
    const r = await ds("PATCH", "admin", { userId, ...patch });
    if (!r.ok) { setError(dsError(r.error)); void load(); }
  }

  const name = (id: string) => users?.find((u) => u.id === id)?.full_name ?? "Someone";
  const limitInput = (u: AccessRow, key: "ds_searches_per_day" | "ds_reveals_per_day" | "ds_lists_per_day", used: number) => (
    <label className="block">
      <span className="figure block text-[11.5px] text-[var(--text-muted)]">{used} used of</span>
      <input type="number" min={0} max={5000} defaultValue={u[key]} disabled={u.role === "admin"}
        onBlur={(e) => { const v = Math.round(Number(e.target.value)); if (Number.isFinite(v) && v !== u[key]) void change(u.id, { [key]: v }); }}
        className="figure h-8 w-20 rounded-md border border-[var(--hairline-strong)] px-2 text-[13px] disabled:bg-[var(--surface-sunken)]" />
    </label>
  );

  if (error) return <Card className="p-5 text-[13px] text-[#a3261e]">{error}</Card>;
  if (!users) return <div className="h-64 animate-pulse rounded-xl bg-[rgb(15_23_42/0.06)]" />;

  const locked = users.filter((u) => u.ds_locked_at);
  return (
    <div className="space-y-5">
      {locked.map((u) => (
        <div key={u.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[#efc9c5] bg-[#fbeceb] px-4 py-3 text-[13px] text-[#7a1f19]">
          <Lock size={16} />
          <span className="flex-1"><strong>{u.full_name}</strong>: DB Search locked — {u.ds_lock_reason ?? "no reason recorded"}.</span>
          <button onClick={() => change(u.id, { unlock: true })} className="rounded-lg bg-white px-3 py-1.5 font-semibold text-[#0b2a4a]">Unlock</button>
        </div>
      ))}

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-[13px]">
          <thead><tr className="text-left text-[11.5px] text-[var(--text-muted)]">
            <th className="px-4 py-2.5 font-semibold">Person</th><th className="px-4 py-2.5 font-semibold">DB Search</th>
            <th className="px-4 py-2.5 font-semibold">Searches a day</th><th className="px-4 py-2.5 font-semibold">Reveals a day</th><th className="px-4 py-2.5 font-semibold">List owners a day</th><th className="px-4 py-2.5 font-semibold">Status</th>
          </tr></thead>
          <tbody>
            {users.filter((u) => u.active).map((u) => (
              <tr key={u.id} className="border-t border-[var(--hairline)] align-middle">
                <td className="px-4 py-3"><div className="font-semibold">{u.full_name}</div><div className="text-[12px] capitalize text-[var(--text-muted)]">{u.role}</div></td>
                <td className="px-4 py-3">
                  {u.role === "admin" ? <span className="text-[12.5px] text-[var(--text-muted)]">Always on</span> : (
                    <button role="switch" aria-checked={u.ds_access} aria-label={`DB Search access for ${u.full_name}`} onClick={() => change(u.id, { ds_access: !u.ds_access })}
                      className={`relative h-6 w-10 rounded-full transition ${u.ds_access ? "bg-[#0b2a4a]" : "bg-[rgb(15_23_42/0.2)]"}`}>
                      <span className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition-all ${u.ds_access ? "left-[19px]" : "left-[3px]"}`} />
                    </button>
                  )}
                </td>
                <td className="px-4 py-3">{limitInput(u, "ds_searches_per_day", u.usage.searches)}</td>
                <td className="px-4 py-3">{limitInput(u, "ds_reveals_per_day", u.usage.reveals)}</td>
                <td className="px-4 py-3">{limitInput(u, "ds_lists_per_day", u.usage.lists)}</td>
                <td className="px-4 py-3">
                  {u.role === "admin" ? <span className="text-[12.5px] text-[var(--text-muted)]">—</span>
                    : u.ds_locked_at ? <button onClick={() => change(u.id, { unlock: true })} className="inline-flex items-center gap-1.5 rounded-full border border-[#efc9c5] bg-[#fbeceb] px-2.5 py-1 text-[11.5px] font-semibold text-[#a3261e]"><Unlock size={12} /> Locked · unlock</button>
                    : <button onClick={() => change(u.id, { lock: true })} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--hairline-strong)] px-2.5 py-1 text-[11.5px] font-semibold text-[var(--text-secondary)] hover:border-[#a3261e] hover:text-[#a3261e]"><Lock size={12} /> Lock now</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-[var(--hairline)] px-4 py-3 text-[12px] text-[var(--text-muted)]">DB Search locks an agent automatically after more than 15 reveals in 10 minutes, or more than 60 searches in 5 minutes.</p>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-[14px] font-bold">Activity, last 7 days</h2>
        {activity.length === 0 ? <Empty>No DB Search activity yet.</Empty> : (
          <ul className="divide-y divide-[var(--hairline)] text-[13px]">
            {activity.map((a) => (
              <li key={a.id} className="flex items-baseline gap-3 py-2.5">
                <span className="figure w-28 shrink-0 text-[12px] text-[var(--text-muted)]">{new Date(a.created_at).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="flex-1">
                  <strong>{name(a.user_id)}</strong> {ACTION_LABEL[a.action] ?? a.action}
                  {a.query ? <> “<span className="font-medium">{a.query}</span>”</> : null}
                  {a.detail && typeof a.detail.reason === "string" ? <span className="text-[var(--text-muted)]"> · {String(a.detail.reason).replace(/_/g, " ")}</span> : null}
                </span>
                {(a.action === "locked" || a.action === "denied") && <span className="rounded-full border border-[#efc9c5] bg-[#fbeceb] px-2 py-0.5 text-[11px] font-semibold text-[#a3261e]">Alert</span>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
