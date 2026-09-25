"use client";

import { Info } from "lucide-react";
import { useSite } from "@/lib/context/site-context";

export function ApproxNotice() {
  const { t } = useSite();
  return (
    <div className="border-b border-[var(--hairline)] bg-[var(--accent-wash)]">
      <div className="mx-auto flex max-w-[1320px] items-start gap-4 px-5 py-6 sm:px-8">
        <Info size={20} strokeWidth={1.5} className="mt-0.5 shrink-0 text-[var(--accent)]" />
        <div>
          <p className="text-[14px] font-semibold text-[var(--text-primary)]">{t.pages.invest.approxTitle}</p>
          <p className="mt-1 max-w-[100ch] text-[14px] leading-[1.7] text-[var(--text-secondary)]">{t.pages.invest.approxBody}</p>
        </div>
      </div>
    </div>
  );
}
