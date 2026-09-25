"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { MapPin, ArrowUpRight } from "lucide-react";
import { useSite } from "@/lib/context/site-context";
import { ProjectDetail } from "@/components/sections/ProjectDetail";
import { PROJECTS, DEVELOPERS, type Project } from "@/lib/projects";
import { localizeProject } from "@/lib/i18n/project-copy";
import { interpolate } from "@/lib/i18n";
import { PROJECTS_SECTION_ID } from "@/lib/site-config";

export function ProjectsGrid() {
  const { t } = useSite();
  const [developer, setDeveloper] = useState("all");
  const [active, setActive] = useState<Project | null>(null);

  // Deep link from the homepage: /projects?p=<slug> opens that project.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("p");
    const hit = slug && PROJECTS.find((p) => p.slug === slug);
    if (hit) setActive(hit);
  }, []);

  const shown = developer === "all" ? PROJECTS : PROJECTS.filter((p) => p.developer === developer);

  return (
    <section id={PROJECTS_SECTION_ID} className="scroll-mt-24 py-16 sm:py-24">
      <div className="mx-auto max-w-[1320px] px-5 sm:px-8">
        <div className="flex flex-col gap-6 border-b border-[var(--hairline)] pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:flex-wrap sm:px-0">
            {["all", ...DEVELOPERS].map((d) => {
              const on = developer === d;
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setDeveloper(d)}
                  className={`shrink-0 border px-4 py-2 font-[family-name:var(--font-eyebrow)] text-[10.5px] font-semibold uppercase tracking-[0.14em] transition-colors rtl:tracking-normal ${
                    on
                      ? "border-[var(--accent-solid)] bg-[var(--accent-solid)] text-white"
                      : "border-[var(--hairline-strong)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {d === "all" ? t.projects.allDevelopers : d}
                </button>
              );
            })}
          </div>
          <span className="kicker shrink-0">{interpolate(t.pages.projects.count, { count: shown.length })}</span>
        </div>

        <div className="mt-12 grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((project, i) => (
            <ProjectTile key={project.slug} project={project} index={i} onOpen={() => setActive(project)} />
          ))}
        </div>

        <p className="mt-16 max-w-[80ch] text-[13px] leading-[1.75] text-[var(--text-muted)]">{t.projects.disclaimer}</p>
      </div>

      <ProjectDetail project={active} onClose={() => setActive(null)} />
    </section>
  );
}

function ProjectTile({ project, index, onOpen }: { project: Project; index: number; onOpen: () => void }) {
  const { t, locale } = useSite();
  const reduce = useReducedMotion();
  const p = localizeProject(project, locale);

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: (index % 3) * 0.08, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <button type="button" onClick={onOpen} className="group block w-full text-start">
        <div className="zoom-media relative aspect-[4/3] overflow-hidden bg-[var(--surface-sunken)]">
          <Image src={project.image} alt={project.name} fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover" />
          <span className="absolute start-4 top-4 bg-[rgb(7_26_46/0.78)] px-3 py-1.5 font-[family-name:var(--font-eyebrow)] text-[9.5px] font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm rtl:tracking-normal">
            {project.developer}
          </span>
        </div>
        <div className="mt-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="font-[family-name:var(--font-display)] text-[26px] font-medium leading-[1.1] text-[var(--text-primary)] rtl:font-[family-name:var(--font-display-ar)]">
              {project.name}
            </h3>
            <p className="mt-2 flex items-center gap-1.5 text-[13.5px] text-[var(--text-muted)]">
              <MapPin size={13} strokeWidth={1.5} />
              {project.community}
            </p>
          </div>
          <span className="mt-1 grid h-10 w-10 shrink-0 place-items-center border border-[var(--hairline-strong)] text-[var(--text-primary)] transition-colors duration-300 group-hover:border-[var(--accent-solid)] group-hover:bg-[var(--accent-solid)] group-hover:text-white">
            <ArrowUpRight size={16} strokeWidth={1.5} className="rtl:-scale-x-100" />
          </span>
        </div>
        <p className="mt-3 line-clamp-2 text-[14.5px] leading-[1.7] text-[var(--text-secondary)]">{p.blurb}</p>
        <p className="mt-3 text-[13px] text-[var(--text-muted)]">{p.unitMix}</p>
        <span className="sr-only">{t.projects.viewDetail}</span>
      </button>
    </motion.article>
  );
}
