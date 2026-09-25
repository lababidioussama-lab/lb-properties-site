"use client";

import { motion, useReducedMotion } from "motion/react";
import { Sparkles, TrendingUp, Home, Waves } from "lucide-react";

import { useSite } from "@/lib/context/site-context";
import { AREA_BY_ID, TYPICAL_SQFT, type BedroomKey } from "@/lib/dubai-market";
import { formatCurrency } from "@/lib/currency";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

/**
 * Curated community + unit-size pairs, not real listings.
 *
 * Metrolux-style opportunity cards are normally a live inventory feed. We
 * do not have one, so this reads off the same lib/dubai-market.ts table the
 * ROI calculators already use — the same numbers, the same disclaimer,
 * rather than inventing a specific "DAMAC Islands 2" unit that does not
 * exist in our pipeline.
 */
const PICKS: { area: string; bedroom: BedroomKey }[] = [
  { area: "jvc", bedroom: "studio" },
  { area: "businessBay", bedroom: "2bed" },
  { area: "dubaiHills", bedroom: "4bed" },
  { area: "dubaiSouth", bedroom: "studio" },
  { area: "palmJumeirah", bedroom: "3bed" },
  { area: "arabianRanches", bedroom: "4bed" },
];

const GOLDEN_VISA_THRESHOLD = 2_000_000;
const HIGH_YIELD_THRESHOLD = 7;

export function FeaturedOpportunities() {
  const { t, currency, openDrawer } = useSite();
  const reduceMotion = useReducedMotion();

  const cards = PICKS.map(({ area, bedroom }) => {
    const record = AREA_BY_ID.get(area);
    const price = record?.price[bedroom];
    const rent = record?.ltrRent[bedroom];
    if (!record || !price || !rent) return null;
    const yieldPct = Math.round((rent / price) * 1000) / 10;
    return {
      area,
      bedroom,
      price,
      yieldPct,
      sqft: TYPICAL_SQFT[bedroom],
      assetType: record.assetType,
      goldenVisa: price >= GOLDEN_VISA_THRESHOLD,
      highYield: yieldPct >= HIGH_YIELD_THRESHOLD,
      waterfront: area === "palmJumeirah" || area === "emaarBeachfront",
    };
  }).filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <section className="relative border-t border-[var(--hairline)] bg-[var(--surface)] px-5 py-16 sm:py-20 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1320px]">
        <SectionHeader
          eyebrow={t.opportunities.eyebrow}
          title={t.opportunities.title}
          subtitle={t.opportunities.subtitle}
        />

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card, index) => (
            <motion.div
              key={`${card.area}-${card.bedroom}`}
              initial={reduceMotion ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.75, delay: index * 0.07 }}
            >
              <GlassCard className="flex h-full flex-col p-6">
                <div className="flex flex-wrap gap-1.5">
                  {card.goldenVisa && (
                    <Badge icon={Sparkles} label={t.opportunities.badges.goldenVisa} />
                  )}
                  {card.highYield && (
                    <Badge icon={TrendingUp} label={t.opportunities.badges.highYield} />
                  )}
                  {card.assetType === "villa" && (
                    <Badge icon={Home} label={t.opportunities.badges.villa} />
                  )}
                  {card.waterfront && (
                    <Badge icon={Waves} label={t.opportunities.badges.waterfront} />
                  )}
                </div>

                <h3 className="display-3 mt-5 text-[var(--text-primary)]">
                  {t.hubs[card.area as keyof typeof t.hubs]}
                </h3>
                <p className="mt-1 text-[13.5px] text-[var(--text-muted)]">
                  {t.bedrooms[card.bedroom]} · {card.sqft.toLocaleString()} sq ft
                </p>

                <div className="mt-6 flex items-end justify-between border-t border-[var(--hairline)] pt-5">
                  <div>
                    <span className="eyebrow">{t.opportunities.from}</span>
                    <p className="figure mt-1.5 text-[19px] font-semibold text-[var(--text-primary)]">
                      {formatCurrency(card.price, currency, { compact: true })}
                    </p>
                  </div>
                  <div className="text-end">
                    <span className="eyebrow">{t.opportunities.grossYield}</span>
                    <p className="figure mt-1.5 text-[19px] font-semibold text-[var(--accent)]">
                      {card.yieldPct}%
                    </p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Button variant="accent" size="lg" onClick={() => openDrawer("advisory")}>
            {t.opportunities.cta}
          </Button>
        </div>

        <p className="mt-8 max-w-[92ch] text-[12.5px] leading-[1.85] text-[var(--text-muted)]">
          {t.opportunities.disclaimer}
        </p>
      </div>
    </section>
  );
}

function Badge({ icon: Icon, label }: { icon: typeof Sparkles; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-border-lit)] bg-[var(--accent-wash)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--accent)]">
      <Icon size={11} strokeWidth={2} />
      {label}
    </span>
  );
}
