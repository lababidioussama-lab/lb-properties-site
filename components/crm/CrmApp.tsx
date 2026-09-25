"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Activity, ShieldCheck, Receipt, KeyRound, Calculator, Menu, PlugZap, FolderLock, Sun, KanbanSquare, Users, CheckSquare, UserCog, LogOut, FileText, ExternalLink, Building2, HandCoins, CalendarDays, BarChart3, MessageSquareText, ScrollText, KeySquare, PhoneCall, Send, UserCircle, ClipboardList } from "lucide-react";

import type { CrmContact, CrmDeal, CrmInvoice, CrmKyc, CrmSourceSpend, CrmTenancy, CrmLead, CrmListing, CrmTask, CrmTemplate, CrmUser } from "@/lib/crm";
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
import { TeamMonitor, TeamDocuments } from "./TeamMonitor";
import { MyDay } from "./MyDay";
import { ToolsView } from "./Tools";
import { IntegrationsView } from "./Integrations";
import { InvoicesView } from "./Invoices";
import { RentalsView } from "./Rentals";
import { ComplianceView } from "./Compliance";
import { TargetMeter } from "./TargetMeter";
import type { CrmAgentRequest } from "@/lib/crm";

type View = "compliance" | "invoices" | "rentals" | "integrations" | "today" | "tools" | "monitor" | "team_docs" | "reports" | "pipeline" | "temp_leads" | "contacts" | "listings" | "owner_requests" | "calendar" | "deals" | "tasks" | "templates" | "quick_wa" | "profile" | "team" | "requests" | "audit";

function upsert<T extends { id: string }>(list: T[], item: T, prepend = false): T[] {
  if (list.some((x) => x.id === item.id)) return list.map((x) => (x.id === item.id ? item : x));
  return prepend ? [item, ...list] : [...list, item];
}

export function CrmApp({ me, demo = false }: { me: SessionUser; demo?: boolean }) {
  if (demo && typeof window !== "undefined") (window as { __CRM_DEMO__?: boolean }).__CRM_DEMO__ = true;
  const isAdmin = me.role === "admin";
  const [view, setView] = useState<View>("today");
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
  const [loaded, setLoaded] = useState(false);
  const deals = useTable<CrmDeal>("deals");
  const templates = useTable<CrmTemplate & { created_at?: string }>("templates");
  const kyc = useTable<CrmKyc>("kyc");
  const tenancies = useTable<CrmTenancy>("tenancies");
  const invoices = useTable<CrmInvoice>("invoices", isAdmin);
  const spend = useTable<CrmSourceSpend>("source_spend", isAdmin);

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
    setLoaded(true);
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
  const todayCount = leads.filter((l) => l.stage === "new" && (!l.owner_id || isAdmin || l.owner_id === me.id)).length;
  const dueCount = openTasks.filter((t) => t.due_at && new Date(t.due_at).getTime() < Date.now() + 86_400_000).length;

  const nav: { id: View; label: string; icon: typeof Users; badge?: number; group: string; desc: string }[] = [
    { id: "today", label: "My day", icon: Sun, badge: todayCount, group: "Overview", desc: "What to do first today, in order." },
    { id: "reports", label: "Dashboard", icon: BarChart3, group: "Overview", desc: "Performance across leads, pipeline and commission." },
    { id: "pipeline", label: "Leads", icon: KanbanSquare, badge: leads.filter((l) => l.stage === "new").length, group: "Sales", desc: "Every enquiry, from first contact to closed deal." },
    { id: "temp_leads", label: "Temp leads", icon: PhoneCall, group: "Sales", desc: "Raw calling list, promoted to Leads once qualified." },
    { id: "contacts", label: "Contacts", icon: Users, group: "Sales", desc: "Clients, owners and their properties." },
    { id: "deals", label: "Deals", icon: HandCoins, group: "Sales", desc: "Closed transactions, commission and payouts." },
    { id: "rentals", label: "Rentals", icon: KeyRound, group: "Sales", desc: "Tenancies, Ejari, cheque schedules and renewals." },
    { id: "listings", label: "Listings", icon: Building2, group: "Properties", desc: "Stock for sale and rent, with permit compliance." },
    { id: "owner_requests", label: "Owner requests", icon: KeySquare, group: "Properties", desc: "Owners who want to sell or let through us." },
    { id: "calendar", label: "Calendar", icon: CalendarDays, group: "Workspace", desc: "Viewings, meetings and handovers." },
    { id: "tasks", label: "Tasks", icon: CheckSquare, badge: dueCount, group: "Workspace", desc: "Follow-ups, grouped by when they are due." },
    { id: "tools", label: "Tools", icon: Calculator, group: "Workspace", desc: "Cost sheets, commission, yield and mortgage — ready to send on WhatsApp." },
    { id: "templates", label: "WhatsApp templates", icon: MessageSquareText, group: "WhatsApp", desc: "Reusable messages for one-click replies." },
    { id: "quick_wa", label: "Quick WhatsApp", icon: Send, group: "WhatsApp", desc: "Send one message to a list of leads." },
    ...(isAdmin ? [
      { id: "compliance" as View, label: "Compliance", icon: ShieldCheck, group: "Admin", desc: "KYC, goAML, licences, permits and rentals — everything that could lead to a fine." },
      { id: "invoices" as View, label: "Invoices", icon: Receipt, group: "Admin", desc: "VAT tax invoices for commission, and who still owes us." },
      { id: "monitor" as View, label: "Agent performance", icon: Activity, group: "Admin", desc: "Who is using the CRM, and how each agent is performing." },
      { id: "team" as View, label: "Team", icon: UserCog, group: "Admin", desc: "Agents, roles, commission slabs and targets." },
      { id: "integrations" as View, label: "Integrations", icon: PlugZap, group: "Admin", desc: "Bayut, Dubizzle and Property Finder leads, straight to your agents." },
      { id: "team_docs" as View, label: "Team documents", icon: FolderLock, group: "Admin", desc: "Every agent's IDs, visas, licences and contracts." },
      { id: "requests" as View, label: "Requests", icon: ClipboardList, group: "Admin", desc: "What agents have asked the office for." },
      { id: "audit" as View, label: "Audit log", icon: ScrollText, group: "Admin", desc: "Who changed what, and when." },
    ] : []),
    { id: "profile", label: "My profile", icon: UserCircle, group: "Account", desc: "Your details, targets, documents and requests." },
  ];
  const groups = [...new Set(nav.map((n) => n.group))];
  const current = nav.find((n) => n.id === view);
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
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col bg-[#0b1a2b] text-white md:flex">
        <div className="flex items-center gap-3 px-5 pb-5 pt-6">
          <Image src="/logo-icon-white.png" alt="" width={34} height={34} />
          <div className="leading-none">
            <div className="font-[family-name:var(--font-wordmark)] text-[16px] tracking-[0.16em]">LABABIDI</div>
            <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.34em] text-[#d4b87f]">Properties CRM</div>
          </div>
        </div>
        <div className="px-3 [&_button]:!border-white/10 [&_button]:!bg-white/[0.06] [&_button]:!text-white/60 hover:[&_button]:!text-white">
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
        <nav className="mt-3 flex-1 overflow-y-auto px-3 pb-4">
          {groups.map((g) => (
            <div key={g} className="mt-4 first:mt-2">
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/35">{g}</div>
              {nav.filter((n) => n.group === g).map((n) => {
                const on = view === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => setView(n.id)}
                    className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-[7px] text-[13px] transition-colors ${on ? "bg-white/[0.09] font-medium text-white" : "text-white/65 hover:bg-white/[0.05] hover:text-white"}`}
                  >
                    {on && <span className="absolute -start-3 top-1.5 bottom-1.5 w-[3px] rounded-e bg-[#c8a96e]" />}
                    <n.icon size={16} strokeWidth={1.7} className={on ? "text-[#d4b87f]" : "text-white/50 group-hover:text-white/80"} />
                    <span className="flex-1 text-start">{n.label}</span>
                    {!!n.badge && <span className="min-w-5 rounded-full bg-[#c8a96e] px-1.5 text-center text-[10.5px] font-semibold leading-5 text-[#0b1a2b]">{n.badge}</span>}
                  </button>
                );
              })}
            </div>
          ))}
          <a
            href="/documents/index.html"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-[7px] text-[13px] text-white/65 transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            <FileText size={16} strokeWidth={1.7} className="text-white/50" />
            <span className="flex-1 text-start">Documents</span>
            <ExternalLink size={12} className="text-white/40" />
          </a>
        </nav>
        {!isAdmin && <TargetMeter me={me_} deals={deals.rows} variant="sidebar" />}
        <div className="border-t border-white/10 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            {me_?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me_.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
            ) : (
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#c8a96e]/20 text-[12px] font-semibold text-[#e3cc9f]">
                {(me_?.full_name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("")}
              </div>
            )}
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[13px] font-medium">{me_?.full_name ?? "Signed in"}</div>
              <div className="text-[11px] capitalize text-white/45">{me.role}</div>
            </div>
            <button onClick={signOut} aria-label="Sign out" title="Sign out" className="grid h-8 w-8 place-items-center rounded-lg text-white/50 transition hover:bg-white/10 hover:text-white">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 flex items-center gap-3 bg-[#0b1a2b] px-4 py-3 text-white md:hidden">
          <Image src="/logo-icon-white.png" alt="" width={26} height={26} />
          <select
            value={view}
            onChange={(e) => setView(e.target.value as View)}
            className="h-9 flex-1 rounded-lg border border-white/15 bg-white/[0.06] px-3 text-[13px] text-white outline-none"
          >
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {nav.filter((n) => n.group === g).map((n) => <option key={n.id} value={n.id} className="text-black">{n.label}</option>)}
              </optgroup>
            ))}
          </select>
          <button onClick={signOut} className="grid h-9 w-9 place-items-center rounded-lg text-white/60" aria-label="Sign out"><LogOut size={16} /></button>
        </div>
        {!isAdmin && <div className="sticky top-[60px] z-30"><TargetMeter me={me_} deals={deals.rows} variant="bar" /></div>}

        <main className="mx-auto w-full max-w-[1480px] flex-1 px-4 pb-24 pt-5 md:px-10 md:py-9">
          <div className="mb-5 flex items-start justify-between gap-4 border-b border-[var(--hairline)] pb-4 md:mb-7 md:pb-6">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--gold)]">{current?.group}</p>
              <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-[28px] font-semibold leading-none tracking-[-0.01em] md:text-[34px]">
                {current?.label}
              </h1>
              <p className="mt-2 hidden text-[13.5px] text-[var(--text-muted)] sm:block">{current?.desc}</p>
            </div>
            <NotificationBell leads={leads} tasks={tasks} listings={listings.rows} isAdmin={isAdmin} meId={me.id} onOpenLead={setLeadId} />
          </div>

          {problem && (
            <Card className="mb-5 border-[#c0392b]/40 p-4 text-[13px] text-[var(--text-secondary)]">
              Could not load CRM data ({problem}). If this mentions a missing relation or column, run
              supabase/migrations/0001_concierge_leads.sql and 0002_crm.sql on the database.
            </Card>
          )}

          {view === "today" && (
            <MyDay loaded={loaded} me={me_} isAdmin={isAdmin} leads={leads} tasks={tasks} tenancies={tenancies.rows} onOpenRentals={() => setView("rentals")} userName={userName}
              onOpenLead={setLeadId} onTask={onTask} onRemoveTask={onRemoveTask} />
          )}
          {view === "tools" && <ToolsView />}
          {view === "reports" && <ReportsView leads={leads} deals={deals.rows} users={users} userName={userName} spend={isAdmin ? spend : null} />}
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
          {view === "deals" && <DealsView t={deals} isAdmin={isAdmin} users={users} listings={listings.rows} contacts={contacts} kyc={kyc.rows} userName={userName} onInvoiceCreated={() => void invoices.reload()} />}
          {view === "templates" && (
            <TemplatesView templates={templates.rows} isAdmin={isAdmin} onCreate={templates.create} onUpdate={templates.update} onRemove={templates.remove} />
          )}
          {view === "pipeline" && (
            <Pipeline leads={leads} tasks={tasks} users={users} isAdmin={isAdmin} userName={userName} onLead={onLead} onOpen={setLeadId} />
          )}
          {view === "contacts" && (
            <ContactsView contacts={contacts} kyc={kyc.rows} isAdmin={isAdmin} users={users} userName={userName} onContact={onContact} onOpen={setContactId} />
          )}
          {view === "tasks" && (
            <TasksView tasks={tasks} users={users} isAdmin={isAdmin} userName={userName} onTask={onTask} onRemoveTask={onRemoveTask} />
          )}
          {view === "team" && isAdmin && <TeamView users={users} meId={me.id} onUser={onUser} />}
          {view === "audit" && isAdmin && <AuditView userName={userName} />}
          {view === "monitor" && isAdmin && <TeamMonitor users={users} leads={leads} tasks={tasks} deals={deals.rows} />}
          {view === "team_docs" && isAdmin && <TeamDocuments users={users} />}
          {view === "rentals" && (
            <RentalsView t={tenancies} isAdmin={isAdmin} users={users} contacts={contacts} listings={listings.rows} deals={deals.rows} userName={userName} />
          )}
          {view === "invoices" && isAdmin && <InvoicesView t={invoices} deals={deals.rows} contacts={contacts} />}
          {view === "compliance" && isAdmin && (
            <ComplianceView users={users} contacts={contacts} listings={listings.rows} deals={deals} kyc={kyc} tenancies={tenancies.rows}
              onOpenContact={setContactId} onGo={setView} />
          )}
          {view === "integrations" && isAdmin && <IntegrationsView onLeadsChanged={() => void load()} />}
        </main>
      </div>


      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--hairline)] bg-white/95 backdrop-blur md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {(["today", "pipeline", "calendar", "tasks"] as View[]).map((id) => {
          const n = nav.find((x) => x.id === id)!;
          const on = view === id;
          return (
            <button key={id} onClick={() => setView(id)} className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[10.5px] font-medium ${on ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>
              {on && <span className="absolute top-0 h-[3px] w-8 rounded-b bg-[#c8a96e]" />}
              <n.icon size={20} strokeWidth={on ? 2 : 1.6} />
              {n.label}
              {!!n.badge && <span className="absolute end-[22%] top-2 min-w-4 rounded-full bg-[#c0392b] px-1 text-center text-[9.5px] font-semibold leading-4 text-white">{n.badge}</span>}
            </button>
          );
        })}
        <label className="relative flex h-16 flex-col items-center justify-center gap-1 text-[10.5px] font-medium text-[var(--text-muted)]">
          <Menu size={20} strokeWidth={1.6} />
          More
          <select value={view} onChange={(e) => setView(e.target.value as View)} className="absolute inset-0 opacity-0" aria-label="More screens">
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {nav.filter((n) => n.group === g).map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
      </nav>

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
          kyc={kyc.rows.find((k) => k.contact_id === lead.contact_id) ?? null}
          tasks={tasks.filter((t) => t.lead_id === lead.id)}
          userName={userName}
          onLead={onLead}
          onContact={onContact}
          onTask={onTask}
          onRemoveTask={onRemoveTask}
          onOpenContact={(id) => { setLeadId(null); setContactId(id); }}
          onClose={() => setLeadId(null)}
          onDeal={() => void deals.reload()}
        />
      )}
      {contact && (
        <ContactPanel
          key={contact.id}
          contact={contact}
          kyc={kyc}
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
