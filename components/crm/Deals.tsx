"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { commissionOf, quarterOf, slabOutcome, type CrmDeal, type CrmListing, type CrmUser } from "@/lib/crm";
import { money, shortDate, INPUT, BTN, BTN_GHOST, Label, Card, SidePanel, Empty } from "./shared";
import { Avatar } from "./Avatar";
import type { Table } from "./useTable";

const today = () => new Date().toISOString().slice(0, 10);
const BLANK = {
  title: "", deal_type: "sale", price_aed: "", commission_pct: "2", agent_split_pct: "50",
  closed_at: today(), agent_id: "", listing_id: "", notes: "",
};

export function DealsView({ t, isAdmin, users, listings, userName }: {
  t: Table<CrmDeal>;
  isAdmin: boolean;
  users: CrmUser[];
  listings: CrmListing[];
  userName: (id: string | null) => string;
}) {
  const [month, setMonth] = useState("all");
  const [editing, setEditing] = useState<CrmDeal | "new" | null>(null);

  const months = useMemo(() => [...new Set(t.rows.map((d) => d.closed_at.slice(0, 7)))].sort().reverse(), [t.rows]);
  const rows = month === "all" ? t.rows : t.rows.filter((d) => d.closed_at.startsWith(month));

  const totals = useMemo(() => {
    const gross = rows.reduce((s, d) => s + commissionOf(d), 0);
    const agents = rows.reduce((s, d) => s + (commissionOf(d) * Number(d.agent_split_pct)) / 100, 0);
    const unpaid = rows.filter((d) => !d.paid_at).reduce((s, d) => s + commissionOf(d), 0);
    return [
      { label: "Deals closed", value: String(rows.length) },
      { label: "Sales volume", value: money(rows.reduce((s, d) => s + Number(d.price_aed), 0)) },
      { label: "Gross commission", value: money(gross) },
      { label: "Company share", value: money(gross - agents) },
      { label: "Unpaid commission", value: money(unpaid) },
    ];
  }, [rows]);

  const thisQuarter = quarterOf(new Date());
  const byAgent = useMemo(() => {
    const m = new Map<string, { deals: number; earned: number; revenue: number }>();
    for (const d of rows.filter((d) => quarterOf(d.closed_at) === thisQuarter)) {
      const key = d.agent_id ?? "none";
      const e = m.get(key) ?? { deals: 0, earned: 0, revenue: 0 };
      e.deals += 1;
      e.earned += (commissionOf(d) * Number(d.agent_split_pct)) / 100;
      e.revenue += Number(d.price_aed);
      m.set(key, e);
    }
    return [...m.entries()].sort((a, b) => b[1].earned - a[1].earned);
  }, [rows, thisQuarter]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <select value={month} onChange={(e) => setMonth(e.target.value)} className={`${INPUT} !w-auto`}>
          <option value="all">All time</option>
          {months.map((m) => <option key={m} value={m}>{new Date(`${m}-01`).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</option>)}
        </select>
        <button onClick={() => setEditing("new")} className={`${BTN} ms-auto`}><Plus size={14} /> Record deal</button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {totals.map((s) => (
          <Card key={s.label} className="px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{s.label}</div>
            <div className="figure mt-2 text-[24px] font-semibold leading-none text-[var(--accent)]">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Card className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--hairline)] text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {["Deal", "Type", "Agent", "Price", "Commission", "Agent share", "Closed", "Status"].map((h) => <th key={h} className="px-3 py-3 text-start font-semibold">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => {
                const c = commissionOf(d);
                return (
                  <tr key={d.id} onClick={() => setEditing(d)} className="cursor-pointer border-b border-[var(--hairline)] last:border-0 hover:bg-[var(--surface)]">
                    <td className="px-3 py-2.5 font-medium text-[var(--text-primary)]">{d.title}</td>
                    <td className="px-3 py-2.5 capitalize text-[var(--text-secondary)]">{d.deal_type}</td>
                    <td className="px-3 py-2.5 text-[var(--text-secondary)]">{userName(d.agent_id)}</td>
                    <td className="figure px-3 py-2.5">{money(d.price_aed)}</td>
                    <td className="figure px-3 py-2.5">{money(c)} <span className="text-[var(--text-muted)]">({d.commission_pct}%)</span></td>
                    <td className="figure px-3 py-2.5">{money((c * Number(d.agent_split_pct)) / 100)}</td>
                    <td className="px-3 py-2.5 text-[var(--text-muted)]">{shortDate(d.closed_at)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${d.paid_at ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                        {d.paid_at ? "Paid" : "Unpaid"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <Empty>No deals recorded yet.</Empty>}
        </Card>

        <Card className="p-4">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Quarterly slab · {thisQuarter}</h3>
          {byAgent.length === 0 ? <Empty>—</Empty> : (
            <ul className="space-y-3">
              {byAgent.map(([agent, e]) => {
                const u = users.find((x) => x.id === agent);
                const outcome = slabOutcome(e.revenue, u?.quarterly_target_aed);
                return (
                  <li key={agent}>
                    <div className="flex items-center gap-3">
                      <span className="flex flex-1 items-center gap-2 text-[13px] text-[var(--text-primary)]">
                        <Avatar name={userName(agent === "none" ? null : agent)} url={users.find((u) => u.id === agent)?.avatar_url} size="sm" />
                        {userName(agent === "none" ? null : agent)}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">{e.deals} deals</span>
                      <span className="figure text-[12.5px] text-[var(--text-primary)]">{money(e.earned)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className={outcome.tone}>{outcome.label}</span>
                      <span className={`figure ${outcome.tone}`}>{outcome.pct}% of target</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      {editing && (
        <DealForm
          deal={editing === "new" ? null : editing}
          isAdmin={isAdmin}
          users={users}
          listings={listings}
          error={t.error}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            const saved = editing === "new" ? await t.create(body) : await t.update(editing.id, body);
            if (saved) setEditing(null);
          }}
          onTogglePaid={editing === "new" || !isAdmin ? undefined : async () => {
            await t.update(editing.id, { paid_at: editing.paid_at ? null : today() });
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function DealForm({ deal, isAdmin, users, listings, error, onClose, onSave, onTogglePaid }: {
  deal: CrmDeal | null;
  isAdmin: boolean;
  users: CrmUser[];
  listings: CrmListing[];
  error: string | null;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
  onTogglePaid?: () => void;
}) {
  const [f, setF] = useState(() => deal
    ? { ...BLANK, ...Object.fromEntries(Object.entries(deal).map(([k, v]) => [k, v == null ? "" : String(v)])) }
    : BLANK);
  const set = (k: keyof typeof BLANK) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const commission = (Number(f.price_aed) * Number(f.commission_pct)) / 100 || 0;

  return (
    <SidePanel title={deal ? deal.title : "Record a closed deal"} subtitle={deal?.paid_at ? `Commission paid ${shortDate(deal.paid_at)}` : "Commission unpaid"} onClose={onClose}>
      <label className="block"><Label>Deal name *</Label><input value={f.title} onChange={set("title")} placeholder="e.g. Marina Gate 2304 sale" className={INPUT} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label><Label>Type</Label><select value={f.deal_type} onChange={set("deal_type")} className={INPUT}><option value="sale">Secondary sale</option><option value="offplan">Off-plan</option><option value="rent">Rental</option></select></label>
        <label><Label>Closed on</Label><input type="date" value={f.closed_at} onChange={set("closed_at")} className={INPUT} /></label>
        <label><Label>{f.deal_type === "rent" ? "Annual rent (AED)" : "Sale price (AED)"}</Label><input type="number" value={f.price_aed} onChange={set("price_aed")} className={`${INPUT} figure`} /></label>
        <label><Label>Commission %</Label><input type="number" step="0.25" value={f.commission_pct} onChange={set("commission_pct")} className={`${INPUT} figure`} /></label>
        <label><Label>Agent split %</Label><input type="number" value={f.agent_split_pct} onChange={set("agent_split_pct")} disabled={!isAdmin} className={`${INPUT} figure`} /></label>
        {isAdmin && (
          <label><Label>Agent</Label>
            <select value={f.agent_id} onChange={set("agent_id")} className={INPUT}>
              <option value="">Me</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </label>
        )}
        <label className="col-span-2"><Label>Listing</Label>
          <select value={f.listing_id} onChange={set("listing_id")} className={INPUT}>
            <option value="">—</option>
            {listings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </label>
      </div>
      <Card className="grid grid-cols-3 gap-2 p-3 text-center">
        <div><Label>Commission</Label><div className="figure text-[14px]">{money(commission)}</div></div>
        <div><Label>Agent</Label><div className="figure text-[14px]">{money((commission * Number(f.agent_split_pct)) / 100)}</div></div>
        <div><Label>Company</Label><div className="figure text-[14px]">{money(commission - (commission * Number(f.agent_split_pct)) / 100)}</div></div>
      </Card>
      <label className="block"><Label>Notes</Label><textarea rows={3} value={f.notes} onChange={set("notes")} className={`${INPUT} resize-none`} /></label>
      {error && <p className="text-[12px] text-[#c0392b]">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => onSave(f)} disabled={!f.title.trim()} className={BTN}>Save deal</button>
        {onTogglePaid && <button onClick={onTogglePaid} className={BTN_GHOST}>{deal?.paid_at ? "Mark unpaid" : "Mark commission paid"}</button>}
      </div>
    </SidePanel>
  );
}
