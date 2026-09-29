"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, LogOut } from "lucide-react";

import { Card } from "../shared";
import { ds, dsError, type DsSessionInfo, type DsUsage } from "./api";
import { DsSignIn } from "./DsSignIn";
import { DsHome } from "./DsHome";
import { DsSearch } from "./DsSearch";
import { DsUnit } from "./DsUnit";
import { DsAccess } from "./DsAccess";
import { DsOwnerPanel } from "./DsOwnerPanel";
import { DsPortfolio } from "./DsPortfolio";
import { DsArea } from "./DsArea";
import { DsMarket, type MarketMode } from "./DsMarket";
import { DsChecks, type CheckMode } from "./DsChecks";
import { DsVastu } from "./DsVastu";
import { DsBrokers } from "./DsBrokers";

export type DsView = "ds_home" | "ds_search" | "ds_unit" | "ds_portfolio" | "ds_area" | "ds_market" | "ds_checks" | "ds_vastu" | "ds_brokers" | "ds_access";
export const DS_VIEWS: DsView[] = ["ds_home", "ds_search", "ds_unit", "ds_portfolio", "ds_area", "ds_market", "ds_checks", "ds_vastu", "ds_brokers", "ds_access"];

/** A tool to open, optionally in one of its modes (Valuation inside the market tool, and so on). */
export type DsOpen = (view: DsView, mode?: MarketMode | CheckMode) => void;

const TABS: { id: DsView; label: string }[] = [
  { id: "ds_home", label: "All tools" },
  { id: "ds_search", label: "Owners" },
  { id: "ds_unit", label: "Units" },
  { id: "ds_portfolio", label: "Portfolios" },
  { id: "ds_area", label: "Areas" },
  { id: "ds_market", label: "Market" },
  { id: "ds_checks", label: "Checks" },
  { id: "ds_vastu", label: "Vastu & sun" },
  { id: "ds_brokers", label: "Brokers" },
  { id: "ds_access", label: "Access & activity" },
];

/**
 * DB Search inside the CRM. Holds the DB Search session (separate from the
 * CRM one), shows the sign-in until there is one, and routes between tools.
 */
export function DbSearch({ view, onView, meEmail, isAdmin, onOpenLead }: {
  view: DsView;
  onView: (v: DsView) => void;
  meEmail: string;
  isAdmin: boolean;
  onOpenLead: (id: string) => void;
}) {
  const [info, setInfo] = useState<DsSessionInfo | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [ownerRef, setOwnerRef] = useState<string | null>(null);
  const [unitQuery, setUnitQuery] = useState<{ code: string; place?: string | null } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(null);
  const [marketMode, setMarketMode] = useState<MarketMode>("sales");
  const [checkMode, setCheckMode] = useState<CheckMode>("permit");
  const openTool: DsOpen = (v, mode) => {
    if (v === "ds_market" && mode) setMarketMode(mode as MarketMode);
    if (v === "ds_checks" && mode) setCheckMode(mode as CheckMode);
    onView(v);
  };
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const r = await ds<DsSessionInfo>("GET", "session");
    if (r.ok) { setInfo(r); setProblem(null); }
    else setProblem(r.error);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);

  /* Any call that comes back "sign in again" drops straight to the sign-in. */
  const onExpired = useCallback(() => setInfo((i) => (i ? { ...i, signedIn: false } : i)), []);
  const onUsage = useCallback((usage: DsUsage, session?: { endsAt: number }) =>
    setInfo((i) => (i ? { ...i, usage, session: session ? { endsAt: session.endsAt, idleMinutes: 20 } : i.session } : i)), []);

  async function leave() {
    await ds("DELETE", "session");
    setOwnerRef(null);
    void load();
  }

  if (problem) {
    return <Card className="p-6 text-[14px] text-[var(--text-secondary)]">{dsError(problem)}</Card>;
  }
  if (!info) return <div className="h-40 animate-pulse rounded-xl bg-[rgb(15_23_42/0.06)]" />;
  if (!info.signedIn) return <DsSignIn email={meEmail} onDone={load} />;

  const left = info.session ? Math.max(0, info.session.endsAt - now) : null;
  if (left === 0) return <DsSignIn email={meEmail} onDone={load} expired />;
  const hm = left == null ? "" : `${Math.floor(left / 3_600_000)}:${String(Math.floor((left % 3_600_000) / 60_000)).padStart(2, "0")}`;

  const shared = { onExpired, onUsage, onOpenOwner: setOwnerRef };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#0b2a4a] px-4 py-2.5 text-[12.5px] text-white">
        <Lock size={14} className="text-[#d4b87f]" />
        <span className="font-semibold">DB Search session</span>
        {hm && <span className="figure text-[#e3cc9f]">{hm} left</span>}
        <span className="text-white/60">· ends after 20 minutes without activity · everything you do here is recorded</span>
        {info.usage && info.limits && (
          <span className="figure ms-auto text-white/80">
            Searches {info.usage.searches}/{info.limits.searches} · Numbers {info.usage.reveals}/{info.limits.reveals}
          </span>
        )}
        <button onClick={leave} className={`inline-flex items-center gap-1.5 rounded-md border border-white/20 px-2.5 py-1 font-semibold hover:bg-white/10 ${info.usage && info.limits ? "" : "ms-auto"}`}>
          <LogOut size={13} /> Leave DB Search
        </button>
      </div>

      <nav aria-label="DB Search tools" className="flex gap-1 overflow-x-auto border-b border-[var(--hairline)] [scrollbar-width:none]">
        {TABS.filter((t) => isAdmin || t.id !== "ds_access").map((t) => (
          <button key={t.id} onClick={() => onView(t.id)} aria-current={view === t.id ? "page" : undefined}
            className={`relative shrink-0 px-4 pb-3 pt-1 text-[13.5px] font-semibold transition-colors ${view === t.id ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
            {t.label}
            {view === t.id && <span className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-[#b8955a]" />}
          </button>
        ))}
      </nav>

      <div key={view} className="crm-stagger">
      {view === "ds_home" && <DsHome info={info} isAdmin={isAdmin} onOpen={openTool} />}
      {view === "ds_search" && <DsSearch {...shared} initialQuery={searchQuery} />}
      {view === "ds_unit" && <DsUnit {...shared} initial={unitQuery} />}
      {view === "ds_portfolio" && <DsPortfolio {...shared} onSearchName={(name) => { setSearchQuery(name); onView("ds_search"); }} />}
      {view === "ds_area" && <DsArea {...shared} />}
      {view === "ds_market" && <DsMarket mode={marketMode} onMode={setMarketMode} onExpired={onExpired} />}
      {view === "ds_checks" && <DsChecks mode={checkMode} onMode={setCheckMode} onExpired={onExpired} onOpenOwner={setOwnerRef} />}
      {view === "ds_vastu" && <DsVastu />}
      {view === "ds_brokers" && <DsBrokers onExpired={onExpired} />}
      {view === "ds_access" && isAdmin && <DsAccess onExpired={onExpired} />}
      </div>

      {ownerRef && (
        <DsOwnerPanel
          key={ownerRef}
          refId={ownerRef}
          {...shared}
          onClose={() => setOwnerRef(null)}
          onOpenLead={onOpenLead}
          onUnit={(code, place) => { setOwnerRef(null); setUnitQuery({ code, place }); onView("ds_unit"); }}
        />
      )}
    </div>
  );
}
