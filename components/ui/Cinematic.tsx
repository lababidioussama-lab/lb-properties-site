"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "motion/react";

/**
 * Scroll-driven section choreography.
 *
 * Every section on this page previously arrived the same way — an opacity
 * fade on enter — which at fifteen sections reads as no movement at all.
 * These wrappers tie the transform to scroll *progress* rather than firing
 * a fixed animation on intersection, so the section keeps moving while the
 * visitor moves, and stops when they stop. That difference is most of what
 * makes a page feel directed rather than merely animated.
 *
 * All of it degrades to a plain static block under prefers-reduced-motion:
 * scroll-linked parallax is one of the more reliable ways to trigger
 * vestibular symptoms, so the reduced-motion path renders no transform at
 * all rather than a smaller one.
 */

/** Rises and settles as it enters, then drifts slightly as it leaves. */
export function CinematicSection({
  children,
  className = "",
  id,
  /** 0 = no travel, 1 = the default 80px. */
  intensity = 1,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  intensity?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const travel = 80 * intensity;
  const y = useTransform(scrollYProgress, [0, 0.5, 1], [travel, 0, -travel * 0.5]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.975, 1, 0.99]);
  /* Deliberately no scroll-linked opacity. Tying visibility to scroll maths
     means any section that never receives a scroll event — restored scroll
     position, in-page anchor jump, a browser that resolves the observer
     late — can sit at zero and simply not exist for the reader. Transforms
     fail visibly and harmlessly; opacity fails invisibly. */

  if (reduceMotion) {
    return (
      <section ref={ref} id={id} className={className}>
        {children}
      </section>
    );
  }

  return (
    <motion.section
      ref={ref}
      id={id}
      className={className}
      style={{ y, scale }}
    >
      {children}
    </motion.section>
  );
}

/**
 * Parallax *inside a fixed frame*.
 *
 * This is the difference between motion that reads as expensive and motion
 * that reads as paper: the frame never moves, so the layout is completely
 * still, while the image within it drifts at a different rate to the scroll.
 * The eye reads that rate difference as depth rather than as sliding.
 *
 * The child is overscaled so the drift cannot expose an edge.
 * `speed` is the fraction of the frame height travelled across the scroll.
 */
export function ParallaxFrame({
  children,
  speed = 0.12,
  className = "",
}: {
  children: ReactNode;
  speed?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const y = useTransform(
    scrollYProgress,
    [0, 1],
    [`${speed * 100}%`, `${-speed * 100}%`],
  );

  if (reduceMotion) {
    return (
      <div ref={ref} className={`relative overflow-hidden ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`}>
      {/* Overscaled by twice the travel so no edge can enter the frame. */}
      <motion.div
        style={{ y, height: `${100 + speed * 200}%`, top: `${-speed * 100}%` }}
        className="absolute inset-x-0"
      >
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Staggered reveal for a group of children — cards, list rows, stats.
 * Each child arrives slightly after the last, which reads as intent rather
 * than as everything popping at once.
 */
export function Stagger({
  children,
  className = "",
  gap = 0.07,
}: {
  children: ReactNode;
  className?: string;
  gap?: number;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, margin: "-70px" }}
      variants={{
        hidden: {},
        shown: { transition: { staggerChildren: gap } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** A single child of <Stagger>. */
export function StaggerItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 26 },
        shown: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.6, ease: [0.2, 0.8, 0.2, 1] },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Same choreography as CinematicSection, but as a plain wrapper — for
 * components that already render their own <section> and only need the
 * scroll-linked movement applied around them.
 */
export function Reveal({
  children,
  intensity = 1,
}: {
  children: ReactNode;
  intensity?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  /* These numbers are large on purpose. An earlier pass used 70px of travel
     and a 0.982 scale, which measured correctly and was invisible — below
     roughly 4% scale change and 100px of travel, scroll-linked movement
     reads as nothing at all. The section now enters tilted back and a tenth
     smaller, straightens as it reaches the middle of the viewport, and
     recedes slightly as it leaves. */
  const travel = 150 * intensity;
  const y = useTransform(scrollYProgress, [0, 0.5, 1], [travel, 0, -travel * 0.42]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1, 0.965]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [7 * intensity, 0, -3 * intensity]);

  if (reduceMotion) return <div ref={ref}>{children}</div>;

  return (
    <div ref={ref} style={{ perspective: 1400 }}>
      <motion.div
        style={{
          y,
          scale,
          rotateX,
          transformOrigin: "center top",
          // Without this the tilt renders flat and the depth is lost.
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
