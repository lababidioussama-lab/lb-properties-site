"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, MapPin } from "lucide-react";
import type { CrmEvent, CrmLead, CrmListing, CrmUser } from "@/lib/crm";
import { toInputDate, INPUT, BTN, BTN_GHOST, Label, Card, SidePanel, Empty } from "./shared";
import { useTable } from "./useTable";

const KIND_STYLE: Record<CrmEvent["kind"], string> = {
  viewing: "bg-amber-500/20 text-amber-200 border-amber-500/40",
  meeting: "bg-sky-500/20 text-sky-200 border-sky-500/40",
  call: "bg-indigo-500/20 text-indigo-200 border-indigo-500/40",
  handover: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
};
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export function CalendarView({ isAdmin, users, leads, listings, userName }: {
  isAdmin: boolean;
  users: CrmUser[];
  leads: CrmLead[];
  listings: CrmListing[];
  userName: (id: string | null) => string;
}) {
  const t = useTable<CrmEvent>("events");
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [agent, setAgent] = useState("all");
  const [editing, setEditing] = useState<CrmEvent | { starts_at: string } | null>(null);

  const events = t.rows.filter((e) => e.status !== "cancelled" && (agent === "all" || e.agent_id === agent));

  const days = useMemo(() => {
    const first = new Date(cursor);
    const offset = (first.getDay() + 6) % 7;
    first.setDate(1 - offset);
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(first); d.setDate(first.getDate() + i); return d; });
  }, [cursor]);

  const upcoming = events
    .filter((e) => new Date(e.starts_at).getTime() >= Date.now() - 3_600_000 && e.status === "scheduled")
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    .slice(0, 8);

  const shift = (n: number) => setCursor((c) => { const d = new Date(c); d.setMonth(d.getMonth() + n); return d; });
  const newAt = (d: Date) => { const s = new Date(d); s.setHours(11, 0, 0, 0); setEditing({ starts_at: s.toISOString() }); };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
      <Card className="p-4">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button onClick={() => shift(-1)} className={BTN_GHOST} aria-label="Previous month"><ChevronLeft size={15} /></button>
          <h2 className="min-w-[160px] text-center font-[family-name:var(--font-display)] text-[22px]">
            {cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </h2>
          <button onClick={() => shift(1)} className={BTN_GHOST} aria-label="Next month"><ChevronRight size={15} /></button>
          <button onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }} className={BTN_GHOST}>Today</button>
          {isAdmin && (
            <select value={agent} onChange={(e) => setAgent(e.target.value)} className={`${INPUT} ms-auto w-auto`}>
              <option value="all">All agents</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          )}
          <button onClick={() => newAt(new Date())} className={`${BTN} ${isAdmin ? "" : "ms-auto"}`}><Plus size={14} /> Book</button>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-[var(--hairline)] bg-[var(--hairline)]">
          {WEEKDAYS.map((d) => <div key={d} className="bg-[var(--surface-sunken)] py-2 text-center text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{d}</div>)}
          {days.map((d) => {
            const inMonth = d.getMonth() === cursor.getMonth();
            const dayEvents = events.filter((e) => sameDay(new Date(e.starts_at), d));
            return (
              <div key={d.toISOString()} onDoubleClick={() => newAt(d)} className={`min-h-[96px] bg-[var(--surface-raised)] p-1.5 ${inMonth ? "" : "opacity-40"}`}>
                <div className={`mb-1 grid h-6 w-6 place-items-center rounded-full text-[11.5px] ${sameDay(d, new Date()) ? "bg-[var(--accent-solid)] text-white" : "text-[var(--text-secondary)]"}`}>{d.getDate()}</div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((e) => (
                    <button key={e.id} onClick={() => setEditing(e)} className={`block w-full truncate rounded border px-1.5 py-0.5 text-start text-[10.5px] ${KIND_STYLE[e.kind]} ${e.status === "done" ? "line-through opacity-60" : ""}`}>
                      {time(e.starts_at)} {e.title}
                    </button>
                  ))}
                  {dayEvents.length > 3 && <div className="px-1 text-[10px] text-[var(--text-muted)]">+{dayEvents.length - 3} more</div>}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-[var(--text-muted)]">Double-click a day to book on it.</p>
      </Card>

      <Card className="p-4">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Coming up</h3>
        {upcoming.length === 0 ? <Empty>No upcoming appointments.</Empty> : (
          <ul className="space-y-2.5">
            {upcoming.map((e) => (
              <li key={e.id}>
                <button onClick={() => setEditing(e)} className="w-full rounded-lg border border-[var(--hairline)] p-3 text-start hover:border-[var(--accent)]">
                  <div className="flex items-center justify-between">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold capitalize ${KIND_STYLE[e.kind]}`}>{e.kind}</span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      {new Date(e.starts_at).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })} · {time(e.starts_at)}
                    </span>
                  </div>
                  <div className="mt-1.5 text-[13px] text-[var(--text-primary)]">{e.title}</div>
                  {e.location && <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--text-muted)]"><MapPin size={11} /> {e.location}</div>}
                  <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">{userName(e.agent_id)}</div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {editing && (
        <EventForm
          event={"id" in editing ? editing : null}
          defaultStart={editing.starts_at}
          isAdmin={isAdmin}
          users={users}
          leads={leads}
          listings={listings}
          error={t.error}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            const saved = "id" in editing ? await t.update(editing.id, body) : await t.create(body);
            if (saved) setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function EventForm({ event, defaultStart, isAdmin, users, leads, listings, error, onClose, onSave }: {
  event: CrmEvent | null;
  defaultStart: string;
  isAdmin: boolean;
  users: CrmUser[];
  leads: CrmLead[];
  listings: CrmListing[];
  error: string | null;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const [f, setF] = useState({
    title: event?.title ?? "",
    kind: event?.kind ?? "viewing",
    starts_at: toInputDate(event?.starts_at ?? defaultStart),
    location: event?.location ?? "",
    lead_id: event?.lead_id ?? "",
    listing_id: event?.listing_id ?? "",
    agent_id: event?.agent_id ?? "",
    notes: event?.notes ?? "",
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const save = (extra: Record<string, unknown> = {}) =>
    onSave({ ...f, starts_at: f.starts_at ? new Date(f.starts_at).toISOString() : null, ...extra });

  return (
    <SidePanel title={event ? event.title : "Book an appointment"} subtitle={event ? `Status: ${event.status}` : "Viewing, meeting, call or handover"} onClose={onClose}>
      <label className="block"><Label>Title *</Label><input value={f.title} onChange={set("title")} placeholder="e.g. Viewing: Marina Gate 2304" className={INPUT} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label><Label>Type</Label>
          <select value={f.kind} onChange={set("kind")} className={INPUT}>
            <option value="viewing">Viewing</option><option value="meeting">Meeting</option><option value="call">Call</option><option value="handover">Handover</option>
          </select>
        </label>
        <label><Label>Date & time *</Label><input type="datetime-local" value={f.starts_at} onChange={set("starts_at")} className={INPUT} /></label>
        <label className="col-span-2"><Label>Location</Label><input value={f.location} onChange={set("location")} placeholder="Building, community or map link" className={INPUT} /></label>
        <label><Label>Client (lead)</Label>
          <select value={f.lead_id} onChange={set("lead_id")} className={INPUT}>
            <option value="">—</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
          </select>
        </label>
        <label><Label>Listing</Label>
          <select value={f.listing_id} onChange={set("listing_id")} className={INPUT}>
            <option value="">—</option>
            {listings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </label>
        {isAdmin && (
          <label className="col-span-2"><Label>Agent</Label>
            <select value={f.agent_id} onChange={set("agent_id")} className={INPUT}>
              <option value="">Me</option>
              {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </label>
        )}
      </div>
      <label className="block"><Label>Notes</Label><textarea rows={3} value={f.notes} onChange={set("notes")} className={`${INPUT} resize-none`} /></label>
      {error && <p className="text-[12px] text-[#e0645f]">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => save()} disabled={!f.title.trim() || !f.starts_at} className={BTN}>Save</button>
        {event && event.status === "scheduled" && <button onClick={() => save({ status: "done" })} className={BTN_GHOST}>Mark done</button>}
        {event && event.status !== "cancelled" && <button onClick={() => save({ status: "cancelled" })} className={BTN_GHOST}>Cancel appointment</button>}
      </div>
    </SidePanel>
  );
}
