"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { useSite } from "@/lib/context/site-context";
import { interpolate } from "@/lib/i18n";
import {
  AREAS,
  BEDROOM_KEYS,
  PRICE_DATA,
  TYPICAL_SQFT,
  YIELD_GATE,
  grossYieldBand,
  grossYieldFor,
  pricePerSqft,
  type BedroomKey,
} from "@/lib/dubai-market";
import {
  DUBAI_PRICE_GROWTH,
  DUBAI_RENT_GROWTH,
  DUBAI_YIELD_BENCHMARK,
  MARKET_REFERENCE,
} from "@/lib/market-reference";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";

/**
 * Market data — two charts and a KPI row.
 *
 * Deliberately NOT charted: transaction volume. The registry table loads
 * unevenly (2 sales in one quarter, 16,000 the next) so a volume series
 * would draw a boom that is an artefact of when rows were ingested. The
 * same defect is why appreciation is quoted from an index below rather
 * than computed here. See the PROVENANCE block in lib/dubai-market.ts.
 *
 * Both charts are single-hue: the communities are nominal categories, so
 * colouring each bar by its own value would spend the identity channel
 * re-encoding what bar length already shows. One accent, sorted rows.
 */

type View = "chart" | "table";

export function MarketCharts() {
  const { t, rtl } = useSite();

  // One filter row scopes both charts: it picks the price chart's unit type
  // AND the marker showing where that unit type sits inside each yield band.
  const [bedroom, setBedroom] = useState<BedroomKey>("2bed");
  const [view, setView] = useState<View>("chart");

  const areaLabel = (id: string) => t.hubs[id as keyof typeof t.hubs] ?? id;

  const priceRows = useMemo(
    () =>
      AREAS.map((a) => ({ id: a.id, value: pricePerSqft(a, bedroom) }))
        .filter((r): r is { id: string; value: number } => r.value !== null)
        .sort((a, b) => b.value - a.value),
    [bedroom],
  );

  const yieldRows = useMemo(
    () =>
      AREAS.map((a) => ({
        id: a.id,
        band: grossYieldBand(a),
        marker: grossYieldFor(a, bedroom),
      }))
        .filter((r): r is { id: string; band: [number, number]; marker: number | null } =>
          Boolean(r.band),
        )
        // By the midpoint of the band, so a wide band does not outrank a
        // consistently higher-yielding community on its top end alone.
        .sort((a, b) => (b.band[0] + b.band[1]) / 2 - (a.band[0] + a.band[1]) / 2),
    [bedroom],
  );

  // Round the axis out to a clean number so the ticks are readable.
  const priceMax = useMemo(() => {
    const max = priceRows.reduce((m, r) => Math.max(m, r.value), 0);
    return Math.max(500, Math.ceil(max / 500) * 500);
  }, [priceRows]);

  return (
    <section
      id="market-data"
      className="relative scroll-mt-24 border-t border-[var(--hairline)] bg-[var(--surface-sunken)] px-5 py-16 sm:py-20 sm:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-[1320px]">
        <SectionHeader
          eyebrow={t.market.eyebrow}
          title={t.market.title}
          subtitle={t.market.subtitle}
          variant="split"
        />

        <GrowthTiles />

        {/* ---------- one filter row, above everything it scopes ---------- */}
        <div className="mt-14 flex flex-wrap items-end justify-between gap-x-8 gap-y-5 border-b border-[var(--hairline)] pb-5">
          <div>
            <span className="eyebrow">{t.market.filterLabel}</span>
            <div role="tablist" className="mt-3 flex flex-wrap gap-2">
              {BEDROOM_KEYS.map((key) => {
                const active = key === bedroom;
                return (
                  <button
                    key={key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setBedroom(key)}
                    className={[
                      "rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors duration-300",
                      active
                        ? "border-[var(--glass-border-lit)] bg-[var(--accent-wash)] text-[var(--text-primary)]"
                        : "border-[var(--hairline)] text-[var(--text-muted)] hover:border-[var(--hairline-strong)]",
                    ].join(" ")}
                  >
                    {t.bedrooms[key]}
                  </button>
                );
              })}
            </div>
          </div>

          <div role="tablist" className="flex gap-2">
            {(["chart", "table"] as View[]).map((option) => {
              const active = option === view;
              return (
                <button
                  key={option}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setView(option)}
                  className={[
                    "rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition-colors duration-300",
                    active
                      ? "border-[var(--glass-border-lit)] bg-[var(--accent-wash)] text-[var(--text-primary)]"
                      : "border-[var(--hairline)] text-[var(--text-muted)] hover:border-[var(--hairline-strong)]",
                  ].join(" ")}
                >
                  {option === "chart" ? t.market.viewChart : t.market.viewTable}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* ---------- price per sq ft ---------- */}
          <ChartCard title={t.market.price.title} subtitle={t.market.price.subtitle}>
            {priceRows.length === 0 ? (
              <Empty label={t.market.price.empty} />
            ) : view === "table" ? (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--hairline)]">
                    <th className="py-2 text-start font-medium text-[var(--text-muted)]">
                      {t.market.table.community}
                    </th>
                    <th className="py-2 text-end font-medium text-[var(--text-muted)]">
                      {t.market.table.perSqft}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {priceRows.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--hairline)]">
                      <td className="py-2 text-[var(--text-secondary)]">
                        {areaLabel(row.id)}
                      </td>
                      <td className="figure py-2 text-end text-[var(--text-primary)]">
                        {Math.round(row.value).toLocaleString("en-US")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <>
                <ul className="space-y-1.5">
                  {priceRows.map((row) => (
                    <li
                      key={row.id}
                      /* On a phone the three-column row left the bar only ~90px
                         to work with, which is too little to compare lengths in.
                         So the name and value take one line and the bar gets the
                         full width beneath; from `sm` up it is one row again. */
                      className="group grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1 sm:grid-cols-[9.5rem_1fr_3.6rem] sm:gap-y-0"
                    >
                      <span className="order-1 truncate text-[12.5px] text-[var(--text-secondary)]">
                        {areaLabel(row.id)}
                      </span>
                      <span className="order-3 col-span-2 relative block h-3.5 sm:order-2 sm:col-span-1">
                        <span
                          className="absolute inset-y-0 start-0 rounded-e-[4px] bg-[var(--accent)] opacity-85 transition-opacity duration-300 group-hover:opacity-100"
                          style={{ width: `${(row.value / priceMax) * 100}%` }}
                        />
                      </span>
                      <span className="order-2 figure text-end text-[12px] text-[var(--text-muted)] sm:order-3">
                        {Math.round(row.value).toLocaleString("en-US")}
                      </span>
                    </li>
                  ))}
                </ul>
                <Axis
                  label={t.market.price.axis}
                  ticks={[0, priceMax / 2, priceMax].map((v) =>
                    Math.round(v).toLocaleString("en-US"),
                  )}
                />
              </>
            )}
          </ChartCard>

          {/* ---------- gross yield band ---------- */}
          <ChartCard title={t.market.yieldChart.title} subtitle={t.market.yieldChart.subtitle}>
            {yieldRows.length === 0 ? (
              <Empty label={t.market.yieldChart.empty} />
            ) : view === "table" ? (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--hairline)]">
                    <th className="py-2 text-start font-medium text-[var(--text-muted)]">
                      {t.market.table.community}
                    </th>
                    <th className="py-2 text-end font-medium text-[var(--text-muted)]">
                      {t.market.table.lowest}
                    </th>
                    <th className="py-2 text-end font-medium text-[var(--text-muted)]">
                      {t.market.table.highest}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {yieldRows.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--hairline)]">
                      <td className="py-2 text-[var(--text-secondary)]">
                        {areaLabel(row.id)}
                      </td>
                      <td className="figure py-2 text-end text-[var(--text-primary)]">
                        {row.band[0].toFixed(1)}%
                      </td>
                      <td className="figure py-2 text-end text-[var(--text-primary)]">
                        {row.band[1].toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <>
                <YieldBenchmarkKey />
                <div className="relative">
                  {/* The REIDIN citywide figure, drawn across the plot. A
                      community band means little without the benchmark it is
                      being judged against sitting on the same scale.

                      Rendered as an overlay repeating the row grid rather than
                      offset with calc(): the line then lands in the plot column
                      by construction, in both reading directions.

                      Desktop only. On a phone the rows stack, so a single line
                      down the card would no longer sit over the bars — the key
                      above the chart carries the benchmark figure there. */}
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 hidden gap-2.5 sm:grid sm:grid-cols-[9.5rem_1fr_3.6rem]"
                  >
                    <span />
                    <span className="relative">
                      <span
                        className="absolute inset-y-0 w-px bg-[var(--text-muted)] opacity-45"
                        style={{
                          insetInlineStart: `${scale(
                            DUBAI_YIELD_BENCHMARK.allResidentialPct,
                          )}%`,
                        }}
                      />
                    </span>
                    <span />
                  </div>
                  <ul className="space-y-1.5">
                  {yieldRows.map((row) => {
                    const [low, high] = row.band;
                    return (
                      <li
                        key={row.id}
                        className="group grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1 sm:grid-cols-[9.5rem_1fr_3.6rem] sm:gap-y-0"
                      >
                        <span className="order-1 truncate text-[12.5px] text-[var(--text-secondary)]">
                          {areaLabel(row.id)}
                        </span>
                        <span className="order-3 col-span-2 relative block h-3.5 sm:order-2 sm:col-span-1">
                          <span
                            className="absolute inset-y-0 rounded-[4px] bg-[var(--accent)] opacity-85 transition-opacity duration-300 group-hover:opacity-100"
                            style={{
                              insetInlineStart: `${scale(low)}%`,
                              width: `${Math.max(1.5, scale(high) - scale(low))}%`,
                            }}
                          />
                          {/* Where the filtered unit type sits in the band —
                              a 2px surface ring keeps it legible on the fill. */}
                          {row.marker !== null && (
                            <span
                              className="absolute top-1/2 h-2.5 w-2.5 rounded-full bg-[var(--surface-raised)] ring-2 ring-[var(--accent)]"
                              style={{
                                insetInlineStart: `${scale(row.marker)}%`,
                                // insetInlineStart already mirrors; the centring
                                // nudge has to mirror with it or the dot sits a
                                // full diameter off in Arabic.
                                translate: `${rtl ? "50%" : "-50%"} -50%`,
                              }}
                            />
                          )}
                        </span>
                        <span className="order-2 figure text-end text-[12px] text-[var(--text-muted)] sm:order-3">
                          {low.toFixed(1)}–{high.toFixed(1)}
                        </span>
                      </li>
                    );
                  })}
                  </ul>
                </div>
                <Axis
                  label={t.market.yieldChart.axis}
                  ticks={[
                    `${YIELD_GATE[0]}%`,
                    `${(YIELD_GATE[0] + YIELD_GATE[1]) / 2}%`,
                    `${YIELD_GATE[1]}%`,
                  ]}
                />
              </>
            )}
          </ChartCard>
        </div>

        <ProvenanceNotes />
      </div>
    </section>
  );
}

/** Position on the yield axis, which runs across the publishable gate
    rather than from zero — these are range marks, not magnitude bars. */
function scale(pct: number): number {
  const [min, max] = YIELD_GATE;
  return ((pct - min) / (max - min)) * 100;
}

/* ---------------------------------------------------------------------------
   KPI row
   ------------------------------------------------------------------------ */

function GrowthTiles() {
  const { t } = useSite();

  const tiles = [
    {
      label: t.market.growth.nominal,
      value: `${DUBAI_PRICE_GROWTH.nominalYoYPct.toFixed(2)}%`,
      delta: DUBAI_PRICE_GROWTH.nominalYoYPct,
      note: t.market.growth.nominalNote,
    },
    {
      label: t.market.growth.real,
      value: `${DUBAI_PRICE_GROWTH.realYoYPct.toFixed(1)}%`,
      delta: DUBAI_PRICE_GROWTH.realYoYPct,
      note: t.market.growth.realNote,
    },
    {
      label: t.market.growth.ready,
      value: DUBAI_PRICE_GROWTH.readyAedPerSqft.toLocaleString("en-US"),
      unit: t.market.growth.perSqft,
      delta: DUBAI_PRICE_GROWTH.readyYoYPct,
      note: t.market.growth.readyNote,
    },
    {
      label: t.market.growth.offPlan,
      value: DUBAI_PRICE_GROWTH.offPlanAedPerSqft.toLocaleString("en-US"),
      unit: t.market.growth.perSqft,
      delta: DUBAI_PRICE_GROWTH.offPlanYoYPct,
      note: t.market.growth.offPlanNote,
    },
    {
      label: t.market.growth.rents,
      value: `${DUBAI_RENT_GROWTH.allResidentialYoYPct.toFixed(1)}%`,
      delta: DUBAI_RENT_GROWTH.allResidentialYoYPct,
      note: t.market.growth.rentsNote,
    },
    {
      label: t.market.growth.villaRents,
      value: `${DUBAI_RENT_GROWTH.villasYoYPct.toFixed(1)}%`,
      delta: DUBAI_RENT_GROWTH.villasYoYPct,
      note: t.market.growth.villaRentsNote,
    },
  ];

  return (
    <div className="mt-12">
      <h3 className="display-3 text-[var(--text-primary)]">{t.market.growth.title}</h3>
      <p className="mt-4 max-w-[70ch] text-[14px] leading-[1.8] text-[var(--text-secondary)]">
        {t.market.growth.subtitle}
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((tile) => {
          const up = tile.delta >= 0;
          const Arrow = up ? ArrowUpRight : ArrowDownRight;
          return (
            <div
              key={tile.label}
              className="rounded-xl border border-[var(--hairline)] bg-[var(--surface-raised)] p-5"
            >
              <span className="eyebrow">{tile.label}</span>
              {/* Proportional figures, not tabular: these are standalone
                  display numbers, not a column that has to align. */}
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="font-[family-name:var(--font-body)] text-[30px] font-bold leading-none tracking-[-0.02em] text-[var(--accent)]">
                  {up ? "" : "−"}
                  {tile.value.replace("-", "")}
                </span>
                {tile.unit && (
                  <span className="text-[12px] text-[var(--text-muted)]">{tile.unit}</span>
                )}
                <span className="ms-auto shrink-0 text-[var(--text-muted)]">
                  <Arrow size={16} strokeWidth={1.5} aria-hidden="true" />
                </span>
              </div>
              <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
                {tile.note}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Chrome
   ------------------------------------------------------------------------ */

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <GlassCard tilt={false} glow={false} className="p-6 sm:p-8">
      <h3 className="display-3 text-[var(--text-primary)]">{title}</h3>
      <p className="mt-3 text-[13px] leading-[1.75] text-[var(--text-muted)]">{subtitle}</p>
      <div className="mt-7">{children}</div>
    </GlassCard>
  );
}

/** Axis ticks sit below the rows, inside the card, so the labels are never
    the thing that gets clipped by a fixed height. */
function Axis({ label, ticks }: { label: string; ticks: string[] }) {
  return (
    <div className="mt-4 border-t border-[var(--hairline)] pt-2.5">
      <div className="grid grid-cols-[7.5rem_1fr_3.4rem] gap-2.5 sm:grid-cols-[9.5rem_1fr_3.6rem]">
        <span />
        <span className="figure flex justify-between text-[10px] text-[var(--text-muted)]">
          {ticks.map((tick) => (
            <span key={tick}>{tick}</span>
          ))}
        </span>
        <span />
      </div>
      <p className="eyebrow mt-3">{label}</p>
    </div>
  );
}

function YieldBenchmarkKey() {
  const { t } = useSite();
  return (
    <p className="mb-4 flex items-center gap-2 text-[12px] text-[var(--text-muted)]">
      <span aria-hidden="true" className="h-3 w-px bg-[var(--text-muted)] opacity-45" />
      {t.market.yieldChart.benchmark}: {DUBAI_YIELD_BENCHMARK.allResidentialPct}%
    </p>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <p className="py-10 text-center text-[13.5px] text-[var(--text-muted)]">{label}</p>
  );
}

function ProvenanceNotes() {
  const { t } = useSite();
  return (
    <div className="mt-12 border-t border-[var(--hairline)] pt-6">
      <h4 className="eyebrow">{t.market.notes.title}</h4>
      <div className="mt-4 grid gap-5 text-[12.5px] leading-[1.85] text-[var(--text-muted)] lg:grid-cols-2">
        <p>
          {interpolate(t.market.notes.prices, {
            from: PRICE_DATA.registrationsFrom,
            to: PRICE_DATA.latestRegistration,
            min: PRICE_DATA.minSalesPerCell,
            dld: PRICE_DATA.dldBackedCells,
            total: PRICE_DATA.totalCells,
          })}
        </p>
        <p>{t.market.notes.rents}</p>
      </div>
      <p className="mt-5 text-[12.5px] leading-[1.85] text-[var(--text-muted)]">
        {interpolate(t.market.notes.reference, {
          source: MARKET_REFERENCE.source,
          asOf: MARKET_REFERENCE.asOf,
          reviewBy: MARKET_REFERENCE.reviewBy,
        })}
      </p>
      {/* TYPICAL_SQFT is the price chart's denominator; naming it here means
          the reader can reproduce the arithmetic rather than trust it. */}
      <p className="figure mt-3 text-[10.5px] text-[var(--text-muted)]">
        {BEDROOM_KEYS.map((k) => `${t.bedrooms[k]} ${TYPICAL_SQFT[k]}`).join(" · ")} ·{" "}
        {t.market.price.axis}
      </p>
    </div>
  );
}
