"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

import { useSite } from "@/lib/context/site-context";
import { SECTION_IDS } from "@/lib/site-config";

import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Building2, Waves, Stamp, ShieldCheck } from "lucide-react";

const CAPABILITIES = [
  { id: "extensions", icon: Building2 },
  { id: "pools", icon: Waves },
  { id: "permits", icon: Stamp },
] as const;

const STEPS = ["design", "submission", "noc", "build", "handover"] as const;

export function ConstructionPermits() {
  const { t, openDrawer } = useSite();
  const reduceMotion = useReducedMotion();
  const stepperRef = useRef<HTMLDivElement>(null);

  // The stepper fills as the section crosses the viewport, so the progress
  // bar is literally the reader's own progress through the process.
  const { scrollYProgress } = useScroll({
    target: stepperRef,
    offset: ["start 0.85", "end 0.55"],
  });
  const fillWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section
      id={SECTION_IDS.construction}
      className="relative scroll-mt-24 overflow-hidden border-t border-[var(--hairline)] bg-[var(--surface)] px-5 py-16 sm:py-20 sm:px-8 lg:py-24"
    >
      <div className="blueprint-grid pointer-events-none absolute inset-0" aria-hidden="true" />

      <div className="relative mx-auto max-w-[1440px]">
        <SectionHeader
          eyebrow={t.construction.eyebrow}
          title={t.construction.title}
          subtitle={t.construction.subtitle}
        />

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {CAPABILITIES.map((cap, index) => {
            const Icon = cap.icon;
            const copy = t.construction.capabilities[cap.id];
            return (
              <motion.div
                key={cap.id}
                initial={reduceMotion ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.75, delay: index * 0.09, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <GlassCard className="h-full p-7 sm:p-8">
                  <span className="grid h-12 w-12 place-items-center rounded-xl border border-[var(--glass-border-lit)] bg-[var(--accent-wash)] text-[var(--accent)]">
                    <Icon size={22} strokeWidth={1.5} />
                  </span>
                  <h3 className="display-3 mt-6 text-[var(--text-primary)]">{copy.title}</h3>
                  <p className="mt-3.5 text-[13.5px] leading-[1.8] text-[var(--text-secondary)]">
                    {copy.desc}
                  </p>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        {/* ---------- permit journey ---------- */}
        <div ref={stepperRef} className="mt-20">
          <h3 className="eyebrow">{t.construction.stepperTitle}</h3>

          {/* Wide content scrolls inside its own container so the page body
              never scrolls sideways on a phone. */}
          <div className="scroll-x no-scrollbar mt-8 -mx-5 px-5 sm:mx-0 sm:px-0">
            <div className="relative min-w-[720px] pb-2">
              <div className="absolute inset-x-0 top-[15px] h-px bg-[var(--hairline-strong)]" />
              <motion.div
                style={{ width: reduceMotion ? "100%" : fillWidth }}
                className="absolute start-0 top-[15px] h-px bg-[var(--accent)]"
              />

              <ol className="relative grid grid-cols-5 gap-4">
                {STEPS.map((step, index) => {
                  const copy = t.construction.steps[step];
                  return (
                    <li key={step}>
                      <motion.span
                        initial={reduceMotion ? false : { opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        viewport={{ once: true, margin: "-120px" }}
                        transition={{ duration: 0.75, delay: index * 0.12 }}
                        className="relative grid h-8 w-8 place-items-center rounded-full border border-[var(--glass-border-lit)] bg-[var(--surface)]"
                      >
                        <span className="figure font-[family-name:var(--font-eyebrow)] text-[10px] font-bold text-[var(--accent)]">
                          {index + 1}
                        </span>
                      </motion.span>
                      <h4 className="mt-4 text-[13px] font-semibold text-[var(--text-primary)]">
                        {copy.title}
                      </h4>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-[var(--text-muted)]">
                        {copy.desc}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>

        {/* ---------- trust banner ---------- */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.75, ease: [0.2, 0.8, 0.2, 1] }}
          className="lit-edge mt-20 rounded-2xl border border-[var(--glass-border-lit)] bg-[var(--accent-wash)] p-8 text-center sm:p-12"
        >
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-[var(--glass-border-lit)] text-[var(--accent)]">
            <ShieldCheck size={26} strokeWidth={1.5} />
          </span>
          <p className="display-3 mx-auto mt-6 max-w-[26ch] text-[var(--text-primary)]">
            {t.construction.trustBanner}
          </p>
          <p className="mx-auto mt-4 max-w-[62ch] text-[13px] leading-[1.8] text-[var(--text-secondary)]">
            {t.construction.trustSub}
          </p>
          <div className="mt-8 flex justify-center">
            <Button variant="accent" size="lg" onClick={() => openDrawer("construction")}>
              {t.construction.cta}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
