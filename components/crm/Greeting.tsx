"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

/** Set by the login screen just before it reloads into the CRM. */
export const WELCOME_FLAG = "crm:welcome";

export const greetingFor = (hour: number) =>
  hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

export const firstName = (fullName: string | null | undefined) =>
  fullName?.trim().split(/\s+/)[0] ?? "";

const longDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const shortDate = (d: Date) =>
  d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
export const clockTime = (d: Date) =>
  d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** The current time, re-read at the top of every minute. */
export function useClock(): Date | null {
  // null until mounted, so the server-rendered HTML never disagrees with the browser's clock
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    let timer = 0;
    const tick = () => {
      setNow(new Date());
      timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    };
    timer = window.setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    return () => window.clearTimeout(timer);
  }, []);
  return now;
}

/** Top-bar date and time on every screen. The greeting itself lives on
    My Day and in the welcome card, so it is not repeated up here. */
export function HeaderClock() {
  const now = useClock();
  if (!now) return null;
  return (
    <div className="hidden items-baseline gap-2 whitespace-nowrap lg:flex">
      <span className="text-[13px] text-[var(--text-secondary)]">{shortDate(now)}</span>
      <span className="figure text-[15px] font-semibold text-[var(--text-primary)]">{clockTime(now)}</span>
    </div>
  );
}

/**
 * Straight after signing in: a card slides into the top-right corner with the
 * agent's name, today's date and the time. It never covers the work — the
 * CRM stays usable underneath — and leaves on its own after a few seconds
 * (hovering holds it).
 */
export function WelcomeCard({ name, avatarUrl, onDone }: { name: string | null | undefined; avatarUrl?: string | null; onDone: () => void }) {
  const reduce = useReducedMotion();
  const now = useClock();
  const [open, setOpen] = useState(true);
  const [held, setHeld] = useState(false);
  const LIFE = 6;

  useEffect(() => {
    if (held) return;
    const timer = window.setTimeout(() => setOpen(false), LIFE * 1000);
    return () => window.clearTimeout(timer);
  }, [held]);

  const first = firstName(name);
  const initials = (name ?? "").split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join("") || "·";
  const ease = [0.2, 0.8, 0.2, 1] as const;

  return (
    <AnimatePresence onExitComplete={onDone}>
      {open && now && (
        <motion.div
          role="status"
          aria-live="polite"
          onMouseEnter={() => setHeld(true)}
          onMouseLeave={() => setHeld(false)}
          className="fixed end-4 top-[72px] z-[90] w-[min(360px,calc(100vw-32px))] md:end-10 md:top-[92px] overflow-hidden rounded-xl border border-[var(--hairline)] bg-[var(--surface-raised)] shadow-[0_24px_60px_-20px_rgb(15_23_42/0.35)]"
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: 28 }}
          transition={{ duration: 0.55, ease }}
        >
          <div className="flex items-start gap-4 p-5 pe-11">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[var(--accent-solid)] font-[family-name:var(--font-display)] text-[18px] text-[var(--accent)]">{initials}</span>
            )}
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-[var(--gold)]">Welcome back</p>
              <p className="mt-0.5 font-[family-name:var(--font-display)] text-[25px] font-semibold leading-[1.1] text-[var(--text-primary)]">
                {greetingFor(now.getHours())}{first ? `, ${first}` : ""}
              </p>
              <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
                {longDate(now)} · <span className="figure font-semibold text-[var(--text-primary)]">{clockTime(now)}</span>
              </p>
            </div>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Close" className="absolute end-3 top-3 grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--surface-sunken)] hover:text-[var(--text-primary)]">
            <X size={15} />
          </button>
          {/* Drains while the card counts down; refills and waits while hovered. */}
          <motion.div
            key={held ? "held" : "running"}
            className="h-[2px] origin-left bg-[var(--gold)] rtl:origin-right"
            initial={{ scaleX: 1 }}
            animate={{ scaleX: held ? 1 : 0 }}
            transition={{ duration: held ? 0 : LIFE, ease: "linear" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
