"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";

/**
 * Counts the first number inside an already-formatted string up to its value,
 * keeping everything around it: "AED 8,450,000", "50%", "0 min", "117% of
 * target". Anything without a number ("—") renders as-is.
 *
 * On a later change it runs from the old figure to the new one, so an agent
 * who reassigns a lead sees WHICH total moved rather than a silent swap.
 */
export function CountText({ text, duration = 0.9 }: { text: string; duration?: number }) {
  const reduce = useReducedMotion();
  const match = /(\d[\d,]*(?:\.\d+)?)/.exec(text);
  const target = match ? Number(match[1].replace(/,/g, "")) : NaN;
  const decimals = match?.[1].split(".")[1]?.length ?? 0;
  const grouped = match ? match[1].includes(",") || target >= 10_000 : false;

  const [shown, setShown] = useState(reduce || !match ? target : 0);
  const from = useRef(reduce ? target : 0);

  useEffect(() => {
    if (!match || Number.isNaN(target)) return;
    if (reduce) {
      setShown(target);
      from.current = target;
      return;
    }
    const controls = animate(from.current, target, {
      duration,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => setShown(v),
    });
    from.current = target;
    return () => controls.stop();
    // `match` is derived from `text`; `target` captures the only part that matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, reduce, duration]);

  if (!match || Number.isNaN(target)) return <>{text}</>;

  const number = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: grouped,
  }).format(shown);

  return (
    <>
      {text.slice(0, match.index)}
      {number}
      {text.slice(match.index + match[1].length)}
    </>
  );
}
