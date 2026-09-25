"use client";

import type { ReactNode } from "react";
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
  new: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  contacted: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  viewing: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  offer: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  won: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  lost: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
};

export const INPUT =
  "w-full rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)]";

export const BTN =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--accent-solid)] px-3.5 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-[var(--accent-solid-hover)] disabled:opacity-50";

export const BTN_GHOST =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--hairline-strong)] px-3 py-2 text-[12.5px] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text-primary)]";

export function Label({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-[var(--hairline)] bg-[var(--surface-raised)] ${className}`}>{children}</div>
  );
}

/** Right-hand slide-over used for lead and contact details. */
export function SidePanel({ title, subtitle, onClose, children }: {
  title: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      <aside className="relative flex h-full w-full max-w-[560px] flex-col border-s border-[var(--hairline)] bg-[var(--surface-raised)] shadow-[var(--shadow-lift)]">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--hairline)] px-6 py-5">
          <div className="min-w-0">
            <h2 className="truncate font-[family-name:var(--font-display)] text-[26px] leading-tight text-[var(--text-primary)]">
              {title}
            </h2>
            {subtitle && <div className="mt-1 text-[12px] text-[var(--text-muted)]">{subtitle}</div>}
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full border border-[var(--hairline)] p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <X size={15} />
          </button>
        </header>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-[12.5px] text-[var(--text-muted)]">{children}</p>;
}
