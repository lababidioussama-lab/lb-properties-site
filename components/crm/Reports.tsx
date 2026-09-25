"use client";

import { useMemo, useState } from "react";
import { STAGES, STAGE_LABEL, SOURCE_LABEL, LEAD_SOURCES, sourceKey, commissionOf, type CrmDeal, type CrmLead, type CrmSourceSpend, type CrmUser } from "@/lib/crm";
import { money, INPUT, BTN, Card, Empty } from "./shared";
import type { Table } from "./useTable";

/** Minutes from arrival to the first call, WhatsApp, email or stage move. */
const responseMins = (l: CrmLead) =>
  l.first_response_at ? Math.max(0, (new Date(l.first_response_at).getTime() - new Date(l.created_at).getTime()) / 60_000) : null;

export function median(values: number[]) {
  if (!values.length) return null;
  const v = [...values].sort((a, b) => a - b);
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

export const duration = (mins: number | null) =>
  mins == null ? "—" : mins < 60 ? `${Math.round(mins)} min` : mins < 48 * 60 ? `${(mins / 60).toFixed(1)} h` : `${Math.round(mins / 1440)} d`;

export const medianResponse = (leads: CrmLead[]) => median(leads.map(responseMins).filter((m): m is number => m !== null));
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

export function ReportsView({ leads, deals, users, userName, spend }: {
  leads: CrmLead[];
  spend: Table<CrmSourceSpend> | null;
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
      { label: "Median reply time", value: duration(medianResponse(L)) },
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
      response: medianResponse(mine),
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
      <select value={range} onChange={(e) => setRange(Number(e.target.value) as keyof typeof RANGES)} className={`${INPUT} !w-auto`}>
        {Object.entries(RANGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className="px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{k.label}</div>
            <div className="figure mt-2 whitespace-nowrap text-[19px] font-semibold leading-none sm:text-[24px] text-[var(--accent)]">{k.value}</div>
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
                {["Agent", "Leads", "Won", "Overdue", "Reply time", "Deals", "Earned"].map((h) => <th key={h} className="pb-2 text-start font-semibold">{h}</th>)}
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
                  <td className={`figure py-2 ${a.overdue ? "text-[#c0392b]" : ""}`}>{a.overdue}</td>
                  <td className="figure py-2">{duration(a.response)}</td>
                  <td className="figure py-2">{a.deals}</td>
                  <td className="figure py-2">{money(a.earned)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>
      <PortalRoi leads={L} deals={deals} spend={spend} since={since} />
    </div>
  );
}

/** Per portal: volume, speed to lead, conversions, commission and — for the admin — spend, cost per lead and per deal. */
function PortalRoi({ leads, deals, spend, since }: { leads: CrmLead[]; deals: CrmDeal[]; spend: Table<CrmSourceSpend> | null; since: number }) {
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [entry, setEntry] = useState({ month: thisMonth, source: "bayut", amount_aed: "" });
  const rows = useMemo(() => {
    const leadSource = new Map(leads.map((l) => [l.id, sourceKey(l.source)]));
    const keys = [...new Set([...leads.map((l) => sourceKey(l.source)), ...(spend?.rows ?? []).map((s) => s.source)])];
    return keys.map((k) => {
      const mine = leads.filter((l) => sourceKey(l.source) === k);
      const myDeals = deals.filter((d) => d.lead_id && leadSource.get(d.lead_id) === k);
      const cost = (spend?.rows ?? []).filter((s) => s.source === k && new Date(s.month).getTime() >= since - 31 * 86_400_000).reduce((t, s) => t + Number(s.amount_aed), 0);
      return {
        key: k, leads: mine.length, response: medianResponse(mine),
        replied1h: mine.length ? Math.round((mine.filter((l) => (responseMins(l) ?? Infinity) <= 60).length / mine.length) * 100) : 0,
        won: mine.filter((l) => l.stage === "won").length, deals: myDeals.length,
        commission: myDeals.reduce((t, d) => t + commissionOf(d), 0), cost,
      };
    }).sort((a, b) => b.leads - a.leads);
  }, [leads, deals, spend?.rows, since]);

  const head = ["Source", "Leads", "Median reply", "Replied < 1h", "Won", "Commission", ...(spend ? ["Spend", "Cost / lead", "Cost / deal", "ROI"] : [])];
  return (
    <Panel title="Portals: speed, conversion and cost">
      <div className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead><tr className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{head.map((h) => <th key={h} className="pb-2 pe-3 text-start font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-t border-[var(--hairline)]">
                <td className="py-2 pe-3 font-medium">{SOURCE_LABEL[r.key] ?? r.key}</td>
                <td className="figure py-2 pe-3">{r.leads}</td>
                <td className={`figure py-2 pe-3 ${r.response !== null && r.response > 60 ? "text-amber-700" : ""}`}>{duration(r.response)}</td>
                <td className="figure py-2 pe-3">{r.leads ? `${r.replied1h}%` : "—"}</td>
                <td className="figure py-2 pe-3">{r.won}</td>
                <td className="figure py-2 pe-3">{money(r.commission)}</td>
                {spend && <>
                  <td className="figure py-2 pe-3">{r.cost ? money(r.cost) : "—"}</td>
                  <td className="figure py-2 pe-3">{r.cost && r.leads ? money(r.cost / r.leads) : "—"}</td>
                  <td className="figure py-2 pe-3">{r.cost && r.deals ? money(r.cost / r.deals) : "—"}</td>
                  <td className={`figure py-2 pe-3 ${r.cost && r.commission >= r.cost ? "text-emerald-700" : r.cost ? "text-[#c0392b]" : ""}`}>{r.cost ? `${(r.commission / r.cost).toFixed(1)}×` : "—"}</td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <Empty>No leads in this period.</Empty>}
      </div>
      {spend && (
        <div className="mt-4 flex flex-wrap items-end gap-2 border-t border-[var(--hairline)] pt-4">
          <label className="text-[11px] text-[var(--text-muted)]">Month<input type="month" value={entry.month} onChange={(e) => setEntry({ ...entry, month: e.target.value })} className={`${INPUT} mt-1 !w-40`} /></label>
          <label className="text-[11px] text-[var(--text-muted)]">Source
            <select value={entry.source} onChange={(e) => setEntry({ ...entry, source: e.target.value })} className={`${INPUT} mt-1 !w-44`}>
              {LEAD_SOURCES.map((k) => <option key={k} value={k}>{SOURCE_LABEL[k] ?? k}</option>)}
            </select>
          </label>
          <label className="text-[11px] text-[var(--text-muted)]">Spend (AED)<input type="number" value={entry.amount_aed} onChange={(e) => setEntry({ ...entry, amount_aed: e.target.value })} className={`${INPUT} figure mt-1 !w-36`} /></label>
          <button
            disabled={!entry.amount_aed}
            onClick={async () => {
              const month = `${entry.month}-01`;
              const existing = spend.rows.find((s) => s.month.slice(0, 10) === month && s.source === entry.source);
              const ok = existing ? await spend.update(existing.id, { amount_aed: entry.amount_aed }) : await spend.create({ ...entry, month });
              if (ok) setEntry({ ...entry, amount_aed: "" });
            }}
            className={BTN}
          >
            Save monthly spend
          </button>
          <span className="text-[11.5px] text-[var(--text-muted)]">Portal subscriptions and paid ads per month. Only admins see spend.</span>
          {spend.error && <span className="text-[12px] text-[#c0392b]">{spend.error}</span>}
        </div>
      )}
    </Panel>
  );
}
