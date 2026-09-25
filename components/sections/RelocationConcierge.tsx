"use client";

import { motion, useReducedMotion } from "motion/react";

import { useSite } from "@/lib/context/site-context";
import { SECTION_IDS } from "@/lib/site-config";
import { formatCurrency } from "@/lib/currency";
import { RELOCATION_ESTIMATES, type RelocationCardId } from "@/lib/services";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Truck, Plug, KeyRound, Check } from "lucide-react";

const CARDS: { id: RelocationCardId; icon: typeof Truck }[] = [
  { id: "move", icon: Truck },
  { id: "utilities", icon: Plug },
  { id: "handover", icon: KeyRound },
];

export function RelocationConcierge() {
  const { t, currency, openDrawer } = useSite();
  const reduceMotion = useReducedMotion();

  return (
    <section
      id={SECTION_IDS.relocation}
      className="relative scroll-mt-24 border-t border-[var(--hairline)] bg-[var(--surface-sunken)] px-5 py-16 sm:py-20 sm:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-[1320px]">
        <SectionHeader
          eyebrow={t.relocation.eyebrow}
          title={t.relocation.title}
          subtitle={t.relocation.subtitle}
          variant="split"
        />

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {CARDS.map((card, index) => {
            const Icon = card.icon;
            const copy = t.relocation.cards[card.id];
            const estimate = RELOCATION_ESTIMATES[card.id];

            return (
              <motion.div
                key={card.id}
                initial={reduceMotion ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.75, delay: index * 0.09, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <GlassCard className="flex h-full flex-col p-7 sm:p-8">
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-xl border border-[var(--glass-border-lit)] bg-[var(--accent-wash)] text-[var(--accent)]">
                      <Icon size={22} strokeWidth={1.5} />
                    </span>
                    {"tag" in copy && copy.tag && (
                      <span className="rounded-full border border-[var(--glass-border-lit)] px-3 py-1 font-[family-name:var(--font-eyebrow)] text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                        {copy.tag}
                      </span>
                    )}
                  </div>

                  <h3 className="display-3 mt-6 text-[var(--text-primary)]">{copy.title}</h3>
                  <p className="mt-3.5 text-[14.5px] leading-[1.8] text-[var(--text-secondary)]">
                    {copy.desc}
                  </p>

                  <ul className="mt-6 space-y-2.5">
                    {copy.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="mt-0.5 shrink-0 text-[var(--accent)]">
                          <Check size={15} strokeWidth={1.5} />
                        </span>
                        <span className="text-[13.5px] leading-relaxed text-[var(--text-secondary)]">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* An honest band rather than a single figure we could not
                      hold to — the real number depends on volume and access. */}
                  <div className="mt-auto pt-7">
                    <div className="figure flex items-baseline gap-2 border-t border-[var(--hairline)] pt-5">
                      <span className="eyebrow">{t.common.from}</span>
                      <span className="accent-text text-[19px] font-semibold">
                        {formatCurrency(estimate.from, currency)}
                      </span>
                      <span className="text-[12.5px] text-[var(--text-muted)]">
                        – {formatCurrency(estimate.to, currency)}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      className="mt-5"
                      onClick={() =>
                        openDrawer("relocation", { relocationCard: copy.title })
                      }
                    >
                      {t.common.getQuote}
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10">
          <Button variant="accent" size="lg" onClick={() => openDrawer("relocation")}>
            {t.relocation.cta}
          </Button>
        </div>
      </div>
    </section>
  );
}
