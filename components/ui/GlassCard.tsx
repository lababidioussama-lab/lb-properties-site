"use client";

import { useCallback, type ReactNode, type PointerEvent } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "motion/react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  /** Adds the gold hairline along the top edge — the card system's signature */
  lit?: boolean;
  /** Pointer-tracked tilt. Off for tall/text-heavy cards where it reads as noise. */
  tilt?: boolean;
  /** Cursor-following radial glow */
  glow?: boolean;
  as?: "div" | "article" | "li";
}

/** Capped low on purpose: past ~7° the card stops reading as a physical
    object and starts reading as a gimmick. */
const MAX_TILT_DEG = 6;

export function GlassCard({
  children,
  className = "",
  lit = true,
  tilt = true,
  glow = true,
  as = "div",
}: GlassCardProps) {
  const reduceMotion = useReducedMotion();
  const enableTilt = tilt && !reduceMotion;

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  const springCfg = { stiffness: 220, damping: 26, mass: 0.6 };
  const rotateX = useSpring(
    useTransform(py, [0, 1], [MAX_TILT_DEG, -MAX_TILT_DEG]),
    springCfg,
  );
  const rotateY = useSpring(
    useTransform(px, [0, 1], [-MAX_TILT_DEG, MAX_TILT_DEG]),
    springCfg,
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      px.set(x);
      py.set(y);
      if (glow) {
        event.currentTarget.style.setProperty("--mx", `${x * 100}%`);
        event.currentTarget.style.setProperty("--my", `${y * 100}%`);
      }
    },
    [px, py, glow],
  );

  const handlePointerLeave = useCallback(() => {
    px.set(0.5);
    py.set(0.5);
  }, [px, py]);

  const MotionTag = motion[as];

  return (
    <MotionTag
      onPointerMove={enableTilt || glow ? handlePointerMove : undefined}
      onPointerLeave={enableTilt ? handlePointerLeave : undefined}
      style={
        enableTilt
          ? { rotateX, rotateY, transformPerspective: 1100, transformStyle: "preserve-3d" }
          : undefined
      }
      className={[
        "glass rounded-2xl",
        lit ? "lit-edge" : "",
        glow ? "glow-sweep" : "",
        "shadow-[var(--shadow-card)] transition-shadow duration-500",
        "hover:shadow-[var(--shadow-lift)]",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </MotionTag>
  );
}
