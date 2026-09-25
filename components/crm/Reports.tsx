"use client";

import { useMemo, useState } from "react";
import { STAGES, STAGE_LABEL, SOURCE_LABEL, sourceKey, commissionOf, type CrmDeal, type CrmLead, type CrmUser } from "@/lib/crm";
import { money, INPUT, Card, Empty } from "./shared";
import { Avatar } from "./Avatar";

const RANGES = { 30: "Last 30 days", 90: "Last 90 days", 365: "Last 12 months", 0: "All time" } as const;

function Bars({ rows, format = String }: { rows: { label: string; value: number }[]; format?: (n: number) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <Empty>No data yet.</Empty>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between text-[12px]">
            <span className="text-[var(--text-secondary)]">{r.label}</span>
            <span className="figure text-[var(--text-primary)]">{format(r.value)}</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--surface-sunken)]">
            <div className="h-2 rounded-full bg-[var(--accent-solid)]" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{title}</h3>
      {children}
    </Card>
  );
}

export function ReportsView({ leads, deals, users, userName }: {
  leads: CrmLead[];
  deals: CrmDeal[];
  users: CrmUser[];
  userName: (id: string | null) => string;
}) {
  const [range, setRange] = useState<keyof typeof RANGES>(90);
  const since = range ? Date.now() - Number(range) * 86_400_000 : 0;
  const L = useMemo(() => leads.filter((l) => new Date(l.created_at).getTime() >= since), [leads, since]);
  const D = useMemo(() => deals.filter((d) => new Date(d.closed_at).getTime() >= since), [deals, since]);

  const kpis = useMemo(() => {
    const won = L.filter((l) => l.stage === "won").length;
    const decided = L.filter((l) => l.stage === "won" || l.stage === "lost").length;
    const untouched = L.filter((l) => l.stage === "new" && Date.now() - new Date(l.created_at).getTime() > 3_600_000).length;
    return [
      { label: "Leads", value: String(L.length) },
      { label: "Win rate", value: decided ? `${Math.round((won / decided) * 100)}%` : "—" },
      { label: "Deals closed", value: String(D.length) },
      { label: "Gross commission", value: money(D.reduce((s, d) => s + commissionOf(d), 0)) },
      { label: "New leads not contacted after 1h", value: String(untouched) },
    ];
  }, [L, D]);

  const bySource = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of L) m.set(sourceKey(l.source), (m.get(sourceKey(l.source)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: SOURCE_LABEL[k] ?? k, value: v }));
  }, [L]);

  const funnel = STAGES.filter((s) => s !== "lost").map((s, i, arr) => ({
    label: STAGE_LABEL[s],
    value: L.filter((l) => arr.indexOf(l.stage as (typeof arr)[number]) >= i).length,
  }));

  const agents = useMemo(() => users.map((u) => {
    const mine = L.filter((l) => l.owner_id === u.id);
    const myDeals = D.filter((d) => d.agent_id === u.id);
    return {
      id: u.id,
      leads: mine.length,
      won: mine.filter((l) => l.stage === "won").length,
      overdue: mine.filter((l) => l.next_follow_up_at && new Date(l.next_follow_up_at).getTime() < Date.now() && l.stage !== "won" && l.stage !== "lost").length,
      deals: myDeals.length,
      earned: myDeals.reduce((s, d) => s + (commissionOf(d) * Number(d.agent_split_pct)) / 100, 0),
    };
  }).sort((a, b) => b.earned - a.earned || b.won - a.won), [users, L, D]);

  const monthly = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of D) m.set(d.closed_at.slice(0, 7), (m.get(d.closed_at.slice(0, 7)) ?? 0) + commissionOf(d));
    return [...m.entries()].sort().slice(-12).map(([k, v]) => ({
      label: new Date(`${k}-01`).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }), value: v,
    }));
  }, [D]);

  return (
    <div className="space-y-5">
      <select value={range} onChange={(e) => setRange(Number(e.target.value) as keyof typeof RANGES)} className={`${INPUT} w-auto`}>
        {Object.entries(RANGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{k.label}</div>
            <div className="figure mt-1 text-[18px] text-[var(--text-primary)]">{k.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Leads by source"><Bars rows={bySource} /></Panel>
        <Panel title="Pipeline funnel: leads that reached each stage"><Bars rows={funnel} /></Panel>
        <Panel title="Commission by month"><Bars rows={monthly} format={money} /></Panel>
        <Panel title="Agent leaderboard">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">
                {["Agent", "Leads", "Won", "Overdue", "Deals", "Earned"].map((h) => <th key={h} className="pb-2 text-start font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} className="border-t border-[var(--hairline)]">
                  <td className="py-2 text-[var(--text-primary)]">
                    <span className="flex items-center gap-2">
                      <Avatar name={userName(a.id)} url={users.find((u) => u.id === a.id)?.avatar_url} size="sm" />
                      {userName(a.id)}
                    </span>
                  </td>
                  <td className="figure py-2">{a.leads}</td>
                  <td className="figure py-2">{a.won}</td>
                  <td className={`figure py-2 ${a.overdue ? "text-[#e0645f]" : ""}`}>{a.overdue}</td>
                  <td className="figure py-2">{a.deals}</td>
                  <td className="figure py-2">{money(a.earned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}
