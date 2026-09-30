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

/* DB Search's own tabs first, in its order; the CRM's extra tools after the divider. */
const TABS: { id: DsView; label: string; extra?: boolean }[] = [
  { id: "ds_search", label: "Search" },
  { id: "ds_phone", label: "Phone" },
  { id: "ds_brokers", label: "Agents" },
  { id: "ds_portfolio", label: "Portfolio" },
  { id: "ds_unit", label: "Unit history", extra: true },
  { id: "ds_area", label: "Areas", extra: true },
  { id: "ds_market", label: "Market", extra: true },
  { id: "ds_checks", label: "Checks", extra: true },
  { id: "ds_vastu", label: "Vastu & sun", extra: true },
  { id: "ds_access", label: "Access & activity", extra: true },
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

      {stats && (
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {([["Owners", stats.owners], ["Properties", stats.properties], ["Projects", stats.projects], ["Phones", stats.phones]] as const).map(([label, n]) => (
            <div key={label} className="rounded-xl border border-[var(--hairline)] bg-white px-2 py-2 sm:px-4 sm:py-3">
              <div className="figure text-[15px] font-bold text-[var(--accent)] sm:text-[20px]">{compact(n)}</div>
              <div className="truncate text-[9.5px] font-semibold uppercase tracking-[0.01em] text-[var(--text-muted)] sm:text-[11.5px] sm:tracking-[0.08em]">{label}</div>
            </div>
          ))}
        </div>
      )}

      <nav aria-label="DB Search tools" className="flex items-end gap-1 overflow-x-auto border-b border-[var(--hairline)] [scrollbar-width:none]">
        {TABS.filter((t) => isAdmin || t.id !== "ds_access").map((t, i, all) => (
          <span key={t.id} className="flex shrink-0 items-end">
            {t.extra && !all[i - 1]?.extra && <span aria-hidden className="mx-2 mb-3 h-4 w-px bg-[var(--hairline-strong)]" />}
            <button onClick={() => onView(t.id)} aria-current={tab === t.id ? "page" : undefined}
              className={`relative px-4 pb-3 pt-1 font-semibold transition-colors ${t.extra ? "text-[13px]" : "text-[14px]"} ${tab === t.id ? "text-[var(--accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
              {t.label}
              {tab === t.id && <span className="absolute inset-x-3 -bottom-px h-[2px] rounded-full bg-[#b8955a]" />}
            </button>
          </span>
        ))}
      </nav>

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
