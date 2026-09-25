"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { MapPin, ChevronLeft, ChevronRight, Images, ArrowUpRight } from "lucide-react";
import { useSite } from "@/lib/context/site-context";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ProjectDetail } from "@/components/sections/ProjectDetail";
import { PROJECTS, DEVELOPERS, type Project } from "@/lib/projects";
import { formatCurrency } from "@/lib/currency";
import { localizeProject } from "@/lib/i18n/project-copy";
import { ParallaxFrame } from "@/components/ui/Cinematic";

/**
 * Off-plan allocations, presented as a horizontal rail.
 *
 * A stacked grid of fourteen projects added roughly six thousand pixels of
 * vertical scroll to a page that was already long, and buried everything
 * after it. A rail keeps the whole set to one screen of height: the visitor
 * swipes sideways through the inventory and only goes deep on the one they
 * care about, which is also how they already browse property on a phone.
 *
 * Native scroll-snap does the work rather than a transform carousel — it
 * gives real momentum, real touch behaviour and correct RTL for free.
 */
const SECTION_ID = "off-plan-projects";

export function ProjectListings() {
  const { t } = useSite();
  const [developer, setDeveloper] = useState("all");
  const [active, setActive] = useState<Project | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const shown =
    developer === "all"
      ? PROJECTS
      : PROJECTS.filter((p) => p.developer === developer);

  /* Which arrows are usable. scrollLeft is negative in RTL in every engine
     that matters now, so the magnitude is what gets compared. */
  const syncEdges = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const x = Math.abs(el.scrollLeft);
    setEdge({
      start: x < 8,
      end: x + el.clientWidth >= el.scrollWidth - 8,
    });
  }, []);

  useEffect(() => {
    syncEdges();
    const el = railRef.current;
    if (!el) return;
    el.addEventListener("scroll", syncEdges, { passive: true });
    window.addEventListener("resize", syncEdges);
    return () => {
      el.removeEventListener("scroll", syncEdges);
      window.removeEventListener("resize", syncEdges);
    };
  }, [syncEdges, shown.length]);

  const nudge = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    // One card plus its gap, so a click always lands on a snap point.
    const step = el.querySelector("article")?.clientWidth ?? 320;
    el.scrollBy({ left: dir * (step + 24), behavior: "smooth" });
  };

  return (
    <section
      id={SECTION_ID}
      className="relative scroll-mt-24 overflow-hidden border-t border-[var(--hairline)] bg-[var(--surface-sunken)] py-16 sm:py-20 lg:py-24"
    >
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <SectionHeader
          eyebrow={t.projects.eyebrow}
          title={t.projects.title}
          subtitle={t.projects.subtitle}
          variant="split"
        />

        <div className="mt-10 flex flex-wrap items-center gap-2">
          {["all", ...DEVELOPERS].map((d) => {
            const on = developer === d;
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setDeveloper(d);
                  railRef.current?.scrollTo({ left: 0 });
                }}
                className={`rounded-full border px-3.5 py-1.5 font-[family-name:var(--font-eyebrow)] text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors ${
                  on
                    ? "border-transparent bg-[var(--accent-solid)] text-white"
                    : "border-[var(--hairline-strong)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                }`}
              >
                {d === "all" ? t.projects.allDevelopers : d}
              </button>
            );
          })}

          <span className="ms-auto hidden items-center gap-2 sm:flex">
            <RailArrow dir={-1} disabled={edge.start} onClick={() => nudge(-1)} />
            <RailArrow dir={1} disabled={edge.end} onClick={() => nudge(1)} />
          </span>
        </div>
      </div>

      {/* The rail lives in the same column as the copy so the first card
          aligns with the heading. The next card peeks past the container
          edge, which — with the arrows — is the affordance that there is
          more to the right. */}
      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <div
          ref={railRef}
          className="no-scrollbar mt-8 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth pb-4"
        >
          {shown.map((project, i) => (
            <ProjectCard
              key={project.slug}
              project={project}
              index={i}
              onOpen={() => setActive(project)}
            />
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
        <p className="mt-6 flex items-center gap-2 text-[11.5px] text-[var(--text-muted)] sm:hidden">
          <ChevronRight size={13} className="rtl:-scale-x-100" />
          {t.projects.swipeHint}
        </p>
        <p className="mt-8 max-w-[70ch] text-[12px] leading-[1.75] text-[var(--text-muted)]">
          {t.projects.disclaimer}
        </p>
      </div>

      <ProjectDetail project={active} onClose={() => setActive(null)} />
    </section>
  );
}

function RailArrow({
  dir,
  disabled,
  onClick,
}: {
  dir: 1 | -1;
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = dir === -1 ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === -1 ? "Previous projects" : "Next projects"}
      className="rounded-full border border-[var(--hairline-strong)] p-2 text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-30"
    >
      <Icon size={16} strokeWidth={1.6} className="rtl:-scale-x-100" />
    </button>
  );
}

function ProjectCard({
  project,
  index,
  onOpen,
}: {
  project: Project;
  index: number;
  onOpen: () => void;
}) {
  const { t, currency, locale } = useSite();
  const reduceMotion = useReducedMotion();
  // Prose swaps per locale; the facts and imagery do not.
  const p = localizeProject(project, locale);

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0 }}
      whileInView={reduceMotion ? undefined : { opacity: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.75, delay: Math.min(index, 4) * 0.05 }}
      className="group w-[300px] shrink-0 snap-start sm:w-[340px]"
    >
      {/* One button wrapping the whole card: the entire surface is the
          affordance, and it stays a single tab stop rather than three. */}
      <button
        type="button"
        onClick={onOpen}
        className="flex h-full w-full flex-col overflow-hidden rounded-xl border border-[var(--glass-border)] bg-[var(--surface-raised)] text-start transition-all duration-500 [transition-timing-function:var(--ease-lux)] hover:border-[var(--accent-dim)] hover:shadow-[var(--shadow-lift)]"
      >
        <ParallaxFrame speed={0.1} className="aspect-[4/3]">
          <Image
            src={project.image}
            alt={`${project.name}, ${project.community}`}
            fill
            sizes="340px"
            className="object-cover transition-transform duration-[900ms] [transition-timing-function:var(--ease-lux)] group-hover:scale-[1.06]"
          />
          {/* Scrim: the developer chip and the name both sit over imagery
              that could be any brightness. */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/25" />

          <span className="absolute start-3 top-3 rounded-full bg-white/12 px-2.5 py-1 font-[family-name:var(--font-eyebrow)] text-[9px] font-semibold uppercase tracking-[0.14em] text-white backdrop-blur-md">
            {project.developer}
          </span>

          <span className="absolute end-3 top-3 flex items-center gap-1 rounded-full bg-black/45 px-2 py-1 font-[family-name:var(--font-numeric)] text-[10px] tabular-nums text-white backdrop-blur-sm">
            <Images size={11} strokeWidth={1.6} />
            {project.images.length}
          </span>

          <div className="absolute inset-x-0 bottom-0 p-4">
            <h3 className="font-[family-name:var(--font-display)] text-[23px] font-normal leading-[1.15] text-white">
              {project.name}
            </h3>
            <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-white/75">
              <MapPin size={11} strokeWidth={1.5} className="shrink-0" />
              {project.community}
            </p>
          </div>
        </ParallaxFrame>

        <div className="flex flex-1 flex-col p-5">
          <p className="text-[13px] leading-[1.65] text-[var(--text-secondary)]">
            {p.blurb}
          </p>

          <p className="mt-3 text-[12px] leading-[1.6] text-[var(--text-muted)]">
            {p.unitMix}
          </p>

          <div className="min-h-4 flex-1" />

          <div className="mt-4 flex items-end justify-between border-t border-[var(--hairline)] pt-4">
            <div>
              <span className="eyebrow text-[9px]">{t.projects.priceLabel}</span>
              <p className="mt-1 font-[family-name:var(--font-numeric)] text-[13px] font-medium text-[var(--text-primary)]">
                {project.priceFrom
                  ? formatCurrency(project.priceFrom, currency)
                  : t.projects.onRequest}
              </p>
            </div>
            <span className="flex items-center gap-1.5 font-[family-name:var(--font-eyebrow)] text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">
              {t.projects.viewDetail}
              <ArrowUpRight
                size={13}
                strokeWidth={2}
                className="transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 rtl:-scale-x-100"
              />
            </span>
          </div>
        </div>
      </button>
    </motion.article>
  );
}
