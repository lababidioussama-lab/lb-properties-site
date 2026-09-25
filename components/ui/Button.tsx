"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Four roles, deliberately few:
 *  cta     — Deep Emerald, the conversion action (opens WhatsApp)
 *  bronze  — flat Burnished Bronze, the primary in-page action
 *  outline — bronze hairline, the secondary
 *  ghost   — tertiary, no chrome
 */
type Variant = "cta" | "accent" | "outline" | "ghost";

interface BaseProps {
  children: ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  className?: string;
  fullWidth?: boolean;
  /** Light sweep on hover. Reserve for a single hero-grade action. */
  shimmer?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  cta: "cta-fill",
  accent: "accent-fill accent-fill-raised",
  outline: "accent-outline",
  ghost: "text-[var(--text-secondary)] hover:text-[var(--accent)]",
};

/* Tracking was wide enough (0.18–0.2em) to push most real labels onto two or
   three lines, which is what turned these into lozenges. Pulled back to a
   still-luxurious 0.10–0.13em so the common CTAs set on one line. */
/* Tracking is the expensive part on a phone: at 0.13em a 45-character CTA
   ("Request VIP Off-Plan Deal Flow & Tax-Free Analysis") gained ~60px of
   pure letter-spacing and wrapped to three lines, 111px tall. The wide
   tracking is a desktop refinement, so it — and the generous padding —
   start at `sm` and the phone gets a tighter, shorter button. */
const SIZES = {
  sm: "text-[10.5px] tracking-[0.08em] px-3.5 py-2.5 gap-2 sm:tracking-[0.10em] sm:px-4",
  md: "text-[10.5px] tracking-[0.08em] px-4.5 py-3 gap-2 sm:text-[11px] sm:tracking-[0.12em] sm:px-6 sm:py-3.5 sm:gap-2.5",
  lg: "text-[11px] tracking-[0.08em] px-5 py-3.5 gap-2.5 sm:text-[11.5px] sm:tracking-[0.13em] sm:px-8 sm:py-4 sm:gap-3",
} as const;

function classesFor({
  variant = "accent",
  size = "md",
  fullWidth,
  shimmer,
  className = "",
}: BaseProps) {
  return [
    /* Not rounded-full. A pill is only a pill while the label stays on one
       line; the moment it wraps, the radius follows the taller box and the
       button becomes a large oval slab. A fixed 999px radius cannot know
       that, so the shape is pinned to the system's own near-square scale,
       which holds up at any number of lines. */
    "relative inline-flex items-center justify-center rounded-xl text-center text-balance",
    "font-[family-name:var(--font-eyebrow)] font-semibold uppercase",
    "disabled:opacity-50 disabled:pointer-events-none",
    shimmer ? "shimmer-hover" : "",
    fullWidth ? "w-full" : "",
    SIZES[size],
    VARIANTS[variant],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

/* Scale only — translating a button causes sub-pixel text blur mid-press. */
const PRESS = { scale: 0.975 };
const HOVER = { scale: 1.012 };
const SPRING = { type: "spring", stiffness: 420, damping: 30 } as const;

export function Button({
  onClick,
  type = "button",
  disabled,
  ariaLabel,
  ...props
}: BaseProps & {
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      whileTap={PRESS}
      whileHover={HOVER}
      transition={SPRING}
      className={classesFor(props)}
    >
      <span className="relative z-[2] inline-flex items-center gap-[inherit]">
        {props.children}
      </span>
    </motion.button>
  );
}

export function ButtonLink({
  href,
  target,
  rel,
  onClick,
  ...props
}: BaseProps & {
  href: string;
  target?: string;
  rel?: string;
  onClick?: () => void;
}) {
  return (
    <motion.a
      href={href}
      target={target}
      rel={rel}
      onClick={onClick}
      whileTap={PRESS}
      whileHover={HOVER}
      transition={SPRING}
      className={classesFor(props)}
    >
      <span className="relative z-[2] inline-flex items-center gap-[inherit]">
        {props.children}
      </span>
    </motion.a>
  );
}
