"use client";

import { motion } from "motion/react";
import { useSite } from "@/lib/context/site-context";
import { CURRENCY_CODES } from "@/lib/currency";

export function CurrencyToggle() {
  const { currency, setCurrency, t } = useSite();

  return (
    <div
      role="group"
      aria-label={t.utility.currency}
      className="flex items-center rounded-full border border-[var(--hairline)] p-0.5"
    >
      {CURRENCY_CODES.map((code) => {
        const active = code === currency;
        return (
          <button
            key={code}
            onClick={() => setCurrency(code)}
            aria-pressed={active}
            className={[
              "relative rounded-full px-2.5 py-1.5 font-[family-name:var(--font-eyebrow)] text-[10px] font-semibold tracking-[0.1em] transition-colors duration-300",
              active ? "!text-white" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]",
            ].join(" ")}
          >
            {active && (
              // layoutId makes the gold pill slide between positions rather
              // than cross-fade, which is what sells it as one object.
              <motion.span
                layoutId="currency-pill"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="accent-fill absolute inset-0 rounded-full"
              />
            )}
            <span className="relative">{code}</span>
          </button>
        );
      })}
    </div>
  );
}
