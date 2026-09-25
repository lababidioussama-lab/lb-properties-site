"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Info, Download, TrendingDown } from "lucide-react";

import { useSite } from "@/lib/context/site-context";
import { SECTION_IDS } from "@/lib/site-config";
import { formatCurrency } from "@/lib/currency";
import { interpolate } from "@/lib/i18n";
import {
  AREAS,
  AREA_BY_ID,
  TYPICAL_SQFT,
  bedroomsFor,
  serviceChargeMid,
  type BedroomKey,
} from "@/lib/dubai-market";
import { calculateSecondaryRoi, defaultsFor, type RoiMode } from "@/lib/secondary-roi";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Select, NumberField } from "@/components/ui/Select";
import { CountUp } from "@/components/ui/CountUp";
import { Button } from "@/components/ui/Button";

const MODES: RoiMode[] = ["longTerm", "shortTerm"];

export function NetRoiEngine() {
  const { t, currency, openDrawer, updateSelections } = useSite();
  const reduceMotion = useReducedMotion();

  const [mode, setMode] = useState<RoiMode>("longTerm");
  const [areaId, setAreaId] = useState("dubaiMarina");
  const [bedroom, setBedroom] = useState<BedroomKey>("1bed");

  // Seeded from the market table, then owned by the user once they type —
  // an empty form would make the tool feel like homework.
  const [price, setPrice] = useState(1_650_000);
  const [sqft, setSqft] = useState(780);
  const [rent, setRent] = useState(102_000);
  const [adr, setAdr] = useState(545);

  const available = useMemo(() => bedroomsFor(areaId, mode), [areaId, mode]);

  useEffect(() => {
    if (!available.includes(bedroom) && available.length > 0) setBedroom(available[0]);
  }, [available, bedroom]);

  // Re-seed whenever the area or size changes: the visitor is asking a new
  // question at that point, and stale figures from the last one would be
  // worse than none.
  useEffect(() => {
    const seed = defaultsFor(areaId, bedroom);
    if (!seed) return;
    setPrice(seed.price);
    setRent(seed.annualRent);
    setAdr(seed.adr);
    setSqft(TYPICAL_SQFT[bedroom]);
  }, [areaId, bedroom]);

  const area = AREA_BY_ID.get(areaId);
  const scPerSqft = area ? serviceChargeMid(area) : 0;
  const occupancy = area?.occupancy ?? 0.75;

  const result = useMemo(
    () =>
      calculateSecondaryRoi({
        mode,
        price: Math.max(1, price),
        sqft: Math.max(1, sqft),
        serviceChargePerSqft: scPerSqft,
        annualRent: rent,
        adr,
        occupancy,
        bedroom,
      }),
    [mode, price, sqft, scPerSqft, rent, adr, occupancy, bedroom],
  );

  const areaLabel = t.hubs[areaId as keyof typeof t.hubs];

  function handleCta() {
    updateSelections({
      roiMode: t.netRoi.modes[mode],
      roiArea: areaLabel,
      roiBedroom: t.bedrooms[bedroom],
      roiPriceAed: price,
      roiNetYieldPct: result.netYieldOnOutlay,
      roiServiceChargeAed: result.serviceChargeAnnual,
    });
    openDrawer("netRoi");
  }

  return (
    <section
      id={SECTION_IDS.netRoi}
      className="relative scroll-mt-24 border-t border-[var(--hairline)] bg-[var(--surface)] px-5 py-16 sm:py-20 sm:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-[1320px]">
        <SectionHeader
          eyebrow={t.netRoi.eyebrow}
          title={t.netRoi.title}
          subtitle={t.netRoi.subtitle}
        />

        {/* ---------- mode switch ---------- */}
        <div className="mt-12">
          <span className="eyebrow">{t.netRoi.modeLabel}</span>
          <div role="tablist" className="mt-4 inline-grid grid-cols-2 gap-2 sm:gap-3">
            {MODES.map((option) => {
              const active = option === mode;
              return (
                <button
                  key={option}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMode(option)}
                  className={[
                    "relative rounded-xl border px-5 py-3.5 text-start transition-colors duration-400",
                    active
                      ? "border-[var(--glass-border-lit)] text-[var(--text-primary)]"
                      : "border-[var(--hairline)] text-[var(--text-muted)] hover:border-[var(--hairline-strong)]",
                  ].join(" ")}
                >
                  {active && (
                    <motion.span
                      layoutId="roi-mode-bg"
                      transition={{ type: "spring", stiffness: 400, damping: 34 }}
                      className="absolute inset-0 rounded-xl bg-[var(--accent-wash)]"
                    />
                  )}
                  <span className="relative block text-[14.5px] font-semibold">
                    {t.netRoi.modes[option]}
                  </span>
                  <span className="relative mt-0.5 block text-[12.5px] text-[var(--text-muted)]">
                    {t.netRoi.modes[`${option}Desc` as keyof typeof t.netRoi.modes]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          {/* ---------- inputs ---------- */}
          <GlassCard tilt={false} className="p-7 sm:p-9">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Select
                  label={t.netRoi.inputs.area}
                  value={areaId}
                  onChange={setAreaId}
                  options={AREAS.map((a) => ({
                    value: a.id,
                    label: t.hubs[a.id as keyof typeof t.hubs],
                  }))}
                />
              </div>
              <Select
                label={t.netRoi.inputs.bedroom}
                value={bedroom}
                onChange={setBedroom}
                options={available.map((k) => ({ value: k, label: t.bedrooms[k] }))}
              />
              <NumberField
                label={t.netRoi.inputs.sqft}
                value={sqft}
                onChange={setSqft}
                unit={t.netRoi.inputs.sqftUnit}
                min={100}
              />
              <div className="sm:col-span-2">
                <NumberField
                  label={t.netRoi.inputs.price}
                  value={price}
                  onChange={setPrice}
                  unit="AED"
                  min={100_000}
                />
              </div>
              {mode === "longTerm" ? (
                <div className="sm:col-span-2">
                  <NumberField
                    label={t.netRoi.inputs.rent}
                    value={rent}
                    onChange={setRent}
                    unit="AED"
                    min={0}
                  />
                </div>
              ) : (
                <div className="sm:col-span-2">
                  <NumberField
                    label={t.netRoi.inputs.adr}
                    value={adr}
                    onChange={setAdr}
                    unit="AED"
                    min={0}
                  />
                  <p className="figure mt-2 text-[12px] text-[var(--text-muted)]">
                    {t.netRoi.inputs.occupancy}: {Math.round(occupancy * 100)}%
                  </p>
                </div>
              )}
            </div>

            {/* ---- capital outlay breakdown ---- */}
            <div className="mt-8 border-t border-[var(--hairline)] pt-6">
              <h4 className="eyebrow">{t.netRoi.outlay.title}</h4>
              <dl className="mt-4 space-y-2.5">
                <Row label={t.netRoi.outlay.price} value={result.costs.price} />
                <Row label={t.netRoi.outlay.dld} value={result.costs.dld} negative />
                <Row label={t.netRoi.outlay.dldAdmin} value={result.costs.dldAdmin} negative />
                <Row label={t.netRoi.outlay.agency} value={result.costs.agency} negative />
                <Row
                  label={t.netRoi.outlay.registration}
                  value={result.costs.registration}
                  negative
                />
                <Row label={t.netRoi.outlay.titleDeed} value={result.costs.titleDeed} negative />
              </dl>
              <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-[var(--hairline)] pt-4">
                <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                  {t.netRoi.outlay.total}
                </span>
                <CountUp formatKey={currency}
                  value={result.costs.totalOutlay}
                  format={(v) => formatCurrency(v, currency)}
                  className="figure text-[17px] font-bold text-[var(--accent)]"
                />
              </div>
              <p className="figure mt-1.5 text-end text-[12px] text-[var(--text-muted)]">
                {interpolate(t.netRoi.outlay.pctNote, {
                  pct: result.costs.feePctOfPrice.toFixed(1),
                })}
              </p>
            </div>
          </GlassCard>

          {/* ---------- results ---------- */}
          <div className="flex flex-col gap-6">
            <GlassCard tilt={false} className="p-7 sm:p-9">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <span className="eyebrow">{t.netRoi.results.netOnOutlay}</span>
                  <CountUp formatKey={currency}
                    value={result.netYieldOnOutlay}
                    format={(v) => `${v.toFixed(2)}%`}
                    className="figure mt-2.5 block text-[38px] font-bold leading-none text-[var(--accent)] sm:text-[46px]"
                  />
                  <span className="mt-2 block text-[12.5px] text-[var(--text-muted)]">
                    {t.netRoi.results.netOnOutlayNote}
                  </span>
                </div>
                <div className="sm:text-end">
                  <span className="eyebrow">{t.netRoi.results.grossOnPrice}</span>
                  <CountUp formatKey={currency}
                    value={result.grossYieldOnPrice}
                    format={(v) => `${v.toFixed(2)}%`}
                    className="figure mt-2.5 block text-[24px] font-semibold leading-none text-[var(--text-secondary)]"
                  />
                  <span className="mt-2 block text-[12.5px] text-[var(--text-muted)]">
                    {t.netRoi.results.grossOnPriceNote}
                  </span>
                </div>
              </div>

              {/* The gap between the advertised number and the real one is
                  the single most useful output here, so it gets its own row. */}
              <div className="mt-7 flex items-center gap-4 rounded-xl border border-[var(--hairline)] bg-[var(--surface-sunken)] p-4">
                <span className="shrink-0 text-[var(--text-muted)]">
                  <TrendingDown size={20} strokeWidth={1.5} />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-[13.5px] font-medium text-[var(--text-primary)]">
                    {t.netRoi.results.gap}
                  </span>
                  <p className="mt-0.5 text-[12.5px] text-[var(--text-muted)]">
                    {t.netRoi.results.gapNote}
                  </p>
                </div>
                <CountUp formatKey={currency}
                  value={result.yieldGap}
                  format={(v) => `${v.toFixed(2)} pp`}
                  className="figure shrink-0 text-[17px] font-bold text-[var(--text-primary)]"
                />
              </div>

              <div className="mt-8 border-t border-[var(--hairline)] pt-6">
                <h4 className="eyebrow">{t.netRoi.income.title}</h4>
                <dl className="mt-4 space-y-2.5">
                  <Row label={t.netRoi.income.gross} value={result.grossAnnual} />
                  <Row
                    label={t.netRoi.income.serviceCharge}
                    value={result.serviceChargeAnnual}
                    negative
                  />
                  <Row
                    label={t.netRoi.income.management}
                    value={result.managementAnnual}
                    negative
                  />
                  {result.utilitiesAnnual > 0 && (
                    <Row label={t.netRoi.income.utilities} value={result.utilitiesAnnual} negative />
                  )}
                  {result.otherAnnual > 0 && (
                    <Row label={t.netRoi.income.other} value={result.otherAnnual} negative />
                  )}
                </dl>
                <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-[var(--hairline)] pt-4">
                  <span className="text-[14px] font-semibold text-[var(--text-primary)]">
                    {t.netRoi.income.net}
                  </span>
                  <CountUp formatKey={currency}
                    value={result.netAnnual}
                    format={(v) => formatCurrency(v, currency)}
                    className="figure text-[17px] font-bold text-[var(--accent)]"
                  />
                </div>
                {result.paybackYears !== null && (
                  <p className="figure mt-2 text-end text-[12px] text-[var(--text-muted)]">
                    {t.netRoi.results.payback} {result.paybackYears.toFixed(1)}{" "}
                    {t.netRoi.results.years}
                  </p>
                )}
              </div>
            </GlassCard>

            <MollakLookup
              areaId={areaId}
              sqft={sqft}
              onAreaChange={setAreaId}
              onSqftChange={setSqft}
            />
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start gap-3">
          <Button variant="accent" size="lg" shimmer onClick={handleCta}>
            <Download size={16} strokeWidth={1.5} />
            {t.netRoi.cta}
          </Button>
          <span className="text-[13px] text-[var(--text-muted)]">{t.netRoi.ctaHint}</span>
        </div>

        <p className="mt-12 max-w-[92ch] border-t border-[var(--hairline)] pt-6 text-[12.5px] leading-[1.85] text-[var(--text-muted)]">
          {t.netRoi.disclaimer}
        </p>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------------------
   RERA Mollak service-charge lookup
   ------------------------------------------------------------------------ */

function MollakLookup({
  areaId,
  sqft,
  onAreaChange,
  onSqftChange,
}: {
  areaId: string;
  sqft: number;
  onAreaChange: (id: string) => void;
  onSqftChange: (value: number) => void;
}) {
  const { t, currency } = useSite();
  const area = AREA_BY_ID.get(areaId);
  if (!area) return null;

  const [low, high] = area.serviceCharge;
  const mid = serviceChargeMid(area);
  const annual = sqft * mid;
  const areaLabel = t.hubs[areaId as keyof typeof t.hubs];

  return (
    <GlassCard tilt={false} className="p-7 sm:p-9">
      <h3 className="display-3 text-[var(--text-primary)]">{t.netRoi.mollak.title}</h3>
      <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--text-muted)]">
        {t.netRoi.mollak.subtitle}
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <Select
          label={t.netRoi.inputs.area}
          value={areaId}
          onChange={onAreaChange}
          options={AREAS.map((a) => ({
            value: a.id,
            label: t.hubs[a.id as keyof typeof t.hubs],
          }))}
        />
        <NumberField
          label={t.netRoi.inputs.sqft}
          value={sqft}
          onChange={onSqftChange}
          unit={t.netRoi.inputs.sqftUnit}
          min={100}
        />
      </div>

      {/* The band as a bar, with the midpoint marked — a range communicates
          the real uncertainty far better than a single fabricated number. */}
      <div className="mt-7">
        <div className="flex items-baseline justify-between">
          <span className="eyebrow">{t.netRoi.mollak.perSqft}</span>
          <span className="figure text-[14px] font-semibold text-[var(--accent)]">
            {low}–{high}
          </span>
        </div>
        <div className="relative mt-3 h-1.5 rounded-full bg-[var(--surface-sunken)] ring-1 ring-inset ring-[var(--hairline)]">
          <div
            className="absolute inset-y-0 rounded-full bg-[var(--accent-dim)]"
            style={{ insetInlineStart: `${(low / 32) * 100}%`, width: `${((high - low) / 32) * 100}%` }}
          />
          <div
            className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-[var(--accent)]"
            style={{ insetInlineStart: `${(mid / 32) * 100}%` }}
          />
        </div>
        <div className="figure mt-2 flex justify-between text-[10px] text-[var(--text-muted)]">
          <span>0</span>
          <span>32 AED / sq ft</span>
        </div>
      </div>

      <div className="mt-7 rounded-xl border border-[var(--glass-border-lit)] bg-[var(--accent-wash)] p-5">
        <span className="eyebrow">{t.netRoi.mollak.annualTotal}</span>
        <CountUp formatKey={currency}
          value={annual}
          format={(v) => formatCurrency(v, currency)}
          className="figure mt-2 block text-[28px] font-bold leading-none text-[var(--accent)]"
        />
        <p className="mt-2 text-[12.5px] text-[var(--text-muted)]">
          {interpolate(t.netRoi.mollak.forArea, {
            sqft: Math.round(sqft).toLocaleString("en-US"),
            area: areaLabel,
          })}
        </p>
      </div>

      <p className="mt-5 flex items-start gap-2.5 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
        <span className="mt-0.5 shrink-0">
          <Info size={14} strokeWidth={1.5} />
        </span>
        {t.netRoi.mollak.caution}
      </p>
    </GlassCard>
  );
}

function Row({
  label,
  value,
  negative,
}: {
  label: string;
  value: number;
  negative?: boolean;
}) {
  const { currency } = useSite();
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-[13.5px] text-[var(--text-muted)]">{label}</dt>
      <dd className="figure text-[13.5px] text-[var(--text-secondary)]">
        {negative ? "−" : ""}
        {formatCurrency(value, currency)}
      </dd>
    </div>
  );
}
