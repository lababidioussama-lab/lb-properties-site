"use client";

/**
 * The site's motion vocabulary, in one place so every page moves the same way.
 *
 * Rules the pieces follow:
 * - Elements move, sections never do. Whole-section transforms were tried and
 *   read as sheets of paper sliding, so reveals stay inside their section.
 * - Every piece renders its finished state under prefers-reduced-motion.
 * - One easing curve (--ease-lux) and durations of 0.8–1.2s: the brand is a
 *   private office, and quick springy motion reads as an app, not a practice.
 */

import { Fragment, useEffect, useRef, type ReactNode } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import Lenis from "lenis";

export const EASE = [0.2, 0.8, 0.2, 1] as const;

/* ------------------------------------------------------------ smooth scroll */

/**
 * Wheel-smoothed scrolling. Touch keeps the phone's own native scroll, and
 * reduced-motion visitors get no smoothing at all.
 *
 * Two things would otherwise break: the drawers and the project modal lock the
 * page by setting body overflow to hidden, which Lenis ignores (it scrolls the
 * window programmatically), so it is stopped whenever that lock is on; and
 * anything scrollable inside a dialog keeps its own native wheel.
 */
export function SmoothScroll() {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce) return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      autoRaf: true,
      allowNestedScroll: true,
      prevent: (node) => Boolean(node.closest?.('[role="dialog"], [data-lenis-prevent]')),
    });

    const body = document.body;
    const sync = () => (body.style.overflow === "hidden" ? lenis.stop() : lenis.start());
    const observer = new MutationObserver(sync);
    observer.observe(body, { attributes: true, attributeFilter: ["style"] });

    return () => {
      observer.disconnect();
      lenis.destroy();
    };
  }, [reduce]);

  return null;
}

/* ---------------------------------------------------------- scroll progress */

/** A hairline across the top of the viewport that fills as the page is read. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px] origin-left bg-[linear-gradient(90deg,#c8a96e,#ead6ad)] rtl:origin-right"
    />
  );
}

/* ------------------------------------------------------------------ reveals */

export function Reveal({
  children,
  delay = 0,
  className = "",
  y = 26,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Splits a dictionary string into words that rise out of a mask one after
 * another. Understands the dictionaries' [[emphasis]] markers, so the italic
 * accent survives the split. Arabic works too: it splits on spaces only, so
 * the letters inside each word stay joined.
 */
export function SplitWords({
  text,
  delay = 0,
  stagger = 0.06,
  inView = false,
  className = "",
}: {
  text: string;
  delay?: number;
  stagger?: number;
  /** Animate when scrolled into view instead of on mount. */
  inView?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const words: { word: string; em: boolean }[] = [];
  text.split(/(\[\[.*?\]\])/).forEach((part) => {
    const em = part.startsWith("[[") && part.endsWith("]]");
    const body = em ? part.slice(2, -2) : part;
    body.split(/\s+/).filter(Boolean).forEach((word) => words.push({ word, em }));
  });

  const target = { y: "0%", opacity: 1 };
  return (
    <span className={className}>
      {words.map(({ word, em }, i) => {
        const Tag = em ? "em" : "span";
        return (
          <Fragment key={i}>
            <span className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
              <motion.span
                className="inline-block will-change-transform"
                initial={reduce ? false : { y: "105%", opacity: 0 }}
                {...(inView
                  ? { whileInView: target, viewport: { once: true, margin: "-60px" } }
                  : { animate: target })}
                transition={{ duration: 1.1, delay: delay + i * stagger, ease: EASE }}
              >
                <Tag>{word}</Tag>
              </motion.span>
            </span>
            {i < words.length - 1 && " "}
          </Fragment>
        );
      })}
    </span>
  );
}

/**
 * An image that uncovers itself like a curtain lifting, then keeps drifting
 * gently against the scroll. The wrapper sets the frame; pass the <Image fill>
 * as the child.
 */
export function CurtainImage({
  children,
  className = "",
  delay = 0,
  parallax = 8,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Drift in percent of the frame height; 0 disables it. */
  parallax?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  /* Observed on the unclipped frame: Chromium treats an element hidden by its
     own clip-path as not intersecting, so watching the clipped layer itself
     would leave the curtain down forever. */
  const shown = useInView(ref, { once: true, margin: "-80px" });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [`${-parallax}%`, `${parallax}%`]);
  const open = reduce || shown;

  return (
    <div ref={ref} className={`relative ${className}`}>
      <motion.div
        className="absolute inset-0 overflow-hidden"
        initial={reduce ? false : { clipPath: "inset(100% 0% 0% 0%)" }}
        animate={open ? { clipPath: "inset(0% 0% 0% 0%)" } : undefined}
        transition={{ duration: 1.3, delay, ease: EASE }}
      >
        <motion.div
          className="absolute inset-x-0 -inset-y-[10%]"
          style={reduce || !parallax ? undefined : { y }}
          initial={reduce ? false : { scale: 1.18 }}
          animate={open ? { scale: 1 } : undefined}
          transition={{ duration: 1.8, delay, ease: EASE }}
        >
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}

/** A rule that draws itself across when it enters the viewport. */
export function DrawLine({ className = "", delay = 0 }: { className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      aria-hidden
      className={`origin-left rtl:origin-right ${className}`}
      initial={reduce ? false : { scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 1.2, delay, ease: EASE }}
    />
  );
}

/** Scroll-linked value helper for heroes: 0 at the top, 1 once scrolled past. */
export function useHeroScroll(target: React.RefObject<HTMLElement | null>): MotionValue<number> {
  const { scrollYProgress } = useScroll({ target, offset: ["start start", "end start"] });
  return scrollYProgress;
}
