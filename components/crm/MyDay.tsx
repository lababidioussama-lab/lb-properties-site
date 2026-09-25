"use client";

import type { ReactNode } from "react";
import { CalendarClock, PhoneIncoming, AlarmClock, Hand, MapPin, Hourglass, KeyRound, IdCard } from "lucide-react";
import { licenceAlerts, type CrmEvent, type CrmLead, type CrmTask, type CrmTenancy, type CrmUser } from "@/lib/crm";
import { renewalState } from "./Rentals";
import { money, Card, Empty } from "./shared";
import { TaskGroup } from "./TaskList";
import { useTable } from "./useTable";
import { serviceLabel } from "./LeadPanel";

const OPEN = ["new", "contacted", "viewing", "offer"];
const hours = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function Panel({ icon: Icon, title, count, tone = "", children }: { icon: typeof Hand; title: string; count: number; tone?: string; children: ReactNode }) {
  return (
    <Card className="flex min-w-0 flex-col">
      <div className="flex items-center gap-2.5 border-b border-[var(--hairline)] px-5 py-3.5">
        <Icon size={16} className={tone || "text-[var(--accent)]"} />
        <h3 className="text-[14px] font-semibold">{title}</h3>
        <span className={`ms-auto rounded-full px-2 text-[11.5px] font-semibold leading-5 ${count ? "bg-[var(--accent-wash)] text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>{count}</span>
      </div>
      <div className="flex-1">{children}</div>
    </Card>
  );
}

function LeadRow({ lead, meta, onOpen }: { lead: CrmLead; meta: ReactNode; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="flex w-full items-center gap-3 border-b border-[var(--hairline)] px-5 py-3 text-start transition last:border-0 hover:bg-[rgb(11_42_74/0.025)]">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium">{lead.full_name}</div>
        <div className="truncate text-[12px] text-[var(--text-muted)]">{serviceLabel(lead.service)}{lead.budget_aed ? ` · ${money(lead.budget_aed)}` : ""}</div>
      </div>
      <div className="shrink-0 text-end text-[12px]">{meta}</div>
    </button>
  );
}

/** An agent's day on one screen: what to do first, in order. */
export function MyDay({ me, isAdmin, leads, tasks, tenancies = [], userName, onOpenLead, onOpenRentals, onTask, onRemoveTask, loaded = true }: {
  loaded?: boolean;
  tenancies?: CrmTenancy[];
  onOpenRentals?: () => void;
  me: CrmUser | undefined;
  isAdmin: boolean;
  leads: CrmLead[];
  tasks: CrmTask[];
  userName: (id: string | null) => string;
  onOpenLead: (id: string) => void;
  onTask: (t: CrmTask) => void;
  onRemoveTask: (id: string) => void;
}) {
  const events = useTable<CrmEvent>("events");
  const meId = me?.id;
  const now = Date.now();
  const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

  const mine = (l: CrmLead) => isAdmin || l.owner_id === meId;
  const waiting = leads.filter((l) => (mine(l) || !l.owner_id) && l.stage === "new").sort((a, b) => a.created_at.localeCompare(b.created_at));
  const followUps = leads
    .filter((l) => mine(l) && OPEN.includes(l.stage) && l.next_follow_up_at && new Date(l.next_follow_up_at).getTime() <= endOfDay.getTime())
    .sort((a, b) => (a.next_follow_up_at ?? "").localeCompare(b.next_follow_up_at ?? ""));
  const pool = leads.filter((l) => !l.owner_id && OPEN.includes(l.stage) && l.stage !== "new");
  const expiring = leads
    .filter((l) => mine(l) && l.owner_id && OPEN.includes(l.stage) && l.expires_at && new Date(l.expires_at).getTime() - now < 12 * 3_600_000)
    .sort((a, b) => (a.expires_at ?? "").localeCompare(b.expires_at ?? ""));
  const today = events.rows
    .filter((e) => (isAdmin || e.agent_id === meId) && e.status !== "cancelled" && new Date(e.starts_at).toDateString() === new Date().toDateString())
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const renewals = tenancies
    .filter((t) => (isAdmin || t.agent_id === meId) && (t.status === "active" || t.status === "renewing") && renewalState(t).d <= 120)
    .sort((a, b) => a.end_date.localeCompare(b.end_date));
  const myAlerts = me && me.role === "agent" ? licenceAlerts(me) : [];
  const myTasks = tasks.filter((t) => !t.done_at && (isAdmin || t.assignee_id === meId) && t.due_at && new Date(t.due_at).getTime() <= endOfDay.getTime());

  if (!loaded) {
    return (
      <div className="space-y-5">
        {[88, 180, 180].map((h, i) => <div key={i} className="animate-pulse rounded-xl bg-[rgb(15_23_42/0.06)]" style={{ height: h }} />)}
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const first = me?.full_name?.split(" ")[0] ?? "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl bg-[#0b1a2b] px-6 py-5 text-white shadow-[var(--shadow-card)]">
        <div>
          <div className="font-[family-name:var(--font-display)] text-[26px] font-semibold leading-none">{greeting}{first ? `, ${first}` : ""}</div>
          <div className="mt-1.5 text-[13px] text-white/60">{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</div>
        </div>
        {[
          ["Waiting for first reply", waiting.length],
          ["Follow-ups due", followUps.length],
          ["On the calendar today", today.length],
          ["Tasks due", myTasks.length],
          ["Need an update", expiring.length],
        ].map(([k, v]) => (
          <div key={k as string} className="border-s border-white/15 ps-5">
            <div className="figure text-[24px] font-semibold leading-none text-[#e3cc9f]">{v}</div>
            <div className="mt-1 text-[11.5px] text-white/60">{k}</div>
          </div>
        ))}
      </div>

      {myAlerts.length > 0 && (
        <Card className={`flex items-start gap-3 px-5 py-4 ${myAlerts.some((a) => a.level !== "soon") ? "border-red-200 bg-red-50/60" : "border-amber-200 bg-amber-50/60"}`}>
          <IdCard size={18} className={myAlerts.some((a) => a.level !== "soon") ? "text-red-600" : "text-amber-600"} />
          <div className="text-[13px]">
            <div className="font-semibold">{myAlerts.map((a) => a.text).join(" · ")}</div>
            <div className="text-[12.5px] text-[var(--text-secondary)]">
              {myAlerts.some((a) => a.level !== "soon" && /BRN/.test(a.text)) ? "Without a valid RERA broker card you cannot claim or receive new leads. " : ""}Send your renewed card or visa to the admin.
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Panel icon={PhoneIncoming} title="New leads waiting for a first reply" count={waiting.length} tone="text-[#c0392b]">
          {waiting.length === 0 ? <Empty>Everyone has been contacted.</Empty> : waiting.slice(0, 8).map((l) => (
            <LeadRow key={l.id} lead={l} onOpen={() => onOpenLead(l.id)} meta={
              <span className={hours(l.created_at) >= 1 ? "font-semibold text-[#c0392b]" : "text-[var(--text-muted)]"}>
                {hours(l.created_at) < 1 ? "Just in" : `${hours(l.created_at)}h waiting`}
                <span className="block text-[11px] font-medium text-[var(--accent)]">{l.owner_id ? (isAdmin ? userName(l.owner_id) : "Yours") : "Unclaimed · tap to claim"}</span>
              </span>
            } />
          ))}
        </Panel>

        <Panel icon={AlarmClock} title="Follow-ups due today or overdue" count={followUps.length}>
          {followUps.length === 0 ? <Empty>No follow-ups due.</Empty> : followUps.slice(0, 8).map((l) => {
            const late = new Date(l.next_follow_up_at!).getTime() < now;
            return (
              <LeadRow key={l.id} lead={l} onOpen={() => onOpenLead(l.id)} meta={
                <span className={late ? "font-semibold text-[#c0392b]" : "text-[var(--text-secondary)]"}>
                  {late ? "Overdue" : time(l.next_follow_up_at!)}
                  {isAdmin && <span className="block text-[11px] font-normal text-[var(--text-muted)]">{userName(l.owner_id)}</span>}
                </span>
              } />
            );
          })}
        </Panel>

        <Panel icon={CalendarClock} title="Today's calendar" count={today.length}>
          {today.length === 0 ? <Empty>Nothing booked today.</Empty> : today.map((e) => (
            <div key={e.id} className="flex items-start gap-4 border-b border-[var(--hairline)] px-5 py-3 last:border-0">
              <div className="figure w-12 shrink-0 text-[13.5px] font-semibold text-[var(--accent)]">{time(e.starts_at)}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium">{e.title}</div>
                <div className="flex items-center gap-1 truncate text-[12px] text-[var(--text-muted)]">
                  <span className="capitalize">{e.kind}</span>
                  {e.location && <><span>·</span><MapPin size={11} />{e.location}</>}
                  {isAdmin && <span>· {userName(e.agent_id)}</span>}
                </div>
              </div>
              {e.lead_id && <button onClick={() => onOpenLead(e.lead_id!)} className="text-[12px] font-medium text-[var(--accent)] hover:underline">Open lead</button>}
            </div>
          ))}
        </Panel>

        <Panel icon={Hourglass} title="Needs an update — about to return to the pool" count={expiring.length} tone="text-amber-600">
          {expiring.length === 0 ? <Empty>All your leads are up to date.</Empty> : expiring.slice(0, 8).map((l) => {
            const left = Math.max(0, Math.round((new Date(l.expires_at!).getTime() - now) / 3_600_000));
            return (
              <LeadRow key={l.id} lead={l} onOpen={() => onOpenLead(l.id)} meta={
                <span className={left <= 3 ? "font-semibold text-[#c0392b]" : "font-medium text-amber-700"}>
                  {left === 0 ? "Due now" : `${left}h left`}
                  {isAdmin && <span className="block text-[11px] font-normal text-[var(--text-muted)]">{userName(l.owner_id)}</span>}
                </span>
              } />
            );
          })}
        </Panel>

        {renewals.length > 0 && (
          <Panel icon={KeyRound} title="Tenancy renewals coming up" count={renewals.length} tone="text-amber-600">
            {renewals.slice(0, 6).map((t) => {
              const r = renewalState(t);
              return (
                <button key={t.id} onClick={onOpenRentals} className="flex w-full items-center gap-3 border-b border-[var(--hairline)] px-5 py-3 text-start last:border-0 hover:bg-[rgb(11_42_74/0.025)]">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-medium">{t.property_label}</div>
                    <div className="text-[12px] text-[var(--text-muted)]">Ends {new Date(t.end_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}{t.renewal_notice_sent_at ? " · notice sent" : ""}</div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.tone}`}>{r.label}</span>
                </button>
              );
            })}
          </Panel>
        )}

        <Panel icon={Hand} title="Open pool — claim a lead" count={pool.length}>
          {pool.length === 0 ? <Empty>The pool is empty.</Empty> : pool.slice(0, 6).map((l) => (
            <LeadRow key={l.id} lead={l} onOpen={() => onOpenLead(l.id)} meta={<span className="font-medium text-[var(--accent)]">Claim →<span className="block text-[11px] font-normal text-[var(--text-muted)]">{hours(l.created_at)}h old</span></span>} />
          ))}
        </Panel>
      </div>

      <Card className="p-5">
        {myTasks.length === 0
          ? <Empty>No tasks due today.</Empty>
          : <TaskGroup title="Tasks due today or overdue" tasks={myTasks} onChange={onTask} onRemove={onRemoveTask} userName={userName} showAssignee={isAdmin} />}
      </Card>
    </div>
  );
}
