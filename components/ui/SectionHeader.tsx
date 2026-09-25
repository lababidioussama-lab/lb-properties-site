"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { emphasize } from "@/lib/i18n/emphasis";

type Align = "start" | "center";
/**
 * `split` sets the deck in a second column beside the title instead of
 * beneath it. It exists purely so that consecutive sections do not all open
 * with the same stacked eyebrow/title/deck silhouette — the page was
 * legible before but read as one uniform column.
 */
type Variant = "stacked" | "split";

interface SectionHeaderProps {
  eyebrow: string;
  title: ReactNode;
  subtitle?: string;
  align?: Align;
  variant?: Variant;
  /** Large ordinal set beside the eyebrow, e.g. "01". */
  index?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "start",
  variant = "stacked",
  index,
}: SectionHeaderProps) {
  const reduceMotion = useReducedMotion();
  const centered = align === "center";
  const split = variant === "split" && !centered && Boolean(subtitle);

  const rise = reduceMotion
    ? {}
    : {
        initial: { opacity: 0 },
        whileInView: { opacity: 1 },
        viewport: { once: true, margin: "-80px" },
      };

  // Strings arrive from the dictionaries and may carry [[emphasis]] markers.
  const heading = typeof title === "string" ? emphasize(title) : title;

  const eyebrowRow = (
    <motion.div
      {...rise}
      transition={{ duration: 0.35 }}
      className={`flex items-baseline gap-3 ${centered ? "justify-center" : ""}`}
    >
      {index && (
        <span className="font-[family-name:var(--font-numeric)] text-[11px] font-medium tabular-nums text-[var(--accent)]">
          {index}
        </span>
      )}
      <span className="h-px w-8 self-center bg-[linear-gradient(90deg,transparent,var(--accent))] rtl:bg-[linear-gradient(270deg,transparent,var(--accent))]" />
      <span className="eyebrow">{eyebrow}</span>
    </motion.div>
  );

  const headingEl = (
    <motion.h2
      {...rise}
      transition={{ duration: 0.35 }}
      className="display-2 mt-5 text-[var(--text-primary)]"
    >
      {heading}
    </motion.h2>
  );

  const deck = subtitle && (
    <motion.p
      {...rise}
      transition={{ duration: 0.35 }}
      className={
        split
          ? "text-[15px] leading-[1.8] text-[var(--text-secondary)]"
          : `mt-6 text-[15px] leading-[1.8] text-[var(--text-secondary)] ${
              centered ? "mx-auto max-w-2xl" : "max-w-[58ch]"
            }`
      }
    >
      {subtitle}
    </motion.p>
  );

  if (split) {
    return (
      <div className="grid gap-x-12 gap-y-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
        <div>
          {eyebrowRow}
          {headingEl}
        </div>
        {/* Optically aligns the deck's last line with the title baseline. */}
        <div className="lg:pb-2">{deck}</div>
      </div>
    );
  }

  return (
    <div className={`max-w-3xl ${centered ? "mx-auto text-center" : ""}`}>
      {eyebrowRow}
      {headingEl}
      {deck}
    </div>
  );
}
