"use client";

import { useCallback, type KeyboardEvent } from "react";
import { motion } from "motion/react";
import { useDragFraction, keyboardStepFor } from "@/lib/use-drag-fraction";

interface RangeSliderProps {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  label: string;
  /** Rendered inside the thumb tooltip and announced to assistive tech */
  formatValue: (value: number) => string;
  minLabel?: string;
  maxLabel?: string;
}

/**
 * Built rather than styled over <input type="range"> for two reasons: the
 * native control cannot carry the bronze track treatment and thumb tooltip,
 * and its RTL behaviour is inconsistent across engines — which matters here
 * because Arabic is a first-class locale, not an afterthought.
 *
 * Full ARIA slider semantics and keyboard support are implemented to match
 * what the native element would have given us.
 */
export function RangeSlider({
  value,
  min,
  max,
  step,
  onChange,
  label,
  formatValue,
  minLabel,
  maxLabel,
}: RangeSliderProps) {
  const quantise = useCallback(
    (raw: number) => {
      const stepped = Math.round((raw - min) / step) * step + min;
      return Math.min(max, Math.max(min, stepped));
    },
    [min, max, step],
  );

  const handleFraction = useCallback(
    (fraction: number) => onChange(quantise(min + fraction * (max - min))),
    [min, max, onChange, quantise],
  );

  const { trackRef, dragHandlers, rtl } = useDragFraction(handleFraction);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Home") {
        event.preventDefault();
        onChange(min);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        onChange(max);
        return;
      }
      // A whole-range sweep with arrow keys would take 196 presses at the
      // default step, so PageUp/PageDown jump by a tenth of the range.
      const isPage = event.key === "PageUp" || event.key === "PageDown";
      const direction = isPage
        ? event.key === "PageUp"
          ? 1
          : -1
        : keyboardStepFor(event.key, rtl);
      if (direction === null) return;

      event.preventDefault();
      const magnitude = isPage ? Math.max(step, Math.round((max - min) / 10 / step) * step) : step;
      onChange(quantise(value + direction * magnitude));
    },
    [value, min, max, step, rtl, onChange, quantise],
  );

  const fraction = (value - min) / (max - min);
  const percent = `${fraction * 100}%`;

  return (
    <div className="w-full">
      <div className="mb-7 flex items-end justify-between gap-4">
        <span className="eyebrow">{label}</span>
        <span className="figure display-3 accent-text font-[family-name:var(--font-body)] font-semibold">
          {formatValue(value)}
        </span>
      </div>

      {/* Generous hit area: the visual track is 6px but the grab zone is 40px,
          which is what makes this usable on a phone. */}
      <div
        ref={trackRef}
        {...dragHandlers}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={formatValue(value)}
        aria-orientation="horizontal"
        onKeyDown={handleKeyDown}
        className="grab-handle relative -my-4 flex h-10 w-full cursor-grab items-center active:cursor-grabbing"
      >
        <div className="relative h-1.5 w-full rounded-full bg-[var(--surface-sunken)] ring-1 ring-inset ring-[var(--hairline)]">
          {/* Filled portion. inset-inline-start anchors it to the reading
              start automatically, so RTL needs no special case here. */}
          <motion.div
            className="absolute inset-y-0 start-0 rounded-full bg-[var(--accent)]"
            animate={{ width: percent }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          />
          <motion.div
            className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-[var(--accent)] bg-[var(--surface-raised)] shadow-[0_2px_10px_rgba(0,0,0,0.35),0_0_0_5px_var(--accent-wash)]"
            style={{ insetInlineStart: percent, translateX: rtl ? "50%" : "-50%" }}
            animate={{ insetInlineStart: percent }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <span className="absolute inset-[6px] rounded-full bg-[var(--accent)]" />
          </motion.div>
        </div>
      </div>

      {(minLabel || maxLabel) && (
        <div className="mt-4 flex justify-between">
          <span className="figure text-[11px] text-[var(--text-muted)]">{minLabel}</span>
          <span className="figure text-[11px] text-[var(--text-muted)]">{maxLabel}</span>
        </div>
      )}
    </div>
  );
}
