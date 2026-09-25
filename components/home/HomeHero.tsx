"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useSite } from "@/lib/context/site-context";
import { emphasize } from "@/lib/i18n/emphasis";
import { interpolate } from "@/lib/i18n";
import { SITE, pageHref } from "@/lib/site-config";
import { PROJECTS, DEVELOPERS } from "@/lib/projects";

const SLIDES = [
  { src: "/projects/palace-beach-residence-5.jpg", pos: "object-[center_60%]", caption: "Palace Beach Residence · Emaar Beachfront" },
  { src: "/projects/the-cove-creek-island.jpg", pos: "object-center", caption: "The Cove · Dubai Creek Harbour" },
  { src: "/projects/grand-polo-equestra-5.jpg", pos: "object-center", caption: "Grand Polo Club & Resort · Emaar" },
];

export function HomeHero() {
  const { t, locale, openDrawer } = useSite();
  const reduce = useReducedMotion();
  const h = t.home.hero;
  const f = t.home.facts;
  const rise = (d: number) =>
    reduce ? {} : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.9, delay: d, ease: [0.2, 0.8, 0.2, 1] as const } };

  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 7000);
    return () => window.clearInterval(id);
  }, [reduce]);
  const slide = SLIDES[index];

  const facts = [
    { k: f.licensed, v: interpolate(f.licensedValue, { licence: SITE.licenseNo }) },
    { k: f.projects, v: interpolate(f.projectsValue, { count: PROJECTS.length, devs: DEVELOPERS.length }) },
    { k: f.languages, v: f.languagesValue },
    { k: f.reply, v: f.replyValue },
  ];

  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#07192b]">
      <div className="absolute inset-0 -z-10">
        <AnimatePresence initial={false}>
          <motion.div
            key={slide.src}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: "easeInOut" }}
          >
            <Image
              src={slide.src}
              alt=""
              fill
              priority={index === 0}
              sizes="100vw"
              className={`kenburns object-cover ${slide.pos}`}
            />
          </motion.div>
        </AnimatePresence>
        <div className="photo-scrim absolute inset-0" />
        <div className="absolute inset-0 bg-[rgb(7_26_46/0.28)] sm:hidden" />
      </div>

      <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col justify-end px-5 pb-10 pt-40 sm:px-8 sm:pb-14">
        <motion.p {...rise(0.1)} className="kicker flex items-center gap-3 !text-[#c9d6e4]">
          <span className="h-px w-10 bg-[#c9d6e4]/70" />
          {h.kicker}
        </motion.p>

        <motion.h1
          {...rise(0.22)}
          className="mt-6 max-w-[14ch] font-[family-name:var(--font-display)] text-[clamp(44px,8.4vw,112px)] font-medium leading-[0.98] tracking-[-0.015em] text-white [&_em]:font-medium [&_em]:italic [&_em]:text-[#dfe8f2] [text-shadow:0_2px_30px_rgb(7_26_46/0.55)] rtl:font-[family-name:var(--font-display-ar)] rtl:leading-[1.25] rtl:[&_em]:not-italic"
        >
          {emphasize(h.title)}
        </motion.h1>

        <motion.p {...rise(0.36)} className="mt-7 max-w-[54ch] text-[16.5px] leading-[1.8] text-white/80 sm:text-[17px]">
          {h.subtitle}
        </motion.p>

        <motion.div {...rise(0.48)} className="mt-10 flex flex-wrap gap-3">
          <Link href={pageHref(locale, "projects")} className="btn btn-light">
            {h.primary}
            <ArrowRight size={15} className="rtl:-scale-x-100" />
          </Link>
          <button onClick={() => openDrawer("advisory")} className="btn btn-ghost-light">
            {h.secondary}
          </button>
        </motion.div>

        <motion.dl
          {...rise(0.62)}
          className="mt-16 grid grid-cols-2 gap-x-6 gap-y-6 border-t border-white/15 pt-7 lg:grid-cols-4"
        >
          {facts.map((x) => (
            <div key={x.k}>
              <dt className="font-[family-name:var(--font-eyebrow)] text-[9.5px] font-semibold uppercase tracking-[0.24em] text-[#9fb2c8] rtl:tracking-normal rtl:text-[12px]">
                {x.k}
              </dt>
              <dd className="mt-2 text-[14px] text-white/90">{x.v}</dd>
            </div>
          ))}
        </motion.dl>
      </div>

      <div className="absolute bottom-5 end-5 hidden items-center gap-4 sm:flex sm:end-8">
        <span className="text-[10px] uppercase tracking-[0.24em] text-white/60">{slide.caption}</span>
        <div className="flex gap-1.5">
          {SLIDES.map((s, i) => (
            <button
              key={s.src}
              onClick={() => setIndex(i)}
              aria-label={s.caption}
              className={`h-[3px] transition-all duration-700 ${i === index ? "w-8 bg-white" : "w-4 bg-white/35 hover:bg-white/60"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
