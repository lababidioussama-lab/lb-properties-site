"use client";

import { useMemo, useState } from "react";
import { Plus, Printer, Download, FilePlus2 } from "lucide-react";
import { commissionOf, type CrmContact, type CrmDeal, type CrmInvoice } from "@/lib/crm";
import { money, shortDate, downloadCsv, INPUT, BTN, BTN_GHOST, Label, Card, SidePanel, Empty } from "./shared";
import type { Table } from "./useTable";

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const COMPANY = {
  name: "Lababidi Properties",
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || "Dubai, United Arab Emirates",
  trn: process.env.NEXT_PUBLIC_COMPANY_TRN || "",
  orn: process.env.NEXT_PUBLIC_COMPANY_ORN || "",
};

const STATUS_TONE: Record<CrmInvoice["status"], string> = {
  draft: "bg-zinc-100 text-zinc-600", sent: "bg-sky-50 text-sky-700", paid: "bg-emerald-50 text-emerald-700", void: "bg-zinc-100 text-zinc-400 line-through",
};

export const owed = (i: CrmInvoice) => (i.status === "sent" || i.status === "draft" ? Math.max(0, Number(i.total_aed) - Number(i.paid_aed)) : 0);
const daysOverdue = (i: CrmInvoice) => (i.due_date ? Math.floor((Date.now() - new Date(i.due_date).getTime()) / 86_400_000) : 0);

const BUCKETS = [
  { label: "Not due", test: (d: number) => d <= 0 },
  { label: "1–30 days", test: (d: number) => d > 0 && d <= 30 },
  { label: "31–60 days", test: (d: number) => d > 30 && d <= 60 },
  { label: "61–90 days", test: (d: number) => d > 60 && d <= 90 },
  { label: "90+ days", test: (d: number) => d > 90 },
];

/** Admin: VAT tax invoices for commission, and who still owes us money. */
export function InvoicesView({ t, deals, contacts }: { t: Table<CrmInvoice>; deals: CrmDeal[]; contacts: CrmContact[] }) {
  const [editing, setEditing] = useState<CrmInvoice | "new" | null>(null);
  const [prefill, setPrefill] = useState<Partial<CrmInvoice> | null>(null);

  const open = t.rows.filter((i) => i.status === "sent" || (i.status === "draft" && owed(i) > 0));
  const year = today().slice(0, 4);
  const quarter = Math.floor(new Date().getMonth() / 3);
  const inQuarter = (d: string | null) => !!d && d.startsWith(year) && Math.floor((Number(d.slice(5, 7)) - 1) / 3) === quarter;

  const kpis = [
    { label: "Outstanding", value: money(open.filter((i) => i.status === "sent").reduce((s, i) => s + owed(i), 0)) },
    { label: "Overdue", value: money(open.filter((i) => i.status === "sent" && daysOverdue(i) > 0).reduce((s, i) => s + owed(i), 0)) },
    { label: "Drafts to send", value: String(t.rows.filter((i) => i.status === "draft").length) },
    { label: `Collected ${year}`, value: money(t.rows.filter((i) => i.status === "paid" && (i.paid_at ?? i.issue_date).startsWith(year)).reduce((s, i) => s + Number(i.paid_aed || i.total_aed), 0)) },
    { label: "Output VAT this quarter", value: money(t.rows.filter((i) => i.status !== "void" && i.status !== "draft" && inQuarter(i.issue_date)).reduce((s, i) => s + Number(i.vat_aed), 0)) },
  ];

  // Who owes commission: unpaid sent invoices per payer, split into ageing buckets.
  const debtors = useMemo(() => {
    const m = new Map<string, number[]>();
    for (const i of t.rows.filter((x) => x.status === "sent" && owed(x) > 0)) {
      const row = m.get(i.bill_to_name) ?? BUCKETS.map(() => 0);
      row[BUCKETS.findIndex((b) => b.test(daysOverdue(i)))] += owed(i);
      m.set(i.bill_to_name, row);
    }
    return [...m.entries()].map(([name, b]) => ({ name, b, total: b.reduce((s, x) => s + x, 0) })).sort((a, b) => b.total - a.total);
  }, [t.rows]);

  const invoiced = new Set(t.rows.filter((i) => i.status !== "void" && i.deal_id).map((i) => i.deal_id));
  const toInvoice = deals.filter((d) => !d.paid_at && !invoiced.has(d.id));

  function fromDeal(d: CrmDeal) {
    const client = contacts.find((c) => c.id === d.contact_id);
    setPrefill({
      deal_id: d.id, bill_to_name: d.deal_type === "offplan" && d.developer ? d.developer : client?.full_name ?? "",
      description: `Brokerage commission — ${d.title} (${d.commission_pct}% of ${money(d.price_aed)})`,
      net_aed: commissionOf(d),
    });
    setEditing("new");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => downloadCsv("invoices", t.rows, [
            ["Number", (i) => i.number], ["Bill to", (i) => i.bill_to_name], ["TRN", (i) => i.bill_to_trn], ["Issued", (i) => i.issue_date], ["Due", (i) => i.due_date],
            ["Net AED", (i) => i.net_aed], ["VAT AED", (i) => i.vat_aed], ["Total AED", (i) => i.total_aed], ["Paid AED", (i) => i.paid_aed], ["Status", (i) => i.status],
          ])}
          className={`${BTN_GHOST} ms-auto`}
        >
          <Download size={14} /> Export for accountant
        </button>
        <button onClick={() => { setPrefill(null); setEditing("new"); }} className={BTN}><Plus size={14} /> New invoice</button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="px-5 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{k.label}</div>
            <div className="figure mt-2 whitespace-nowrap text-[19px] font-semibold leading-none text-[var(--accent)] sm:text-[22px]">{k.value}</div>
          </Card>
        ))}
      </div>

      {!COMPANY.trn && (
        <Card className="border-amber-200 bg-amber-50 px-4 py-3 text-[12.5px] text-amber-800">
          Add the company TRN (NEXT_PUBLIC_COMPANY_TRN on Netlify) so it prints on every tax invoice. A UAE tax invoice must show the supplier&apos;s TRN.
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr]">
        <Card className="overflow-x-auto p-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Who owes commission</h3>
          {debtors.length === 0 ? <Empty>Nobody owes anything right now.</Empty> : (
            <table className="w-full text-[12.5px]">
              <thead><tr className="text-[10px] uppercase tracking-[0.12em] text-[var(--text-muted)]">{["Payer", ...BUCKETS.map((b) => b.label), "Total"].map((h) => <th key={h} className="pb-2 pe-3 text-start font-semibold">{h}</th>)}</tr></thead>
              <tbody>
                {debtors.map((d) => (
                  <tr key={d.name} className="border-t border-[var(--hairline)]">
                    <td className="py-2 pe-3 font-medium">{d.name}</td>
                    {d.b.map((v, i) => <td key={i} className={`figure py-2 pe-3 ${v && i >= 2 ? "text-[#c0392b]" : v && i === 1 ? "text-amber-700" : ""}`}>{v ? money(v) : "—"}</td>)}
                    <td className="figure py-2 pe-3 font-semibold">{money(d.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">Deals not invoiced yet ({toInvoice.length})</h3>
          {toInvoice.length === 0 ? <Empty>Every unpaid deal has an invoice.</Empty> : (
            <ul className="space-y-1.5">
              {toInvoice.slice(0, 8).map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-lg border border-[var(--hairline)] px-3 py-2 text-[12.5px]">
                  <span className="min-w-0 flex-1 truncate">{d.title}</span>
                  <span className="figure text-[var(--text-secondary)]">{money(commissionOf(d))}</span>
                  <button onClick={() => fromDeal(d)} className={`${BTN_GHOST} !h-8`}><FilePlus2 size={13} /> Invoice</button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-[var(--hairline)] text-[10px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
              {["Invoice", "Bill to", "Issued", "Due", "Net", "VAT", "Total", "Balance", "Status"].map((h) => <th key={h} className="px-3 py-3 text-start font-semibold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {t.rows.map((i) => {
              const late = i.status === "sent" && daysOverdue(i) > 0;
              return (
                <tr key={i.id} onClick={() => setEditing(i)} className="cursor-pointer border-b border-[var(--hairline)] last:border-0 hover:bg-[var(--surface)]">
                  <td className="figure px-3 py-2.5 font-medium">{i.number}</td>
                  <td className="px-3 py-2.5">{i.bill_to_name}</td>
                  <td className="px-3 py-2.5 text-[var(--text-muted)]">{shortDate(i.issue_date)}</td>
                  <td className={`px-3 py-2.5 ${late ? "font-medium text-[#c0392b]" : "text-[var(--text-muted)]"}`}>{shortDate(i.due_date)}{late && ` · ${daysOverdue(i)}d late`}</td>
                  <td className="figure px-3 py-2.5">{money(i.net_aed)}</td>
                  <td className="figure px-3 py-2.5">{money(i.vat_aed)}</td>
                  <td className="figure px-3 py-2.5">{money(i.total_aed)}</td>
                  <td className="figure px-3 py-2.5">{owed(i) ? money(owed(i)) : "—"}</td>
                  <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold capitalize ${STATUS_TONE[i.status]}`}>{i.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {t.rows.length === 0 && <Empty>No invoices yet. Create one from a deal.</Empty>}
      </Card>

      {editing && (
        <InvoiceForm
          invoice={editing === "new" ? null : editing}
          prefill={prefill}
          deals={deals}
          error={t.error}
          onClose={() => setEditing(null)}
          onSave={async (body) => {
            const saved = editing === "new" ? await t.create(body) : await t.update(editing.id, body);
            if (saved) setEditing(saved);
          }}
        />
      )}
    </div>
  );
}

function InvoiceForm({ invoice, prefill, deals, error, onClose, onSave }: {
  invoice: CrmInvoice | null;
  prefill: Partial<CrmInvoice> | null;
  deals: CrmDeal[];
  error: string | null;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const src = invoice ?? prefill ?? {};
  const s = (v: unknown) => (v == null ? "" : String(v));
  const [f, setF] = useState({
    deal_id: s(src.deal_id), bill_to_name: s(src.bill_to_name), bill_to_trn: s(src.bill_to_trn), bill_to_address: s(src.bill_to_address),
    description: s(src.description), net_aed: s(src.net_aed), vat_pct: s(src.vat_pct ?? 5), issue_date: s(src.issue_date) || today(),
    due_date: s(src.due_date) || inDays(14), status: s(src.status) || "draft", paid_aed: s(src.paid_aed), paid_at: s(src.paid_at), notes: s(src.notes),
  });
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const net = Number(f.net_aed) || 0;
  const vat = Math.round(net * Number(f.vat_pct || 0)) / 100;

  return (
    <SidePanel title={invoice ? `Tax invoice ${invoice.number}` : "New tax invoice"} subtitle={invoice ? `Issued ${shortDate(invoice.issue_date)}` : "The number is assigned when you save"} onClose={onClose}>
      <label className="block"><Label>Deal</Label>
        <select value={f.deal_id} onChange={set("deal_id")} className={INPUT}>
          <option value="">— Not linked —</option>
          {deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="col-span-2"><Label>Bill to *</Label><input value={f.bill_to_name} onChange={set("bill_to_name")} placeholder="Client, landlord or developer" className={INPUT} /></label>
        <label><Label>Their TRN (if VAT registered)</Label><input value={f.bill_to_trn} onChange={set("bill_to_trn")} className={`${INPUT} figure`} /></label>
        <label><Label>Their address</Label><input value={f.bill_to_address} onChange={set("bill_to_address")} className={INPUT} /></label>
        <label className="col-span-2"><Label>Description *</Label><input value={f.description} onChange={set("description")} className={INPUT} /></label>
        <label><Label>Amount before VAT (AED)</Label><input type="number" value={f.net_aed} onChange={set("net_aed")} className={`${INPUT} figure`} /></label>
        <label><Label>VAT %</Label><input type="number" value={f.vat_pct} onChange={set("vat_pct")} className={`${INPUT} figure`} /></label>
        <label><Label>Issue date</Label><input type="date" value={f.issue_date} onChange={set("issue_date")} className={INPUT} /></label>
        <label><Label>Due date</Label><input type="date" value={f.due_date} onChange={set("due_date")} className={INPUT} /></label>
        <label><Label>Status</Label>
          <select value={f.status} onChange={set("status")} className={INPUT}>
            <option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option><option value="void">Void</option>
          </select>
        </label>
        <label><Label>Received (AED)</Label><input type="number" value={f.paid_aed} onChange={set("paid_aed")} className={`${INPUT} figure`} /></label>
        <label><Label>Received on</Label><input type="date" value={f.paid_at} onChange={set("paid_at")} className={INPUT} /></label>
      </div>
      <Card className="grid grid-cols-3 gap-2 p-3 text-center">
        <div><Label>Net</Label><div className="figure text-[14px]">{money(net)}</div></div>
        <div><Label>VAT</Label><div className="figure text-[14px]">{money(vat)}</div></div>
        <div><Label>Total</Label><div className="figure text-[14px] font-semibold">{money(net + vat)}</div></div>
      </Card>
      <label className="block"><Label>Notes (bank details, terms)</Label><textarea rows={2} value={f.notes} onChange={set("notes")} className={`${INPUT} resize-none`} /></label>
      {error && <p className="text-[12px] text-[#c0392b]">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onSave({
            ...f, deal_id: f.deal_id || null, paid_at: f.paid_at || (f.status === "paid" ? today() : null),
            paid_aed: f.paid_aed || (f.status === "paid" ? (net + vat).toFixed(2) : 0),
          })}
          disabled={!f.bill_to_name.trim() || !f.description.trim()}
          className={BTN}
        >
          Save invoice
        </button>
        {invoice && <button onClick={() => printInvoice(invoice)} className={BTN_GHOST}><Printer size={14} /> Print / PDF</button>}
      </div>
    </SidePanel>
  );
}

const esc = (v: unknown) => String(v ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const aed = (n: number) => `AED ${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** A printable UAE tax invoice: supplier and recipient TRN, number, date, net, VAT and total in AED. */
function printInvoice(i: CrmInvoice) {
  const w = window.open("", "_blank", "width=820,height=1000");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${esc(i.number)}</title><style>
    body{font-family:Helvetica,Arial,sans-serif;color:#1c2330;margin:48px;font-size:13px}
    .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0b1a2b;padding-bottom:18px}
    h1{font-size:26px;letter-spacing:.08em;margin:0;color:#0b1a2b} .brand{font-size:18px;letter-spacing:.18em;color:#0b1a2b}
    .muted{color:#6b7280} table{width:100%;border-collapse:collapse;margin-top:28px} th,td{padding:10px;border-bottom:1px solid #e5e7eb;text-align:left}
    th{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#6b7280} td.n,th.n{text-align:right}
    .tot td{border:none;padding:6px 10px} .grand td{font-size:16px;font-weight:700;border-top:2px solid #0b1a2b}
    .cols{display:flex;gap:40px;margin-top:24px} .cols div{flex:1}
    @media print{body{margin:24px}}
  </style></head><body>
    <div class="top"><div><div class="brand">LABABIDI <small style="color:#b8975a;font-size:10px;letter-spacing:.3em">PROPERTIES</small></div>
      <div class="muted" style="margin-top:8px">${esc(COMPANY.address)}${COMPANY.orn ? `<br>ORN ${esc(COMPANY.orn)}` : ""}<br>TRN ${esc(COMPANY.trn || "—")}</div></div>
      <div style="text-align:right"><h1>TAX INVOICE</h1><div style="margin-top:8px">No. <b>${esc(i.number)}</b><br>Date ${esc(i.issue_date)}${i.due_date ? `<br>Due ${esc(i.due_date)}` : ""}</div></div></div>
    <div class="cols"><div><div class="muted" style="font-size:10px;letter-spacing:.12em;text-transform:uppercase">Bill to</div>
      <b>${esc(i.bill_to_name)}</b><br>${esc(i.bill_to_address)}${i.bill_to_trn ? `<br>TRN ${esc(i.bill_to_trn)}` : ""}</div></div>
    <table><thead><tr><th>Description</th><th class="n">Amount (excl. VAT)</th><th class="n">VAT ${esc(i.vat_pct)}%</th><th class="n">Total</th></tr></thead>
      <tbody><tr><td>${esc(i.description)}</td><td class="n">${aed(i.net_aed)}</td><td class="n">${aed(i.vat_aed)}</td><td class="n">${aed(i.total_aed)}</td></tr></tbody></table>
    <table style="width:320px;margin-left:auto;margin-top:12px" class="tot">
      <tr><td>Subtotal</td><td class="n">${aed(i.net_aed)}</td></tr><tr><td>VAT ${esc(i.vat_pct)}%</td><td class="n">${aed(i.vat_aed)}</td></tr>
      <tr class="grand"><td>Total due</td><td class="n">${aed(i.total_aed)}</td></tr></table>
    ${i.notes ? `<p style="margin-top:32px;white-space:pre-wrap">${esc(i.notes)}</p>` : ""}
    <p class="muted" style="margin-top:48px;font-size:11px">${esc(COMPANY.name)} · This is a tax invoice issued under UAE VAT law.</p>
    <script>window.onload=()=>window.print()</script></body></html>`);
  w.document.close();
}
