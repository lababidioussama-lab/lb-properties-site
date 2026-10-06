"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { X } from "lucide-react";
import { CountText } from "./Motion";
import type { Stage } from "@/lib/crm";

export type Json = Record<string, unknown>;
export type ApiResult<T> = T & { ok: boolean; error?: string };

export async function api<T = Json>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  resource: string,
  body?: Json,
  query?: string,
): Promise<ApiResult<Partial<T>>> {
  if (typeof window !== "undefined" && (window as { __CRM_DEMO__?: boolean }).__CRM_DEMO__) {
    const { demoApi } = await import("./demo");
    return (await demoApi(method, resource, body, query)) as ApiResult<Partial<T>>;
  }
  const res = await fetch(`/api/crm/${resource}${query ? `?${query}` : ""}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) window.location.reload();
  return (await res.json().catch(() => ({ ok: false, error: `Server error ${res.status}. Try again, or tell the admin.` }))) as ApiResult<Partial<T>>;
}

export const money = (v: number | null | undefined) =>
  v == null ? "—" : `AED ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(v)}`;

export const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—";

export const stamp = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** ISO → value for <input type="datetime-local"> in the viewer's timezone. */
export const toInputDate = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export const isOverdue = (iso: string | null) => !!iso && new Date(iso).getTime() < Date.now();

/** A number as wa.me needs it: digits only, in international form. UAE
 *  numbers typed locally (050 123 4567, or 50 123 4567) get their 971. */
export const waDigits = (phone: string) => {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (/^0\d{9}$/.test(d)) d = `971${d.slice(1)}`;      // 05x xxx xxxx, 04 xxx xxxx
  else if (/^5\d{8}$/.test(d)) d = `971${d}`;          // 5x xxx xxxx
  return d;
};
export const whatsapp = (phone: string, text?: string) => `https://wa.me/${waDigits(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

/* Design A · Ledger. Stages are ordinal, so they share one neutral chip and
   differ only by the dot: grey, blue, navy; won green; lost faded. */
export const STAGE_DOT: Record<Stage, string> = {
  new: "var(--text-muted)",
  contacted: "var(--info)",
  viewing: "var(--info)",
  offer: "var(--accent-solid)",
  won: "var(--ok)",
  lost: "var(--text-disabled)",
};
export const STAGE_STYLE: Record<Stage, string> = {
  new: "bg-[var(--neutral-bg)] text-[var(--text-primary)] border-transparent",
  contacted: "bg-[var(--neutral-bg)] text-[var(--text-primary)] border-transparent",
  viewing: "bg-[var(--neutral-bg)] text-[var(--text-primary)] border-transparent",
  offer: "bg-[var(--neutral-bg)] text-[var(--text-primary)] border-transparent",
  won: "bg-[var(--ok-bg)] text-[var(--ok)] border-transparent",
  lost: "bg-[var(--neutral-bg)] text-[var(--text-muted)] border-transparent",
};

/** The five status tones, each with one fixed meaning:
 *  bad = a deadline passed or a legal item missing · warn = approaching ·
 *  ok = done and clean · info = a fact · neutral = inactive. */
export type Tone = "ok" | "warn" | "bad" | "info" | "neutral";
export const TONE: Record<Tone, string> = {
  ok: "bg-[var(--ok-bg)] text-[var(--ok)]",
  warn: "bg-[var(--warn-bg)] text-[var(--warn)]",
  bad: "bg-[var(--bad-bg)] text-[var(--bad)]",
  info: "bg-[var(--info-bg)] text-[var(--info)]",
  neutral: "bg-[var(--neutral-bg)] text-[var(--neutral)]",
};

/** 22px pill: sentence case, one tone, at most one dot. */
export function Chip({ tone = "neutral", dot, children, className = "" }: { tone?: Tone; dot?: string; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex h-[22px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[11px] font-medium ${TONE[tone]} ${className}`}>
      {dot && <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />}
      {children}
    </span>
  );
}

/** A stage is a dot and a word, not a coloured pill: stages are ordinal. */
export function StageChip({ stage, label }: { stage: Stage; label: string }) {
  return (
    <span className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap text-[12px] font-medium ${STAGE_STYLE[stage]} !bg-transparent`}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_DOT[stage] }} />
      {label}
    </span>
  );
}

/* Controls as DB Search draws them: 40px, radius 9-10, a quiet tint by
   default, and the emerald-to-blue gradient only on a screen's main action. */
export const INPUT =
  "w-full h-9 rounded-[9px] border border-[var(--hairline)] bg-[var(--input-bg)] px-3.5 text-[14px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-wash)] disabled:opacity-60 [&:is(textarea)]:h-auto [&:is(textarea)]:py-2.5";

/** The main button, as DB Search draws its Search and Sign in buttons:
 *  the emerald-to-blue gradient. */
export const BTN_GO =
  "btn-go inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-transparent px-4 text-[13px] font-semibold disabled:pointer-events-none disabled:opacity-60";
export const BTN = BTN_GO;

/** DB Search's .btn tint: for a second action that still wants colour. */
export const BTN_TINT =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--accent-dim)] bg-[var(--accent-wash)] px-4 text-[13px] font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent-solid)] hover:text-white disabled:pointer-events-none disabled:opacity-50";

/** DB Search's .btn-secondary: outline, muted until hovered. */
export const BTN_GHOST =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--hairline)] bg-transparent px-4 text-[13px] font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--hairline-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] disabled:pointer-events-none disabled:opacity-50";

/** Text only: the quiet third button. */
export const BTN_QUIET =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 text-[13px] font-semibold text-[var(--accent)] transition-colors hover:bg-[var(--accent-wash)] disabled:pointer-events-none disabled:opacity-50";

/** Square icon button; always give it an aria-label. */
export const BTN_ICON =
  "inline-flex h-10 w-10 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-[9px] border border-[var(--hairline)] bg-transparent text-[var(--text-muted)] transition-colors hover:border-[var(--hairline-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]";

/** The one line under a page title that replaces rows of KPI tiles. */
export function StatusLine({ children }: { children: ReactNode }) {
  return <p className="text-[13px] text-[var(--text-secondary)] [&_b]:font-semibold [&_b]:text-[var(--text-primary)] [&_.bad]:text-[var(--bad)]">{children}</p>;
}

/** Segmented control, as DB Search's sign-in switch: the chosen option
 *  carries the gradient, and it slides to the next choice. */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  const group = useId();
  return (
    <div role="tablist" className="inline-flex shrink-0 gap-0.5 rounded-full border border-[var(--hairline)] bg-[var(--input-bg)] p-1">
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button key={o.id} role="tab" aria-selected={on} onClick={() => onChange(o.id)}
            className={`relative h-8 rounded-full px-3.5 text-[12.5px] font-bold transition-colors ${on ? "text-[var(--on-accent)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
            {on && <motion.span layoutId={`seg-${group}`} transition={{ type: "spring", stiffness: 520, damping: 42 }} className="absolute inset-0 rounded-full bg-[image:var(--grad)]" />}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** DB Search's tabs: equal-width words on one rule; the accent line slides
 *  under the chosen one. */
export function ViewTabs<T extends string>({ value, options, onChange, className = "" }: { value: T; options: { id: T; label: string; count?: number }[]; onChange: (v: T) => void; className?: string }) {
  const group = useId();
  return (
    <div role="tablist" className={`flex overflow-x-auto border-b border-[var(--hairline)] [scrollbar-width:none] ${className}`}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <button key={o.id} role="tab" aria-selected={on} onClick={() => onChange(o.id)}
            className={`relative h-11 shrink-0 px-4 text-[13px] font-bold transition-colors ${on ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"}`}>
            {o.label}{o.count != null && <span className="figure ms-1.5 text-[11.5px] font-normal text-[var(--text-muted)]">{o.count}</span>}
            {on && <motion.span layoutId={`tab-${group}`} transition={{ type: "spring", stiffness: 520, damping: 42 }} className="absolute inset-x-[12%] -bottom-px h-[2px] bg-[var(--accent)]" />}
          </button>
        );
      })}
    </div>
  );
}

/** The last word of a heading goes into the italic serif, and it ends on a full stop. */
export function Headline({ text }: { text: string }) {
  const words = text.trim().split(/\s+/);
  const last = words.pop() ?? "";
  return <>{words.length ? `${words.join(" ")} ` : ""}<em>{last}</em>.</>;
}

/**
 * The page head: a small labelled pill, a very large heading whose last word
 * is italic, and the one-line description set off to the right, over a fine
 * rule. The pill carries the place's key figure.
 */
export function PageHead({ title, lede, figure, figureLabel, action, children }: {
  title: ReactNode;
  lede?: ReactNode;
  figure?: ReactNode;
  figureLabel?: ReactNode;
  action?: ReactNode;
  /** Tabs, set under the head. */
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 mt-8 md:mt-14">
      {figure != null && (
        <span className="crm-status crm-title-after mb-5">
          <i style={{ background: "var(--accent)" }} />
          {typeof figure === "number" ? <CountText text={String(figure)} /> : figure} {figureLabel}
        </span>
      )}
      <div className="page-head grid grid-cols-12 items-end gap-x-8 gap-y-4 pb-7">
        <h1 className="display page-title crm-title col-span-12 text-[var(--text-primary)] lg:col-span-7">{typeof title === "string" ? <Headline text={title} /> : title}</h1>
        {(lede || action) && (
          <div className="crm-title-after col-span-12 flex flex-wrap items-end justify-between gap-4 lg:col-span-5">
            {lede && <p className="max-w-[46ch] text-[14.5px] leading-relaxed text-[var(--text-muted)]">{lede}</p>}
            {action}
          </div>
        )}
      </div>
      {children && <div className="mt-3">{children}</div>}
    </header>
  );
}

/** Panel section header: 48px, title, optional count and action. */
export function CardHead({ title, count, action }: { title: ReactNode; count?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex h-12 items-center gap-3 border-b border-[var(--hairline)] px-5">
      <h2 className="flex-1 truncate text-[14.5px] font-bold text-[var(--text-primary)]">{title}</h2>
      {count != null && <span className="figure text-[12px] text-[var(--text-muted)]">{count}</span>}
      {action}
    </div>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="ds-label mb-1.5 block">
      {children}
    </span>
  );
}

/** A glass panel, as DB Search floats its boxes over the stars. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`panel ${className}`}>{children}</div>
  );
}

/* How many side panels are open, so the browser's Back closes a panel
   instead of leaving the screen, and one panel replacing another (opening
   the next lead) keeps a single history step. */
let openPanels = 0;

/** Right-hand slide-over used for lead and contact details. */
export function SidePanel({ title, subtitle, onClose, children, actions, wide = false }: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** Buttons shown beside the title (Call, WhatsApp…). */
  actions?: ReactNode;
  /** A record page: 1080px, and the children lay out their own columns. */
  wide?: boolean;
}) {
  /* Fields save on blur, so blur the focused one before closing — otherwise
     Escape or the backdrop would throw away whatever was just typed. */
  const close = () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    setTimeout(onClose, 0);
  };
  useEffect(() => {
    openPanels++;
    if (!(history.state as { crmPanel?: boolean } | null)?.crmPanel) history.pushState({ crmPanel: true }, "");
    const onBack = () => {
      (document.activeElement as HTMLElement | null)?.blur?.();
      setTimeout(onClose, 0);
    };
    window.addEventListener("popstate", onBack);
    return () => {
      window.removeEventListener("popstate", onBack);
      openPanels--;
      // Closed by its own button: take the panel's step back out of history, unless another panel took over.
      setTimeout(() => { if (openPanels === 0 && (history.state as { crmPanel?: boolean } | null)?.crmPanel) history.back(); }, 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      (document.activeElement as HTMLElement | null)?.blur?.();
      setTimeout(onClose, 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  /* Drawn straight onto the page, outside whatever screen opened it, so no
     animated or scrolling parent can move, clip or fade the panel. */
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close" onClick={close} className="crm-backdrop absolute inset-0 bg-[rgb(7_9_12/0.42)]" />
      <aside className={`crm-panel relative flex h-full w-full flex-col border-s border-[var(--hairline)] bg-[var(--surface-solid)] shadow-[var(--shadow-lift)] ${wide ? "max-w-[1080px]" : "max-w-[560px]"}`} style={{ backgroundImage: "var(--page-glow)" }}>
        <header className="flex flex-wrap items-center gap-3 border-b border-[var(--hairline)] px-6 py-5">
          <div className="min-w-0 flex-1">
            <h2 className="display truncate py-0.5 text-[22px] text-[var(--text-primary)]">
              {title}
            </h2>
            {subtitle && <div className="mt-1 text-[12px] text-[var(--text-muted)]">{subtitle}</div>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
          <button onClick={close} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-md text-[var(--text-muted)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]">
            <X size={16} />
          </button>
        </header>
        <div className={wide ? "flex min-h-0 flex-1 flex-col lg:flex-row" : "flex-1 space-y-6 overflow-y-auto px-5 py-5"}>{children}</div>
      </aside>
    </div>,
    document.body,
  );
}

/** One empty state everywhere: one sentence saying what to do, one quiet action. */
export function Empty({ children, icon, action }: { children: ReactNode; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-5 py-8">
      {icon && <span className="mt-0.5 shrink-0 text-[var(--text-muted)]">{icon}</span>}
      <div className="space-y-3">
        <p className="max-w-[48ch] text-[14px] text-[var(--text-secondary)]">{children}</p>
        {action}
      </div>
    </div>
  );
}

/** Download rows as a CSV that Excel opens cleanly (UTF-8 BOM, quoted cells). */
export function downloadCsv<T>(name: string, rows: T[], columns: [string, (r: T) => unknown][]) {
  const cell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [columns.map(([h]) => cell(h)).join(","), ...rows.map((r) => columns.map(([, f]) => cell(f(r))).join(","))].join("\r\n");
  const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `${name}-${new Date().toISOString().slice(0, 10)}.csv` });
  a.click();
  URL.revokeObjectURL(url);
}

/** Upload a real file to CRM storage. Returns the private URL to save on the record. */
export async function uploadFile(file: File, kind: "avatar" | "doc" | "photo", userId?: string): Promise<{ url?: string; error?: string }> {
  if (typeof window !== "undefined" && (window as { __CRM_DEMO__?: boolean }).__CRM_DEMO__) {
    return { url: URL.createObjectURL(file) };
  }
  const body = new FormData();
  body.append("file", file);
  body.append("kind", kind);
  if (userId) body.append("user_id", userId);
  const res = await fetch("/api/crm/upload", { method: "POST", body }).catch(() => null);
  if (!res) return { error: "Could not reach the server." };
  const r = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (r.url) return { url: r.url };
  return {
    error: r.error === "too_large" ? "That file is over 5 MB. Compress it or take a smaller photo."
      : r.error === "unsupported_type" ? "Only JPG, PNG, WEBP, HEIC photos and PDF files are accepted."
      : `Upload failed (${r.error ?? res.status}).`,
  };
}

/** Shrink a photo to a square-ish JPEG no larger than `max` px, so profile photos stay small. */
export async function shrinkImage(file: File, max = 512): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.86));
    return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}
