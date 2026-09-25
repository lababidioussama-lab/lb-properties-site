"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, KanbanSquare, Users, Building2 } from "lucide-react";
import type { CrmContact, CrmLead, CrmListing } from "@/lib/crm";

type Hit = { kind: "lead" | "contact" | "listing"; id: string; title: string; sub: string };
const ICON = { lead: KanbanSquare, contact: Users, listing: Building2 };
const digits = (s: string) => s.replace(/\D/g, "");

/** Ctrl/Cmd+K: search leads, contacts and listings by name, phone, permit or building. */
export function CommandSearch({ leads, contacts, listings, onPick }: {
  leads: CrmLead[];
  contacts: CrmContact[];
  listings: CrmListing[];
  onPick: (hit: Hit) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((v) => !v); }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (open) { setQ(""); setActive(0); setTimeout(() => input.current?.focus(), 0); } }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const text = q.trim().toLowerCase();
    if (!text) return [];
    const num = digits(text);
    const has = (...fields: (string | null | undefined)[]) =>
      fields.some((f) => f && (f.toLowerCase().includes(text) || (num.length >= 4 && digits(f).includes(num))));
    return [
      ...leads.filter((l) => has(l.full_name, l.phone, l.email, l.location)).map((l) => ({ kind: "lead" as const, id: l.id, title: l.full_name, sub: `Lead · ${l.stage}${l.location ? ` · ${l.location}` : ""}` })),
      ...contacts.filter((c) => has(c.full_name, c.phone, c.email)).map((c) => ({ kind: "contact" as const, id: c.id, title: c.full_name, sub: `Contact · ${c.kind}` })),
      ...listings.filter((l) => has(l.title, l.community, l.building, l.unit, l.permit_no)).map((l) => ({ kind: "listing" as const, id: l.id, title: l.title, sub: `Listing · ${[l.building, l.community].filter(Boolean).join(", ")}` })),
    ].slice(0, 12);
  }, [q, leads, contacts, listings]);

  function choose(hit: Hit | undefined) {
    if (!hit) return;
    onPick(hit);
    setOpen(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="flex w-full items-center gap-2 rounded-lg border border-[var(--hairline)] px-3 py-2 text-[12.5px] text-[var(--text-muted)] transition-colors hover:border-[var(--hairline-strong)]">
        <Search size={14} /> Search anything
        <kbd className="figure ms-auto rounded border border-[var(--hairline)] px-1.5 text-[10.5px]">Ctrl K</kbd>
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/55 px-4 pt-[12vh]" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[560px] overflow-hidden rounded-xl border border-[var(--hairline-strong)] bg-[var(--surface-raised)] shadow-[var(--shadow-lift)]">
            <div className="flex items-center gap-2 border-b border-[var(--hairline)] px-4">
              <Search size={16} className="text-[var(--text-muted)]" />
              <input
                ref={input}
                value={q}
                onChange={(e) => { setQ(e.target.value); setActive(0); }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
                  if (e.key === "Enter") choose(hits[active]);
                }}
                placeholder="Name, phone, building, permit number…"
                className="w-full bg-transparent py-3.5 text-[14px] text-[var(--text-primary)] outline-none"
              />
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-1.5">
              {q && hits.length === 0 && <li className="px-3 py-6 text-center text-[12.5px] text-[var(--text-muted)]">No matches.</li>}
              {!q && <li className="px-3 py-6 text-center text-[12.5px] text-[var(--text-muted)]">Search leads, contacts and listings.</li>}
              {hits.map((h, i) => {
                const Icon = ICON[h.kind];
                return (
                  <li key={`${h.kind}-${h.id}`}>
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => choose(h)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start ${i === active ? "bg-[var(--accent-wash)]" : ""}`}
                    >
                      <Icon size={15} className="shrink-0 text-[var(--text-muted)]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] text-[var(--text-primary)]">{h.title}</span>
                        <span className="block truncate text-[11px] capitalize text-[var(--text-muted)]">{h.sub}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
