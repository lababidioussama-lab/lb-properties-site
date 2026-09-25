"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { KanbanSquare, Users, CheckSquare, UserCog, LogOut, FileText, ExternalLink, Building2, HandCoins, CalendarDays, BarChart3, MessageSquareText, ScrollText, KeySquare, PhoneCall, Send, UserCircle, ClipboardList } from "lucide-react";

import type { CrmContact, CrmDeal, CrmLead, CrmListing, CrmTask, CrmTemplate, CrmUser } from "@/lib/crm";
import type { SessionUser } from "@/lib/crm-auth";
import { api, Card } from "./shared";
import { Pipeline } from "./Pipeline";
import { LeadPanel } from "./LeadPanel";
import { ContactsView, ContactPanel } from "./Contacts";
import { NewTask, TaskGroup } from "./TaskList";
import { TeamView } from "./Team";
import { useTable } from "./useTable";
import { ListingsView } from "./Listings";
import { DealsView } from "./Deals";
import { CalendarView } from "./Calendar";
import { ReportsView } from "./Reports";
import { TemplatesView } from "./Templates";
import { CommandSearch } from "./CommandSearch";
import { AuditView } from "./Audit";
import { OwnerRequestsView } from "./OwnerRequests";
import { TempLeadsView } from "./TempLeads";
import { AgentProfileView } from "./AgentProfile";
import { QuickWhatsAppView } from "./QuickWhatsApp";
import { NotificationBell } from "./Notifications";
import { RequestsQueue } from "./AgentRequests";
import type { CrmAgentRequest } from "@/lib/crm";

type View = "reports" | "pipeline" | "temp_leads" | "contacts" | "listings" | "owner_requests" | "calendar" | "deals" | "tasks" | "templates" | "quick_wa" | "profile" | "team" | "requests" | "audit";

function upsert<T extends { id: string }>(list: T[], item: T, prepend = false): T[] {
  if (list.some((x) => x.id === item.id)) return list.map((x) => (x.id === item.id ? item : x));
  return prepend ? [item, ...list] : [...list, item];
}

export function CrmApp({ me, demo = false }: { me: SessionUser; demo?: boolean }) {
  if (demo && typeof window !== "undefined") (window as { __CRM_DEMO__?: boolean }).__CRM_DEMO__ = true;
  const isAdmin = me.role === "admin";
  const [view, setView] = useState<View>("reports");
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);
  const listings = useTable<CrmListing>("listings");
  const [listingPrefill, setListingPrefill] = useState<Record<string, string> | null>(null);
  const [tempLeadPromote, setTempLeadPromote] = useState<Record<string, string> | null>(null);
  const deals = useTable<CrmDeal>("deals");
  const templates = useTable<CrmTemplate & { created_at?: string }>("templates");

  const load = useCallback(async () => {
    const [l, c, t, u] = await Promise.all([
      api<{ leads: CrmLead[] }>("GET", "leads"),
      api<{ contacts: CrmContact[] }>("GET", "contacts"),
      api<{ tasks: CrmTask[] }>("GET", "tasks"),
      api<{ users: CrmUser[] }>("GET", "users"),
    ]);
    setProblem(l.ok ? null : l.error ?? "Could not load data");
    setLeads(l.leads ?? []);
    setContacts(c.contacts ?? []);
    setTasks(t.tasks ?? []);
    setUsers(u.users ?? []);
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(load, 60_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const userName = useMemo(() => {
    const names = new Map(users.map((u) => [u.id, u.full_name]));
    return (id: string | null) => (id ? names.get(id) ?? "—" : "Unassigned");
  }, [users]);

  const onLead = (l: CrmLead) => setLeads((all) => upsert(all, l, true));
  const onContact = (c: CrmContact) => setContacts((all) => upsert(all, c, true));
  const onTask = (t: CrmTask) => setTasks((all) => upsert(all, t));
  const onRemoveTask = (id: string) => setTasks((all) => all.filter((t) => t.id !== id));
  const onUser = (u: CrmUser) => setUsers((all) => upsert(all, u));

  const lead = leads.find((l) => l.id === leadId) ?? null;
  const contact = contacts.find((c) => c.id === contactId) ?? null;
  const me_ = users.find((u) => u.id === me.id);

  const openTasks = tasks.filter((t) => !t.done_at);
  const dueCount = openTasks.filter((t) => t.due_at && new Date(t.due_at).getTime() < Date.now() + 86_400_000).length;

  const nav: { id: View; label: string; icon: typeof Users; badge?: number }[] = [
    { id: "reports", label: "Dashboard", icon: BarChart3 },
    { id: "pipeline", label: "Leads", icon: KanbanSquare, badge: leads.filter((l) => l.stage === "new").length },
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "listings", label: "Listings", icon: Building2 },
    { id: "owner_requests", label: "Owner requests", icon: KeySquare },
    { id: "temp_leads", label: "Temp leads", icon: PhoneCall },
    { id: "calendar", label: "Calendar", icon: CalendarDays },
    { id: "deals", label: "Deals", icon: HandCoins },
    { id: "tasks", label: "Tasks", icon: CheckSquare, badge: dueCount },
    { id: "templates", label: "WhatsApp templates", icon: MessageSquareText },
    { id: "quick_wa", label: "Quick WhatsApp", icon: Send },
    { id: "profile", label: "My profile", icon: UserCircle },
    ...(isAdmin ? [{ id: "team" as View, label: "Team", icon: UserCog }] : []),
    ...(isAdmin ? [{ id: "requests" as View, label: "Requests", icon: ClipboardList }] : []),
    ...(isAdmin ? [{ id: "audit" as View, label: "Audit log", icon: ScrollText }] : []),
  ];
  const requestsTable = useTable<CrmAgentRequest>("requests");

  const digits = (p: string | null) => (p ?? "").replace(/\D/g, "").slice(-9);
  const duplicatesOf = (l: CrmLead) => {
    const key = digits(l.phone);
    if (key.length < 7) return [];
    return [
      ...leads.filter((x) => x.id !== l.id && digits(x.phone) === key).map((x) => `lead "${x.full_name}"`),
      ...contacts.filter((c) => c.id !== l.contact_id && digits(c.phone) === key).map((c) => `contact "${c.full_name}"`),
    ];
  };

  async function signOut() {
    await fetch("/api/crm/login", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="flex min-h-screen text-[var(--text-primary)]">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-e border-[var(--hairline)] bg-[var(--surface-sunken)] p-4 md:flex">
        <div className="flex items-center gap-2.5 px-2 py-2">
          <Image src="/logo-icon-white.png" alt="" width={30} height={30} />
          <div className="leading-tight">
            <div className="font-[family-name:var(--font-display)] text-[17px] tracking-[0.18em]">LABABIDI</div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-[var(--text-muted)]">CRM</div>
          </div>
        </div>
        <div className="mt-5">
          <CommandSearch
            leads={leads}
            contacts={contacts}
            listings={listings.rows}
            onPick={(hit) => {
              if (hit.kind === "lead") setLeadId(hit.id);
              else if (hit.kind === "contact") setContactId(hit.id);
              else setView("listings");
            }}
          />
        </div>
        <nav className="mt-4 flex flex-col gap-1">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setView(n.id)}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${view === n.id ? "bg-[var(--accent-wash)] text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}
            >
              <n.icon size={16} strokeWidth={1.6} />
              <span className="flex-1 text-start">{n.label}</span>
              {!!n.badge && <span className="figure rounded-full bg-[var(--accent-solid)] px-1.5 text-[10px] text-white">{n.badge}</span>}
            </button>
          ))}
          <a
            href="/documents/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
          >
            <FileText size={16} strokeWidth={1.6} />
            <span className="flex-1 text-start">Documents</span>
            <ExternalLink size={12} className="text-[var(--text-muted)]" />
          </a>
        </nav>
        <div className="mt-auto border-t border-[var(--hairline)] px-2 pt-4">
          <div className="text-[12.5px]">{me_?.full_name ?? "Signed in"}</div>
          <div className="text-[11px] capitalize text-[var(--text-muted)]">{me.role}</div>
          <button onClick={signOut} className="mt-3 flex items-center gap-2 text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <nav className="flex gap-1 overflow-x-auto border-b border-[var(--hairline)] p-2 md:hidden">
          {nav.map((n) => (
            <button key={n.id} onClick={() => setView(n.id)} className={`rounded-lg px-3 py-1.5 text-[12.5px] ${view === n.id ? "bg-[var(--accent-wash)]" : "text-[var(--text-muted)]"}`}>{n.label}</button>
          ))}
          <a href="/documents/index.html" target="_blank" rel="noopener noreferrer" className="rounded-lg px-3 py-1.5 text-[12.5px] text-[var(--text-muted)]">Documents</a>
          <button onClick={signOut} className="ms-auto px-2 text-[var(--text-muted)]" aria-label="Sign out"><LogOut size={15} /></button>
        </nav>

        <main className="flex-1 p-5 md:p-8">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="font-[family-name:var(--font-display)] text-[32px] leading-none">
              {nav.find((n) => n.id === view)?.label}
            </h1>
            <NotificationBell leads={leads} tasks={tasks} listings={listings.rows} isAdmin={isAdmin} meId={me.id} onOpenLead={setLeadId} />
          </div>

          {problem && (
            <Card className="mb-5 border-[#e0645f]/40 p-4 text-[13px] text-[var(--text-secondary)]">
              Could not load CRM data ({problem}). If this mentions a missing relation or column, run
              supabase/migrations/0001_concierge_leads.sql and 0002_crm.sql on the database.
            </Card>
          )}

          {view === "reports" && <ReportsView leads={leads} deals={deals.rows} users={users} userName={userName} />}
          {view === "listings" && (
            <ListingsView t={listings} isAdmin={isAdmin} users={users} contacts={contacts} userName={userName}
              prefill={listingPrefill} onPrefillUsed={() => setListingPrefill(null)} />
          )}
          {view === "temp_leads" && (
            <TempLeadsView
              isAdmin={isAdmin}
              users={users}
              userName={userName}
              onPromote={(row) => {
                setTempLeadPromote({ full_name: row.full_name, phone: row.phone, source: "referral" });
                setView("pipeline");
              }}
            />
          )}
          {view === "quick_wa" && <QuickWhatsAppView leads={leads} templates={templates.rows} meName={me_?.full_name ?? "the team"} />}
          {view === "profile" && me_ && <AgentProfileView me={me_} isAdmin={isAdmin} deals={deals.rows} listings={listings.rows} onMeUpdate={onUser} />}
          {view === "requests" && isAdmin && <RequestsQueue t={requestsTable} userName={userName} />}
          {view === "owner_requests" && (
            <OwnerRequestsView
              isAdmin={isAdmin}
              users={users}
              userName={userName}
              onCreateListing={(req) => {
                setListingPrefill({
                  title: `${req.property_type ?? "Property"} in ${req.community ?? "Dubai"}`.trim(),
                  purpose: req.purpose, property_type: req.property_type ?? "apartment",
                  community: req.community ?? "", building: req.building ?? "",
                  price_aed: String(req.asking_price_aed ?? ""),
                });
                setView("listings");
              }}
            />
          )}
          {view === "calendar" && <CalendarView isAdmin={isAdmin} users={users} leads={leads} listings={listings.rows} userName={userName} />}
          {view === "deals" && <DealsView t={deals} isAdmin={isAdmin} users={users} listings={listings.rows} userName={userName} />}
          {view === "templates" && (
            <TemplatesView templates={templates.rows} isAdmin={isAdmin} onCreate={templates.create} onUpdate={templates.update} onRemove={templates.remove} />
          )}
          {view === "pipeline" && (
            <Pipeline leads={leads} tasks={tasks} users={users} isAdmin={isAdmin} userName={userName} onLead={onLead} onOpen={setLeadId} />
          )}
          {view === "contacts" && (
            <ContactsView contacts={contacts} isAdmin={isAdmin} users={users} userName={userName} onContact={onContact} onOpen={setContactId} />
          )}
          {view === "tasks" && (
            <TasksView tasks={tasks} users={users} isAdmin={isAdmin} userName={userName} onTask={onTask} onRemoveTask={onRemoveTask} />
          )}
          {view === "team" && isAdmin && <TeamView users={users} meId={me.id} onUser={onUser} />}
          {view === "audit" && isAdmin && <AuditView userName={userName} />}
        </main>
      </div>

      {lead && (
        <LeadPanel
          key={lead.id}
          lead={lead}
          listings={listings.rows}
          templates={templates.rows}
          duplicates={duplicatesOf(lead)}
          isAdmin={isAdmin}
          users={users}
          contact={contacts.find((c) => c.id === lead.contact_id) ?? null}
          tasks={tasks.filter((t) => t.lead_id === lead.id)}
          userName={userName}
          onLead={onLead}
          onContact={onContact}
          onTask={onTask}
          onRemoveTask={onRemoveTask}
          onOpenContact={(id) => { setLeadId(null); setContactId(id); }}
          onClose={() => setLeadId(null)}
        />
      )}
      {contact && (
        <ContactPanel
          key={contact.id}
          contact={contact}
          listings={listings.rows}
          leads={leads.filter((l) => l.contact_id === contact.id)}
          tasks={tasks.filter((t) => t.contact_id === contact.id)}
          users={users}
          isAdmin={isAdmin}
          userName={userName}
          onContact={onContact}
          onTask={onTask}
          onRemoveTask={onRemoveTask}
          onOpenLead={(id) => { setContactId(null); setLeadId(id); }}
          onClose={() => setContactId(null)}
        />
      )}
    </div>
  );
}

function TasksView({ tasks, users, isAdmin, userName, onTask, onRemoveTask }: {
  tasks: CrmTask[];
  users: CrmUser[];
  isAdmin: boolean;
  userName: (id: string | null) => string;
  onTask: (t: CrmTask) => void;
  onRemoveTask: (id: string) => void;
}) {
  const now = new Date();
  const endToday = new Date(now);
  endToday.setHours(23, 59, 59, 999);
  const open = tasks.filter((t) => !t.done_at);
  const time = (t: CrmTask) => (t.due_at ? new Date(t.due_at).getTime() : Infinity);

  const groups = [
    { title: "Overdue", items: open.filter((t) => time(t) < now.getTime()) },
    { title: "Today", items: open.filter((t) => time(t) >= now.getTime() && time(t) <= endToday.getTime()) },
    { title: "Upcoming", items: open.filter((t) => time(t) > endToday.getTime() && t.due_at) },
    { title: "No date", items: open.filter((t) => !t.due_at) },
    { title: "Done", items: tasks.filter((t) => t.done_at).slice(-20).reverse() },
  ];
  const row = { onChange: onTask, onRemove: onRemoveTask, userName, showAssignee: isAdmin };

  return (
    <div className="space-y-5">
      <Card className="p-4"><NewTask users={users} isAdmin={isAdmin} onCreated={onTask} /></Card>
      <Card className="space-y-5 p-4">
        {groups.map((g) => <TaskGroup key={g.title} title={g.title} tasks={g.items} {...row} />)}
      </Card>
    </div>
  );
}
