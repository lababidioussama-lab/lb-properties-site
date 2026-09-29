"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowRight, Banknote, BarChart3, Briefcase, Building, Compass, Hash, History, Home, MapPin, MonitorSmartphone, Search, ShieldCheck } from "lucide-react";

import { Card } from "../shared";
import type { DsSessionInfo } from "./api";
import type { DsOpen, DsView } from "./DbSearch";

interface Tool { title: string; desc: string; icon: LucideIcon; view?: DsView; mode?: "sales" | "rents" | "valuation" | "permit" | "listed" | "pnumber"; tag: string }

/* Grouped by the job an agent is doing. Tools without a view are listed as
   "Next" rather than hidden, so the whole plan is visible and nothing pretends to work. */
const GROUPS: { title: string; tools: Tool[] }[] = [
  { title: "Find owners", tools: [
    { title: "Owner search", desc: "By name, phone, unit, plot or building", icon: Search, view: "ds_search", tag: "Instant" },
    { title: "Unit history", desc: "Every owner of one unit, with dates and prices", icon: History, view: "ds_unit", tag: "Instant" },
    { title: "Portfolio owners", desc: "People who own several units — your investors", icon: Briefcase, view: "ds_portfolio", tag: "Instant" },
    { title: "Area prospecting", desc: "A building or community as a calling list", icon: MapPin, view: "ds_area", tag: "Daily limit" },
  ] },
  { title: "Price it", tools: [
    { title: "Sales & prices", desc: "Registered sales by area, month and bedrooms", icon: BarChart3, view: "ds_market", mode: "sales", tag: "Instant" },
    { title: "Valuation", desc: "A value range from comparable sales, with its confidence", icon: Banknote, view: "ds_market", mode: "valuation", tag: "Instant" },
    { title: "Rents & yields", desc: "Registered rents by area and property type", icon: Home, view: "ds_market", mode: "rents", tag: "Instant" },
  ] },
  { title: "Check a property", tools: [
    { title: "DLD permit check", desc: "A Trakheesi permit already fetched from DLD", icon: ShieldCheck, view: "ds_checks", mode: "permit", tag: "Saved checks" },
    { title: "Listed right now?", desc: "Is the unit advertised on the portals", icon: MonitorSmartphone, view: "ds_checks", mode: "listed", tag: "Live" },
    { title: "Plot & property number", desc: "Find a unit from its property, plot or registration number", icon: Hash, view: "ds_checks", mode: "pnumber", tag: "Instant" },
    { title: "Vastu & sun map", desc: "Which way it faces, and its sunlight in each season", icon: Compass, view: "ds_vastu", tag: "Calculated" },
  ] },
  { title: "People in the market", tools: [
    { title: "Broker directory", desc: "Find a broker or agency by name, BRN or phone", icon: Building, view: "ds_brokers", tag: "Instant" },
  ] },
];

function ToolRow({ tool, onOpen }: { tool: Tool; onOpen: DsOpen }) {
  const live = !!tool.view;
  const Icon = tool.icon;
  return (
    <button
      disabled={!live}
      onClick={() => tool.view && onOpen(tool.view, tool.mode)}
      className="group flex w-full items-center gap-3.5 border-t border-[var(--hairline)] px-5 py-3 text-start transition-colors enabled:hover:bg-[var(--accent-wash)] disabled:cursor-default"
    >
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${live ? "bg-[var(--accent-wash)] text-[var(--accent)]" : "bg-[rgb(15_23_42/0.04)] text-[var(--text-muted)]"}`}>
        <Icon size={17} strokeWidth={1.7} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[13.5px] font-semibold ${live ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>{tool.title}</span>
        <span className="block truncate text-[12px] text-[var(--text-muted)]">{tool.desc}</span>
      </span>
      <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${live ? "border-[#e1dfda] bg-[#f1f0ed] text-[#62615b]" : "border-[#e6d5b0] bg-[#f7f0e2] text-[#7a5c26]"}`}>{tool.tag}</span>
      {live && <ArrowRight size={15} className="shrink-0 text-[var(--accent)] transition-transform group-hover:translate-x-0.5" />}
    </button>
  );
}

export function DsHome({ info, isAdmin, onOpen }: { info: DsSessionInfo; isAdmin: boolean; onOpen: DsOpen }) {
  const onView = (v: DsView) => onOpen(v);
  const u = info.usage, l = info.limits;
  const meter = (label: string, used: number, limit: number, gold = false) => (
    <div>
      <div className="flex justify-between text-[12.5px]"><span className="text-[var(--text-secondary)]">{label}</span><span className="figure"><strong>{used}</strong> / {limit}</span></div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[rgb(15_23_42/0.08)]">
        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, (used / Math.max(1, limit)) * 100)}%`, background: gold ? "#b8955a" : "#0b2a4a" }} />
      </div>
    </div>
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
      <div className="space-y-5">
        <button onClick={() => onView("ds_search")} className="flex h-14 w-full items-center gap-3 rounded-xl border border-[rgb(11_42_74/0.3)] bg-white px-4 text-start text-[14px] text-[var(--text-muted)] shadow-[0_0_0_4px_rgb(11_42_74/0.05)] transition hover:border-[var(--accent)]">
          <Search size={18} className="text-[var(--accent)]" />
          <span className="flex-1">Name, phone, unit, plot or building — e.g. Marina Gate 2 1405</span>
          <span className="rounded-lg bg-[var(--accent-solid)] px-5 py-2 text-[13px] font-semibold text-white">Search</span>
        </button>

        <div className="grid items-start gap-5 lg:grid-cols-2">
          {[GROUPS.slice(0, 2), GROUPS.slice(2)].map((col, i) => (
            <div key={i} className="space-y-5">
              {col.map((g) => (
                <Card key={g.title} className="overflow-hidden pt-1">
                  <div className="flex items-center justify-between px-5 pb-2 pt-3">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#9a7a44]">{g.title}</span>
                    <span className="figure text-[11.5px] text-[var(--text-muted)]">{g.tools.length} tool{g.tools.length > 1 ? "s" : ""}</span>
                  </div>
                  {g.tools.map((t) => <ToolRow key={t.title} tool={t} onOpen={onOpen} />)}
                </Card>
              ))}
            </div>
          ))}
        </div>
      </div>

      <aside className="space-y-5">
        {u && l ? (
          <Card className="space-y-3.5 p-5">
            <div className="flex items-baseline justify-between"><h2 className="text-[13.5px] font-bold">Your limits today</h2><span className="text-[11.5px] text-[var(--text-muted)]">Reset at midnight</span></div>
            {meter("Searches", u.searches, l.searches)}
            {meter("Numbers revealed", u.reveals, l.reveals, true)}
            {meter("Owners sent to lists", u.lists, l.lists)}
          </Card>
        ) : (
          <Card className="p-5 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
            <h2 className="mb-1.5 text-[13.5px] font-bold text-[var(--text-primary)]">No daily limits</h2>
            Admin accounts are not capped. Everything is still recorded.
            {isAdmin && <button onClick={() => onView("ds_access")} className="mt-3 block font-semibold text-[var(--accent)] hover:underline">Set agents' access and limits</button>}
          </Card>
        )}
        <Card className="p-5">
          <h2 className="mb-3 text-[13.5px] font-bold">What the data covers</h2>
          <dl className="space-y-2.5 text-[12.5px]">
            {[["Owner records", "to 30 Dec 2024"], ["Sales", "to 30 Dec 2024"], ["Current owner confirmed", "31% of units"]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3"><dt className="text-[var(--text-secondary)]">{k}</dt><dd className="figure font-semibold">{v}</dd></div>
            ))}
          </dl>
          <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-muted)]">Units without a dated sale show as <strong>Likely current</strong>, never as confirmed.</p>
        </Card>
      </aside>
    </div>
  );
}
