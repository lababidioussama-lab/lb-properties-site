"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSite } from "@/lib/context/site-context";

/**
 * Swipeable image gallery.
 *
 * Movement is expressed in *logical* direction (forward/back), not left and
 * right, because the whole gallery mirrors under RTL: in Arabic a forward
 * swipe travels the other way across the screen, and the enter/exit offsets
 * have to follow or the animation runs backwards against the drag.
 */
export function Gallery({
  images,
  alt,
  className = "",
}: {
  images: string[];
  alt: string;
  className?: string;
}) {
  // dirSign is +1 in LTR and -1 in RTL — exactly the mirror factor needed.
  const { rtl, dirSign } = useSite();
  const reduceMotion = useReducedMotion();
  const [[index, direction], setState] = useState<[number, number]>([0, 0]);
  const count = images.length;

  const go = useCallback(
    (delta: number) => {
      setState(([i]) => [(i + delta + count) % count, delta]);
    },
    [count],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Arrow keys are physical, so their meaning flips under RTL too.
      if (e.key === "ArrowRight") go(rtl ? -1 : 1);
      if (e.key === "ArrowLeft") go(rtl ? 1 : -1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, rtl]);

  if (count === 0) return null;

  // Logical direction → screen offset.
  const flip = dirSign;
  const enterFrom = (d: number) => ({ x: d * 60 * flip, opacity: 0 });
  const exitTo = (d: number) => ({ x: -d * 60 * flip, opacity: 0 });

  return (
    <div className={`relative overflow-hidden rounded-lg bg-black/20 ${className}`}>
      <div className="relative aspect-[16/10]">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={index}
            custom={direction}
            initial={reduceMotion ? { opacity: 0 } : enterFrom(direction)}
            animate={{ x: 0, opacity: 1 }}
            exit={reduceMotion ? { opacity: 0 } : exitTo(direction)}
            transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
            drag={reduceMotion ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.14}
            onDragEnd={(_, info) => {
              // Velocity as well as distance, so a fast flick counts even
              // when the finger barely travels.
              const power = info.offset.x + info.velocity.x * 0.2;
              if (power < -60) go(flip);
              else if (power > 60) go(-flip);
            }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <Image
              src={images[index]}
              alt={`${alt} — ${index + 1} of ${count}`}
              fill
              sizes="(max-width: 900px) 100vw, 860px"
              className="pointer-events-none select-none object-cover"
              priority={index === 0}
              draggable={false}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <>
          <GalleryArrow side="start" onClick={() => go(-flip)} />
          <GalleryArrow side="end" onClick={() => go(flip)} />

          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
            <div className="pointer-events-auto flex gap-1.5">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  aria-label={`Image ${i + 1}`}
                  aria-current={i === index}
                  onClick={() => setState(([prev]) => [i, i > prev ? 1 : -1])}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? "w-6 bg-white" : "w-1.5 bg-white/45 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
            <span className="rounded-full bg-black/50 px-2.5 py-1 font-[family-name:var(--font-numeric)] text-[10px] tabular-nums text-white backdrop-blur-sm">
              {index + 1}/{count}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

/** `start`/`end` rather than left/right so the arrows swap under RTL. */
function GalleryArrow({
  side,
  onClick,
}: {
  side: "start" | "end";
  onClick: () => void;
}) {
  const Icon = side === "start" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === "start" ? "Previous image" : "Next image"}
      className={`absolute top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/45 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70 sm:flex ${
        side === "start" ? "start-3" : "end-3"
      }`}
    >
      <Icon size={17} strokeWidth={1.6} className="rtl:-scale-x-100" />
    </button>
  );
}
