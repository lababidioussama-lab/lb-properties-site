"use client";

import { motion, useReducedMotion } from "motion/react";
import { BookOpen, KeyRound, BarChart3 } from "lucide-react";
import { useSite } from "@/lib/context/site-context";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";

/**
 * Lead-magnet cards. Unlike Metrolux's instant PDF downloads, these open the
 * WhatsApp lead drawer — we do not have four ready-made PDF guides sitting
 * on a server, so "instant download" would be a broken promise. Routing to
 * a real human on WhatsApp is the honest version of the same funnel.
 */
const ITEMS = [
  { id: "investmentGuide", icon: BookOpen },
  { id: "goldenVisaGuide", icon: KeyRound },
  { id: "yieldReport", icon: BarChart3 },
] as const;

export function ResourceLibrary() {
  const { t, openDrawer } = useSite();
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative border-t border-[var(--hairline)] bg-[var(--surface)] px-5 py-16 sm:py-20 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1320px]">
        <SectionHeader
          eyebrow={t.resources.eyebrow}
          title={t.resources.title}
          subtitle={t.resources.subtitle}
          variant="split"
        />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {ITEMS.map((res, index) => {
            const Icon = res.icon;
            const copy = t.resources.items[res.id];
            return (
              <motion.div
                key={res.id}
                initial={reduceMotion ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.75, delay: index * 0.08 }}
              >
                <GlassCard className="flex h-full flex-col p-7">
                  <span className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--glass-border-lit)] bg-[var(--accent-wash)] text-[var(--accent)]">
                    <Icon size={20} strokeWidth={1.5} />
                  </span>
                  <h3 className="display-3 mt-5 text-[var(--text-primary)]">{copy.title}</h3>
                  <p className="mt-3 flex-1 text-[14px] leading-[1.75] text-[var(--text-secondary)]">
                    {copy.desc}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-6"
                    onClick={() => openDrawer("advisory")}
                  >
                    {t.resources.cta}
                  </Button>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
