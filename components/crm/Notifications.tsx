"use client";

import { useMemo, useState } from "react";
import { Bell, Timer, AlertTriangle, ShieldX, Hand } from "lucide-react";
import type { CrmLead, CrmListing, CrmTask } from "@/lib/crm";
import { shortDate } from "./shared";

type Item = { icon: typeof Bell; text: string; sub: string; tone: string; onClick?: () => void };

export function NotificationBell({ leads, tasks, listings, isAdmin, meId, onOpenLead }: {
  leads: CrmLead[];
  tasks: CrmTask[];
  listings: CrmListing[];
  isAdmin: boolean;
  meId: string;
  onOpenLead: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const mine = (l: CrmLead) => isAdmin || l.owner_id === meId;

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const l of leads.filter((l) => mine(l) && l.expires_at)) {
      const hrs = (new Date(l.expires_at as string).getTime() - Date.now()) / 3_600_000;
      if (hrs > 0 && hrs < 6) out.push({ icon: Timer, text: `Lead expiring soon: ${l.full_name}`, sub: `${Math.round(hrs)}h left to update`, tone: "text-red-700", onClick: () => onOpenLead(l.id) });
    }
    for (const t of tasks.filter((t) => !t.done_at && t.due_at && (isAdmin || t.assignee_id === meId))) {
      if (new Date(t.due_at as string).getTime() < Date.now()) out.push({ icon: AlertTriangle, text: `Overdue task: ${t.title}`, sub: shortDate(t.due_at), tone: "text-amber-700" });
    }
    if (isAdmin) {
      for (const l of listings.filter((l) => l.approval === "rejected")) {
        out.push({ icon: ShieldX, text: `Listing rejected: ${l.title}`, sub: l.approval_note ?? "No reason given", tone: "text-red-700" });
      }
    }
    const poolCount = leads.filter((l) => !l.owner_id && l.stage !== "won" && l.stage !== "lost").length;
    if (poolCount > 0) out.push({ icon: Hand, text: `${poolCount} lead${poolCount === 1 ? "" : "s"} in the open pool`, sub: "Unclaimed and waiting", tone: "text-sky-700" });
    return out.slice(0, 12);
  }, [leads, tasks, listings, isAdmin, meId]);

  return (
    <div className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-label="Notifications" className="relative rounded-full border border-[var(--hairline)] p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
        <Bell size={15} />
        {items.length > 0 && <span className="absolute -top-1 -end-1 grid h-4 w-4 place-items-center rounded-full bg-[var(--accent-solid)] text-[9px] text-white">{items.length}</span>}
      </button>
      {open && (
        <>
          <button aria-label="Close" onClick={() => setOpen(false)} className="fixed inset-0 z-40 cursor-default" />
          <div className="absolute end-0 top-full z-50 mt-2 w-72 rounded-lg border border-[var(--hairline-strong)] bg-[var(--surface-raised)] p-2 shadow-[var(--shadow-lift)]">
            {items.length === 0 ? (
              <p className="p-3 text-center text-[12px] text-[var(--text-muted)]">Nothing needs attention.</p>
            ) : (
              <ul className="space-y-0.5">
                {items.map((it, i) => (
                  <li key={i}>
                    <button onClick={() => { it.onClick?.(); setOpen(false); }} className="flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-start hover:bg-[var(--surface)]">
                      <it.icon size={14} className={`mt-0.5 shrink-0 ${it.tone}`} />
                      <span>
                        <span className="block text-[12px] text-[var(--text-primary)]">{it.text}</span>
                        <span className="block text-[11px] text-[var(--text-muted)]">{it.sub}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
