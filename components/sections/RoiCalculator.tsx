"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

import { useSite } from "@/lib/context/site-context";
import { SECTION_IDS } from "@/lib/site-config";
import { formatCurrency, formatCompact } from "@/lib/currency";
import {
  BUDGET_RANGE,
  VISA_THRESHOLDS,
  calculateRoi,
  type InvestmentGoal,
} from "@/lib/investment-data";
import { interpolate } from "@/lib/i18n";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { CountUp } from "@/components/ui/CountUp";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { Check, ShieldCheck, ArrowRight } from "lucide-react";

const GOALS: InvestmentGoal[] = ["yield", "appreciation", "goldenVisa"];

export function RoiCalculator() {
  const { t, currency, openDrawer, updateSelections } = useSite();
  const reduceMotion = useReducedMotion();

  const [budget, setBudget] = useState(2_500_000);
  const [goal, setGoal] = useState<InvestmentGoal>("yield");

  const result = useMemo(() => calculateRoi(budget, goal), [budget, goal]);

  function handleCta() {
    updateSelections({
      budgetAed: budget,
      goal,
      netAnnualAed: result.netAnnualAed,
      hubs: result.hubs.map((h) => t.hubs[h.id as keyof typeof t.hubs]),
    });
    openDrawer("advisory");
  }

  return (
    <section
      id={SECTION_IDS.advisory}
      className="relative scroll-mt-24 border-t border-[var(--hairline)] bg-[var(--surface)] px-5 py-16 sm:py-20 sm:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-[1320px]">
        <SectionHeader eyebrow={t.roi.eyebrow} title={t.roi.title} subtitle={t.roi.subtitle} />

        <div className="mt-16 grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:gap-10">
          {/* ---------- Controls ---------- */}
          <GlassCard tilt={false} className="p-7 sm:p-9">
            <RangeSlider
              value={budget}
              min={BUDGET_RANGE.min}
              max={BUDGET_RANGE.max}
              step={BUDGET_RANGE.step}
              onChange={setBudget}
              label={t.roi.budgetLabel}
              formatValue={(v) => formatCurrency(v, currency)}
              minLabel={formatCompact(BUDGET_RANGE.min, currency)}
              maxLabel={`${formatCompact(BUDGET_RANGE.max, currency)}+`}
            />

            <div className="mt-10">
              <span className="eyebrow">{t.roi.goalLabel}</span>
              <div role="radiogroup" aria-label={t.roi.goalLabel} className="mt-4 grid gap-2.5">
                {GOALS.map((option) => {
                  const active = option === goal;
                  return (
                    <button
                      key={option}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setGoal(option)}
                      className={[
                        "relative flex items-center gap-4 overflow-hidden rounded-xl border px-5 py-4 text-start transition-colors duration-400",
                        active
                          ? "border-[var(--glass-border-lit)] bg-[var(--accent-wash)]"
                          : "border-[var(--hairline)] hover:border-[var(--hairline-strong)]",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors duration-300",
                          active
                            ? "border-[var(--accent)] text-[var(--accent)]"
                            : "border-[var(--hairline-strong)] text-transparent",
                        ].join(" ")}
                      >
                        <span className="h-2 w-2 rounded-full bg-current" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[14px] font-medium text-[var(--text-primary)]">
                          {t.roi.goals[option]}
                        </span>
                        <span className="mt-0.5 block text-[13px] text-[var(--text-muted)]">
                          {t.roi.goals[`${option}Desc` as keyof typeof t.roi.goals]}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </GlassCard>

          {/* ---------- Results ---------- */}
          <div className="flex flex-col gap-5">
            <GlassCard tilt={false} className="p-7 sm:p-9">
              <h3 className="eyebrow">{t.roi.results.title}</h3>

              <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-7">
                <Figure
                  label={t.roi.results.netAnnual}
                  value={
                    <CountUp formatKey={currency}
                      value={result.netAnnualAed}
                      format={(v) => formatCurrency(v, currency)}
                      className="accent-text display-3 font-[family-name:var(--font-body)] font-semibold"
                    />
                  }
                  note={
                    <>
                      <CountUp formatKey={currency}
                        value={result.netMonthlyAed}
                        format={(v) => formatCurrency(v, currency)}
                      />{" "}
                      {t.roi.results.netMonthly}
                    </>
                  }
                />
                <Figure
                  label={t.roi.results.netYield}
                  value={
                    <CountUp formatKey={currency}
                      value={result.netYieldPct}
                      format={(v) => `${v.toFixed(1)}%`}
                      className="accent-text display-3 font-[family-name:var(--font-body)] font-semibold"
                    />
                  }
                  note={
                    <>
                      <CountUp formatKey={currency} value={result.grossYieldPct} format={(v) => `${v.toFixed(1)}%`} />{" "}
                      {t.roi.results.grossYield.toLowerCase()}
                    </>
                  }
                />
                <Figure
                  label={t.roi.results.appreciation}
                  value={
                    <CountUp formatKey={currency}
                      value={result.appreciationPct}
                      format={(v) => `${v.toFixed(1)}%`}
                      className="display-3 font-[family-name:var(--font-body)] font-semibold text-[var(--text-primary)]"
                    />
                  }
                />
                <Figure
                  label={t.roi.results.fiveYear}
                  value={
                    <CountUp formatKey={currency}
                      value={result.fiveYearValueAed}
                      format={(v) => formatCurrency(v, currency, { compact: true })}
                      className="display-3 font-[family-name:var(--font-body)] font-semibold text-[var(--text-primary)]"
                    />
                  }
                />
              </div>

              <VisaBadge
                eligible={result.goldenVisaEligible}
                investorEligible={result.investorVisaEligible}
                shortfallAed={result.goldenVisaShortfallAed}
              />
            </GlassCard>

            {/* ---------- Recommended hubs ---------- */}
            <GlassCard tilt={false} className="p-7 sm:p-9">
              <h3 className="eyebrow">{t.roi.hubsTitle}</h3>
              <ul className="mt-5 space-y-2.5">
                <AnimatePresence mode="popLayout" initial={false}>
                  {result.hubs.map((hub) => (
                    <motion.li
                      key={hub.id}
                      layout={!reduceMotion}
                      initial={reduceMotion ? false : { opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={reduceMotion ? undefined : { opacity: 0 }}
                      transition={{ duration: 0.75 }}
                      className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border border-[var(--hairline)] px-4 py-3"
                    >
                      <span className="text-[14.5px] font-medium text-[var(--text-primary)]">
                        {t.hubs[hub.id as keyof typeof t.hubs]}
                      </span>
                      <span className="figure flex items-center gap-3 text-[12.5px] text-[var(--text-muted)]">
                        <span className="text-[var(--accent)]">
                          {hub.grossYield[0]}–{hub.grossYield[1]}% {t.roi.hubYield}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {hub.appreciation[0]}–{hub.appreciation[1]}% {t.roi.hubGrowth}
                        </span>
                      </span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </GlassCard>
          </div>
        </div>

        {/* ---------- CTA ---------- */}
        <div className="mt-10 flex flex-col items-start gap-3">
          <Button variant="accent" size="lg" onClick={handleCta}>
            {t.roi.cta}
            <ArrowRight size={16} strokeWidth={1.5} className="rtl:rotate-180" />
          </Button>
          <span className="text-[13px] text-[var(--text-muted)]">{t.roi.ctaHint}</span>
        </div>

        {/* The disclaimer sits with the numbers it qualifies, not buried in
            a footer nobody reads. */}
        <p className="mt-12 max-w-[92ch] border-t border-[var(--hairline)] pt-6 text-[12.5px] leading-[1.85] text-[var(--text-muted)]">
          {t.roi.disclaimer}
        </p>
      </div>
    </section>
  );
}

function Figure({
  label,
  value,
  note,
}: {
  label: string;
  value: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="eyebrow">{label}</div>
      <div className="mt-2">{value}</div>
      {note && <div className="figure mt-1.5 text-[12.5px] text-[var(--text-muted)]">{note}</div>}
    </div>
  );
}

function VisaBadge({
  eligible,
  investorEligible,
  shortfallAed,
}: {
  eligible: boolean;
  investorEligible: boolean;
  shortfallAed: number;
}) {
  const { t, currency } = useSite();

  /* Three states rather than two: telling somebody at AED 1.6M exactly how
     far short they are is more useful — and more honest — than a bare "no",
     and the 2-year investor visa they DO qualify for is worth surfacing. */
  const state = eligible ? "golden" : investorEligible ? "investor" : "none";

  const copy = {
    golden: { title: t.roi.visa.eligibleTitle, body: t.roi.visa.eligibleBody },
    investor: {
      title: t.roi.visa.investorTitle,
      body: `${t.roi.visa.investorBody} ${interpolate(t.roi.visa.shortfallBody, {
        // Measured against an AED threshold, so quoted in AED.
        amount: formatCurrency(shortfallAed, "AED"),
      })}`,
    },
    none: { title: t.roi.visa.noneTitle, body: t.roi.visa.noneBody },
  }[state];

  return (
    <div
      className={[
        "mt-8 flex items-start gap-4 rounded-xl border p-5 transition-colors duration-500",
        state === "golden"
          ? "border-[var(--glass-border-lit)] bg-[var(--accent-wash)]"
          : "border-[var(--hairline)]",
      ].join(" ")}
    >
      <span
        className={
          state === "golden"
            ? "mt-0.5 shrink-0 text-[var(--accent)]"
            : "mt-0.5 shrink-0 text-[var(--text-muted)]"
        }
      >
        {state === "golden" ? <ShieldCheck size={22} strokeWidth={1.5} /> : <Check size={22} strokeWidth={1.5} />}
      </span>
      <div className="min-w-0">
        <p
          className={`text-[14.5px] font-semibold ${
            state === "golden" ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
          }`}
        >
          {copy.title}
        </p>
        <p className="figure mt-1.5 text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
          {copy.body}
        </p>
        {/* Statutory thresholds stay in AED at every currency setting.
            Converting them was not just visually inconsistent with the body
            copy — which names "AED 2M" — it was wrong. The residency test is
            written in dirhams, so rendering "€502,600" implies a buyer
            qualifies at that figure, which only holds while the rate holds.
            The visitor's own budget and returns convert; the legal
            thresholds they are measured against do not. */}
        <p className="figure mt-2 text-[12px] text-[var(--text-muted)]">
          {formatCurrency(VISA_THRESHOLDS.golden, "AED")} ·{" "}
          {formatCurrency(VISA_THRESHOLDS.investor, "AED")}
          {currency !== "AED" && (
            <span className="ms-1.5 normal-case">{t.roi.visa.aedNote}</span>
          )}
        </p>
      </div>
    </div>
  );
}
