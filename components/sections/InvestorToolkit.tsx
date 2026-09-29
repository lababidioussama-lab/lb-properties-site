"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { BarChart3, Calculator, Landmark, TrendingUp } from "lucide-react";

import { useSite } from "@/lib/context/site-context";
import { MARKET_SECTION_ID, SECTION_IDS } from "@/lib/site-config";
import { EASE } from "@/components/motion";
import { RoiCalculator } from "@/components/sections/RoiCalculator";
import { NetRoiEngine } from "@/components/sections/NetRoiEngine";
import { MortgageAdvisory } from "@/components/sections/MortgageAdvisory";
import { MarketCharts } from "@/components/sections/MarketCharts";

const TOOLS = [
  { id: SECTION_IDS.advisory, key: "roi", icon: TrendingUp, Tool: RoiCalculator },
  { id: SECTION_IDS.netRoi, key: "netRoi", icon: Calculator, Tool: NetRoiEngine },
  { id: SECTION_IDS.mortgage, key: "mortgage", icon: Landmark, Tool: MortgageAdvisory },
  { id: MARKET_SECTION_ID, key: "market", icon: BarChart3, Tool: MarketCharts },
] as const;

/** Height of the fixed header once the page has scrolled. */
const HEADER = 72;

/**
 * The four investor tools behind one switcher instead of ~7,000px of
 * stacked calculators.
 *
 * Inactive tools stay mounted and are only hidden, so a visitor who sets a
 * budget in one tool and flips to another finds it as they left it. Each
 * tool keeps its section id, and the URL hash both follows the active tool
 * and selects it, so /invest#mortgage-advisory links from the home page and
 * the page hero still land on the right tool.
 */
export function InvestorToolkit() {
  const { t } = useSite();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const anchor = useRef<HTMLDivElement>(null);
  const tabs = useRef<HTMLDivElement>(null);

  /* On a phone the tab row scrolls sideways; keep the chosen tool in view
     rather than leaving it half off the edge (which, in Arabic, is the left). */
  useEffect(() => {
    const row = tabs.current;
    const tab = row?.children[active] as HTMLElement | undefined;
    if (!row || !tab) return;
    // Measured on screen, so it holds in both writing directions.
    const r = row.getBoundingClientRect();
    const c = tab.getBoundingClientRect();
    const delta = c.left + c.width / 2 - (r.left + r.width / 2);
    row.scrollBy({ left: delta, behavior: reduce ? "auto" : "smooth" });
  }, [active, reduce]);

  const scrollToTools = useCallback(
    (onlyIfPast: boolean) => {
      const el = anchor.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      if (onlyIfPast && top > HEADER) return;
      window.scrollTo({ top: top + window.scrollY - HEADER + 1, behavior: reduce ? "auto" : "smooth" });
    },
    [reduce],
  );

  useEffect(() => {
    const fromHash = () => {
      const i = TOOLS.findIndex((tool) => `#${tool.id}` === window.location.hash);
      if (i < 0) return;
      setActive(i);
      requestAnimationFrame(() => scrollToTools(false));
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, [scrollToTools]);

  const select = (i: number) => {
    setActive(i);
    history.replaceState(null, "", `#${TOOLS[i].id}`);
    scrollToTools(true);
  };

  return (
    <>
      <div ref={anchor} />
      <div className="sticky top-[72px] z-30 border-b border-[var(--hairline)] bg-[var(--surface)]/85 backdrop-blur-xl">
        <div
          ref={tabs}
          role="tablist"
          aria-label={t.home.tools.kicker}
          className="mx-auto flex max-w-[1320px] gap-1 overflow-x-auto px-5 py-3 [scrollbar-width:none] sm:px-8 [&::-webkit-scrollbar]:hidden"
        >
          {TOOLS.map(({ id, key, icon: Icon }, i) => {
            const on = i === active;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={on}
                aria-controls={`${id}-panel`}
                onClick={() => select(i)}
                className={`relative flex shrink-0 items-center gap-2.5 px-4 py-2.5 text-[13.5px] font-medium transition-colors duration-300 sm:px-5 ${
                  on ? "text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="toolkit-pill"
                    className="absolute inset-0 -z-10 bg-[var(--accent-solid)]"
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 34 }}
                  />
                )}
                <Icon size={16} strokeWidth={1.6} className={on ? "text-[#d4b87f]" : "text-[var(--metal)]"} />
                <span className="whitespace-nowrap">{t.home.tools.items[key].title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {TOOLS.map(({ id, Tool }, i) => {
        const on = i === active;
        return (
          <motion.div
            key={id}
            id={`${id}-panel`}
            role="tabpanel"
            hidden={!on}
            initial={false}
            animate={on ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
            transition={{ duration: reduce ? 0 : 0.6, ease: EASE }}
          >
            <Tool />
          </motion.div>
        );
      })}
    </>
  );
}
