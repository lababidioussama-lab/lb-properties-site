"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";

import { useSite } from "@/lib/context/site-context";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Button } from "@/components/ui/Button";
import { PhoneCall, ListChecks, FileSignature, KeyRound } from "lucide-react";

const STEPS = [
  { id: "discovery", icon: PhoneCall },
  { id: "shortlist", icon: ListChecks },
  { id: "reservation", icon: FileSignature },
  { id: "handover", icon: KeyRound },
] as const;

export function AcquisitionProcess() {
  const { t, openDrawer } = useSite();
  const reduceMotion = useReducedMotion();
  const railRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: railRef,
    offset: ["start 0.85", "end 0.6"],
  });
  const fillWidth = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section className="relative border-t border-[var(--hairline)] bg-[var(--surface-sunken)] px-5 py-16 sm:py-20 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1440px]">
        <SectionHeader
          eyebrow={t.process.eyebrow}
          title={t.process.title}
          subtitle={t.process.subtitle}
          variant="split"
        />

        <div ref={railRef} className="scroll-x no-scrollbar mt-16 -mx-5 px-5 sm:mx-0 sm:px-0">
          <div className="relative min-w-[680px]">
            <div className="absolute inset-x-0 top-[23px] h-px bg-[var(--hairline-strong)]" />
            <motion.div
              style={{ width: reduceMotion ? "100%" : fillWidth }}
              className="absolute start-0 top-[23px] h-px bg-[var(--accent)]"
            />

            <ol className="relative grid grid-cols-4 gap-5">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const copy = t.process.steps[step.id];
                return (
                  <li key={step.id}>
                    <motion.span
                      initial={reduceMotion ? false : { opacity: 0 }}
                      whileInView={{ scale: 1, opacity: 1 }}
                      viewport={{ once: true, margin: "-100px" }}
                      transition={{ duration: 0.75, delay: index * 0.1 }}
                      className="relative grid h-12 w-12 place-items-center rounded-full border border-[var(--glass-border-lit)] bg-[var(--surface-raised)] text-[var(--accent)]"
                    >
                      <Icon size={19} strokeWidth={1.5} />
                    </motion.span>
                    <h4 className="mt-5 text-[13.5px] font-semibold text-[var(--text-primary)]">
                      {copy.title}
                    </h4>
                    <p className="mt-2 max-w-[26ch] text-[12px] leading-[1.7] text-[var(--text-muted)]">
                      {copy.desc}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <div className="mt-14 flex justify-center">
          <Button variant="accent" size="lg" onClick={() => openDrawer("advisory")}>
            {t.process.cta}
          </Button>
        </div>
      </div>
    </section>
  );
}
