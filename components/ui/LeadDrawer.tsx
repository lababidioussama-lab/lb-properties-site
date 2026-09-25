"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X, Upload, Check } from "lucide-react";

import { useSite } from "@/lib/context/site-context";
import { SITE, type ServiceKey } from "@/lib/site-config";
import { formatCurrency } from "@/lib/currency";
import { buildWhatsAppUrl, isPlausiblePhone, type LeadPayload } from "@/lib/lead";
import { Button } from "./Button";
import { IconWhatsApp } from "./Icons";

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png"];

type Status = "idle" | "submitting" | "done";

export function LeadDrawer() {
  const { t, locale, currency, drawerOpen, closeDrawer, activeService, selections } = useSite();
  const reduceMotion = useReducedMotion();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [waUrl, setWaUrl] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    setStatus("idle");
    setError(null);
    setWaUrl(null);
    const id = window.setTimeout(() => firstFieldRef.current?.focus(), 260);
    return () => window.clearTimeout(id);
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
      if (e.key !== "Tab") return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"])',
      );
      if (!focusables?.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

  const subtitle = useMemo(() => {
    const map: Record<ServiceKey, string> = {
      advisory: t.form.subtitleAdvisory,
      netRoi: t.form.subtitleNetRoi,
      relocation: t.form.subtitleRelocation,
      maintenance: t.form.subtitleMaintenance,
      fitout: t.form.subtitleFitout,
      construction: t.form.subtitleConstruction,
      mortgage: t.form.subtitleMortgage,
    };
    return map[activeService];
  }, [activeService, t]);

  const summary = useMemo(() => {
    const rows: { label: string; value: string }[] = [];
    const s = selections;
    if (s.budgetAed !== undefined)
      rows.push({ label: t.roi.budgetLabel, value: formatCurrency(s.budgetAed, currency) });
    if (s.goal) rows.push({ label: t.roi.goalLabel, value: t.roi.goals[s.goal] });
    if (s.netAnnualAed !== undefined)
      rows.push({
        label: t.roi.results.netAnnual,
        value: formatCurrency(s.netAnnualAed, currency),
      });

    if (s.roiMode) rows.push({ label: t.netRoi.modeLabel, value: s.roiMode });
    if (s.roiNetYieldPct !== undefined)
      rows.push({
        label: t.netRoi.results.netOnOutlay,
        value: `${s.roiNetYieldPct.toFixed(2)}%`,
      });

    if (s.mortgagePropertyStatus)
      rows.push({ label: t.mortgage.statusLabel, value: s.mortgagePropertyStatus });
    if (s.mortgageLoanAed !== undefined)
      rows.push({
        label: t.mortgage.results.loan,
        value: formatCurrency(s.mortgageLoanAed, currency),
      });
    if (s.mortgageCashRequiredAed !== undefined)
      rows.push({
        label: t.mortgage.results.cashRequired,
        value: formatCurrency(s.mortgageCashRequiredAed, currency),
      });

    if (s.planId) {
      const plan = t.maintenance.plans[s.planId as keyof typeof t.maintenance.plans];
      rows.push({ label: t.common.selectPlan, value: plan?.name ?? s.planId });
    }
    if (s.relocationCard) rows.push({ label: t.nav.relocation, value: s.relocationCard });
    if (s.fitoutPackage) rows.push({ label: t.nav.fitout, value: s.fitoutPackage });
    if (s.fitoutMaterial)
      rows.push({ label: t.fitout.materials.title, value: s.fitoutMaterial });
    return rows;
  }, [selections, currency, t]);

  function handleFile(files: FileList | null) {
    const chosen = files?.[0] ?? null;
    if (!chosen) return setFile(null);
    if (!ACCEPTED.includes(chosen.type)) return setError(t.form.errorFileType);
    if (chosen.size > MAX_FILE_BYTES) return setError(t.form.errorFileSize);
    setError(null);
    setFile(chosen);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === "submitting") return;

    if (!fullName.trim() || !phone.trim()) return setError(t.form.errorRequired);
    if (!isPlausiblePhone(phone)) return setError(t.form.errorPhone);

    setError(null);
    setStatus("submitting");

    const payload: LeadPayload = {
      service: activeService,
      fullName: fullName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
      locale,
      currency,
      company: company || undefined,
      selections: {
        ...selections,
        floorPlanName: file?.name,
      },
    };

    // Built before the network call: WhatsApp delivery must survive the
    // database being unreachable, so it can never depend on the response.
    const url = buildWhatsAppUrl(payload);
    setWaUrl(url);

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        console.warn("Lead not persisted:", body?.error ?? response.status);
        setError(t.form.errorGeneric);
      }
    } catch (cause) {
      console.warn("Lead request failed:", cause);
      setError(t.form.errorGeneric);
    }

    setStatus("done");
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <AnimatePresence>
      {drawerOpen && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={t.form.title}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeDrawer}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            ref={panelRef}
            initial={reduceMotion ? { opacity: 0 } : { x: "100%" }}
            animate={reduceMotion ? { opacity: 1 } : { x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 34 }}
            className="absolute inset-y-0 end-0 flex w-full max-w-[480px] flex-col border-s border-[var(--glass-border)] bg-[var(--surface-raised)] shadow-[var(--shadow-lift)]"
          >
            <div className="relative border-b border-[var(--hairline)] px-6 pb-6 pt-7">
              {/* A faint accent wash behind the header separates it from the
                  form body without another hard rule. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[var(--accent-wash)] to-transparent"
              />
              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-[family-name:var(--font-display)] text-[30px] font-normal leading-[1.1] text-[var(--text-primary)]">
                    {t.form.title}
                  </h2>
                  <p className="mt-2.5 max-w-[38ch] text-[13px] leading-relaxed text-[var(--text-muted)]">
                    {subtitle}
                  </p>
                  {/* The single most reassuring fact at the point of enquiry:
                      how quickly a human actually replies. */}
                  <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-[var(--glass-border-lit)] bg-[var(--accent-wash)] px-3 py-1.5 text-[11px] text-[var(--text-secondary)]">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-emerald-wa)] opacity-70" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-emerald-wa)]" />
                    </span>
                    {t.hero.stats.responseValue}
                  </span>
                </div>
                <button
                  onClick={closeDrawer}
                  aria-label={t.form.close}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--hairline)] text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>

            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {status === "done" ? (
                <SuccessPanel waUrl={waUrl} error={error} />
              ) : (
                <form id="lead-form" onSubmit={handleSubmit} className="space-y-5">
                  {summary.length > 0 && (
                    <div className="rounded-xl border border-[var(--glass-border-lit)] bg-[var(--accent-wash)] p-4">
                      <h3 className="eyebrow">{t.form.summaryTitle}</h3>
                      <dl className="mt-3 space-y-2">
                        {summary.map((row) => (
                          <div key={row.label} className="flex justify-between gap-4 text-[12.5px]">
                            <dt className="text-[var(--text-muted)]">{row.label}</dt>
                            <dd className="figure text-end font-medium text-[var(--text-primary)]">
                              {row.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  )}

                  <>
                      <Field label={t.form.name} required>
                        <input
                          ref={firstFieldRef}
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder={t.form.namePlaceholder}
                          autoComplete="name"
                          className={INPUT}
                        />
                      </Field>

                      <Field label={t.form.phone} required>
                        <input
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder={t.form.phonePlaceholder}
                          type="tel"
                          dir="ltr"
                          autoComplete="tel"
                          className={`${INPUT} figure`}
                        />
                      </Field>

                      <Field label={t.form.email} hint={t.form.emailOptional}>
                        <input
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder={t.form.emailPlaceholder}
                          type="email"
                          dir="ltr"
                          autoComplete="email"
                          className={INPUT}
                        />
                      </Field>

                      {activeService === "fitout" && (
                        <Field label={t.form.floorPlan} hint={t.fitout.upload.hint}>
                          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-[var(--hairline-strong)] px-4 py-3.5 text-[13px] text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
                            <Upload size={17} strokeWidth={1.5} />
                            <span className="truncate">
                              {file ? file.name : t.form.floorPlanChoose}
                            </span>
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={(e) => handleFile(e.target.files)}
                              className="sr-only"
                            />
                          </label>
                        </Field>
                      )}

                      <Field label={t.form.notes}>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder={t.form.notesPlaceholder}
                          rows={3}
                          className={`${INPUT} resize-none`}
                        />
                      </Field>
                    </>

                  {/* Honeypot: off-screen and unlabelled to humans. */}
                  <div aria-hidden="true" className="absolute -left-[9999px] opacity-0">
                    <label>
                      Company
                      <input
                        tabIndex={-1}
                        autoComplete="off"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                      />
                    </label>
                  </div>

                  {error && (
                    <p role="alert" className="text-[12.5px] text-[#e0645f]">
                      {error}
                    </p>
                  )}
                </form>
              )}
            </div>

            {status !== "done" && (
              <div className="border-t border-[var(--hairline)] px-6 py-5">
                <Button
                  type="submit"
                  variant="cta"
                  size="lg"
                  fullWidth
                  disabled={status === "submitting"}
                  onClick={() =>
                    (document.getElementById("lead-form") as HTMLFormElement | null)?.requestSubmit()
                  }
                >
                  <IconWhatsApp size={16} />
                  {status === "submitting" ? t.form.submitting : t.form.submit}
                </Button>
                <p className="mt-3 text-center text-[11px] text-[var(--text-muted)]">
                  {t.form.privacy}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* Taller, quieter fields with a real focus state.
   The previous version changed only the border colour on focus, which on a
   hairline border is nearly invisible; a ring plus a ground shift makes the
   active field unambiguous without shouting. */
const INPUT =
  "w-full rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface)] px-4 py-3.5 text-[14.5px] " +
  "text-[var(--text-primary)] placeholder:text-[var(--text-muted)]/70 outline-none " +
  "transition-[border-color,box-shadow,background-color] duration-300 [transition-timing-function:var(--ease-lux)] " +
  "hover:border-[var(--text-muted)] " +
  "focus:border-[var(--accent)] focus:bg-[var(--surface-raised)] focus:shadow-[0_0_0_3px_var(--accent-wash)]";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-baseline justify-between gap-2">
        <span className="flex items-baseline gap-1.5">
          <span className="eyebrow text-[var(--text-secondary)]">{label}</span>
          {/* A bare red asterisk reads as an error marker. Naming the state
              is clearer and does not depend on colour. */}
          {required && (
            <span className="text-[9px] uppercase tracking-[0.12em] text-[var(--accent)]">
              •
            </span>
          )}
        </span>
        {hint && (
          <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
            {hint}
          </span>
        )}
      </span>
      {children}
    </label>
  );
}

function SuccessPanel({ waUrl, error }: { waUrl: string | null; error: string | null }) {
  const { t } = useSite();
  return (
    <div className="flex flex-col items-center py-10 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full border border-[var(--glass-border-lit)] bg-[var(--accent-wash)] text-[var(--accent)]">
        <Check size={28} strokeWidth={1.5} />
      </span>
      <h3 className="display-3 mt-6 text-[var(--text-primary)]">{t.form.successTitle}</h3>
      <p className="mt-3 max-w-[34ch] text-[13.5px] leading-relaxed text-[var(--text-muted)]">
        {t.form.successBody}
      </p>
      {/* Shown when the insert failed: the enquiry still reaches us, and
          saying so is more useful than a silent success. */}
      {error && <p className="mt-4 max-w-[34ch] text-[12px] text-[var(--text-muted)]">{error}</p>}
      {waUrl && (
        <a
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 text-[12.5px] text-[var(--accent)] underline underline-offset-4"
        >
          <IconWhatsApp size={15} />
          {t.form.successManual}
        </a>
      )}
      <p className="figure mt-8 text-[12px] text-[var(--text-muted)]" dir="ltr">
        {SITE.phoneDisplay}
      </p>
    </div>
  );
}
