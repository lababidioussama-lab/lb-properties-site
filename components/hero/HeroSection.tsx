"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";

import { useSite } from "@/lib/context/site-context";
import { emphasize } from "@/lib/i18n/emphasis";
import { SECTION_IDS, SITE, type ServiceKey } from "@/lib/site-config";
import { HeroBackdrop } from "./HeroBackdrop";
import { AmbientGlowCanvas } from "./AmbientGlowCanvas";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TrendingUp, Calculator, Palette, Wrench, ChevronDown, ArrowRight } from "lucide-react";
import { IconWhatsApp } from "@/components/ui/Icons";

/** The four entry points. Selecting one writes to the lead context, so the
    choice genuinely pre-qualifies the enquiry rather than just scrolling. */
const TABS: { id: ServiceKey; icon: typeof TrendingUp }[] = [
  { id: "advisory", icon: TrendingUp },
  { id: "netRoi", icon: Calculator },
  { id: "fitout", icon: Palette },
  { id: "maintenance", icon: Wrench },
];

export function HeroSection() {
  const { t, activeService, setActiveService, openDrawer } = useSite();
  const reduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, reduceMotion ? 1 : 0]);
  const leftY = 0;
  const rightY = 0;

  const ctaLabel = t.hero.cta[activeService as keyof typeof t.hero.cta] ?? t.hero.cta.advisory;

  const rise = (_delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.4 },
        };

  function handleTab(id: ServiceKey) {
    setActiveService(id);
    document
      .getElementById(SECTION_IDS[id])
      ?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  return (
    <section
      ref={sectionRef}
      className="relative min-h-[100svh] overflow-hidden bg-[var(--surface)]"
    >
      <HeroBackdrop />
      <div className="hero-scrim-y pointer-events-none absolute inset-0" />
      <div className="hero-scrim-x pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid min-h-[100svh] max-w-[1440px] grid-cols-1 items-center gap-14 px-5 pt-28 pb-24 sm:px-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16 lg:pt-24 lg:pb-20">
        {/* ================= LEFT 60% — editorial column ================= */}
        <motion.div style={{ y: leftY, opacity: fade }}>
          <motion.div {...rise(0.05)} className="flex items-center gap-3">
            <span className="h-px w-10 bg-[linear-gradient(90deg,transparent,var(--accent))] rtl:bg-[linear-gradient(270deg,transparent,var(--accent))]" />
            <span className="eyebrow">{t.hero.eyebrow}</span>
          </motion.div>

          <motion.h1
            {...rise(0.12)}
            className="display-1 mt-7 max-w-[20ch] text-[var(--text-primary)]"
          >
            {emphasize(t.hero.title)}
          </motion.h1>

          <motion.p
            {...rise(0.2)}
            className="mt-7 max-w-[52ch] text-[15px] leading-[1.85] text-[var(--text-muted)] sm:text-[15.5px]"
          >
            {t.hero.subtitle}
          </motion.p>

          {/* Dual CTA: emerald conversion action first, bronze hairline second */}
          <motion.div {...rise(0.3)} className="mt-10 flex flex-wrap items-center gap-3.5">
            <ButtonLink
              variant="cta"
              size="lg"
              href={SITE.waLink(
                "Hello — I would like to speak to an advisor about a Dubai property.",
              )}
              target="_blank"
              rel="noopener noreferrer"
            >
              <IconWhatsApp size={16} />
              {t.utility.concierge}
            </ButtonLink>
            <Button variant="outline" size="lg" onClick={() => openDrawer(activeService)}>
              <motion.span
                key={ctaLabel}
                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {ctaLabel}
              </motion.span>
              <ArrowRight size={15} strokeWidth={1.5} className="rtl:rotate-180" />
            </Button>
          </motion.div>

          <motion.dl
            {...rise(0.42)}
            className="mt-14 grid max-w-xl grid-cols-2 gap-x-8 gap-y-6 border-t border-[var(--hairline)] pt-8 sm:grid-cols-3"
          >
            <Stat label={t.hero.stats.licensed} value={t.hero.stats.licensedValue} numeric={false} />
            <Stat label={t.hero.stats.languages} value={t.hero.stats.languagesValue} numeric={false} />
            <Stat
              label={t.hero.stats.response}
              value={t.hero.stats.responseValue}
              numeric={false}
              className="col-span-2 sm:col-span-1"
            />
          </motion.dl>
        </motion.div>

        {/* ================= RIGHT 40% — floating glass card ================= */}
        <motion.div style={{ y: rightY, opacity: fade }} className="lg:justify-self-end">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="relative w-full max-w-[460px] overflow-hidden rounded-2xl border border-[var(--glass-border-lit)] bg-[var(--surface-raised)]/85 p-7 shadow-[var(--shadow-lift)] backdrop-blur-xl sm:p-8 lg:ms-auto"
          >
            <AmbientGlowCanvas className="opacity-70" />
            {/* Bronze hairline along the top edge */}
            <span className="pointer-events-none absolute inset-x-8 top-0 h-px bg-[linear-gradient(90deg,transparent,var(--accent),transparent)]" />

            <div className="relative">
              <span className="eyebrow">{t.hero.tabsLabel}</span>

              <div role="tablist" aria-label={t.hero.tabsLabel} className="mt-5 grid gap-2">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const active = tab.id === activeService;
                  return (
                    <button
                      key={tab.id}
                      role="tab"
                      aria-selected={active}
                      onClick={() => handleTab(tab.id)}
                      className={[
                        "group relative flex items-center gap-3.5 rounded-xl border px-4 py-3.5 text-start transition-colors duration-400",
                        active
                          ? "border-[var(--glass-border-lit)] text-[var(--text-primary)]"
                          : "border-[var(--hairline)] text-[var(--text-muted)] hover:border-[var(--hairline-strong)] hover:text-[var(--text-primary)]",
                      ].join(" ")}
                    >
                      {active && (
                        <motion.span
                          layoutId="hero-tab-bg"
                          transition={{ type: "spring", stiffness: 400, damping: 34 }}
                          className="absolute inset-0 rounded-xl bg-[var(--accent-wash)]"
                        />
                      )}
                      <span
                        className={`relative transition-colors duration-400 ${
                          active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                        }`}
                      >
                        <Icon size={19} strokeWidth={1.5} />
                      </span>
                      <span className="relative text-[13px] font-medium">
                        {t.hero.tabs[tab.id as keyof typeof t.hero.tabs]}
                      </span>
                      {active && (
                        <motion.span
                          layoutId="hero-tab-marker"
                          transition={{ type: "spring", stiffness: 400, damping: 34 }}
                          className="absolute inset-y-2.5 end-3 w-px bg-[var(--accent)]"
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 border-t border-[var(--hairline)] pt-5">
                <Button variant="accent" size="md" fullWidth onClick={() => openDrawer(activeService)}>
                  {ctaLabel}
                </Button>
                <p className="mt-3.5 text-center text-[11px] text-[var(--text-muted)]">
                  {t.hero.stats.response} · {t.hero.stats.responseValue}
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <motion.a
        href={`#${SECTION_IDS.advisory}`}
        {...rise(0.75)}
        aria-label={t.hero.scrollHint}
        className="absolute inset-x-0 bottom-6 z-10 mx-auto hidden w-max flex-col items-center gap-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--accent)] lg:flex"
      >
        <span className="eyebrow">{t.hero.scrollHint}</span>
        <ChevronDown size={16} strokeWidth={1.5} />
      </motion.a>
    </section>
  );
}

function Stat({
  label,
  value,
  numeric = true,
  className = "",
}: {
  label: string;
  value: string;
  numeric?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="eyebrow">{label}</dt>
      <dd
        className={`mt-2.5 text-[21px] font-semibold text-[var(--accent)] ${
          numeric ? "figure" : "font-[family-name:var(--font-body)] text-[15px] leading-snug sm:text-[16px]"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
