"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowLeft, BarChart3, ChevronDown, Compass, FileSearch, Lock, LogOut, Moon, Phone, Search, Send, Sparkles, Sun, UserPlus, Wrench } from "lucide-react";

import { ds, dsError, type DsSessionInfo, type DsUsage } from "./api";
import { DsSignIn } from "./DsSignIn";
import { DsSmart } from "./DsSmart";
import { DsSearch } from "./DsSearch";
import { DsPhone } from "./DsPhone";
import { DsUnit } from "./DsUnit";
import { DsOwnerPanel } from "./DsOwnerPanel";
import { DsCampaign } from "./DsCampaign";
import { DsArea } from "./DsArea";
import { DsBrokers } from "./DsBrokers";
import { DsPortfolio } from "./DsPortfolio";
import { DsChecks, type CheckMode } from "./DsChecks";
import { DsVastu } from "./DsVastu";

/* Every DB Search view id. Access lives in the CRM (Team & rules); ds_home
   is kept so old links land on Search. */
export type DsView = "ds_home" | "ds_smart" | "ds_search" | "ds_phone" | "ds_unit" | "ds_portfolio" | "ds_area" | "ds_checks" | "ds_vastu" | "ds_brokers" | "ds_access" | "ds_campaign";
export const DS_VIEWS: DsView[] = ["ds_home", "ds_smart", "ds_search", "ds_phone", "ds_unit", "ds_area", "ds_brokers", "ds_campaign", "ds_checks", "ds_vastu", "ds_portfolio"];

/* The extra tools, behind one Tools menu in the bar. All of them are for
   the admin: an agent gets the four tabs, the Vastu Map and the WhatsApp
   campaign. */
const MORE: { id: DsView; label: string; icon: typeof Search }[] = [
  { id: "ds_checks", label: "Property checks", icon: FileSearch },
  { id: "ds_portfolio", label: "Portfolio", icon: BarChart3 },
];
const ADMIN_ONLY: DsView[] = MORE.map((m) => m.id);

/* DB Search's own tabs, in its order: Smart, Search, Phone, Agents. */
const TABS: { id: DsView; label: string; icon: typeof Search }[] = [
  { id: "ds_smart", label: "Smart", icon: Sparkles },
  { id: "ds_search", label: "Search", icon: Search },
  { id: "ds_phone", label: "Phone", icon: Phone },
  { id: "ds_brokers", label: "Agents", icon: UserPlus },
];
export const DS_TOOLS = TABS.map(({ id, label }) => ({ id, label }));

/**
 * DB Search on its own page, laid out as dbsearchdubai.com lays out its app:
 * the brand bar (Lababidi logo, session time, theme, Back to CRM, Exit), one
 * row of tabs, then the tab's search box and results. It holds the DB Search
 * session (separate from the CRM's) and shows the sign-in until there is one.
 */
export function DbSearch({ view, onView, meEmail, onOpenLead, theme, onTheme, crmHref, initialSearch = null }: {
  view: DsView;
  onView: (v: DsView) => void;
  meEmail: string;

  onOpenLead: (id: string) => void;
  theme: "light" | "dark";
  onTheme: () => void;
  /** Where Back to CRM goes when the CRM's tab is not open. */
  crmHref: string;
  /** A name handed over from the CRM (Portfolio) to search straight away. */
  initialSearch?: string | null;
}) {
  const [info, setInfo] = useState<DsSessionInfo | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [ownerRef, setOwnerRef] = useState<string | null>(null);
  const [unitQuery, setUnitQuery] = useState<{ code: string; place?: string | null } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string | null>(initialSearch);
  const [checkMode, setCheckMode] = useState<CheckMode>("permit");
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [menu]);
  const [phoneQuery, setPhoneQuery] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const wasIn = useRef(false);

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

  /* Back to the CRM. Browsers ignore a page asking to bring another tab to
     the front, so when the CRM opened this tab we close it, which lands on
     the CRM tab behind it; opened any other way, the CRM loads right here. */
  function backToCrm() {
    let fromCrm = false;
    try { fromCrm = !!window.opener && !window.opener.closed && window.opener.name === "lababidi-crm"; } catch { /* another site opened us */ }
    if (fromCrm) {
      window.close();
      // A tab the browser refuses to close falls through to a plain visit.
      window.setTimeout(() => { window.location.href = crmHref; }, 250);
      return;
    }
    window.location.href = crmHref;
  }

  /* The bar's buttons: one height, one pill shape. `topOn` marks the screen you are on. */
  const topBtn = "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-transparent px-3 text-[12.5px] font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]";
  const topOn = "!border-[var(--hairline-strong)] !bg-[var(--surface-hover)] !text-[var(--text-primary)]";
  const topIcon = "grid h-9 w-9 shrink-0 place-items-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]";
  const bar = (right: ReactNode) => (
    <header className="relative z-20 mx-auto flex w-full max-w-[1100px] flex-wrap items-center gap-x-2.5 gap-y-2 pb-3 pt-3 min-[1400px]:max-w-[1280px]">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:flex-none">
        <Image src={theme === "dark" ? "/logo-icon-white.png" : "/logo-icon.png"} alt="Lababidi Properties" width={32} height={32} priority />
        <div className="min-w-0 leading-tight">
          <div className="display text-[18px]">DB <em className="text-[var(--accent)]">Search</em></div>
          <div className="ds-label mt-0.5 truncate !text-[9.5px] !tracking-[0.12em]">Lababidi Properties</div>
        </div>
      </div>
      <div className="hidden flex-1 sm:block" />
      <div className="contents sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-1.5">{right}</div>
    </header>
  );
  const commonRight = (
    <>
      <button onClick={onTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"} className={topIcon}>
        {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
      </button>
      <button onClick={backToCrm} aria-label="Back to CRM" className={`${topBtn} !border-[var(--hairline)]`}><ArrowLeft size={14} /><span className="hidden sm:inline">Back to CRM</span><span className="sm:hidden">CRM</span></button>
    </>
  );


  if (problem) {
    return <div className="relative z-10 px-4">{bar(commonRight)}<p role="alert" className="panel mx-auto max-w-[560px] p-5 text-[14px] text-[var(--text-secondary)]">{dsError(problem)}</p></div>;
  }
  if (!info) return <div className="relative z-10 px-4">{bar(commonRight)}<div className="panel mx-auto h-72 max-w-[430px] animate-pulse" /></div>;
  const left = info.session ? Math.max(0, info.session.endsAt - now) : null;
  const out = !info.signedIn || left === 0;
  if (!out) wasIn.current = true;
  // First visit: just the sign-in. After a timeout the page stays underneath (below), so nothing is lost.
  if (out && !wasIn.current) return <DsSignIn email={meEmail} onDone={load} theme={theme} topBar={bar(commonRight)} />;
  const hm = left == null ? "" : `${Math.floor(left / 3_600_000)}:${String(Math.floor((left % 3_600_000) / 60_000)).padStart(2, "0")}`;

  const shared = { onExpired, onUsage, onOpenOwner: setOwnerRef };
  let tab: DsView = view === "ds_home" ? "ds_search" : view;
  if (!(DS_VIEWS as string[]).includes(tab)) tab = "ds_search";
  const isAdmin = info.user.role === "admin";
  if (!isAdmin && ADMIN_ONLY.includes(tab)) tab = "ds_search";
  /* The area filter and unit history open from a search, so Search stays lit. */
  const lit = tab === "ds_area" || tab === "ds_unit" ? "ds_search" : tab;
  const more = isAdmin ? MORE : [];
  const inMore = more.some((m) => m.id === tab);

  return (
    <div className={`relative z-10 min-h-[100dvh] px-3 md:px-6 ${tab === "ds_vastu" ? "pb-3" : "pb-16"}`}>
      {bar(
        <>
          <span title="Your DB Search session ends after 20 minutes without activity"
            className="hidden h-9 items-center gap-1.5 rounded-full border border-[var(--hairline)] px-3 text-[11.5px] text-[var(--text-muted)] lg:inline-flex">
            <Lock size={12} className="text-[var(--emerald)]" />
            <span className="figure text-[var(--text-primary)]">{hm || "-"}</span>
            {info.usage && info.limits && <span><span className="figure">{info.usage.searches}/{info.limits.searches}</span> searches</span>}
          </span>
          <div className="order-last flex basis-full items-center justify-center gap-0.5 rounded-full border border-[var(--hairline)] bg-[var(--input-bg)] p-0.5 sm:order-none sm:basis-auto">
            <button onClick={() => onView("ds_vastu")} aria-current={tab === "ds_vastu" ? "page" : undefined}
              className={`${topBtn} !h-8 ${tab === "ds_vastu" ? topOn : ""}`}>
              <Compass size={14} /> Vastu Map
            </button>
            <button onClick={() => onView("ds_campaign")} aria-current={tab === "ds_campaign" ? "page" : undefined}
              className={`${topBtn} !h-8 ${tab === "ds_campaign" ? topOn : ""}`}>
              <Send size={14} className="text-[var(--wa)]" /> <span className="hidden sm:inline">WhatsApp campaign</span><span className="sm:hidden">Campaign</span>
            </button>
            {isAdmin && <div ref={menuRef} className="relative">
              <button onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu}
                className={`${topBtn} !h-8 ${inMore ? topOn : ""}`}>
                <Wrench size={14} /> Tools <ChevronDown size={12} />
              </button>
              {menu && (
                <div role="menu" className="crm-pop absolute end-0 top-10 z-40 w-56 overflow-hidden rounded-[12px] border border-[var(--hairline)] bg-[var(--surface-solid)] py-1 shadow-[var(--shadow-pop)]">
                  {more.map((m) => (
                    <button key={m.id} role="menuitem" onClick={() => { setMenu(false); onView(m.id); }}
                      className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] transition-colors hover:bg-[var(--surface-hover)] ${tab === m.id ? "font-bold text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>
                      <m.icon size={14} /> {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>}
          </div>
          <span aria-hidden="true" className="mx-0.5 hidden h-5 w-px bg-[var(--hairline)] sm:block" />
          {commonRight}
          <button onClick={leave} aria-label="Exit DB Search" title="Exit DB Search" className={topIcon}><LogOut size={15} /></button>
        </>,
      )}

      <div className="mx-auto w-full max-w-[1100px] min-[1400px]:max-w-[1280px]">
        <nav aria-label="DB Search" className={`grid grid-cols-4 border-b border-[var(--hairline)] ${tab === "ds_vastu" ? "mb-3" : "mb-4"}`}>
          {TABS.map((t) => {
            const on = lit === t.id;
            return (
              <button key={t.id} onClick={() => onView(t.id)} aria-current={on ? "page" : undefined}
                className={`relative flex items-center justify-center gap-1.5 px-1 py-2.5 text-[12.5px] font-bold transition-colors ${on ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
                <t.icon size={14} /><span>{t.label}</span>
                {on && <motion.span layoutId="ds-tab" transition={{ type: "spring", stiffness: 520, damping: 44 }} className="absolute inset-x-[12%] -bottom-px h-[2px] bg-[var(--accent)]" />}
              </button>
            );
          })}
        </nav>

        <main>
          {(tab === "ds_area" || tab === "ds_unit" || tab === "ds_campaign" || inMore) && (
            <button onClick={() => onView("ds_search")} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--accent)] hover:underline"><ArrowLeft size={14} /> Back to Search</button>
          )}
          {/* The four tabs stay loaded and are only hidden, so a search is still
              there when you come back to its tab and costs nothing to see again. */}
          <div hidden={tab !== "ds_smart"}><DsSmart onExpired={onExpired} onUsage={onUsage} onOpenLead={onOpenLead} onAreaFilter={() => onView("ds_area")} /></div>
          <div hidden={tab !== "ds_search"}><DsSearch onExpired={onExpired} onUsage={onUsage} onOpenLead={onOpenLead} initialQuery={searchQuery} onPhone={(q) => { setPhoneQuery(q); onView("ds_phone"); }} onAreaFilter={() => onView("ds_area")} /></div>
          <div hidden={tab !== "ds_phone"}><DsPhone onExpired={onExpired} onUsage={onUsage} onOpenLead={onOpenLead} initialQuery={phoneQuery} /></div>
          <div hidden={tab !== "ds_brokers"}><DsBrokers onExpired={onExpired} /></div>
          {tab === "ds_campaign" && <DsCampaign onExpired={onExpired} onUsage={onUsage} meName={info.user.name} />}
          {tab === "ds_unit" && <DsUnit {...shared} initial={unitQuery} />}
          {tab === "ds_area" && <DsArea {...shared} />}
          {tab === "ds_checks" && <DsChecks mode={checkMode} onMode={setCheckMode} onExpired={onExpired} onOpenOwner={setOwnerRef} />}
          {tab === "ds_vastu" && <DsVastu />}
          {tab === "ds_portfolio" && <DsPortfolio {...shared} onSearchName={(name) => { setSearchQuery(name); onView("ds_search"); }} />}
        </main>
      </div>

      {out && (
        <div className="fixed inset-0 z-[70] overflow-y-auto bg-[var(--canvas)]" style={{ backgroundImage: "var(--page-glow)" }}>
          <DsSignIn email={meEmail} onDone={load} expired theme={theme} topBar={bar(commonRight)} />
        </div>
      )}

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
