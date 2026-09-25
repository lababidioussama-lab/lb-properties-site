"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useSite } from "@/lib/context/site-context";
import { LOCALE_LABELS, LOCALE_NAMES } from "@/lib/i18n/types";
import { TRANSLATED_LOCALES } from "@/lib/i18n";

/**
 * Language menu.
 *
 * Previously a row of pills, one per locale. At three locales that was fine;
 * at ten it broke in three separate ways — every target fell to 31–38px wide
 * (below the 44px minimum, so neighbours got tapped instead), the CJK
 * endonyms wrapped and pushed the row to ragged 29/45/62px heights, and
 * seven of the ten had no dictionary, so choosing them changed the URL and
 * left the page in English.
 *
 * A menu fixes the geometry, and TRANSLATED_LOCALES fixes the third: only
 * languages that actually have copy are offered. When a dictionary lands,
 * its entry appears here on its own.
 */
export function LanguageSelector() {
  const { locale, t } = useSite();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* Swap only the locale segment so the visitor stays on the page they were
     reading. Locale is always the first segment, courtesy of the proxy. */
  const rest = pathname.replace(/^\/[^/]+/, "") || "";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t.utility.language}
        className="flex h-9 items-center gap-1.5 rounded-full border border-[var(--hairline)] px-3 font-[family-name:var(--font-eyebrow)] text-[10px] font-semibold tracking-[0.1em] text-[var(--text-secondary)] transition-colors duration-300 hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
      >
        <Globe size={13} strokeWidth={1.6} />
        {LOCALE_LABELS[locale]}
        <ChevronDown
          size={12}
          strokeWidth={2}
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="absolute end-0 top-[calc(100%+0.5rem)] z-50 min-w-[13rem] overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--surface-raised)] p-1 shadow-[var(--shadow-lift)]"
          >
            {TRANSLATED_LOCALES.map((code) => {
              const active = code === locale;
              return (
                <Link
                  key={code}
                  href={`/${code}${rest}`}
                  hrefLang={code}
                  lang={code}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  aria-current={active ? "true" : undefined}
                  /* Full-width rows, 44px tall: a language list is read
                     once and tapped once, so legibility beats density. */
                  className={`flex h-11 items-center justify-between gap-4 rounded-lg px-3 text-[13.5px] transition-colors ${
                    active
                      ? "bg-[var(--accent-wash)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {/* Endonym: a Russian buyer scans for "Русский". */}
                  <span>{LOCALE_NAMES[code]}</span>
                  {active ? (
                    <Check size={14} strokeWidth={2} className="text-[var(--accent)]" />
                  ) : (
                    <span className="font-[family-name:var(--font-eyebrow)] text-[10px] tracking-[0.1em] text-[var(--text-muted)]">
                      {LOCALE_LABELS[code]}
                    </span>
                  )}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
