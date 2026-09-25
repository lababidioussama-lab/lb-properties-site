"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { emphasize } from "@/lib/i18n/emphasis";

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
    reduce ? {} : { initial: { opacity: 0, y: 18 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: d, ease: [0.2, 0.8, 0.2, 1] as const } };

  return (
    <section className="relative isolate flex min-h-[520px] items-end overflow-hidden bg-[#07192b] pb-14 pt-36 sm:min-h-[600px] sm:pb-20">
      <div className="absolute inset-0 -z-10">
        <Image src={image} alt="" fill priority sizes="100vw" className="kenburns object-cover" />
        <div className="photo-scrim absolute inset-0" />
      </div>

      <div className="mx-auto w-full max-w-[1320px] px-5 sm:px-8">
        <motion.p {...rise(0.05)} className="kicker flex items-center gap-3 !text-[#c9d6e4]">
          <span className="h-px w-10 bg-[#c9d6e4]/70" />
          {kicker}
        </motion.p>
        <motion.h1 {...rise(0.15)} className="display-1 mt-5 max-w-[18ch] text-white [&_em]:!text-[#c9d6e4]">
          {emphasize(title)}
        </motion.h1>
        <motion.p {...rise(0.28)} className="mt-6 max-w-[60ch] text-[16.5px] leading-[1.8] text-white/80">
          {subtitle}
        </motion.p>
        {children && <motion.div {...rise(0.4)} className="mt-9">{children}</motion.div>}
      </div>
    </section>
  );
}
