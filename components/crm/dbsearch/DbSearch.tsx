"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, LogOut } from "lucide-react";

import { Card } from "../shared";
import { ds, dsError, type DsSessionInfo, type DsStats, type DsUsage } from "./api";
import { DsSignIn } from "./DsSignIn";
import { DsSearch } from "./DsSearch";
import { DsPhone } from "./DsPhone";
import { DsUnit } from "./DsUnit";
import { DsAccess } from "./DsAccess";
import { DsOwnerPanel } from "./DsOwnerPanel";
import { DsPortfolio } from "./DsPortfolio";
import { DsArea } from "./DsArea";
import { DsMarket, type MarketMode } from "./DsMarket";
import { DsChecks, type CheckMode } from "./DsChecks";
import { DsVastu } from "./DsVastu";
import { DsBrokers } from "./DsBrokers";

/* ds_home is kept so old links still land somewhere: it shows Search. */
export type DsView = "ds_home" | "ds_search" | "ds_phone" | "ds_unit" | "ds_portfolio" | "ds_area" | "ds_market" | "ds_checks" | "ds_vastu" | "ds_brokers" | "ds_access";
export const DS_VIEWS: DsView[] = ["ds_home", "ds_search", "ds_phone", "ds_unit", "ds_portfolio", "ds_area", "ds_market", "ds_checks", "ds_vastu", "ds_brokers", "ds_access"];

/* The tool strip, in dbsearchdubai.com's order: its own tools first, then the
   tools the CRM adds. The CRM's top bar draws it; this list is the source. */
export const DS_TOOLS: { id: DsView; label: string }[] = [
  { id: "ds_search", label: "Search" },
  { id: "ds_phone", label: "Phone" },
  { id: "ds_brokers", label: "Agents" },
  { id: "ds_portfolio", label: "Portfolio" },
  { id: "ds_area", label: "Area filter" },
  { id: "ds_market", label: "Market" },
  { id: "ds_unit", label: "Unit history" },
  { id: "ds_checks", label: "Checks" },
  { id: "ds_vastu", label: "Vastu & sun" },
  { id: "ds_access", label: "Access" },
];

const compact = (n: number) => n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}K` : String(n);

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
  const [phoneQuery, setPhoneQuery] = useState<string | null>(null);
  const [stats, setStats] = useState<DsStats | null>(null);
  const [marketMode, setMarketMode] = useState<MarketMode>("sales");
  const [checkMode, setCheckMode] = useState<CheckMode>("permit");

  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const r = await ds<DsSessionInfo>("GET", "session");
    if (r.ok) { setInfo(r); setProblem(null); }
    else setProblem(r.error);
  }, []);

  useEffect(() => { void load(); }, [load]);
  const signedIn = !!info?.signedIn;
  useEffect(() => {
    if (!signedIn) return;
    void ds<{ stats: DsStats | null }>("GET", "stats").then((r) => { if (r.ok) setStats(r.stats); });
  }, [signedIn]);
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
  const tab = view === "ds_home" ? "ds_search" : view;

  return (
    <div className="space-y-4">
      {/* The secure session, as one quiet line: time left, today's use, leave. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-[var(--hairline)] bg-[var(--surface-hover)] px-3 py-1.5 text-[12px] text-[var(--text-secondary)]">
        <Lock size={12} className="text-[var(--text-muted)]" />
        <span>Secure session{hm && <> · <b className="font-semibold text-[var(--text-primary)]">{hm}</b> left</>}</span>
        {info.usage && info.limits && <span>· Searches {info.usage.searches}/{info.limits.searches} · Numbers {info.usage.reveals}/{info.limits.reveals}</span>}
        {stats && <span className="hidden text-[var(--text-muted)] lg:inline">· {compact(stats.owners)} owners · {compact(stats.properties)} properties · {compact(stats.phones)} phones</span>}
        <span className="flex-1" />
        <button onClick={leave} className="inline-flex items-center gap-1 font-medium text-[var(--text-primary)] hover:underline">
          <LogOut size={12} /> Leave
        </button>
      </div>

      <div key={tab} className="crm-stagger">
      {tab === "ds_search" && <DsSearch onExpired={onExpired} onUsage={onUsage} onOpenLead={onOpenLead} initialQuery={searchQuery} onPhone={(q) => { setPhoneQuery(q); onView("ds_phone"); }} />}
      {tab === "ds_phone" && <DsPhone onExpired={onExpired} onUsage={onUsage} onOpenLead={onOpenLead} initialQuery={phoneQuery} />}
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
