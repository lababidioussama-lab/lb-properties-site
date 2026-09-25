"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";

import { useSite } from "@/lib/context/site-context";
import { SECTION_IDS } from "@/lib/site-config";
import { formatCurrency } from "@/lib/currency";
import { PLANS, PLAN_FEATURES, planPrice, ANNUAL_DISCOUNT, type PlanId } from "@/lib/services";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { CountUp } from "@/components/ui/CountUp";
import { Button } from "@/components/ui/Button";
import { Check, Minus } from "lucide-react";

type Billing = "monthly" | "annual";

export function MaintenancePlans() {
  const { t, currency, openDrawer } = useSite();
  const reduceMotion = useReducedMotion();
  const [billing, setBilling] = useState<Billing>("annual");

  return (
    <section
      id={SECTION_IDS.maintenance}
      className="relative scroll-mt-24 border-t border-[var(--hairline)] bg-[var(--surface)] px-5 py-16 sm:py-20 sm:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-[1440px]">
        <SectionHeader
          eyebrow={t.maintenance.eyebrow}
          title={t.maintenance.title}
          subtitle={t.maintenance.subtitle}
          align="center"
        />

        {/* ---- billing toggle ---- */}
        <div className="mt-11 flex justify-center">
          <div
            role="group"
            aria-label={t.maintenance.billing.monthly}
            className="flex items-center rounded-full border border-[var(--hairline)] p-1"
          >
            {(["monthly", "annual"] as Billing[]).map((option) => {
              const active = option === billing;
              return (
                <button
                  key={option}
                  onClick={() => setBilling(option)}
                  aria-pressed={active}
                  className={[
                    "relative flex items-center gap-2 rounded-full px-5 py-2.5 font-[family-name:var(--font-eyebrow)] text-[10.5px] font-semibold uppercase tracking-[0.14em] transition-colors duration-300",
                    active ? "text-[#0e1117]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
                  ].join(" ")}
                >
                  {active && (
                    <motion.span
                      layoutId="billing-pill"
                      transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      className="accent-fill absolute inset-0 rounded-full"
                    />
                  )}
                  <span className="relative">{t.maintenance.billing[option]}</span>
                  {option === "annual" && (
                    <span
                      className={`relative rounded-full px-2 py-0.5 text-[9px] tracking-[0.1em] ${
                        active ? "bg-black/15" : "bg-[var(--accent-wash)] text-[var(--accent)]"
                      }`}
                    >
                      {t.maintenance.billing.save}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ---- tiers ---- */}
        <div className="mt-14 grid items-start gap-6 lg:grid-cols-3">
          {PLANS.map((plan, index) => {
            const price = planPrice(plan, billing);
            const copy = t.maintenance.plans[plan.id];

            return (
              <motion.div
                key={plan.id}
                initial={reduceMotion ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.75, delay: index * 0.09, ease: [0.2, 0.8, 0.2, 1] }}
                /* The anchor tier is raised on desktop only — on mobile the
                   cards stack, and a lifted middle card would just look
                   misaligned. */
                className={plan.featured ? "lg:-mt-5" : ""}
              >
                <GlassCard
                  tilt={false}
                  className={[
                    "flex h-full flex-col p-7 sm:p-8",
                    plan.featured ? "border-[var(--glass-border-lit)]" : "",
                  ].join(" ")}
                >
                  {plan.featured && (
                    <span className="accent-fill mb-5 -mt-1 self-start rounded-full px-3 py-1 font-[family-name:var(--font-eyebrow)] text-[9px] font-bold uppercase tracking-[0.18em]">
                      {t.maintenance.popular}
                    </span>
                  )}

                  <h3 className="display-3 text-[var(--text-primary)]">{copy.name}</h3>
                  <p className="eyebrow mt-2">{copy.for}</p>
                  <p className="mt-4 text-[13px] leading-[1.75] text-[var(--text-secondary)]">
                    {copy.desc}
                  </p>

                  <div className="mt-7 border-y border-[var(--hairline)] py-6">
                    <div className="flex items-baseline gap-2">
                      <CountUp formatKey={currency}
                        value={price.monthlyAed}
                        format={(v) => formatCurrency(v, currency)}
                        className="accent-text display-2 font-[family-name:var(--font-body)] font-semibold"
                      />
                      <span className="text-[12px] text-[var(--text-muted)]">
                        {t.maintenance.billing.perMonth}
                      </span>
                    </div>
                    <p className="figure mt-2 text-[11.5px] text-[var(--text-muted)]">
                      {billing === "annual" ? (
                        <>
                          {formatCurrency(price.annualAed, currency)}{" "}
                          {t.maintenance.billing.billedAnnually} ·{" "}
                          <span className="text-[var(--accent)]">
                            {t.maintenance.billing.save}
                          </span>
                        </>
                      ) : (
                        <>
                          {formatCurrency(plan.monthlyAed * 12, currency)}{" "}
                          {t.maintenance.billing.perYear}
                        </>
                      )}
                    </p>
                  </div>

                  {/* Every tier lists every feature so the differences line
                      up across the three cards at a glance. */}
                  <ul className="mt-6 space-y-3">
                    {PLAN_FEATURES.map((feature) => {
                      const value = plan.features[feature];
                      const included = value !== false;
                      const valueLabel =
                        typeof value === "string"
                          ? t.maintenance.values[value]
                          : value === true
                            ? null
                            : null;

                      return (
                        <li
                          key={feature}
                          className={`flex items-start justify-between gap-3 ${
                            included ? "" : "opacity-40"
                          }`}
                        >
                          <span className="flex items-start gap-2.5">
                            <span
                              className={`mt-0.5 shrink-0 ${
                                included ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                              }`}
                            >
                              {included ? <Check size={15} strokeWidth={1.5} /> : <Minus size={15} strokeWidth={1.5} />}
                            </span>
                            <span className="text-[12.5px] leading-snug text-[var(--text-secondary)]">
                              {t.maintenance.features[feature]}
                            </span>
                          </span>
                          {valueLabel && (
                            <span className="shrink-0 text-[11.5px] font-medium text-[var(--text-primary)]">
                              {valueLabel}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>

                  <div className="mt-auto pt-8">
                    <Button
                      variant={plan.featured ? "accent" : "outline"}
                      size="md"
                      fullWidth
                      onClick={() =>
                        openDrawer("maintenance", { planId: plan.id as PlanId, billing })
                      }
                    >
                      {t.maintenance.cta}
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        <p className="figure mt-8 text-center text-[11.5px] text-[var(--text-muted)]">
          {t.maintenance.billing.annual} · {Math.round(ANNUAL_DISCOUNT * 100)}%
        </p>
      </div>
    </section>
  );
}
