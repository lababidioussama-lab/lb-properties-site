import type { ReactNode } from "react";
import { BTN_GHOST, BTN_GO } from "../shared";

/* DB Search's own building blocks (dbsearchdubai.com), kept compact: a glass
   panel with a mono caps label, then one row of input, the gradient action
   and a quiet Clear (stacked on phones). */

export const DS_INPUT =
  "h-11 w-full min-w-0 rounded-[10px] border border-[var(--hairline)] bg-[var(--input-bg)] px-3.5 text-[15px] text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:ring-[3px] focus:ring-[var(--accent-wash)]";
export const DS_GO = `${BTN_GO} !h-11 px-6 text-[13.5px]`;
export const DS_CLEAR = `${BTN_GHOST} !h-11`;
export const DS_ROW = "flex flex-col gap-2 sm:flex-row sm:items-center";
export const DS_CHIP =
  "inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-[var(--surface-hover)] px-3 text-[12.5px] font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--accent-dim)] hover:bg-[var(--accent-wash)] hover:text-[var(--accent)]";

export function DsBox({ label, icon, action, children, className = "" }: { label: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel p-4 ${className}`}>
      <div className="mb-2 flex items-center gap-2">
        <p className="ds-label flex flex-1 items-center gap-1.5">{icon}{label}</p>
        {action}
      </div>
      {children}
    </section>
  );
}
