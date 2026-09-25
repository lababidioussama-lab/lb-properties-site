"use client";

import { motion, useReducedMotion } from "motion/react";
import { Quote } from "lucide-react";
import { useSite } from "@/lib/context/site-context";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";

/**
 * SAMPLE CONTENT — the quotes in lib/i18n/*.ts are written, not collected.
 *
 * The section is gated in app/[locale]/page.tsx and does not render in a
 * production build. Attributions describe a client type rather than naming a
 * person, deliberately: inventing a named individual is the part that would
 * be genuinely deceptive.
 *
 * When real quotes arrive, get written permission, replace the dictionary
 * entries, and delete the gate — do not just set ALLOW_SAMPLE_TESTIMONIALS.
 */
const ITEMS = ["one", "two", "three"] as const;

export function Testimonials() {
  const { t } = useSite();
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative border-t border-[var(--hairline)] bg-[var(--surface-sunken)] px-5 py-16 sm:py-20 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1320px]">
        <SectionHeader
          eyebrow={t.testimonials.eyebrow}
          title={t.testimonials.title}
          subtitle={t.testimonials.subtitle}
          align="center"
        />

        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {ITEMS.map((key, index) => {
            const item = t.testimonials.items[key];
            return (
              <motion.div
                key={key}
                initial={reduceMotion ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.75, delay: index * 0.08 }}
              >
                <GlassCard tilt={false} className="flex h-full flex-col p-7">
                  <Quote size={22} strokeWidth={1.5} className="text-[var(--accent)] opacity-60" />
                  <p className="mt-5 flex-1 text-[14.5px] italic leading-[1.8] text-[var(--text-secondary)]">
                    {item.quote}
                  </p>
                  <p className="mt-5 border-t border-[var(--hairline)] pt-4 text-[13px] font-medium text-[var(--text-muted)]">
                    {item.attribution}
                  </p>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
