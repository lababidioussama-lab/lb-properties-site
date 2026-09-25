"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
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
  return (await res.json().catch(() => ({ ok: false, error: "bad_response" }))) as ApiResult<Partial<T>>;
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

export const whatsapp = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

export const STAGE_STYLE: Record<Stage, string> = {
  new: "bg-sky-50 text-sky-700 border-sky-200",
  contacted: "bg-indigo-50 text-indigo-700 border-indigo-200",
  viewing: "bg-amber-50 text-amber-700 border-amber-200",
  offer: "bg-violet-50 text-violet-700 border-violet-200",
  won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lost: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

export const INPUT =
  "w-full h-9 rounded-lg border border-[var(--hairline-strong)] bg-white px-3 text-[13px] text-[var(--text-primary)] shadow-[0_1px_1px_rgb(15_23_42/0.03)] outline-none transition placeholder:text-[var(--text-muted)] hover:border-[rgb(15_23_42/0.25)] focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[rgb(11_42_74/0.12)] disabled:bg-[var(--surface-sunken)] disabled:text-[var(--text-muted)] [&:is(textarea)]:h-auto [&:is(textarea)]:py-2";

export const BTN =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--accent-solid)] px-3.5 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgb(11_42_74/0.25),inset_0_1px_0_rgb(255_255_255/0.08)] transition hover:bg-[var(--accent-solid-hover)] active:translate-y-px disabled:pointer-events-none disabled:opacity-45";

export const BTN_GHOST =
  "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[var(--hairline-strong)] bg-white px-3 text-[13px] font-medium text-[var(--text-secondary)] shadow-[0_1px_1px_rgb(15_23_42/0.03)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] active:translate-y-px disabled:pointer-events-none disabled:opacity-45";

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-semibold text-[var(--text-secondary)]">
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--hairline)] bg-[var(--surface-raised)] shadow-[var(--shadow-card)] ${className}`}>{children}</div>
  );
}

/** Right-hand slide-over used for lead and contact details. */
export function SidePanel({ title, subtitle, onClose, children }: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[rgb(11_26_43/0.35)] backdrop-blur-[2px]" />
      <aside className="relative flex h-full w-full max-w-[580px] flex-col bg-[var(--surface)] shadow-[-24px_0_60px_-20px_rgb(15_23_42/0.35)]">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--hairline)] bg-white px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate font-[family-name:var(--font-display)] text-[28px] font-semibold leading-tight text-[var(--text-primary)]">
              {title}
            </h2>
            {subtitle && <div className="mt-1 text-[12.5px] text-[var(--text-muted)]">{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-lg border border-[var(--hairline-strong)] bg-white text-[var(--text-muted)] transition hover:text-[var(--text-primary)]">
            <X size={16} />
          </button>
        </header>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">{children}</div>
      </aside>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-10 text-center text-[13px] text-[var(--text-muted)]">{children}</p>;
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
