"use client";

import { useMemo, useState } from "react";
import { Plus, Download, ShieldCheck, AlertTriangle, Trash2, Receipt } from "lucide-react";
import { commissionOf, quarterOf, slabOutcome, daysLeft, goamlRequired, kycMissing, DEAL_MILESTONES, GOAML_CASH_THRESHOLD_AED, PAYMENT_METHODS, PAYMENT_METHOD_LABEL, type CrmContact, type CrmDeal, type CrmInvoice, type CrmKyc, type CrmListing, type CrmUser, type PlanInstalment } from "@/lib/crm";
import { KycBadge } from "./Kyc";
import { api, money, shortDate, toInputDate, downloadCsv, INPUT, BTN, BTN_GHOST, Label, Card, SidePanel, Empty } from "./shared";
import { Avatar } from "./Avatar";
import type { Table } from "./useTable";

const today = () => new Date().toISOString().slice(0, 10);
const BLANK = {
  title: "", deal_type: "sale", price_aed: "", commission_pct: "2", agent_split_pct: "50",
  closed_at: today(), agent_id: "", listing_id: "", contact_id: "", notes: "",
  payment_method: "", cash_amount_aed: "", kyc_override_reason: "", goaml_ref: "", goaml_reported_at: "",
  noc_expiry: "", transfer_at: "", developer: "", project: "", unit_no: "", spa_signed_at: "", oqood_no: "",
  commission_trigger_pct: "", developer_invoice_status: "",
};

export function DealsView({ t, isAdmin, users, listings, contacts, kyc, userName, onInvoiceCreated }: {
  t: Table<CrmDeal>;
  contacts: CrmContact[];
  kyc: CrmKyc[];
  onInvoiceCreated?: (inv: CrmInvoice) => void;
  isAdmin: boolean;
  users: CrmUser[];
  listings: CrmListing[];
  userName: (id: string | null) => string;
}) {
  const [month, setMonth] = useState("all");
  const [editing, setEditing] = useState<CrmDeal | "new" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function invoiceFor(d: CrmDeal) {
    const client = contacts.find((c) => c.id === d.contact_id);
    const billTo = d.deal_type === "offplan" && d.developer ? d.developer : client?.full_name ?? "";
    const r = await api<{ row: CrmInvoice }>("POST", "data/invoices", {
      deal_id: d.id, bill_to_name: billTo || d.title,
      description: `Brokerage commission — ${d.title} (${d.commission_pct}% of ${money(d.price_aed)})`,
      net_aed: commissionOf(d), vat_pct: 5, issue_date: today(), due_date: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10), status: "draft",
    });
    if (r.row) { setNotice(`Invoice ${(r.row as CrmInvoice).number} created as a draft. Open Invoices to send it.`); onInvoiceCreated?.(r.row as CrmInvoice); setEditing(null); }
    else setNotice(r.error ?? "Could not create the invoice.");
  }

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
        {isAdmin && (
          <button
            onClick={() => downloadCsv("deals", rows, [
              ["Deal", (d) => d.title], ["Type", (d) => d.deal_type], ["Agent", (d) => userName(d.agent_id)], ["Price AED", (d) => d.price_aed],
              ["Commission %", (d) => d.commission_pct], ["Commission AED", (d) => commissionOf(d)], ["Agent split %", (d) => d.agent_split_pct],
              ["Agent share AED", (d) => (commissionOf(d) * Number(d.agent_split_pct)) / 100], ["Closed", (d) => d.closed_at], ["Paid", (d) => d.paid_at ?? "Unpaid"],
            ])}
            className={`${BTN_GHOST} ms-auto`}
          >
            <Download size={14} /> Export
          </button>
        )}
        <button onClick={() => setEditing("new")} className={`${BTN} ${isAdmin ? "" : "ms-auto"}`}><Plus size={14} /> Record deal</button>
      </div>

      {notice && <Card className="border-emerald-200 bg-emerald-50/60 px-4 py-3 text-[13px] text-emerald-800">{notice}</Card>}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {totals.map((s) => (
          <Card key={s.label} className="px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{s.label}</div>
            <div className="figure mt-2 whitespace-nowrap text-[19px] font-semibold leading-none sm:text-[24px] text-[var(--accent)]">{s.value}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Card className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-[var(--hairline)] text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                {["Deal", "Type", "Agent", "Price", "Commission", "Agent share", "Closed", "Checklist", "Status"].map((h) => <th key={h} className="px-3 py-3 text-start font-semibold">{h}</th>)}
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
                      {(() => { const p = dealProgress(d); return <span className={`figure text-[11.5px] ${p.done === p.total ? "text-emerald-700" : "text-[var(--text-secondary)]"}`}>{p.done}/{p.total}</span>; })()}
                      {d.goaml_required && !d.goaml_reported_at && <span className="ms-1.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">goAML</span>}
                    </td>
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
          contacts={contacts}
          kyc={kyc}
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
          onInvoice={editing === "new" || !isAdmin ? undefined : () => invoiceFor(editing)}
        />
      )}
    </div>
  );
}

const DEAL_ERRORS: Record<string, string> = {
  kyc_contact_required: "Choose the client. A deal needs a client with a complete KYC file.",
  kyc_incomplete: "The client's KYC file is not complete. Finish it on the contact, or (admin) override with a reason.",
};

/** Steps done out of the checklist for this deal type. */
export function dealProgress(d: Pick<CrmDeal, "deal_type" | "milestones">) {
  const steps = DEAL_MILESTONES[d.deal_type];
  const done = steps.filter((s) => d.milestones?.[s.key]).length;
  return { done, total: steps.length };
}

function DealForm({ deal, isAdmin, users, listings, contacts, kyc, error, onClose, onSave, onTogglePaid, onInvoice }: {
  deal: CrmDeal | null;
  isAdmin: boolean;
  users: CrmUser[];
  listings: CrmListing[];
  contacts: CrmContact[];
  kyc: CrmKyc[];
  error: string | null;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
  onTogglePaid?: () => void;
  onInvoice?: () => void;
}) {
  const str = (v: unknown) => (v == null ? "" : String(v));
  const [f, setF] = useState(() => ({
    ...BLANK,
    ...(deal ? Object.fromEntries(Object.keys(BLANK).map((k) => [k, str((deal as unknown as Record<string, unknown>)[k])])) : {}),
    closed_at: deal?.closed_at ?? today(),
  }));
  const [milestones, setMilestones] = useState<Record<string, string | null>>(deal?.milestones ?? {});
  const [plan, setPlan] = useState<PlanInstalment[]>(deal?.payment_plan ?? []);
  const set = (k: keyof typeof BLANK) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const commission = (Number(f.price_aed) * Number(f.commission_pct)) / 100 || 0;
  const type = f.deal_type as CrmDeal["deal_type"];
  const client = contacts.find((c) => c.id === f.contact_id);
  const file = kyc.find((k) => k.contact_id === f.contact_id);
  const missing = f.contact_id ? kycMissing(file) : ["Choose the client"];
  const cashy = ["cash", "crypto", "mixed"].includes(f.payment_method);
  const goaml = goamlRequired({ payment_method: f.payment_method, cash_amount_aed: f.cash_amount_aed ? Number(f.cash_amount_aed) : null, price_aed: Number(f.price_aed) });
  const nocDays = f.noc_expiry ? daysLeft(f.noc_expiry) : null;
  const planPct = plan.reduce((s, p) => s + Number(p.pct || 0), 0);
  const paidPct = plan.filter((p) => p.paid_at).reduce((s, p) => s + Number(p.pct || 0), 0);

  function body() {
    const out: Record<string, unknown> = {
      title: f.title, deal_type: f.deal_type, price_aed: f.price_aed, commission_pct: f.commission_pct, closed_at: f.closed_at,
      listing_id: f.listing_id || null, contact_id: f.contact_id || null, notes: f.notes,
      payment_method: f.payment_method || null, cash_amount_aed: cashy && f.cash_amount_aed ? f.cash_amount_aed : null,
      milestones, noc_expiry: f.noc_expiry || null, transfer_at: f.transfer_at || null,
    };
    if (type === "offplan") {
      Object.assign(out, {
        developer: f.developer, project: f.project, unit_no: f.unit_no, spa_signed_at: f.spa_signed_at || null, oqood_no: f.oqood_no,
        commission_trigger_pct: f.commission_trigger_pct || null, developer_invoice_status: f.developer_invoice_status || null,
        payment_plan: plan.filter((p) => p.label || p.pct),
      });
    }
    if (isAdmin) {
      Object.assign(out, {
        agent_id: f.agent_id || null, agent_split_pct: f.agent_split_pct,
        goaml_ref: f.goaml_ref || null, goaml_reported_at: f.goaml_reported_at || null,
        ...(f.kyc_override_reason ? { kyc_override_reason: f.kyc_override_reason } : {}),
      });
    }
    return out;
  }

  return (
    <SidePanel title={deal ? deal.title : "Record a closed deal"} subtitle={deal?.paid_at ? `Commission paid ${shortDate(deal.paid_at)}` : "Commission unpaid"} onClose={onClose}>
      <label className="block"><Label>Deal name *</Label><input value={f.title} onChange={set("title")} placeholder="e.g. Marina Gate 2304 sale" className={INPUT} /></label>
      <div className="grid grid-cols-2 gap-3">
        <label><Label>Type</Label><select value={f.deal_type} onChange={set("deal_type")} className={INPUT}><option value="sale">Secondary sale</option><option value="offplan">Off-plan</option><option value="rent">Rental</option></select></label>
        <label><Label>Closed on</Label><input type="date" value={f.closed_at} onChange={set("closed_at")} className={INPUT} /></label>
        <label><Label>{type === "rent" ? "Annual rent (AED)" : "Sale price (AED)"}</Label><input type="number" value={f.price_aed} onChange={set("price_aed")} className={`${INPUT} figure`} /></label>
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
        <label className="col-span-2"><Label>Client *</Label>
          <select value={f.contact_id} onChange={set("contact_id")} className={INPUT}>
            <option value="">Choose the client…</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.phone ? ` · ${c.phone}` : ""}</option>)}
          </select>
        </label>
        <label className="col-span-2"><Label>Listing</Label>
          <select value={f.listing_id} onChange={set("listing_id")} className={INPUT}>
            <option value="">—</option>
            {listings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </label>
        <label><Label>Client pays by</Label>
          <select value={f.payment_method} onChange={set("payment_method")} className={INPUT}>
            <option value="">Choose…</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
          </select>
        </label>
        {cashy && <label><Label>Cash / crypto part (AED)</Label><input type="number" value={f.cash_amount_aed} onChange={set("cash_amount_aed")} className={`${INPUT} figure`} /></label>}
      </div>

      <section className={`rounded-lg border p-3 text-[12.5px] ${missing.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50/60"}`}>
        <div className="flex items-center gap-2 font-semibold">
          <ShieldCheck size={15} className={missing.length ? "text-amber-600" : "text-emerald-600"} />
          Client KYC {client && <KycBadge file={file} />}
        </div>
        {missing.length > 0 && <p className="mt-1 text-amber-800">Missing: {missing.join(", ")}. Complete it on the client&apos;s contact page.</p>}
        {deal?.kyc_override_reason && <p className="mt-1 text-[var(--text-secondary)]">Admin override: {deal.kyc_override_reason}</p>}
        {isAdmin && missing.length > 0 && !deal && (
          <label className="mt-2 block"><Label>Admin override — reason (logged)</Label>
            <input value={f.kyc_override_reason} onChange={set("kyc_override_reason")} className={INPUT} />
          </label>
        )}
      </section>

      {goaml && (
        <section className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-[12.5px]">
          <p className="flex items-center gap-2 font-semibold text-amber-800"><AlertTriangle size={15} /> goAML report needed (REAR)</p>
          <p className="mt-1 text-amber-800">Cash or virtual assets of AED {GOAML_CASH_THRESHOLD_AED.toLocaleString()}+ must be reported to the UAE FIU through goAML.</p>
          {isAdmin ? (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label><Label>goAML reference</Label><input value={f.goaml_ref} onChange={set("goaml_ref")} className={INPUT} /></label>
              <label><Label>Reported on</Label><input type="date" value={f.goaml_reported_at.slice(0, 10)} onChange={set("goaml_reported_at")} className={INPUT} /></label>
            </div>
          ) : (
            <p className="mt-1 font-medium">{deal?.goaml_reported_at ? `Reported ${shortDate(deal.goaml_reported_at)} · ref ${deal.goaml_ref ?? "—"}` : "The admin will file it."}</p>
          )}
        </section>
      )}

      <Card className="grid grid-cols-3 gap-2 p-3 text-center">
        <div><Label>Commission</Label><div className="figure text-[14px]">{money(commission)}</div></div>
        <div><Label>Agent</Label><div className="figure text-[14px]">{money((commission * Number(f.agent_split_pct)) / 100)}</div></div>
        <div><Label>Company</Label><div className="figure text-[14px]">{money(commission - (commission * Number(f.agent_split_pct)) / 100)}</div></div>
      </Card>

      <section>
        <Label>Checklist · {DEAL_MILESTONES[type].filter((s) => milestones[s.key]).length}/{DEAL_MILESTONES[type].length}</Label>
        <ul className="space-y-1">
          {DEAL_MILESTONES[type].map((s) => {
            const done = milestones[s.key];
            return (
              <li key={s.key}>
                <label className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-[12.5px] ${done ? "border-emerald-200 bg-emerald-50/60" : "border-[var(--hairline)]"}`}>
                  <input type="checkbox" checked={!!done} onChange={() => setMilestones({ ...milestones, [s.key]: done ? null : today() })} className="h-4 w-4 accent-[var(--accent)]" />
                  <span className="flex-1">{s.label}</span>
                  {done && <span className="text-[11px] text-emerald-700">{shortDate(done)}</span>}
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      {type !== "offplan" && (
        <div className="grid grid-cols-2 gap-3">
          {type === "sale" && (
            <label><Label>NOC expiry</Label>
              <input type="date" value={f.noc_expiry} onChange={set("noc_expiry")} className={INPUT} />
              {nocDays !== null && nocDays <= 7 && <span className={`mt-1 block text-[11px] font-medium ${nocDays < 0 ? "text-red-700" : "text-amber-700"}`}>{nocDays < 0 ? "NOC expired — reapply" : `NOC expires in ${nocDays} days`}</span>}
            </label>
          )}
          <label><Label>{type === "rent" ? "Move-in date" : "Transfer appointment"}</Label>
            <input type="datetime-local" value={f.transfer_at ? toInputDate(f.transfer_at) : ""} onChange={(e) => setF({ ...f, transfer_at: e.target.value ? new Date(e.target.value).toISOString() : "" })} className={INPUT} />
          </label>
        </div>
      )}

      {type === "offplan" && (
        <section className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label><Label>Developer</Label><input value={f.developer} onChange={set("developer")} className={INPUT} /></label>
            <label><Label>Project</Label><input value={f.project} onChange={set("project")} className={INPUT} /></label>
            <label><Label>Unit no.</Label><input value={f.unit_no} onChange={set("unit_no")} className={INPUT} /></label>
            <label><Label>SPA signed on</Label><input type="date" value={f.spa_signed_at} onChange={set("spa_signed_at")} className={INPUT} /></label>
            <label><Label>Oqood no.</Label><input value={f.oqood_no} onChange={set("oqood_no")} className={INPUT} /></label>
            <label><Label>Commission paid at (% of price)</Label><input type="number" value={f.commission_trigger_pct} onChange={set("commission_trigger_pct")} placeholder="e.g. 20" className={`${INPUT} figure`} /></label>
            <label className="col-span-2"><Label>Developer commission invoice</Label>
              <select value={f.developer_invoice_status} onChange={set("developer_invoice_status")} className={INPUT}>
                <option value="">—</option><option value="not_due">Not due yet</option><option value="sent">Invoiced</option><option value="paid">Paid by developer</option>
              </select>
            </label>
          </div>
          <div>
            <Label>Payment plan · {planPct}% planned · {paidPct}% paid</Label>
            {f.commission_trigger_pct && (
              <p className={`mb-2 text-[12px] font-medium ${paidPct >= Number(f.commission_trigger_pct) ? "text-emerald-700" : "text-[var(--text-muted)]"}`}>
                {paidPct >= Number(f.commission_trigger_pct) ? "Commission trigger reached — invoice the developer." : `Commission is due once ${f.commission_trigger_pct}% is paid.`}
              </p>
            )}
            <ul className="space-y-1.5">
              {plan.map((p, i) => {
                const upd = (patch: Partial<PlanInstalment>) => setPlan(plan.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                return (
                  <li key={i} className="grid grid-cols-[1.4fr_0.6fr_1fr_auto_auto] items-center gap-1.5">
                    <input value={p.label} onChange={(e) => upd({ label: e.target.value })} placeholder="e.g. On booking" className={INPUT} />
                    <input type="number" value={p.pct || ""} onChange={(e) => upd({ pct: Number(e.target.value) })} placeholder="%" className={`${INPUT} figure`} />
                    <input type="date" value={p.due ?? ""} onChange={(e) => upd({ due: e.target.value || null })} className={INPUT} />
                    <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={!!p.paid_at} onChange={() => upd({ paid_at: p.paid_at ? null : today() })} className="accent-[var(--accent)]" /> Paid</label>
                    <button onClick={() => setPlan(plan.filter((_, j) => j !== i))} aria-label="Remove" className="text-[var(--text-muted)] hover:text-[#c0392b]"><Trash2 size={13} /></button>
                  </li>
                );
              })}
            </ul>
            <button onClick={() => setPlan([...plan, { label: "", pct: 0, due: null, paid_at: null }])} className={`${BTN_GHOST} mt-2 !h-8`}><Plus size={13} /> Add instalment</button>
          </div>
        </section>
      )}

      <label className="block"><Label>Notes</Label><textarea rows={3} value={f.notes} onChange={set("notes")} className={`${INPUT} resize-none`} /></label>
      {error && <p className="text-[12px] text-[#c0392b]">{DEAL_ERRORS[error] ?? error}</p>}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => onSave(body())} disabled={!f.title.trim()} className={BTN}>Save deal</button>
        {onTogglePaid && <button onClick={onTogglePaid} className={BTN_GHOST}>{deal?.paid_at ? "Mark unpaid" : "Mark commission paid"}</button>}
        {onInvoice && <button onClick={onInvoice} className={BTN_GHOST}><Receipt size={14} /> Create tax invoice</button>}
      </div>
    </SidePanel>
  );
}
