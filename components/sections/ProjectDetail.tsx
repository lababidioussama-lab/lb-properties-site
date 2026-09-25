"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X, MapPin, Building2, Clock, Check } from "lucide-react";
import { useSite } from "@/lib/context/site-context";
import { Gallery } from "@/components/ui/Gallery";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/currency";
import { localizeProject } from "@/lib/i18n/project-copy";
import type { Project } from "@/lib/projects";

/**
 * Project detail dialog.
 *
 * Deliberately a dialog rather than a route: the enquiry is the point, and
 * a full page navigation loses the scroll position and the widget state the
 * visitor has already built up further down the page.
 */
export function ProjectDetail({
  project,
  onClose,
}: {
  project: Project | null;
  onClose: () => void;
}) {
  const { t, currency, locale, openDrawer } = useSite();
  const reduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const open = project !== null;
  const p = project ? localizeProject(project, locale) : null;

  // Escape to close, and lock the page behind the dialog so a scroll gesture
  // over the backdrop does not run the page underneath.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    const body = document.body;
    const prev = body.style.overflow;
    body.style.overflow = "hidden";

    panelRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {project && p && (
        <div
          className="fixed inset-0 z-[85] flex items-end justify-center sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={project.name}
        >
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 40, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.99 }}
            transition={{ duration: 0.36, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative flex max-h-[92vh] w-full max-w-[920px] flex-col overflow-hidden rounded-t-2xl border border-[var(--glass-border)] bg-[var(--surface-raised)] outline-none sm:rounded-2xl"
          >
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="absolute end-3 top-3 z-10 rounded-full border border-white/20 bg-black/45 p-2 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
            >
              <X size={16} strokeWidth={1.6} />
            </button>

            <div className="overflow-y-auto">
              <Gallery
                images={project.images}
                alt={project.name}
                className="rounded-none"
              />

              <div className="p-6 sm:p-8">
                <span className="eyebrow text-[var(--accent)]">
                  {project.developer}
                </span>

                <h2 className="display-2 mt-3 text-[var(--text-primary)]">
                  {project.name}
                </h2>

                <p className="mt-3 flex items-center gap-1.5 text-[13px] text-[var(--text-muted)]">
                  <MapPin size={14} strokeWidth={1.5} />
                  {project.community}
                </p>

                <p className="mt-6 max-w-[68ch] text-[14.5px] leading-[1.8] text-[var(--text-secondary)]">
                  {p.about}
                </p>

                <div className="mt-8 grid gap-8 sm:grid-cols-2">
                  <div>
                    <h3 className="eyebrow">{t.projects.unitMixLabel}</h3>
                    <p className="mt-2 flex items-start gap-2 text-[13.5px] leading-[1.7] text-[var(--text-secondary)]">
                      <Building2 size={14} strokeWidth={1.5} className="mt-1 shrink-0" />
                      {p.unitMix}
                    </p>

                    {p.connectivity && (
                      <>
                        <h3 className="eyebrow mt-6">{t.projects.connectivityLabel}</h3>
                        <ul className="mt-2 space-y-1.5">
                          {p.connectivity.map((c) => (
                            <li
                              key={c.label}
                              className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]"
                            >
                              <Clock size={13} strokeWidth={1.5} className="shrink-0 text-[var(--text-muted)]" />
                              <span className="font-[family-name:var(--font-numeric)] tabular-nums">
                                {c.minutes}
                              </span>
                              {t.projects.minutesTo} {c.label}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>

                  <div>
                    <h3 className="eyebrow">{t.projects.highlightsLabel}</h3>
                    <ul className="mt-2 space-y-1.5">
                      {p.highlights.map((h) => (
                        <li
                          key={h}
                          className="flex items-start gap-2 text-[13.5px] leading-[1.7] text-[var(--text-secondary)]"
                        >
                          <Check size={14} strokeWidth={2} className="mt-1 shrink-0 text-[var(--accent)]" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <dl className="mt-8 grid grid-cols-2 gap-4 border-t border-[var(--hairline)] pt-5 sm:max-w-sm">
                  <div>
                    <dt className="eyebrow text-[9px]">{t.projects.priceLabel}</dt>
                    <dd className="mt-1 font-[family-name:var(--font-numeric)] text-[14px] font-medium text-[var(--text-primary)]">
                      {project.priceFrom
                        ? formatCurrency(project.priceFrom, currency)
                        : t.projects.onRequest}
                    </dd>
                  </div>
                  <div>
                    <dt className="eyebrow text-[9px]">{t.projects.planLabel}</dt>
                    <dd className="mt-1 text-[14px] font-medium text-[var(--text-primary)]">
                      {project.paymentPlan ?? t.projects.onRequest}
                    </dd>
                  </div>
                </dl>

                <Button
                  className="mt-7 w-full sm:w-auto"
                  onClick={() => {
                    onClose();
                    openDrawer("advisory", {
                      project: project.name,
                      projectDeveloper: project.developer,
                      projectCommunity: project.community,
                    });
                  }}
                >
                  {t.projects.cta}
                </Button>

                <p className="mt-6 text-[11.5px] leading-[1.7] text-[var(--text-muted)]">
                  {t.projects.disclaimer}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
