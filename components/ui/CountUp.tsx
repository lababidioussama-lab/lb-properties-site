"use client";

import { useEffect, useRef, useState } from "react";
import { useMotionValue, useSpring, useReducedMotion } from "motion/react";

interface CountUpProps {
  value: number;
  format: (value: number) => string;
  /**
   * Anything the formatter depends on besides the number — in practice the
   * currency code. Without it a figure keeps its old currency until the
   * value itself next changes, because every model figure is held in AED
   * and converted at render: switching AED→EUR changes `format` but not
   * `value`, and `format` is held in a ref precisely so it does NOT
   * re-trigger. The result was a panel showing "AED 145,417" next to a
   * slider reading "€628,250".
   */
  formatKey?: string | number;
  className?: string;
}

/**
 * Springs a figure to its new value instead of snapping. The perceptual point
 * is that the reader sees WHICH numbers changed when they move the slider.
 *
 * Formatted text is written through a state setter rather than to node.
 * textContent directly, so React stays the only thing mutating the DOM.
 */
export function CountUp({ value, format, formatKey, className = "" }: CountUpProps) {
  const reduceMotion = useReducedMotion();
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, { stiffness: 90, damping: 22, mass: 0.7 });
  const [display, setDisplay] = useState(() => format(value));

  // format changes identity on every render in most call sites; holding it in
  // a ref keeps the subscription from tearing down and restarting each frame.
  const formatRef = useRef(format);
  formatRef.current = format;

  useEffect(() => {
    if (reduceMotion) {
      setDisplay(formatRef.current(value));
      return;
    }
    motionValue.set(value);
  }, [value, motionValue, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    const unsubscribe = spring.on("change", (latest) => {
      setDisplay(formatRef.current(latest));
    });
    return unsubscribe;
  }, [spring, reduceMotion]);

  /* Re-format in place when the formatter's inputs change but the number
     does not. Reads the spring's current position rather than `value` so a
     currency switch mid-animation does not snap the figure to its target. */
  useEffect(() => {
    if (formatKey === undefined) return;
    setDisplay(formatRef.current(reduceMotion ? value : spring.get()));
  }, [formatKey, spring, value, reduceMotion]);

  return (
    <span className={`figure ${className}`} aria-live="polite">
      {display}
    </span>
  );
}
