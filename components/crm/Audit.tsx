"use client";

import { useEffect, useState } from "react";
import type { CrmAuditEntry } from "@/lib/crm";
import { api, stamp, Card, Empty } from "./shared";

export function AuditView({ userName }: { userName: (id: string | null) => string }) {
  const [entries, setEntries] = useState<CrmAuditEntry[]>([]);

  useEffect(() => {
    let live = true;
    api<{ entries: CrmAuditEntry[] }>("GET", "audit").then((r) => { if (live) setEntries(r.entries ?? []); });
    return () => { live = false; };
  }, []);

  return (
    <Card className="overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="border-b border-[var(--hairline)] text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
            {["When", "Who", "Entity", "Action", "Detail"].map((h) => <th key={h} className="px-4 py-3 text-start font-semibold">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-[var(--hairline)] last:border-0">
              <td className="px-4 py-2.5 text-[var(--text-muted)]">{stamp(e.created_at)}</td>
              <td className="px-4 py-2.5 text-[var(--text-secondary)]">{userName(e.user_id)}</td>
              <td className="px-4 py-2.5 capitalize text-[var(--text-primary)]">{e.entity}</td>
              <td className="px-4 py-2.5 capitalize text-[var(--text-secondary)]">{e.action.replace(/_/g, " ")}</td>
              <td className="px-4 py-2.5 text-[var(--text-muted)]">{Object.entries(e.detail).map(([k, v]) => `${k}: ${v}`).join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length === 0 && <Empty>No audit entries yet.</Empty>}
    </Card>
  );
}
