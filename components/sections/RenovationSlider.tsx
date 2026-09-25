"use client";

import { useCallback, useState, type KeyboardEvent } from "react";
import { motion, useReducedMotion } from "motion/react";

import { useSite } from "@/lib/context/site-context";
import { SECTION_IDS } from "@/lib/site-config";
import { useDragFraction, keyboardStepFor } from "@/lib/use-drag-fraction";

import { Check, Upload } from "lucide-react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { RoomScene, MATERIALS, type MaterialKey } from "./RoomScene";

const PACKAGES = ["investor", "villa"] as const;
const MATERIAL_KEYS: MaterialKey[] = ["marble", "oak", "microcement", "brass"];

export function RenovationSlider() {
  const { t, rtl, openDrawer, updateSelections } = useSite();
  const reduceMotion = useReducedMotion();
  const [split, setSplit] = useState(0.5);
  const [material, setMaterial] = useState<MaterialKey>("marble");

  const handleFraction = useCallback((fraction: number) => setSplit(fraction), []);
  const { trackRef, dragHandlers } = useDragFraction(handleFraction);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const direction = keyboardStepFor(event.key, rtl);
      if (direction === null) return;
      event.preventDefault();
      setSplit((prev) => Math.min(1, Math.max(0, prev + direction * 0.05)));
    },
    [rtl],
  );

  /* `split` is always "how much AFTER is showing", independent of direction.
     The clip is expressed from the reading start so RTL mirrors for free;
     the handle is positioned the same way. */
  const pct = split * 100;
  const clipAfter = rtl
    ? `inset(0 0 0 ${100 - pct}%)`
    : `inset(0 ${100 - pct}% 0 0)`;

  return (
    <section
      id={SECTION_IDS.fitout}
      className="relative scroll-mt-24 border-t border-[var(--hairline)] bg-[var(--surface-sunken)] px-5 py-16 sm:py-20 sm:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-[1440px]">
        <SectionHeader
          eyebrow={t.fitout.eyebrow}
          title={t.fitout.title}
          subtitle={t.fitout.subtitle}
          variant="split"
        />

        {/* ---------- comparison ---------- */}
        <div className="mt-14 overflow-hidden rounded-2xl border border-[var(--glass-border)] shadow-[var(--shadow-card)]">
          <div
            ref={trackRef}
            {...dragHandlers}
            role="slider"
            tabIndex={0}
            aria-label={t.fitout.dragHint}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pct)}
            aria-valuetext={`${Math.round(pct)}% ${t.fitout.after}`}
            onKeyDown={handleKeyDown}
            className="grab-handle relative aspect-[16/10] w-full cursor-ew-resize select-none sm:aspect-[2/1]"
          >
            {/* BEFORE fills the frame; AFTER is clipped over it. */}
            <div className="absolute inset-0">
              <RoomScene variant="before" idSuffix="before" />
            </div>
            <div className="absolute inset-0" style={{ clipPath: clipAfter }}>
              <RoomScene variant="after" idSuffix="after" material={material} />
            </div>

            {/* labels */}
            <span className="pointer-events-none absolute bottom-4 start-4 rounded-full bg-black/55 px-3.5 py-1.5 font-[family-name:var(--font-eyebrow)] text-[9.5px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
              {t.fitout.before}
            </span>
            <span className="pointer-events-none absolute bottom-4 end-4 rounded-full bg-black/55 px-3.5 py-1.5 font-[family-name:var(--font-eyebrow)] text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-bright)] backdrop-blur-sm">
              {t.fitout.after}
            </span>

            {/* handle */}
            <div
              className="pointer-events-none absolute inset-y-0 w-0"
              style={{ insetInlineStart: `${pct}%` }}
            >
              <span className="absolute inset-y-0 -start-px w-0.5 bg-[linear-gradient(to_bottom,transparent,var(--accent-bright)_12%,var(--accent-bright)_88%,transparent)]" />
              <span className="absolute top-1/2 start-0 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-[var(--accent-bright)]/70 bg-black/45 backdrop-blur-md rtl:translate-x-1/2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-bright)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m9 6-5 6 5 6" />
                  <path d="m15 6 5 6-5 6" />
                </svg>
              </span>
            </div>

            {reduceMotion ? null : (
              <motion.span
                initial={{ opacity: 0 }}
                whileInView={{ opacity: [0, 1, 1, 0] }}
                viewport={{ once: true }}
                transition={{ duration: 3.2, times: [0, 0.15, 0.7, 1], delay: 0.5 }}
                className="pointer-events-none absolute start-1/2 top-6 -translate-x-1/2 rounded-full bg-black/55 px-4 py-2 font-[family-name:var(--font-eyebrow)] text-[9.5px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm rtl:translate-x-1/2"
              >
                {t.fitout.dragHint}
              </motion.span>
            )}
          </div>
        </div>

        {/* ---------- material palette selector ----------
            Chips drive the AFTER room's finish directly, so the choice is a
            live preview rather than a swatch on a page. */}
        <div className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="eyebrow">{t.fitout.materials.title}</h3>
            <p className="max-w-[54ch] text-[12px] text-[var(--text-muted)]">
              {t.fitout.materials.subtitle}
            </p>
          </div>

          <div role="radiogroup" aria-label={t.fitout.materials.title} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MATERIAL_KEYS.map((key) => {
              const active = key === material;
              const copy = t.fitout.materials[key];
              return (
                <button
                  key={key}
                  role="radio"
                  aria-checked={active}
                  onClick={() => {
                    setMaterial(key);
                    setSplit((prev) => (prev < 0.35 ? 0.62 : prev));
                    updateSelections({ fitoutMaterial: copy.name });
                  }}
                  className={[
                    "group relative flex items-start gap-3.5 rounded-xl border p-4 text-start transition-colors duration-400",
                    active
                      ? "border-[var(--glass-border-lit)] bg-[var(--accent-wash)]"
                      : "border-[var(--hairline)] hover:border-[var(--hairline-strong)]",
                  ].join(" ")}
                >
                  <span
                    className="mt-0.5 h-9 w-9 shrink-0 rounded-lg ring-1 ring-inset ring-black/15"
                    style={{ backgroundColor: MATERIALS[key].swatch }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span
                      className={`block text-[13px] font-semibold ${
                        active ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                      }`}
                    >
                      {copy.name}
                    </span>
                    <span className="mt-1 block text-[11.5px] leading-snug text-[var(--text-muted)]">
                      {copy.desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---------- turnkey packages ---------- */}
        <div className="mt-14 grid gap-6 md:grid-cols-2">
          {PACKAGES.map((key, index) => {
            const copy = t.fitout.packages[key];
            return (
              <motion.div
                key={key}
                initial={reduceMotion ? false : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.75, delay: index * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <GlassCard className="flex h-full flex-col p-7 sm:p-9">
                  <span className="eyebrow">{copy.for}</span>
                  <h3 className="display-3 mt-3 text-[var(--text-primary)]">{copy.title}</h3>
                  <p className="mt-3.5 text-[13.5px] leading-[1.8] text-[var(--text-secondary)]">
                    {copy.desc}
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {copy.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="mt-0.5 shrink-0 text-[var(--accent)]">
                          <Check size={15} strokeWidth={1.5} />
                        </span>
                        <span className="text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
                          {item}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-7">
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      onClick={() => openDrawer("fitout", { fitoutPackage: copy.title })}
                    >
                      {t.common.getQuote}
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-col items-start gap-3">
          <Button variant="accent" size="lg" onClick={() => openDrawer("fitout")}>
            <Upload size={16} strokeWidth={1.5} />
            {t.fitout.upload.cta}
          </Button>
          <span className="text-[12px] text-[var(--text-muted)]">{t.fitout.upload.hint}</span>
        </div>
      </div>
    </section>
  );
}
