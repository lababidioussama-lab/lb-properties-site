"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Info, Wallet, ShieldCheck, TriangleAlert } from "lucide-react";

import { useSite } from "@/lib/context/site-context";
import { SECTION_IDS } from "@/lib/site-config";
import { formatCurrency } from "@/lib/currency";
import {
  calculateMortgage,
  RATE_PCT,
  TERM_YEARS,
  MAX_DBR,
  type BuyerType,
  type PropertyStatus,
} from "@/lib/mortgage";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { NumberField } from "@/components/ui/Select";
import { RangeSlider } from "@/components/ui/RangeSlider";
import { CountUp } from "@/components/ui/CountUp";
import { Button } from "@/components/ui/Button";

const BUYER_TYPES: BuyerType[] = ["resident", "national", "nonResident"];
const STATUSES: PropertyStatus[] = ["first", "second", "offPlan"];

export function MortgageAdvisory() {
  const { t, currency, openDrawer, updateSelections } = useSite();

  const [buyerType, setBuyerType] = useState<BuyerType>("resident");
  const [status, setStatus] = useState<PropertyStatus>("first");
  const [price, setPrice] = useState(2_000_000);
  const [ratePct, setRatePct] = useState<number>(RATE_PCT.default);
  const [termYears, setTermYears] = useState<number>(TERM_YEARS.default);

  /* Income starts empty rather than seeded. Every other input on this page
     has a defensible market default; a salary does not, and pre-filling one
     would put an affordability verdict on screen that the visitor never
     asked for and did not supply the basis for. */
  const [income, setIncome] = useState(0);
  const [commitments, setCommitments] = useState(0);

  const result = useMemo(
    () =>
      calculateMortgage({
        priceAed: Math.max(1, price),
        buyerType,
        status,
        ratePct,
        termYears,
        monthlyIncomeAed: income,
        monthlyCommitmentsAed: commitments,
      }),
    [price, buyerType, status, ratePct, termYears, income, commitments],
  );

  const money = (v: number) => formatCurrency(v, currency);

  function handleCta() {
    updateSelections({
      mortgageBuyerType: t.mortgage.buyers[buyerType],
      mortgagePropertyStatus: t.mortgage.statuses[status],
      mortgagePriceAed: price,
      mortgageLoanAed: result.loanAed,
      mortgageMonthlyAed: result.monthlyPaymentAed,
      mortgageCashRequiredAed: result.cashRequiredAed,
    });
    openDrawer("mortgage");
  }

  return (
    <section
      id={SECTION_IDS.mortgage}
      className="relative scroll-mt-24 border-t border-[var(--hairline)] bg-[var(--surface)] px-5 py-16 sm:py-20 sm:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-[1320px]">
        <SectionHeader
          eyebrow={t.mortgage.eyebrow}
          title={t.mortgage.title}
          subtitle={t.mortgage.subtitle}
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* ---------- inputs ---------- */}
          <GlassCard tilt={false} className="p-7 sm:p-9">
            <OptionGroup
              label={t.mortgage.buyerLabel}
              layoutId="mortgage-buyer-bg"
              value={buyerType}
              onChange={setBuyerType}
              options={BUYER_TYPES.map((key) => ({
                value: key,
                label: t.mortgage.buyers[key],
                desc: t.mortgage.buyers[`${key}Desc` as keyof typeof t.mortgage.buyers],
              }))}
            />

            <div className="mt-8">
              <OptionGroup
                label={t.mortgage.statusLabel}
                layoutId="mortgage-status-bg"
                value={status}
                onChange={setStatus}
                options={STATUSES.map((key) => ({
                  value: key,
                  label: t.mortgage.statuses[key],
                  desc: t.mortgage.statuses[`${key}Desc` as keyof typeof t.mortgage.statuses],
                }))}
              />
            </div>

            <div className="mt-8">
              <NumberField
                label={t.mortgage.priceLabel}
                value={price}
                onChange={setPrice}
                unit="AED"
                min={100_000}
              />
            </div>

            <div className="mt-9">
              <RangeSlider
                label={t.mortgage.rateLabel}
                value={ratePct}
                min={RATE_PCT.min}
                max={RATE_PCT.max}
                step={0.05}
                onChange={setRatePct}
                formatValue={(v) => `${v.toFixed(2)}%`}
                minLabel={`${RATE_PCT.min}%`}
                maxLabel={`${RATE_PCT.max}%`}
              />
              <p className="mt-4 flex items-start gap-2.5 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                <span className="mt-0.5 shrink-0">
                  <Info size={14} strokeWidth={1.5} />
                </span>
                {t.mortgage.rateNote}
              </p>
            </div>

            <div className="mt-9">
              <RangeSlider
                label={t.mortgage.termLabel}
                value={termYears}
                min={TERM_YEARS.min}
                max={TERM_YEARS.max}
                step={1}
                onChange={setTermYears}
                formatValue={(v) => `${v} ${t.mortgage.years}`}
                minLabel={`${TERM_YEARS.min}`}
                maxLabel={`${TERM_YEARS.max}`}
              />
            </div>

            <div className="mt-9 grid gap-5 border-t border-[var(--hairline)] pt-7 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <NumberField
                  label={`${t.mortgage.incomeLabel} — ${t.mortgage.incomeHint}`}
                  value={income}
                  onChange={setIncome}
                  unit="AED"
                  min={0}
                />
              </div>
              <div className="sm:col-span-2">
                <NumberField
                  label={t.mortgage.commitmentsLabel}
                  value={commitments}
                  onChange={setCommitments}
                  unit="AED"
                  min={0}
                />
              </div>
            </div>
          </GlassCard>

          {/* ---------- results ---------- */}
          <div className="flex flex-col gap-6">
            <GlassCard tilt={false} className="p-7 sm:p-9">
              <h3 className="eyebrow">{t.mortgage.results.title}</h3>

              {/* The cash figure leads. A borrower who only sees the loan and
                  the monthly payment walks away believing the deposit is the
                  barrier — it is the deposit PLUS roughly 6% of the price in
                  fees that no lender will finance. */}
              <div className="mt-6 rounded-xl border border-[var(--glass-border-lit)] bg-[var(--accent-wash)] p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 text-[var(--accent)]">
                    <Wallet size={18} strokeWidth={1.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="eyebrow">{t.mortgage.results.cashRequired}</span>
                    <CountUp
                      formatKey={currency}
                      value={result.cashRequiredAed}
                      format={money}
                      className="figure mt-2 block text-[32px] font-bold leading-none text-[var(--accent)] sm:text-[40px]"
                    />
                    <p className="mt-2.5 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                      {t.mortgage.results.cashNote}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-7 grid gap-6 sm:grid-cols-2">
                <div>
                  <span className="eyebrow">{t.mortgage.results.maxLtv}</span>
                  <CountUp
                    formatKey={currency}
                    value={result.maxLtv * 100}
                    format={(v) => `${Math.round(v)}%`}
                    className="figure mt-2 block text-[26px] font-semibold leading-none text-[var(--text-primary)]"
                  />
                </div>
                <div className="sm:text-end">
                  <span className="eyebrow">{t.mortgage.results.monthly}</span>
                  <CountUp
                    formatKey={currency}
                    value={result.monthlyPaymentAed}
                    format={money}
                    className="figure mt-2 block text-[26px] font-semibold leading-none text-[var(--text-primary)]"
                  />
                </div>
              </div>

              <dl className="mt-7 space-y-2.5 border-t border-[var(--hairline)] pt-6">
                <Row label={t.mortgage.results.loan} value={result.loanAed} />
                <Row label={t.mortgage.results.deposit} value={result.depositAed} />
                <Row
                  label={t.mortgage.results.insurance}
                  value={result.insuranceMonthlyAed}
                />
                <Row
                  label={t.mortgage.results.totalInterest}
                  value={result.totalInterestAed}
                />
              </dl>
            </GlassCard>

            {/* ---------- non-financeable costs ---------- */}
            <GlassCard tilt={false} className="p-7 sm:p-9">
              <h3 className="display-3 text-[var(--text-primary)]">{t.mortgage.fees.title}</h3>
              <dl className="mt-6 space-y-2.5">
                <Row label={t.mortgage.fees.dldTransfer} value={result.fees.dldTransfer} />
                <Row label={t.mortgage.fees.agency} value={result.fees.agency} />
                <Row label={t.mortgage.fees.trustee} value={result.fees.trustee} />
                <Row
                  label={t.mortgage.fees.mortgageRegistration}
                  value={result.fees.mortgageRegistration}
                />
                <Row
                  label={t.mortgage.fees.bankArrangement}
                  value={result.fees.bankArrangement}
                />
                <Row label={t.mortgage.fees.valuation} value={result.fees.valuation} />
              </dl>
              <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-[var(--hairline)] pt-4">
                <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                  {t.mortgage.fees.total}
                </span>
                <CountUp
                  formatKey={currency}
                  value={result.fees.total}
                  format={money}
                  className="figure text-[17px] font-bold text-[var(--accent)]"
                />
              </div>
              <p className="figure mt-1.5 text-end text-[12px] text-[var(--text-muted)]">
                {((result.fees.total / Math.max(1, price)) * 100).toFixed(1)}%
              </p>
            </GlassCard>

            {income > 0 && <AffordabilityCard result={result} />}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start gap-3">
          <Button variant="accent" size="lg" shimmer onClick={handleCta}>
            {t.mortgage.cta}
          </Button>
        </div>

        <p className="mt-12 max-w-[92ch] border-t border-[var(--hairline)] pt-6 text-[12.5px] leading-[1.85] text-[var(--text-muted)]">
          {t.mortgage.disclaimer}
        </p>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   Affordability
   ------------------------------------------------------------------------ */

function AffordabilityCard({
  result,
}: {
  result: ReturnType<typeof calculateMortgage>;
}) {
  const { t, currency } = useSite();
  const a = result.affordability;
  if (!a) return null;

  // The bar is capped at twice the limit so a wildly failing ratio still
  // renders as a bar rather than running off the card.
  const fill = Math.min(1, a.dbr / (MAX_DBR * 2));
  const limitMark = 0.5;

  return (
    <GlassCard tilt={false} className="p-7 sm:p-9">
      <h3 className="display-3 text-[var(--text-primary)]">{t.mortgage.affordability.title}</h3>

      <div className="mt-6 flex items-baseline justify-between gap-4">
        <span className="eyebrow">{t.mortgage.affordability.dbr}</span>
        <CountUp
          formatKey={currency}
          value={a.dbr * 100}
          format={(v) => `${v.toFixed(1)}%`}
          className={[
            "figure text-[24px] font-bold leading-none",
            a.passes ? "text-[var(--accent)]" : "text-[var(--text-primary)]",
          ].join(" ")}
        />
      </div>

      <div className="relative mt-4 h-1.5 rounded-full bg-[var(--surface-sunken)] ring-1 ring-inset ring-[var(--hairline)]">
        <motion.div
          className={[
            "absolute inset-y-0 start-0 rounded-full",
            a.passes ? "bg-[var(--accent-dim)]" : "bg-[var(--accent)]",
          ].join(" ")}
          animate={{ width: `${fill * 100}%` }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
        />
        {/* The 50% regulatory line, marked on the track itself — a ratio
            means nothing without the ceiling drawn next to it. */}
        <div
          className="absolute top-1/2 h-3.5 w-0.5 -translate-y-1/2 bg-[var(--text-primary)]"
          style={{ insetInlineStart: `${limitMark * 100}%` }}
        />
      </div>
      <p className="figure mt-2 text-[10.5px] text-[var(--text-muted)]">
        {t.mortgage.affordability.dbrNote}
      </p>

      <div
        className={[
          "mt-6 flex items-start gap-3 rounded-xl border p-4",
          a.passes
            ? "border-[var(--hairline)] bg-[var(--surface-sunken)]"
            : "border-[var(--glass-border-lit)] bg-[var(--accent-wash)]",
        ].join(" ")}
      >
        <span
          className={`mt-0.5 shrink-0 ${a.passes ? "text-[var(--text-muted)]" : "text-[var(--accent)]"}`}
        >
          {a.passes ? (
            <ShieldCheck size={18} strokeWidth={1.5} />
          ) : (
            <TriangleAlert size={18} strokeWidth={1.5} />
          )}
        </span>
        <span className="text-[13.5px] leading-relaxed text-[var(--text-primary)]">
          {a.passes ? t.mortgage.affordability.passes : t.mortgage.affordability.fails}
        </span>
      </div>

      <div className="mt-6 flex items-baseline justify-between gap-4 border-t border-[var(--hairline)] pt-5">
        <span className="text-[13.5px] text-[var(--text-muted)]">
          {t.mortgage.affordability.maxPrice}
        </span>
        <CountUp
          formatKey={currency}
          value={a.maxPriceAed}
          format={(v) => formatCurrency(v, currency)}
          className="figure text-[17px] font-bold text-[var(--accent)]"
        />
      </div>
    </GlassCard>
  );
}

/* ---------------------------------------------------------------------------
   Shared bits
   ------------------------------------------------------------------------ */

function OptionGroup<T extends string>({
  label,
  layoutId,
  value,
  onChange,
  options,
}: {
  label: string;
  layoutId: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; desc: string }[];
}) {
  return (
    <div>
      <span className="eyebrow">{label}</span>
      <div role="tablist" className="mt-4 grid gap-2 sm:grid-cols-3 sm:gap-3">
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(option.value)}
              className={[
                "relative rounded-xl border px-4 py-3.5 text-start transition-colors duration-400",
                active
                  ? "border-[var(--glass-border-lit)] text-[var(--text-primary)]"
                  : "border-[var(--hairline)] text-[var(--text-muted)] hover:border-[var(--hairline-strong)]",
              ].join(" ")}
            >
              {active && (
                <motion.span
                  layoutId={layoutId}
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  className="absolute inset-0 rounded-xl bg-[var(--accent-wash)]"
                />
              )}
              <span className="relative block text-[14px] font-semibold">{option.label}</span>
              <span className="relative mt-0.5 block text-[12px] text-[var(--text-muted)]">
                {option.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  const { currency } = useSite();
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[13.5px] text-[var(--text-muted)]">{label}</dt>
      <dd className="figure text-[13.5px] text-[var(--text-secondary)]">
        {formatCurrency(value, currency)}
      </dd>
    </div>
  );
}
