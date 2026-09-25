"use client";

import { motion, useReducedMotion } from "motion/react";
import { Check, Minus } from "lucide-react";
import { useSite } from "@/lib/context/site-context";
import { SectionHeader } from "@/components/ui/SectionHeader";

/**
 * Dubai against the cities international buyers actually compare it to.
 *
 * Yields are broad citywide residential ranges and tax treatment is the
 * headline position only — both are labelled as such underneath, because a
 * comparison table is exactly the kind of component that gets screenshotted
 * out of context.
 */
const ROWS = [
  { city: "dubai", yield: [5.5, 8.5], tax: "0%", freehold: "yes", highlight: true },
  { city: "london", yield: [3.0, 4.5], tax: "20–45%", freehold: "yes" },
  { city: "newYork", yield: [2.5, 4.0], tax: "10–37%", freehold: "yes" },
  { city: "singapore", yield: [2.5, 3.5], tax: "0–24%", freehold: "limited" },
  { city: "hongKong", yield: [2.0, 3.0], tax: "15%", freehold: "limited" },
] as const;

export function WhyDubai() {
  const { t } = useSite();
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative border-t border-[var(--hairline)] bg-[var(--surface-sunken)] px-5 py-16 sm:py-20 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-[1440px]">
        <SectionHeader
          eyebrow={t.whyDubai.eyebrow}
          title={t.whyDubai.title}
          subtitle={t.whyDubai.subtitle}
          variant="split"
        />

        {/* The table is wide by nature — it scrolls inside itself so the page
            body never scrolls sideways on a phone. */}
        <div className="scroll-x no-scrollbar mt-12 -mx-5 px-5 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[620px] border-collapse text-start">
            <thead>
              <tr className="border-b border-[var(--hairline-strong)]">
                <th className="eyebrow py-4 text-start font-normal">{t.whyDubai.city}</th>
                <th className="eyebrow py-4 text-end font-normal">{t.whyDubai.yield}</th>
                <th className="eyebrow py-4 text-end font-normal">{t.whyDubai.tax}</th>
                <th className="eyebrow py-4 text-end font-normal">{t.whyDubai.ownership}</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, index) => {
                const highlight = "highlight" in row && row.highlight;
                return (
                  <motion.tr
                    key={row.city}
                    initial={reduceMotion ? false : { opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.75, delay: index * 0.06 }}
                    className={[
                      "border-b border-[var(--hairline)]",
                      highlight ? "bg-[var(--accent-wash)]" : "",
                    ].join(" ")}
                  >
                    <td className="py-4 ps-3">
                      <span
                        className={`text-[14px] ${
                          highlight
                            ? "font-semibold text-[var(--accent)]"
                            : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {t.whyDubai.cities[row.city]}
                      </span>
                    </td>
                    <td
                      className={`figure py-4 text-end text-[14px] ${
                        highlight
                          ? "font-semibold text-[var(--accent)]"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {row.yield[0]}–{row.yield[1]}%
                    </td>
                    <td
                      className={`figure py-4 text-end text-[14px] ${
                        highlight
                          ? "font-semibold text-[var(--accent)]"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {row.tax}
                    </td>
                    <td className="py-4 pe-3 text-end">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[12.5px] ${
                          row.freehold === "yes"
                            ? "text-[var(--text-secondary)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {row.freehold === "yes" ? (
                          <Check size={14} strokeWidth={1.5} />
                        ) : (
                          <Minus size={14} strokeWidth={1.5} />
                        )}
                        {row.freehold === "yes" ? t.whyDubai.yes : t.whyDubai.limited}
                      </span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-6 max-w-[92ch] text-[11.5px] leading-[1.85] text-[var(--text-muted)]">
          {t.whyDubai.note}
        </p>
      </div>
    </section>
  );
}
