"use client";

import { useState, type ReactNode } from "react";
import { Copy, Check, Receipt, Percent, TrendingUp, Landmark } from "lucide-react";
import { calculateMortgage, FEES, monthlyPayment, type BuyerType, type PropertyStatus } from "@/lib/mortgage";
import { money, INPUT, BTN_GHOST, Label, Card } from "./shared";

const n = (v: string) => Number(v.replace(/[^\d.]/g, "")) || 0;
const pct = (v: number) => `${v.toFixed(2)}%`;
const NOTE = "All figures are approximate and confirmed before signing.";

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1800); }}
      className={BTN_GHOST}
    >
      {done ? <Check size={14} /> : <Copy size={14} />} {done ? "Copied" : "Copy for WhatsApp"}
    </button>
  );
}

function Tool({ icon: Icon, title, desc, children, copy }: { icon: typeof Copy; title: string; desc: string; children: ReactNode; copy: string }) {
  return (
    <Card className="flex flex-col">
      <div className="flex flex-wrap items-start gap-3 border-b border-[var(--hairline)] px-5 py-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-wash)] text-[var(--accent)]"><Icon size={17} /></span>
        <div className="min-w-[160px] flex-1">
          <h3 className="text-[14.5px] font-semibold">{title}</h3>
          <p className="text-[12.5px] text-[var(--text-muted)]">{desc}</p>
        </div>
        <CopyButton text={copy} />
      </div>
      <div className="flex-1 p-5">{children}</div>
    </Card>
  );
}

function Money({ label, value, onChange, suffix = "AED" }: { label: string; value: string; onChange: (v: string) => void; suffix?: string }) {
  return (
    <label className="block">
      <Label>{label}</Label>
      <div className="relative">
        <input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className={`${INPUT} figure pe-12`} />
        <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-muted)]">{suffix}</span>
      </div>
    </label>
  );
}

function Rows({ rows, total }: { rows: [string, number | string][]; total?: [string, number | string] }) {
  return (
    <dl className="mt-5 space-y-2 text-[13px]">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4">
          <dt className="text-[var(--text-secondary)]">{k}</dt>
          <dd className="figure">{typeof v === "number" ? money(v) : v}</dd>
        </div>
      ))}
      {total && (
        <div className="flex justify-between gap-4 border-t border-[var(--hairline)] pt-3 text-[14.5px] font-semibold">
          <dt>{total[0]}</dt>
          <dd className="figure text-[var(--accent)]">{typeof total[1] === "number" ? money(total[1]) : total[1]}</dd>
        </div>
      )}
      <p className="pt-2 text-[11.5px] text-[var(--text-muted)]">≈ {NOTE}</p>
    </dl>
  );
}

const lines = (title: string, rows: [string, number | string][], total?: [string, number | string]) =>
  [
    `*${title}* (Lababidi Properties)`,
    ...rows.map(([k, v]) => `• ${k}: ${typeof v === "number" ? money(v) : v}`),
    ...(total ? [`*${total[0]}: ${typeof total[1] === "number" ? money(total[1]) : total[1]}*`] : []),
    `_${NOTE}_`,
  ].join("\n");

/* ---------------------------------------------------------------- tools */

function CostSheet() {
  const [price, setPrice] = useState("2,000,000");
  const [finance, setFinance] = useState<"cash" | "mortgage">("cash");
  const [buyer, setBuyer] = useState<BuyerType>("resident");
  const p = n(price);
  let rows: [string, number][];
  let total: [string, number];
  if (finance === "cash") {
    const dld = p * FEES.dldTransferPct + FEES.dldAdminAed;
    const agency = p * FEES.agencyPct * (1 + FEES.vatPct);
    rows = [["Property price", p], ["DLD transfer (4%) + admin", dld], ["Agency (2% + VAT)", agency], ["Trustee office", FEES.trusteeAed]];
    total = ["Total cash needed", p + dld + agency + FEES.trusteeAed];
  } else {
    const m = calculateMortgage({ priceAed: p, buyerType: buyer, status: "first" as PropertyStatus, ratePct: 4.5, termYears: 25 });
    rows = [
      ["Property price", p], [`Loan (${Math.round(m.maxLtv * 100)}% LTV)`, m.loanAed], ["Down payment", m.depositAed],
      ["DLD transfer + admin", m.fees.dldTransfer], ["Agency (2% + VAT)", m.fees.agency], ["Trustee office", m.fees.trustee],
      ["Mortgage registration", m.fees.mortgageRegistration], ["Bank arrangement", m.fees.bankArrangement], ["Valuation", m.fees.valuation],
    ];
    total = ["Total cash needed", m.cashRequiredAed];
  }
  return (
    <Tool icon={Receipt} title="Buyer cost sheet" desc="What a buyer pays on top of the price." copy={lines("Estimated purchase costs", rows, total)}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3"><Money label="Price" value={price} onChange={setPrice} /></div>
        <label><Label>Paying by</Label>
          <select value={finance} onChange={(e) => setFinance(e.target.value as "cash" | "mortgage")} className={INPUT}><option value="cash">Cash</option><option value="mortgage">Mortgage</option></select>
        </label>
        {finance === "mortgage" && (
          <label className="sm:col-span-2"><Label>Buyer</Label>
            <select value={buyer} onChange={(e) => setBuyer(e.target.value as BuyerType)} className={INPUT}>
              <option value="resident">UAE resident (expat)</option><option value="national">UAE national</option><option value="nonResident">Non-resident</option>
            </select>
          </label>
        )}
      </div>
      <Rows rows={rows} total={total} />
    </Tool>
  );
}

function CommissionSplit() {
  const [price, setPrice] = useState("2,000,000");
  const [rate, setRate] = useState("2");
  const [split, setSplit] = useState("50");
  const gross = n(price) * (n(rate) / 100);
  const vat = gross * FEES.vatPct;
  const agent = gross * (n(split) / 100);
  const rows: [string, number | string][] = [["Deal price", n(price)], [`Commission (${rate}%)`, gross], ["VAT on commission (5%)", vat], [`Agent share (${split}%)`, agent], ["Company share", gross - agent]];
  return (
    <Tool icon={Percent} title="Commission split" desc="Gross commission, VAT, and who gets what." copy={lines("Commission estimate", rows, ["Client pays (incl. VAT)", gross + vat])}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3"><Money label="Deal price" value={price} onChange={setPrice} /></div>
        <Money label="Commission" value={rate} onChange={setRate} suffix="%" />
        <Money label="Agent split" value={split} onChange={setSplit} suffix="%" />
      </div>
      <Rows rows={rows} total={["Client pays (incl. VAT)", gross + vat]} />
    </Tool>
  );
}

function RentalYield() {
  const [price, setPrice] = useState("1,600,000");
  const [rent, setRent] = useState("110,000");
  const [size, setSize] = useState("800");
  const [sc, setSc] = useState("18");
  const [mgmt, setMgmt] = useState("5");
  const serviceCharge = n(size) * n(sc);
  const management = n(rent) * (n(mgmt) / 100);
  const net = n(rent) - serviceCharge - management;
  const outlay = n(price) * (1 + FEES.dldTransferPct + FEES.agencyPct * (1 + FEES.vatPct)) + FEES.dldAdminAed + FEES.trusteeAed;
  const rows: [string, number | string][] = [
    ["Annual rent", n(rent)], ["Service charge", -serviceCharge], [`Management (${mgmt}%)`, -management], ["Net annual income", net],
    ["Gross yield on price", n(price) ? pct((n(rent) / n(price)) * 100) : "—"],
  ];
  const total: [string, string] = ["Net yield on total outlay", outlay ? pct((net / outlay) * 100) : "—"];
  return (
    <Tool icon={TrendingUp} title="Rental yield" desc="Gross vs net, after service charge and fees." copy={lines("Estimated rental yield", rows, total)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Money label="Price" value={price} onChange={setPrice} />
        <Money label="Annual rent" value={rent} onChange={setRent} />
        <Money label="Size" value={size} onChange={setSize} suffix="sqft" />
        <Money label="Service charge" value={sc} onChange={setSc} suffix="AED/sqft" />
        <Money label="Management fee" value={mgmt} onChange={setMgmt} suffix="%" />
      </div>
      <Rows rows={rows} total={total} />
    </Tool>
  );
}

function MortgagePayment() {
  const [loan, setLoan] = useState("1,600,000");
  const [rate, setRate] = useState("4.5");
  const [years, setYears] = useState("25");
  const monthly = monthlyPayment(n(loan), n(rate), n(years));
  const totalPaid = monthly * 12 * n(years);
  const rows: [string, number | string][] = [["Loan amount", n(loan)], ["Interest rate", `${rate}%`], ["Term", `${years} years`], ["Total interest", totalPaid - n(loan)]];
  return (
    <Tool icon={Landmark} title="Mortgage payment" desc="Monthly instalment for a loan." copy={lines("Estimated mortgage", rows, ["Monthly payment", monthly])}>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-3"><Money label="Loan" value={loan} onChange={setLoan} /></div>
        <Money label="Rate" value={rate} onChange={setRate} suffix="%" />
        <Money label="Term" value={years} onChange={setYears} suffix="years" />
      </div>
      <Rows rows={rows} total={["Monthly payment", monthly]} />
    </Tool>
  );
}

export function ToolsView() {
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <CostSheet />
      <CommissionSplit />
      <RentalYield />
      <MortgagePayment />
    </div>
  );
}
