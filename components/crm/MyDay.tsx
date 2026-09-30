"use client";

import type { ReactNode } from "react";
import { Hand, MapPin, IdCard, MessageCircle, Phone } from "lucide-react";
import { SOURCE_LABEL, STAGE_LABEL, leadBrief, licenceAlerts, sourceKey, type CrmEvent, type CrmLead, type CrmTask, type CrmTenancy, type CrmUser } from "@/lib/crm";
import { renewalState } from "./Rentals";
import { BTN_GHOST, BTN_ICON, Card, CardHead, Chip, Empty, StatusLine, whatsapp, type Tone } from "./shared";
import { TaskGroup } from "./TaskList";
import { useTable } from "./useTable";
import { clockTime, firstName, greetingFor, useClock } from "./Greeting";

const OPEN = ["new", "contacted", "viewing", "offer"];
const hours = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

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
  const clock = useClock();
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

  const clockNow = clock ?? new Date();
  const greeting = greetingFor(clockNow.getHours());
  const first = firstName(me?.full_name);

  /* One list, in the order an agent should work it: an unanswered enquiry
     first, then promises already broken, then what is about to happen, then
     leads about to fall back to the pool. */
  type Row = { key: string; lead: CrmLead | null; name: string; kind: string; why: string; due: string; tone: Tone; rank: number; phone: string | null; onOpen: () => void };
  const rows: Row[] = [];
  for (const l of waiting) {
    const h = hours(l.created_at);
    rows.push({ key: `w${l.id}`, lead: l, name: l.full_name, kind: `New · ${SOURCE_LABEL[sourceKey(l.source)]}`, why: leadBrief(l), due: h < 1 ? "Just in" : `${h}h no reply`, tone: h >= 1 ? "bad" : "warn", rank: 0 + h / 1000, phone: l.phone, onOpen: () => onOpenLead(l.id) });
  }
  for (const l of followUps) {
    const at = new Date(l.next_follow_up_at!).getTime();
    const late = at < now;
    const days = Math.floor((now - at) / 86_400_000);
    rows.push({ key: `f${l.id}`, lead: l, name: l.full_name, kind: STAGE_LABEL[l.stage], why: leadBrief(l), due: late ? (days >= 1 ? `Overdue ${days} day${days > 1 ? "s" : ""}` : "Overdue") : `Follow up ${time(l.next_follow_up_at!)}`, tone: late ? "bad" : "info", rank: late ? 1 : 2, phone: l.phone, onOpen: () => onOpenLead(l.id) });
  }
  for (const e of today.filter((x) => new Date(x.ends_at ?? x.starts_at).getTime() >= now)) {
    const l = e.lead_id ? leads.find((x) => x.id === e.lead_id) ?? null : null;
    rows.push({ key: `e${e.id}`, lead: l, name: l?.full_name ?? e.title, kind: e.kind.charAt(0).toUpperCase() + e.kind.slice(1), why: [e.title, e.location].filter(Boolean).join(" · "), due: time(e.starts_at), tone: "info", rank: 2 + new Date(e.starts_at).getTime() / 1e15, phone: l?.phone ?? null, onOpen: () => (l ? onOpenLead(l.id) : undefined) });
  }
  for (const l of expiring) {
    if (rows.some((r) => r.lead?.id === l.id)) continue;
    const left = Math.max(0, Math.round((new Date(l.expires_at!).getTime() - now) / 3_600_000));
    rows.push({ key: `x${l.id}`, lead: l, name: l.full_name, kind: STAGE_LABEL[l.stage], why: `Needs an update or it returns to the pool · ${leadBrief(l)}`, due: left === 0 ? "Update now" : `Update in ${left}h`, tone: "warn", rank: 3, phone: l.phone, onOpen: () => onOpenLead(l.id) });
  }
  rows.sort((x, y) => x.rank - y.rank);
  const lateCount = followUps.filter((l) => new Date(l.next_follow_up_at!).getTime() < now).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
        <h2 className="text-[20px] font-semibold tracking-[-0.01em]">{greeting}{first ? `, ${first}` : ""}</h2>
        <span className="text-[13px] text-[var(--text-muted)]">
          {clockNow.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}{clock && <> · <span className="figure">{clockTime(clock)}</span></>}
        </span>
      </div>
      <StatusLine>
        {waiting.length > 0 ? <b className="bad">{waiting.length} waiting for a first reply</b> : <>No one waiting for a reply</>}
        {" · "}{lateCount} follow-up{lateCount === 1 ? "" : "s"} overdue · {today.length} on the calendar today · {myTasks.length} task{myTasks.length === 1 ? "" : "s"} due
      </StatusLine>

      {myAlerts.length > 0 && (
        <Card className={`flex items-start gap-3 px-4 py-3 ${myAlerts.some((a) => a.level !== "soon") ? "border-[var(--bad-bd)] bg-[var(--bad-bg)]" : "border-[var(--warn-bd)] bg-[var(--warn-bg)]"}`}>
          <IdCard size={18} className={myAlerts.some((a) => a.level !== "soon") ? "text-[var(--bad)]" : "text-[var(--warn)]"} />
          <div className="text-[13px]">
            <div className="font-semibold">{myAlerts.map((a) => a.text).join(" · ")}</div>
            <div className="text-[12.5px] text-[var(--text-secondary)]">
              {myAlerts.some((a) => a.level !== "soon" && /BRN/.test(a.text)) ? "Without a valid RERA broker card you cannot claim or receive new leads. " : ""}Send your renewed card or visa to the admin.
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHead title="Do next" count="Ordered by urgency" />
            {rows.length === 0 ? <Empty icon={<Hand size={18} />}>Nothing urgent. Good time to work the calling list.</Empty> : rows.slice(0, 12).map((r) => (
              <div key={r.key} className="flex min-h-[60px] items-center gap-3 border-b border-[var(--hairline-soft)] px-4 py-2.5 last:border-0">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: `var(--${r.tone === "neutral" ? "text-muted" : r.tone})` }} />
                <button onClick={r.onOpen} className="min-w-0 flex-1 text-start">
                  <span className="flex items-baseline gap-2"><span className="truncate text-[14px] font-medium">{r.name}</span><span className="shrink-0 text-[12px] text-[var(--text-muted)]">{r.kind}</span></span>
                  <span className="block truncate text-[12px] text-[var(--text-secondary)]">{r.why}</span>
                </button>
                <Chip tone={r.tone}>{r.due}</Chip>
                {r.phone && <>
                  <a href={`tel:${r.phone.replace(/\s/g, "")}`} aria-label={`Call ${r.name}`} className={BTN_ICON}><Phone size={15} /></a>
                  <a href={whatsapp(r.phone)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${r.name}`} className={`${BTN_ICON} !text-[var(--wa)]`}><MessageCircle size={15} /></a>
                </>}
                <button onClick={r.onOpen} className={`${BTN_GHOST} hidden sm:inline-flex`}>Open</button>
              </div>
            ))}
          </Card>
          <Card>
            <CardHead title="Tasks due today or overdue" count={myTasks.length} />
            <div className="p-4">
              {myTasks.length === 0
                ? <Empty>No tasks due today.</Empty>
                : <TaskGroup title="" tasks={myTasks} onChange={onTask} onRemove={onRemoveTask} userName={userName} showAssignee={isAdmin} />}
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHead title="Today" count={today.length} />
            {today.length === 0 ? <Empty>Nothing booked today.</Empty> : today.map((e) => (
              <div key={e.id} className="flex gap-3 border-b border-[var(--hairline-soft)] px-4 py-2.5 last:border-0">
                <span className="figure w-11 shrink-0 text-[13px] font-medium">{time(e.starts_at)}</span>
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-medium">{e.title}</div>
                  <div className="flex items-center gap-1 truncate text-[12px] text-[var(--text-muted)]">
                    <span className="capitalize">{e.kind}</span>
                    {e.location && <><span>·</span><MapPin size={11} />{e.location}</>}
                    {isAdmin && <span>· {userName(e.agent_id)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </Card>
          <Card>
            <CardHead title="Open pool" action={pool.length ? <Chip tone="warn">{pool.length} unclaimed</Chip> : undefined} />
            {pool.length === 0 ? <Empty>The pool is empty.</Empty> : pool.slice(0, 6).map((l) => (
              <div key={l.id} className="flex items-center gap-3 border-b border-[var(--hairline-soft)] px-4 py-2 last:border-0">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{l.full_name}</div>
                  <div className="truncate text-[12px] text-[var(--text-muted)]">{SOURCE_LABEL[sourceKey(l.source)]} · {hours(l.created_at)}h waiting</div>
                </div>
                <button onClick={() => onOpenLead(l.id)} className={`${BTN_GHOST} !h-7`}>Claim</button>
              </div>
            ))}
          </Card>
          {renewals.length > 0 && (
            <Card>
              <CardHead title="Rentals needing action" count={renewals.length} />
              {renewals.slice(0, 5).map((t) => {
                const r = renewalState(t);
                return (
                  <button key={t.id} onClick={onOpenRentals} className="flex w-full items-center gap-3 border-b border-[var(--hairline-soft)] px-4 py-2.5 text-start last:border-0 hover:bg-[var(--surface-hover)]">
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${r.tone}`}>{r.label}</span>
                    <span className="min-w-0 truncate text-[13px]">{t.property_label}</span>
                  </button>
                );
              })}
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
