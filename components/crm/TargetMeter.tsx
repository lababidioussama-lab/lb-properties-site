"use client";

import { Target } from "lucide-react";
import { quarterOf, slabOutcome, type CrmDeal, type CrmUser } from "@/lib/crm";

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M` : n >= 1_000 ? `${Math.round(n / 1_000)}K` : String(Math.round(n));

function quarterEnd(d = new Date()) {
  const end = new Date(d.getFullYear(), Math.floor(d.getMonth() / 3) * 3 + 3, 0);
  return Math.max(0, Math.ceil((end.getTime() - d.getTime()) / 86_400_000));
}

/** An agent's quarterly target, always on screen: achieved vs target and days left. */
export function TargetMeter({ me, deals, variant }: { me: CrmUser | undefined; deals: CrmDeal[]; variant: "sidebar" | "bar" }) {
  if (!me) return null;
  const q = quarterOf(new Date());
  const achieved = deals.filter((d) => d.agent_id === me.id && quarterOf(d.closed_at) === q).reduce((s, d) => s + Number(d.price_aed), 0);
  const target = Number(me.quarterly_target_aed ?? 0);
  const outcome = slabOutcome(achieved, target);
  const pct = Math.min(100, outcome.pct);
  const days = quarterEnd();
  const bar = pct >= 100 ? "bg-emerald-400" : pct >= 50 ? "bg-[#d4b87f]" : "bg-[#e07a5f]";

  if (variant === "bar") {
    return (
      <div className="flex items-center gap-3 bg-[#0f2236] px-4 py-2 text-white md:hidden">
        <Target size={14} className="shrink-0 text-[#d4b87f]" />
        {target ? (
          <>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} /></div>
            <span className="figure shrink-0 text-[11.5px]"><b>{outcome.pct}%</b> · AED {compact(achieved)}/{compact(target)} · {days}d</span>
          </>
        ) : <span className="text-[11.5px] text-white/60">No target set for {q} yet</span>}
      </div>
    );
  }

  return (
    <div className="mx-3 mb-2 rounded-lg bg-white/[0.06] px-3 py-2.5">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">
        <Target size={12} className="text-[#d4b87f]" /> Target · {q}
        {target > 0 && <span className="figure ms-auto text-[12px] normal-case tracking-normal text-white">{outcome.pct}%</span>}
      </div>
      {target ? (
        <>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"><div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} /></div>
          <div className="figure mt-1.5 flex justify-between text-[11px] text-white/60">
            <span>AED {compact(achieved)} of {compact(target)}</span>
            <span>{days} days left</span>
          </div>
        </>
      ) : <div className="mt-1 text-[11.5px] text-white/50">No target set yet — ask your admin.</div>}
    </div>
  );
}
