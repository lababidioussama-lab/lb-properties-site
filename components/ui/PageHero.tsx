"use client";

import Image from "next/image";
import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useTransform } from "motion/react";
import { EASE, SplitWords, useHeroScroll } from "@/components/motion";

export function PageHero({
  image,
  kicker,
  title,
  subtitle,
  children,
}: {
  image: string;
  kicker: string;
  title: string;
  subtitle: string;
  children?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const rise = (d: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay: d, ease: EASE } };

  const ref = useRef<HTMLElement>(null);
  const progress = useHeroScroll(ref);
  const bgY = useTransform(progress, [0, 1], ["0%", "25%"]);
  const copyOpacity = useTransform(progress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative isolate flex min-h-[520px] items-end overflow-hidden bg-[#07192b] pb-14 pt-36 sm:min-h-[600px] sm:pb-20">
      <motion.div className="absolute inset-0 -z-10" style={reduce ? undefined : { y: bgY }}>
        <Image src={image} alt="" fill priority sizes="100vw" className="kenburns object-cover" />
        <div className="photo-scrim absolute inset-0" />
      </motion.div>

      <motion.div className="mx-auto w-full max-w-[1320px] px-5 sm:px-8" style={reduce ? undefined : { opacity: copyOpacity }}>
        <motion.p {...rise(0.05)} className="kicker flex items-center gap-3 !text-[#d4b87f]">
          <span className="h-px w-10 bg-[#c8a96e]/80" />
          {kicker}
        </motion.p>
        <h1 className="display-1 mt-5 max-w-[18ch] text-white [&_em]:!text-[#d4b87f]">
          <SplitWords text={title} delay={0.15} stagger={0.07} />
        </h1>
        <motion.p {...rise(0.45)} className="mt-6 max-w-[60ch] text-[16.5px] leading-[1.8] text-white/80">
          {subtitle}
        </motion.p>
        {children && <motion.div {...rise(0.6)} className="mt-9">{children}</motion.div>}
      </motion.div>
    </section>
  );
}
