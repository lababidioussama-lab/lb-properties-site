"use client";

import { useState } from "react";

import { ChevronDown } from "lucide-react";

interface SelectProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  hint?: string;
}

/**
 * A native <select> under bespoke chrome.
 *
 * Deliberately not a custom listbox: the native control gives correct
 * keyboard behaviour, screen-reader semantics, and — the reason that
 * actually matters here — the OS wheel picker on mobile, which beats any
 * div-based dropdown for a form filled on a phone.
 */
export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: SelectProps<T>) {
  return (
    <label className="block">
      <span className="mb-2.5 flex items-baseline gap-2">
        <span className="eyebrow">{label}</span>
        {hint && <span className="text-[10.5px] text-[var(--text-muted)]">{hint}</span>}
      </span>

      <span className="relative block">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value as T)}
          className="w-full appearance-none rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-3 pe-11 text-[14px] text-[var(--text-primary)] outline-none transition-colors duration-300 focus:border-[var(--accent)]"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          aria-hidden="true"
          className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
        />
      </span>
    </label>
  );
}

/** Numeric field with a unit suffix, used for square footage and price. */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  unit?: string;
  min?: number;
}) {
  // Non-null only while the field is being edited.
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <label className="block">
      <span className="eyebrow mb-2.5 block">{label}</span>
      <span className="relative block">
        <input
          /* Text, not number. A number input cannot display "1,650,000" —
             it rejects the separators — and 1650000 at a glance is a
             counting exercise. inputMode keeps the numeric keypad on
             mobile, which is the only thing type=number was buying here.
             The spinner arrows are no loss on a figure this large. */
          type="text"
          inputMode="numeric"
          autoComplete="off"
          /* Grouped while at rest, raw while being typed: separators that
             reflow under the caret make a field maddening to edit. */
          value={
            draft ??
            (Number.isFinite(value) ? Math.round(value).toLocaleString("en-US") : "")
          }
          dir="ltr"
          onChange={(event) => {
            // Keep digits only, so pasted "AED 1,650,000" also works.
            const digits = event.target.value.replace(/[^\d]/g, "");
            setDraft(digits);
            /* Clamping on every keystroke made the field impossible to
               edit: with a min of 100,000, typing the "1" of "150000"
               produced 1, which snapped back up to 100000 before the
               second digit could land. The clamp belongs on blur. */
            if (digits !== "") onChange(Number(digits));
          }}
          onBlur={() => {
            const next = Number(draft ?? value);
            onChange(Number.isFinite(next) && next > 0 ? Math.max(min, next) : min);
            setDraft(null);
          }}
          className="figure w-full rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-3 text-[15px] tracking-normal text-[var(--text-primary)] outline-none transition-[border-color,box-shadow] duration-300 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-wash)]"
          style={unit ? { paddingInlineEnd: "4.5rem" } : undefined}
        />
        {unit && (
          <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-muted)]">
            {unit}
          </span>
        )}
      </span>
    </label>
  );
}
