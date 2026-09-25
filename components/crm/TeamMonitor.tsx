"use client";

import { useEffect, useMemo, useState } from "react";
import { ShieldAlert, FileText, ExternalLink } from "lucide-react";
import { commissionOf, quarterOf, slabOutcome, DOC_KIND_LABEL, type CrmAgentDocument, type CrmDeal, type CrmEvent, type CrmLead, type CrmTask, type CrmUser } from "@/lib/crm";
import { api, money, shortDate, stamp, Card, Empty, INPUT } from "./shared";
import { Avatar } from "./Avatar";
import { useTable } from "./useTable";

interface Session { user_id: string | null; action: string; created_at: string; detail: { ip?: string; agent?: string; email?: string } }
interface Stamp { user_id: string | null; created_at: string; kind?: string }

const OPEN = ["new", "contacted", "viewing", "offer"];
const DAY = 86_400_000;

function ago(iso: string | null) {
  if (!iso) return "Never";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

function device(ua?: string) {
  if (!ua) return "";
  const os = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Mac OS/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : "";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "";
  return [br, os].filter(Boolean).join(" · ");
}

function Status({ last }: { last: string | null }) {
  const mins = last ? (Date.now() - new Date(last).getTime()) / 60_000 : Infinity;
  const [dot, label] =
    mins < 15 ? ["bg-emerald-500", "Online"] :
    mins < 60 * 24 ? ["bg-amber-400", "Active today"] :
    mins < 60 * 24 * 7 ? ["bg-zinc-300", "This week"] :
    ["bg-red-400", last ? "Inactive" : "Never signed in"];
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className="text-[12.5px] font-medium text-[var(--text-primary)]">{label}</span>
    </span>
  );
}

/** Admin-only: who is using the CRM, and how each agent is performing. */
export function TeamMonitor({ users, leads, tasks, deals }: { users: CrmUser[]; leads: CrmLead[]; tasks: CrmTask[]; deals: CrmDeal[] }) {
  const events = useTable<CrmEvent>("events");
  const [data, setData] = useState<{ sessions: Session[]; actions: Stamp[]; activities: Stamp[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api<{ sessions: Session[]; actions: Stamp[]; activities: Stamp[] }>("GET", "team_activity").then((r) => {
      if (r.ok) setData({ sessions: r.sessions ?? [], actions: r.actions ?? [], activities: r.activities ?? [] });
      else setError(r.error ?? "load_failed");
    });
  }, []);

  const now = Date.now();
  const q = quarterOf(new Date());

  const rows = useMemo(() => users.filter((u) => u.active).map((u) => {
    const mine = <T extends { user_id: string | null }>(xs: T[]) => xs.filter((x) => x.user_id === u.id);
    const logins = data ? mine(data.sessions).filter((s) => s.action === "login") : [];
    const acts = data ? mine(data.activities) : [];
    const recent7 = (xs: Stamp[]) => xs.filter((x) => now - new Date(x.created_at).getTime() < 7 * DAY);
    const stamps = [...logins, ...(data ? mine(data.actions) : []), ...acts].map((x) => x.created_at).sort();
    const myLeads = leads.filter((l) => l.owner_id === u.id);
    const open = myLeads.filter((l) => OPEN.includes(l.stage));
    const qDeals = deals.filter((d) => d.agent_id === u.id && quarterOf(d.closed_at) === q);
    const revenue = qDeals.reduce((s, d) => s + Number(d.price_aed), 0);
    const earned = qDeals.reduce((s, d) => s + (commissionOf(d) * Number(d.agent_split_pct)) / 100, 0);
    const a7 = recent7(acts);
    return {
      u,
      lastSeen: stamps.at(-1) ?? null,
      lastLogin: logins[0] ?? null,
      logins7: recent7(logins).length,
      calls7: a7.filter((a) => a.kind === "call").length,
      wa7: a7.filter((a) => a.kind === "whatsapp").length,
      notes7: a7.filter((a) => a.kind === "note" || a.kind === "email" || a.kind === "meeting").length,
      open: open.length,
      untouched: open.filter((l) => l.stage === "new").length,
      overdue: open.filter((l) => l.next_follow_up_at && new Date(l.next_follow_up_at).getTime() < now).length,
      tasksOverdue: tasks.filter((t) => t.assignee_id === u.id && !t.done_at && t.due_at && new Date(t.due_at).getTime() < now).length,
      viewings: events.rows.filter((e) => e.agent_id === u.id && e.kind === "viewing" && Math.abs(now - new Date(e.starts_at).getTime()) < 30 * DAY).length,
      won: myLeads.filter((l) => l.stage === "won").length,
      deals: qDeals.length,
      earned,
      target: slabOutcome(revenue, u.quarterly_target_aed),
    };
  }), [users, leads, tasks, deals, events.rows, data, now, q]);

  const online = rows.filter((r) => r.lastSeen && now - new Date(r.lastSeen).getTime() < 15 * 60_000).length;
  const today = rows.filter((r) => r.lastSeen && now - new Date(r.lastSeen).getTime() < DAY).length;
  const logins7 = data?.sessions.filter((s) => s.action === "login" && now - new Date(s.created_at).getTime() < 7 * DAY).length ?? 0;
  const failed7 = data?.sessions.filter((s) => s.action === "login_failed" && now - new Date(s.created_at).getTime() < 7 * DAY).length ?? 0;
  const name = (id: string | null) => users.find((u) => u.id === id)?.full_name ?? "Unknown";

  const kpis = [
    { label: "Online now", value: online },
    { label: "Active today", value: `${today} / ${rows.length}` },
    { label: "Sign-ins (7 days)", value: logins7 },
    { label: "Failed sign-ins (7 days)", value: failed7, alert: failed7 > 0 },
  ];

  return (
    <div className="space-y-6">
      {error && <Card className="p-4 text-[13px] text-[#c0392b]">Could not load activity ({error}).</Card>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="px-5 py-4">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{k.label}</div>
            <div className={`figure mt-2 whitespace-nowrap text-[19px] font-semibold leading-none sm:text-[24px] ${k.alert ? "text-[#c0392b]" : "text-[var(--accent)]"}`}>{k.value}</div>
          </Card>
        ))}
      </div>

      <Card className="overflow-x-auto">
        <div className="flex items-baseline justify-between border-b border-[var(--hairline)] px-5 py-4">
          <h3 className="text-[14px] font-semibold">Agents</h3>
          <span className="text-[12px] text-[var(--text-muted)]">Activity: last 7 days · Deals & target: {q}</span>
        </div>
        <table className="w-full min-w-[1100px] text-[13px]">
          <thead>
            <tr className="border-b border-[var(--hairline)] text-[10.5px] uppercase text-[var(--text-muted)]">
              {["Agent", "Status", "Last sign-in", "Sign-ins", "Calls", "WhatsApp", "Notes", "Open leads", "New, untouched", "Overdue follow-ups", "Overdue tasks", "Viewings (30d)", "Deals", "Earned", "Target"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-3 text-start first:ps-5 last:pe-5">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.u.id} className="border-b border-[var(--hairline)] last:border-0">
                <td className="px-3 py-3 ps-5">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={r.u.full_name} url={r.u.avatar_url} size="sm" />
                    <div className="leading-tight">
                      <div className="whitespace-nowrap font-medium">{r.u.full_name}</div>
                      <div className="text-[11px] capitalize text-[var(--text-muted)]">{r.u.role}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <Status last={r.lastSeen} />
                  <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{ago(r.lastSeen)}</div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-[12px] text-[var(--text-secondary)]">
                  {r.lastLogin ? stamp(r.lastLogin.created_at) : "—"}
                  {r.lastLogin && <div className="text-[11px] text-[var(--text-muted)]">{device(r.lastLogin.detail.agent)}</div>}
                </td>
                <Num v={r.logins7} />
                <Num v={r.calls7} />
                <Num v={r.wa7} />
                <Num v={r.notes7} />
                <Num v={r.open} />
                <Num v={r.untouched} warn={r.untouched > 0} />
                <Num v={r.overdue} bad={r.overdue > 0} />
                <Num v={r.tasksOverdue} bad={r.tasksOverdue > 0} />
                <Num v={r.viewings} />
                <Num v={r.deals} />
                <td className="figure whitespace-nowrap px-3 py-3">{money(r.earned)}</td>
                <td className="whitespace-nowrap px-3 py-3 pe-5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-[var(--surface-sunken)]">
                      <div className={`h-full rounded-full ${r.target.pct >= 100 ? "bg-emerald-500" : r.target.pct >= 50 ? "bg-[var(--accent)]" : "bg-amber-400"}`} style={{ width: `${Math.min(100, r.target.pct)}%` }} />
                    </div>
                    <span className={`figure text-[12px] ${r.target.tone}`}>{r.u.quarterly_target_aed ? `${r.target.pct}%` : "—"}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>No active team members.</Empty>}
      </Card>

      <Card>
        <div className="flex items-center gap-2 border-b border-[var(--hairline)] px-5 py-4">
          <ShieldAlert size={16} className="text-[var(--gold)]" />
          <h3 className="text-[14px] font-semibold">Sign-in history</h3>
          <span className="ms-auto text-[12px] text-[var(--text-muted)]">Last 30 days</span>
        </div>
        {!data || data.sessions.length === 0 ? <Empty>No sign-ins recorded yet. Every sign-in from now on appears here.</Empty> : (
          <ul className="divide-y divide-[var(--hairline)]">
            {data.sessions.slice(0, 25).map((s, i) => (
              <li key={i} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2.5 text-[12.5px]">
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${s.action === "login" ? "bg-emerald-50 text-emerald-700" : s.action === "logout" ? "bg-zinc-100 text-zinc-600" : "bg-red-50 text-red-700"}`}>
                  {s.action === "login" ? "Signed in" : s.action === "logout" ? "Signed out" : "Failed attempt"}
                </span>
                <span className="font-medium">{s.user_id ? name(s.user_id) : s.detail.email ?? "Unknown email"}</span>
                <span className="text-[var(--text-muted)]">{device(s.detail.agent)}</span>
                {s.detail.ip && <span className="figure text-[var(--text-muted)]">{s.detail.ip}</span>}
                <span className="ms-auto text-[var(--text-muted)]">{stamp(s.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Num({ v, warn, bad }: { v: number; warn?: boolean; bad?: boolean }) {
  return (
    <td className={`figure px-3 py-3 text-center ${bad ? "font-semibold text-[#c0392b]" : warn ? "font-semibold text-amber-700" : v === 0 ? "text-[var(--text-muted)]" : ""}`}>{v}</td>
  );
}

/** Admin-only: every agent's uploaded documents in one place. */
export function TeamDocuments({ users }: { users: CrmUser[] }) {
  const t = useTable<CrmAgentDocument>("agent_documents");
  const [who, setWho] = useState("all");
  const [kind, setKind] = useState("all");
  const rows = t.rows.filter((d) => (who === "all" || d.user_id === who) && (kind === "all" || d.kind === kind));
  const people = users.filter((u) => t.rows.some((d) => d.user_id === u.id) || u.active);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <select value={who} onChange={(e) => setWho(e.target.value)} className={`${INPUT} !w-auto`}>
          <option value="all">All team members ({t.rows.length})</option>
          {people.map((u) => <option key={u.id} value={u.id}>{u.full_name} ({t.rows.filter((d) => d.user_id === u.id).length})</option>)}
        </select>
        <select value={kind} onChange={(e) => setKind(e.target.value)} className={`${INPUT} !w-auto`}>
          <option value="all">All document types</option>
          {Object.entries(DOC_KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className="ms-auto text-[12px] text-[var(--text-muted)]">Agents add documents from My profile.</span>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[var(--hairline)] text-[10.5px] uppercase text-[var(--text-muted)]">
              {["Document", "Type", "Team member", "Added", ""].map((h) => <th key={h} className="px-4 py-3 text-start first:ps-5">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => {
              const u = users.find((x) => x.id === d.user_id);
              return (
                <tr key={d.id} className="border-b border-[var(--hairline)] last:border-0">
                  <td className="px-4 py-3 ps-5">
                    <span className="flex items-center gap-2.5 font-medium"><FileText size={15} className="text-[var(--text-muted)]" />{d.title}</span>
                  </td>
                  <td className="px-4 py-3"><span className="rounded-full bg-[var(--accent-wash)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">{DOC_KIND_LABEL[d.kind]}</span></td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2"><Avatar name={u?.full_name ?? "?"} url={u?.avatar_url} size="sm" />{u?.full_name ?? "Former member"}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">{shortDate(d.created_at)}</td>
                  <td className="px-4 py-3 pe-5 text-end">
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--accent)] hover:underline">
                      Open <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>No documents match.</Empty>}
      </Card>
    </div>
  );
}
