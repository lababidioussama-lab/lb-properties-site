import type { Project } from "@/lib/projects";
import type { Locale } from "./types";
import { ruProjectCopy } from "./project-copy/ru";
import { zhProjectCopy } from "./project-copy/zh";

/**
 * Translated prose for the project cards.
 *
 * The projects themselves stay in lib/projects.ts as one set of facts —
 * developer, unit counts, imagery, sourcing. Only the prose is overlaid per
 * locale, keyed by slug, so adding a project never means editing ten
 * translation files and a project can never exist in Russian but not in
 * English.
 *
 * Deliberately NOT translated:
 *  - `name`, because "Palace Beach Residence" is the registered project
 *    name a buyer will search for and see on the SPA agreement;
 *  - `developer`, for the same reason;
 *  - `community`, which is the address as DLD records it.
 * Transliterating any of those would make the listing harder to match
 * against the developer's own paperwork, not easier to read.
 */
export interface ProjectCopy {
  blurb: string;
  about: string;
  unitMix: string;
  highlights: string[];
  /** Same order and length as the project's own connectivity array. */
  connectivity?: string[];
}

export type ProjectCopyMap = Partial<Record<string, ProjectCopy>>;

const OVERLAYS: Partial<Record<Locale, ProjectCopyMap>> = {
  ru: ruProjectCopy,
  zh: zhProjectCopy,
};

/**
 * Returns the project with its prose swapped for the requested locale,
 * falling back field by field. A half-finished translation therefore shows
 * translated copy where it exists and English where it does not, rather
 * than blanking the card.
 */
export function localizeProject(project: Project, locale: Locale): Project {
  const copy = OVERLAYS[locale]?.[project.slug];
  if (!copy) return project;

  return {
    ...project,
    blurb: copy.blurb || project.blurb,
    about: copy.about || project.about,
    unitMix: copy.unitMix || project.unitMix,
    highlights: copy.highlights?.length ? copy.highlights : project.highlights,
    connectivity: project.connectivity?.map((entry, i) => ({
      ...entry,
      // Length is asserted by the test below rather than assumed here.
      label: copy.connectivity?.[i] ?? entry.label,
    })),
  };
}
