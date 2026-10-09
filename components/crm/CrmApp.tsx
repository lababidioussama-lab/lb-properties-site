"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { DS_TOOLS, DS_VIEWS, type DsView } from "./dbsearch/DbSearch";
import { DS_CRM_VIEWS, DsInCrm, type DsCrmView } from "./dbsearch/DsInCrm";
import { VisitorsView } from "./Visitors";
import { SecurityView } from "./Security";
import { Activity, Database, Home, Lock, Moon, Search, History, ShieldCheck, Receipt, KeyRound, Calculator, Menu, X, PlugZap, FolderLock, Sun, KanbanSquare, Users, CheckSquare, UserCog, LogOut, FileText, ExternalLink, Building2, HandCoins, CalendarDays, BarChart3, MessageSquareText, ScrollText, KeySquare, PhoneCall, Send, UserCircle, ClipboardList, SlidersHorizontal } from "lucide-react";

import type { CrmContact, CrmDeal, CrmInvoice, CrmKyc, CrmSourceSpend, CrmTenancy, CrmLead, CrmListing, CrmTask, CrmTemplate, CrmUser } from "@/lib/crm";
import type { SessionUser } from "@/lib/crm-auth";
import { api, BTN, Card, PageHead, ViewTabs } from "./shared";
import { Pipeline } from "./Pipeline";
import { LeadPanel } from "./LeadPanel";
import { ContactsView, ContactPanel } from "./Contacts";
import { NewTask, TaskGroup } from "./TaskList";
import { TeamView } from "./Team";
import { AccessControl } from "./AccessControl";
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
import { WELCOME_FLAG } from "./Greeting";
import { Ribbons } from "./Ribbons";
import { setCrmTheme, type CrmTheme } from "@/lib/crm-theme";
import type { CrmAgentRequest } from "@/lib/crm";

type View = DsView | "visitors" | "security" | "control" | "compliance" | "invoices" | "rentals" | "integrations" | "today" | "tools" | "monitor" | "team_docs" | "reports" | "pipeline" | "temp_leads" | "contacts" | "listings" | "owner_requests" | "calendar" | "deals" | "tasks" | "templates" | "quick_wa" | "profile" | "team" | "requests" | "audit";

function upsert<T extends { id: string }>(list: T[], item: T, prepend = false): T[] {
  if (list.some((x) => x.id === item.id)) return list.map((x) => (x.id === item.id ? item : x));
  return prepend ? [item, ...list] : [...list, item];
}

export function CrmApp({ me, demo = false }: { me: SessionUser; demo?: boolean }) {
  if (demo && typeof window !== "undefined") (window as { __CRM_DEMO__?: boolean }).__CRM_DEMO__ = true;
  const isAdmin = me.role === "admin";
  const [view, setViewState] = useState<View>("today");
  const [moreOpen, setMoreOpen] = useState(false);
  const [welcome, setWelcome] = useState(false);
  useEffect(() => {
    try {
      if (sessionStorage.getItem(WELCOME_FLAG)) {
        sessionStorage.removeItem(WELCOME_FLAG);
        setWelcome(true);
      }
    } catch {}
  }, []);
  /* The open screen lives in the URL (#deals), so a refresh keeps you where
     you were, the browser's Back button steps through screens, and a link
     to a screen can be shared. */
  const setView = useCallback((v: View) => {
    setViewState(v);
    setMoreOpen(false);
    if (window.location.hash !== `#${v}`) history.pushState(null, "", `#${v}`);
    window.scrollTo({ top: 0 });
  }, []);
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [tasks, setTasks] = useState<CrmTask[]>([]);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [problem, setProblem] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [contactId, setContactId] = useState<string | null>(null);
  const listings = useTable<CrmListing>("listings");
  const [listingPrefill, setListingPrefill] = useState<Record<string, string> | null>(null);
  const [loaded, setLoaded] = useState(false);
  const deals = useTable<CrmDeal>("deals");
  const templates = useTable<CrmTemplate & { created_at?: string }>("templates");
  const kyc = useTable<CrmKyc>("kyc");
  const tenancies = useTable<CrmTenancy>("tenancies");
  const invoices = useTable<CrmInvoice>("invoices", isAdmin);
  const spend = useTable<CrmSourceSpend>("source_spend", isAdmin);

  /* Leads and tasks move all day, so they refresh every minute. People and
     contacts change rarely and are the big ones, so after the first load they
     refresh every five minutes, or when asked for (`all`). */
  const load = useCallback(async (all = true) => {
    const [l, t, c, u] = await Promise.all([
      api<{ leads: CrmLead[] }>("GET", "leads"),
      api<{ tasks: CrmTask[] }>("GET", "tasks"),
      all ? api<{ contacts: CrmContact[] }>("GET", "contacts") : null,
      all ? api<{ users: CrmUser[] }>("GET", "users") : null,
    ]);
    setProblem(l.ok ? null : l.error ?? "Could not load data");
    setLeads(l.leads ?? []);
    setTasks(t.tasks ?? []);
    if (c) setContacts(c.contacts ?? []);
    if (u) setUsers(u.users ?? []);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
    let tick = 0;
    const timer = window.setInterval(() => void load(++tick % 5 === 0), 60_000);
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
    { id: "ds_search", label: "Search", icon: Search, group: "DB Search", desc: "" },
    { id: "ds_phone", label: "Phone", icon: PhoneCall, group: "DB Search", desc: "" },
    { id: "ds_brokers", label: "Agents", icon: Search, group: "DB Search", desc: "" },
    { id: "ds_smart", label: "Smart search", icon: Search, group: "DB Search", desc: "" },
    { id: "ds_unit", label: "Unit history", icon: History, group: "DB Search", desc: "" },
    { id: "ds_area", label: "Area prospecting", icon: Search, group: "DB Search", desc: "" },
    { id: "ds_checks", label: "Property checks", icon: Search, group: "DB Search", desc: "" },
    { id: "ds_vastu", label: "Vastu Map", icon: Search, group: "DB Search", desc: "" },
    ...(isAdmin ? [{ id: "security" as View, label: "Security", icon: ShieldCheck, group: "Admin", desc: "Every refused sign-in, the address behind it, and whether anyone holds a password that is not theirs." }] : []),
    ...(isAdmin ? [{ id: "control" as View, label: "Access & activity", icon: ShieldCheck, group: "Admin", desc: "Block or allow each person in the CRM and DB Search, set their limits, and see everything they did." }] : []),
    { id: "pipeline", label: "Leads", icon: KanbanSquare, badge: leads.filter((l) => l.stage === "new").length, group: "Sales", desc: "Every enquiry, from first contact to closed deal." },
    { id: "temp_leads", label: "Temp leads", icon: PhoneCall, group: "Sales", desc: "Raw calling list, promoted to Leads once qualified." },
    { id: "contacts", label: "Contacts", icon: Users, group: "Sales", desc: "Clients, owners and their properties." },
    { id: "deals", label: "Deals", icon: HandCoins, group: "Sales", desc: "Closed transactions, commission and payouts." },
    { id: "rentals", label: "Rentals", icon: KeyRound, group: "Sales", desc: "Tenancies, Ejari, cheque schedules and renewals." },
    { id: "listings", label: "Listings", icon: Building2, group: "Properties", desc: "Stock for sale and rent, with permit compliance." },
    { id: "owner_requests", label: "Owner requests", icon: KeySquare, group: "Properties", desc: "Owners who want to sell or let through us." },
    { id: "calendar", label: "Calendar", icon: CalendarDays, group: "Workspace", desc: "Viewings, meetings and handovers." },
    { id: "tasks", label: "Tasks", icon: CheckSquare, badge: dueCount, group: "Workspace", desc: "Follow-ups, grouped by when they are due." },
    { id: "tools", label: "Tools", icon: Calculator, group: "Workspace", desc: "Cost sheets, commission, yield and mortgage, ready to send on WhatsApp." },
    { id: "templates", label: "WhatsApp templates", icon: MessageSquareText, group: "WhatsApp", desc: "Reusable messages for one-click replies." },
    { id: "quick_wa", label: "Quick WhatsApp", icon: Send, group: "WhatsApp", desc: "Send one message to a list of leads." },
    ...(isAdmin ? [
      { id: "compliance" as View, label: "Compliance", icon: ShieldCheck, group: "Admin", desc: "KYC, goAML, licences, permits and rentals: everything that could lead to a fine." },
      { id: "invoices" as View, label: "Invoices", icon: Receipt, group: "Admin", desc: "VAT tax invoices for commission, and who still owes us." },
      { id: "monitor" as View, label: "Agent performance", icon: Activity, group: "Admin", desc: "Who is using the CRM, and how each agent is performing." },
      { id: "visitors" as View, label: "Visitors", icon: Activity, group: "Admin", desc: "Who visits the website and the CRM, from which country, and whether they came from Instagram, Google or elsewhere." },
      { id: "team" as View, label: "Team", icon: UserCog, group: "Admin", desc: "Agents, roles, commission slabs and targets." },
      { id: "integrations" as View, label: "Lead sources", icon: PlugZap, group: "Admin", desc: "Bayut, Dubizzle and Property Finder leads, straight to your agents." },
      { id: "team_docs" as View, label: "Team documents", icon: FolderLock, group: "Admin", desc: "Every agent's IDs, visas, licences and contracts." },
      { id: "requests" as View, label: "Requests", icon: ClipboardList, group: "Admin", desc: "What agents have asked the office for." },
      { id: "audit" as View, label: "Audit log", icon: ScrollText, group: "Admin", desc: "Who changed what, and when." },
    ] : []),
    { id: "profile", label: "My profile", icon: UserCircle, group: "Account", desc: "Your details, targets, documents and requests." },
  ];
  /* Design A: ten places in the sidebar. Screens that belong together are
     tabs of one place (Deals: Sales · Rentals · Invoices), so the sidebar
     stays short and nothing is more than one click away. */
  const sections: { id: string; label: string; icon: typeof Users; views: { id: View; label: string }[]; badge?: number; badgeTone?: "bad" | "plain"; group?: "workspace" }[] = [
    { id: "home", label: "Home", icon: Home, views: [{ id: "today", label: "Today" }], badge: todayCount, badgeTone: "bad" },
    { id: "leads", label: "Leads", icon: KanbanSquare, views: [{ id: "pipeline", label: "Pipeline" }, { id: "temp_leads", label: "Calling list" }, { id: "owner_requests", label: "Owner requests" }], badge: leads.filter((l) => l.stage === "new" && !l.owner_id).length, badgeTone: "bad" },
    { id: "people", label: "People", icon: Users, views: [{ id: "contacts", label: "People" }] },
    { id: "listings", label: "Listings", icon: Building2, views: [{ id: "listings", label: "Listings" }] },
    { id: "deals", label: "Deals", icon: HandCoins, views: [{ id: "deals", label: "Sales & off-plan" }, { id: "rentals", label: "Rentals" }, ...(isAdmin ? [{ id: "invoices" as View, label: "Invoices" }] : [])] },
    { id: "calendar", label: "Calendar", icon: CalendarDays, views: [{ id: "calendar", label: "Calendar" }, { id: "tasks", label: "Tasks" }], badge: dueCount, badgeTone: "plain" },
    { id: "dbsearch", label: "DB Search", icon: Database, views: DS_TOOLS.map((t) => ({ id: t.id as View, label: t.label })) },
    { id: "reports", label: "Reports", icon: BarChart3, views: [{ id: "reports", label: "Overview" }, ...(isAdmin ? [{ id: "monitor" as View, label: "Agent performance" }, { id: "visitors" as View, label: "Visitors" }] : [])] },
    { id: "tools", label: "Tools", icon: Calculator, views: [{ id: "tools", label: "Calculators" }, { id: "templates", label: "WhatsApp templates" }, { id: "quick_wa", label: "Quick WhatsApp" }], group: "workspace" },
    ...(isAdmin ? [{ id: "admin", label: "Team & rules", icon: SlidersHorizontal, group: "workspace" as const, views: [
      { id: "team" as View, label: "Team" }, { id: "control" as View, label: "Access & activity" }, { id: "security" as View, label: "Security" }, { id: "integrations" as View, label: "Lead sources" }, { id: "compliance" as View, label: "Compliance" },
      { id: "requests" as View, label: "Requests" }, { id: "team_docs" as View, label: "Team documents" }, { id: "audit" as View, label: "Audit log" },
    ] }] : []),
  ];
  /* DB Search's own tabs open on its page; Market, Checks, Vastu and Access
     are CRM screens. */
  const inDbSearch = (DS_VIEWS as string[]).includes(view);
  /* DB Search lives on its own link and opens in its own tab. */
  const dbSearchHref = demo ? (isAdmin ? "/admin/db-search?demo" : "/admin/db-search?demo=agent") : "/admin/db-search";
  const initials = (me_?.full_name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("");
  const section = sections.find((sec) => sec.views.some((v) => v.id === view)) ?? (view === "profile" ? { id: "profile", label: "My profile", icon: UserCircle, views: [{ id: "profile" as View, label: "My profile" }] } : sections[0]);

  const openLeads = leads.filter((l) => ["new", "contacted", "viewing", "offer"].includes(l.stage) && (isAdmin || l.owner_id === me.id)).length;
  const HEAD: Partial<Record<View, { figure: number; label: string }>> = {
    pipeline: { figure: openLeads, label: openLeads === 1 ? "open lead" : "open leads" },
    temp_leads: { figure: openLeads, label: "open leads in the pipeline" },
    contacts: { figure: contacts.length, label: contacts.length === 1 ? "person" : "people" },
    listings: { figure: listings.rows.length, label: listings.rows.length === 1 ? "listing" : "listings" },
    deals: { figure: deals.rows.length, label: deals.rows.length === 1 ? "deal" : "deals" },
    rentals: { figure: tenancies.rows.length, label: tenancies.rows.length === 1 ? "tenancy" : "tenancies" },
    calendar: { figure: dueCount, label: "tasks due in the next day" },
    tasks: { figure: dueCount, label: "tasks due in the next day" },
    team: { figure: users.length, label: "people on the team" },
  };
  const head = HEAD[view];
  useEffect(() => { window.name = "lababidi-crm"; }, []);
  /* Phones show each table row as a card, so every cell carries its column's
     name (read once from the header) for the card to print above the value. */
  useEffect(() => {
    let queued = 0;
    const label = () => {
      queued = 0;
      document.querySelectorAll("main table").forEach((t) => {
        const heads = [...t.querySelectorAll("thead th")].map((h) => h.textContent?.trim() ?? "");
        t.querySelectorAll("tbody tr").forEach((tr) => [...tr.children].forEach((td, i) => {
          if (heads[i] && td.getAttribute("data-label") !== heads[i]) td.setAttribute("data-label", heads[i]);
        }));
      });
    };
    const mo = new MutationObserver(() => { if (!queued) queued = requestAnimationFrame(label); });
    mo.observe(document.body, { childList: true, subtree: true });
    label();
    return () => { mo.disconnect(); if (queued) cancelAnimationFrame(queued); };
  }, []);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const fromHash = () => {
      const raw = window.location.hash.slice(1);
      // DB Search's old tools page is now its Search tab.
      const id = (raw === "ds_home" ? "ds_search" : raw) as View;
      if (nav.some((n) => n.id === id)) setViewState(id);
    };
    fromHash();
    setHydrated(true);
    const wanted = new URLSearchParams(window.location.search).get("lead");
    if (wanted) {
      setLeadId(wanted);
      const url = new URL(window.location.href);
      url.searchParams.delete("lead");
      history.replaceState(null, "", url.toString());
    }
    window.addEventListener("popstate", fromHash);
    window.addEventListener("hashchange", fromHash);
    return () => {
      window.removeEventListener("popstate", fromHash);
      window.removeEventListener("hashchange", fromHash);
    };
    // nav only changes with the role, which is fixed for the session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* The address always names the screen on show, whatever changed it —
     but only once the screen has been read FROM the address, or a refresh
     would overwrite #deals with the default before reading it. */
  useEffect(() => {
    if (hydrated && window.location.hash !== `#${view}`) history.replaceState(null, "", `#${view}`);
  }, [view, hydrated]);

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

  const sideItem = (on: boolean) =>
    `relative flex h-9 w-full items-center gap-3 rounded-md ps-3 pe-2 text-[14px] transition-colors ${on ? "font-medium text-[var(--side-fg)]" : "text-[var(--side-muted)] hover:bg-[var(--side-hover)] hover:text-[var(--side-fg)]"}`;
  const marker = <motion.span layoutId="side-marker" transition={{ type: "spring", stiffness: 520, damping: 44 }} className="absolute inset-y-2 start-0 w-[2px] rounded-full bg-[var(--accent-solid)]" />;
  const badge = (n: number, tone?: "bad" | "plain") =>
    <span className={`grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[11px] font-semibold ${tone === "bad" ? "bg-[var(--bad)] text-white" : "bg-[var(--accent-solid)] text-white"}`}>{n}</span>;
  const [theme, setTheme] = useState<CrmTheme>("dark");
  useEffect(() => { setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark"); }, []);
  const flipTheme = () => { const next = theme === "dark" ? "light" : "dark"; setCrmTheme(next); setTheme(next); };

  return (
    <div className="relative flex min-h-screen text-[var(--text-primary)]">
      <Ribbons />
      <div className="crm-progress" aria-hidden="true" />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {/* The top bar, as one line: the logo, every place in the middle, then
            what is waiting, search, theme, alerts and you. */}
        <header className="crm-topbar sticky top-0 z-30 bg-[color-mix(in_srgb,var(--canvas)_72%,transparent)] backdrop-blur-xl">
          <div className="mx-auto flex h-[68px] w-full max-w-[1408px] items-center gap-3 px-5 md:px-8 xl:px-12">
            <button onClick={() => setView("today")} aria-label="Lababidi Properties, home" className="flex shrink-0 items-center gap-2.5">
              <Image src={theme === "dark" ? "/logo-icon-white.png" : "/logo-icon.png"} alt="" width={30} height={30} priority />
              <span className="hidden whitespace-nowrap text-[17px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] sm:inline">Lababidi <span className="font-normal text-[var(--text-secondary)]">Properties</span></span>
            </button>
            <nav aria-label="Main" className="mx-auto hidden min-w-0 items-center overflow-x-auto [scrollbar-width:none] md:flex">
              {sections.map((sec) => {
                const on = section.id === sec.id;
                const cls = `relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[13px] transition-colors ${on ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`;
                if (sec.id === "dbsearch") {
                  return <a key={sec.id} href={dbSearchHref} target="lababidi-db-search" rel="opener" className={cls} title="Opens DB Search in its own tab">DB Search <ExternalLink size={11} className="opacity-60" /></a>;
                }
                return (
                  <button key={sec.id} onClick={() => setView(on ? view : sec.views[0].id)} aria-current={on ? "page" : undefined} className={cls}>
                    {on && <motion.span layoutId="top-marker" transition={{ type: "spring", stiffness: 520, damping: 44 }} className="absolute inset-0 rounded-full border border-[var(--hairline-strong)] bg-[var(--surface-hover)]" />}
                    <span className="relative">{sec.id === "admin" ? "Team" : sec.label}</span>
                    {!!sec.badge && <span className={`relative grid h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[10.5px] font-semibold ${sec.badgeTone === "bad" ? "bg-[var(--bad)] text-white" : "bg-[var(--accent-solid)] text-white"}`}>{sec.badge}</span>}
                  </button>
                );
              })}
            </nav>
            <div className="flex shrink-0 items-center gap-0.5 max-md:ms-auto">
              <span className="hidden min-[1500px]:block"><span className="crm-status">
                <i className={todayCount ? "crm-pulse" : ""} style={{ background: todayCount ? "var(--bad)" : "var(--ok)", color: todayCount ? "var(--bad)" : "var(--ok)" }} />
                {todayCount ? `${todayCount} waiting for a reply` : "all caught up"}
              </span></span>
              <div className="hidden md:block">
                <CommandSearch
                  leads={leads}
                  contacts={contacts}
                  listings={listings.rows}
                  screens={nav.map(({ id, label, group, icon }) => ({ id, label, group, icon }))}
                  onPick={(hit) => {
                    if (hit.kind === "lead") setLeadId(hit.id);
                    else if (hit.kind === "contact") setContactId(hit.id);
                    else if (hit.kind === "screen") setView(hit.id as View);
                    else setView("listings");
                  }}
                />
              </div>
              <button onClick={flipTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"}
                className="grid h-9 w-9 place-items-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">
                {theme === "dark" ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
              </button>
              <NotificationBell leads={leads} tasks={tasks} listings={listings.rows} isAdmin={isAdmin} meId={me.id} onOpenLead={setLeadId} />
              {isAdmin && (
                <a href="/documents" target="_blank" rel="noopener noreferrer" aria-label="Company documents" title="Company documents"
                  className="hidden h-9 w-9 place-items-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] md:grid"><FileText size={16} strokeWidth={1.5} /></a>
              )}
              <button onClick={() => setView("profile")} aria-label="My profile" title={me_?.full_name ?? "My profile"}
                className="ms-1 grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-[var(--text-primary)] text-[11px] font-semibold text-[var(--canvas)]">
                {me_?.avatar_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={me_.avatar_url} alt="" className="h-full w-full object-cover" />
                  : initials}
              </button>
              <button onClick={signOut} aria-label="Sign out" title="Sign out" className="hidden h-9 w-9 place-items-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] md:grid"><LogOut size={15} /></button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1408px] flex-1 px-5 pb-28 pt-2 md:px-12">

          {problem && (
            <Card className="mb-5 border-[var(--bad)]/40 p-4 text-[13px] text-[var(--text-secondary)]">
              Could not load CRM data ({problem}). If this mentions a missing relation or column, run
              supabase/migrations/0001_concierge_leads.sql and 0002_crm.sql on the database.
            </Card>
          )}

          {/* A new key replays the entrance on every screen change. DB Search's
              tabs share one key, so its session and state survive moving between them. */}
          {view !== "today" && (
            <PageHead key={`head-${section.id}`} title={section.id === "profile" ? "My profile" : section.label} lede={inDbSearch ? undefined : nav.find((n) => n.id === view)?.desc}
              figure={head?.figure} figureLabel={head?.label}>
              {section.views.length > 1 && <ViewTabs value={view} options={section.views} onChange={(v) => setView(v)} />}
            </PageHead>
          )}
          <div key={inDbSearch ? "db_search" : view} className="crm-stagger">
          {view === "today" && (
            <MyDay loaded={loaded} me={me_} isAdmin={isAdmin} leads={leads} tasks={tasks} tenancies={tenancies.rows} onOpenRentals={() => setView("rentals")} userName={userName}
              onOpenLead={setLeadId} onTask={onTask} onRemoveTask={onRemoveTask} />
          )}
          {view === "today" && <div className="mt-5 max-w-md"><TargetMeter me={me_} deals={deals.rows} variant="sidebar" /></div>}
          {(DS_VIEWS as string[]).includes(view) && (
            <Card className="flex flex-col items-start gap-3 p-6">
              <h2 className="text-[16px] font-semibold">DB Search opens in its own tab</h2>
              <p className="text-[13px] text-[var(--text-secondary)]">It has its own sign-in code, so it runs in a separate window. Leads you open from it come back here.</p>
              <a href={`${dbSearchHref}#${view}`} target="lababidi-db-search" className={BTN}>Open DB Search</a>
            </Card>
          )}
          {view === "tools" && <ToolsView />}
          {(DS_CRM_VIEWS as string[]).includes(view) && isAdmin && (
            <DsInCrm view={view as DsCrmView} dbSearchHref={dbSearchHref} onOpenLead={setLeadId} />
          )}
          {view === "reports" && <ReportsView leads={leads} deals={deals.rows} users={users} userName={userName} spend={isAdmin ? spend : null} meId={me.id} />}
          {view === "listings" && (
            <ListingsView t={listings} isAdmin={isAdmin} users={users} contacts={contacts} userName={userName}
              leads={leads} meId={me.id} onOpenLead={setLeadId}
              prefill={listingPrefill} onPrefillUsed={() => setListingPrefill(null)} />
          )}
          {view === "temp_leads" && (
            <TempLeadsView
              isAdmin={isAdmin}
              users={users}
              userName={userName}
              onPromote={async (row) => {
                /* Promote really creates the lead, carrying the name, number
                   and notes over, and opens it. */
                type Dup = { existing: string };
                const r = await api<{ rows: CrmLead[]; duplicates: Dup[] }>("POST", "data/leads", {
                  rows: [{ full_name: row.full_name, phone: row.phone, notes: row.notes ?? null, source: "other", owner_id: row.owner_id ?? me.id }],
                });
                const made = (r.rows as CrmLead[] | undefined)?.[0];
                if (!made) {
                  const d = (r.duplicates as Dup[] | undefined)?.[0];
                  return d ? `Already a lead in the CRM (as ${d.existing}). Nothing was created.` : `Could not create the lead (${r.error ?? "unknown error"}).`;
                }
                onLead(made);
                setView("pipeline");
                setLeadId(made.id);
                return null;
              }}
            />
          )}
          {view === "quick_wa" && <QuickWhatsAppView leads={leads} templates={templates.rows} meName={me_?.full_name ?? "the team"} meId={me.id} isAdmin={isAdmin} />}
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
          {view === "security" && isAdmin && <SecurityView />}
          {view === "control" && isAdmin && <AccessControl meId={me.id} />}
          {view === "audit" && isAdmin && <AuditView userName={userName} />}
          {view === "visitors" && isAdmin && <VisitorsView />}
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
          </div>
        </main>
      </div>


      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[var(--hairline)] bg-white md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {(["home", "leads", "calendar", "dbsearch"] as const).map((id) => {
          const sec = sections.find((x) => x.id === id)!;
          const on = section.id === id;
          return (
            <button key={id} onClick={() => (id === "dbsearch" ? window.location.assign(dbSearchHref) : setView(sec.views[0].id))} className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${on ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>
              <sec.icon size={20} strokeWidth={on ? 2 : 1.75} />
              {sec.label}
              {!!sec.badge && <span className="absolute end-[22%] top-2 min-w-4 rounded-full bg-[var(--bad)] px-1 text-center text-[10px] font-semibold leading-4 text-white">{sec.badge}</span>}
            </button>
          );
        })}
        <button onClick={() => setMoreOpen(true)} className="relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-[var(--text-muted)]" aria-label="More">
          <Menu size={20} strokeWidth={1.75} />
          More
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-[55] md:hidden" role="dialog" aria-modal="true" aria-label="All places">
          <button aria-label="Close" onClick={() => setMoreOpen(false)} className="crm-backdrop absolute inset-0 bg-[rgb(11_26_43/0.4)]" />
          <div className="crm-sheet absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-xl bg-white px-4 pt-3" style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 24px)" }}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--hairline-strong)]" />
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[16px] font-semibold">Everything</span>
              <button onClick={() => setMoreOpen(false)} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-md text-[var(--text-muted)]"><X size={18} /></button>
            </div>
            {sections.map((sec) => (
              <div key={sec.id} className="border-t border-[var(--hairline-soft)] py-2">
                <div className="flex items-center gap-2 py-1 text-[13px] font-semibold"><sec.icon size={16} /> {sec.label}</div>
                <div className="flex flex-wrap gap-1.5 py-1">
                  {sec.views.map((v) => (
                    <button key={v.id} onClick={() => setView(v.id)}
                      className={`h-9 rounded-md border px-3 text-[13px] ${view === v.id ? "border-[var(--accent-solid)] bg-[var(--accent-solid)] text-white" : "border-[var(--hairline-strong)] text-[var(--text-secondary)]"}`}>{v.label}</button>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={signOut} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[var(--hairline-strong)] text-[13px]"><LogOut size={15} /> Sign out</button>
          </div>
        </div>
      )}


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
