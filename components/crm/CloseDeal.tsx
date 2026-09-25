"use client";

import { useState } from "react";
import { PartyPopper, ShieldAlert } from "lucide-react";
import { goamlRequired, kycMissing, PAYMENT_METHODS, PAYMENT_METHOD_LABEL, GOAML_CASH_THRESHOLD_AED, type CrmDeal, type CrmKyc, type CrmLead, type CrmListing } from "@/lib/crm";
import { api, money, INPUT, BTN, BTN_GHOST, Label } from "./shared";

const DEAL_ERRORS: Record<string, string> = {
  kyc_contact_required: "Save the client as a contact and complete their KYC file first.",
  kyc_incomplete: "The client's KYC file is not complete yet.",
};

/** Shown when an agent moves a lead to Won: turns it into a real, linked deal record. */
export function CloseDealForm({ lead, listings, agentSplitPct, kyc, isAdmin, onOpenContact, onDone, onSkip }: {
  lead: CrmLead;
  listings: CrmListing[];
  agentSplitPct: number;
  kyc: CrmKyc | null;
  isAdmin: boolean;
  onOpenContact: (id: string) => void;
  onDone: (deal: CrmDeal) => void;
  onSkip: () => void;
}) {
  const matchedListing = listings.find((l) => l.community && lead.location?.toLowerCase().includes(l.community.toLowerCase()));
  const [f, setF] = useState({
    title: `${lead.full_name} - ${lead.deal_kind === "rent" ? "rental" : "sale"}`.trim(),
    deal_type: lead.deal_kind === "rent" ? "rent" : lead.ready_status === "offplan" ? "offplan" : "sale",
    price_aed: String(lead.deal_value_aed ?? lead.budget_aed ?? ""),
    commission_pct: lead.deal_kind === "rent" ? "5" : "2",
    listing_id: matchedListing?.id ?? "",
    closed_at: new Date().toISOString().slice(0, 10),
    payment_method: kyc?.payment_method ?? "",
    cash_amount_aed: "",
    kyc_override_reason: "",
  });
  const missing = lead.contact_id ? kycMissing(kyc) : ["Save the client as a contact first"];
  const blocked = missing.length > 0 && !(isAdmin && f.kyc_override_reason.trim().length >= 10);
  const cashy = f.payment_method === "cash" || f.payment_method === "crypto" || f.payment_method === "mixed";
  const goaml = goamlRequired({ payment_method: f.payment_method, cash_amount_aed: f.cash_amount_aed ? Number(f.cash_amount_aed) : null, price_aed: Number(f.price_aed) });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!f.price_aed || Number(f.price_aed) <= 0) return setError("Enter the closing price.");
    if (!f.payment_method) return setError("Choose how the client is paying.");
    if (blocked) return setError("Complete the client's KYC file before recording the deal.");
    setBusy(true);
    setError(null);
    const r = await api<{ row: CrmDeal }>("POST", "data/deals", {
      title: f.title, deal_type: f.deal_type, price_aed: f.price_aed, commission_pct: f.commission_pct,
      agent_split_pct: agentSplitPct, closed_at: f.closed_at,
      lead_id: lead.id, contact_id: lead.contact_id, listing_id: f.listing_id || null,
      agent_id: lead.owner_id, payment_method: f.payment_method,
      cash_amount_aed: cashy && f.cash_amount_aed ? f.cash_amount_aed : null,
      ...(isAdmin && missing.length ? { kyc_override_reason: f.kyc_override_reason.trim() } : {}),
    });
    setBusy(false);
    if (r.row) onDone(r.row as CrmDeal);
    else setError(DEAL_ERRORS[r.error ?? ""] ?? r.error ?? "Could not save the deal.");
  }

  return (
    <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
      <div className="flex items-center gap-2 text-emerald-700">
        <PartyPopper size={16} />
        <span className="text-[13px] font-medium">Won! Record the deal</span>
      </div>
      <p className="text-[12px] text-[var(--text-secondary)]">
        This creates a deal on the Deals page, linked back to this lead, so the commission is tracked.
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        <label className="col-span-2"><Label>Deal title</Label>
          <input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} className={INPUT} />
        </label>
        <label><Label>Type</Label>
          <select value={f.deal_type} onChange={(e) => setF({ ...f, deal_type: e.target.value })} className={INPUT}>
            <option value="sale">Secondary sale</option><option value="offplan">Off-plan</option><option value="rent">Rental</option>
          </select>
        </label>
        <label><Label>Closed on</Label>
          <input type="date" value={f.closed_at} onChange={(e) => setF({ ...f, closed_at: e.target.value })} className={INPUT} />
        </label>
        <label><Label>{f.deal_type === "rent" ? "Annual rent (AED)" : "Sale price (AED)"}</Label>
          <input type="number" value={f.price_aed} onChange={(e) => setF({ ...f, price_aed: e.target.value })} className={`${INPUT} figure`} />
        </label>
        <label><Label>Commission %</Label>
          <input type="number" step="0.25" value={f.commission_pct} onChange={(e) => setF({ ...f, commission_pct: e.target.value })} className={`${INPUT} figure`} />
        </label>
        {listings.length > 0 && (
          <label className="col-span-2"><Label>Listing (optional)</Label>
            <select value={f.listing_id} onChange={(e) => setF({ ...f, listing_id: e.target.value })} className={INPUT}>
              <option value="">—</option>
              {listings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          </label>
        )}
        <label><Label>Client pays by</Label>
          <select value={f.payment_method} onChange={(e) => setF({ ...f, payment_method: e.target.value })} className={INPUT}>
            <option value="">Choose…</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{PAYMENT_METHOD_LABEL[m]}</option>)}
          </select>
        </label>
        {cashy && (
          <label><Label>Cash / crypto part (AED)</Label>
            <input type="number" value={f.cash_amount_aed} onChange={(e) => setF({ ...f, cash_amount_aed: e.target.value })} placeholder={f.payment_method === "mixed" ? "" : "Full price"} className={`${INPUT} figure`} />
          </label>
        )}
      </div>
      {goaml && (
        <p className="rounded-md bg-amber-50 px-2.5 py-2 text-[12px] text-amber-800">
          Cash or virtual assets of AED {GOAML_CASH_THRESHOLD_AED.toLocaleString()} or more: the admin must file a goAML report (REAR) with the FIU. The deal will be flagged.
        </p>
      )}
      {missing.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[12px] text-amber-800">
          <p className="flex items-center gap-1.5 font-semibold"><ShieldAlert size={14} /> KYC needed before the deal can be recorded</p>
          <p className="mt-1">Missing: {missing.join(", ")}</p>
          {lead.contact_id && (
            <button onClick={() => onOpenContact(lead.contact_id!)} className={`${BTN_GHOST} mt-2 !h-8`}>Open the client&apos;s KYC file</button>
          )}
          {isAdmin && (
            <label className="mt-2 block"><Label>Admin override — reason (logged)</Label>
              <input value={f.kyc_override_reason} onChange={(e) => setF({ ...f, kyc_override_reason: e.target.value })} placeholder="At least 10 characters" className={INPUT} />
            </label>
          )}
        </div>
      )}
      {f.price_aed && Number(f.commission_pct) > 0 && (
        <p className="text-[11px] text-[var(--text-muted)]">
          Commission ≈ {money((Number(f.price_aed) * Number(f.commission_pct)) / 100)}, agent share at {agentSplitPct}% ≈{" "}
          {money((Number(f.price_aed) * Number(f.commission_pct) * agentSplitPct) / 10000)}
        </p>
      )}
      {error && <p className="text-[12px] text-[#c0392b]">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy || blocked} className={BTN}>{busy ? "Saving…" : "Save deal"}</button>
        <button onClick={onSkip} className={BTN_GHOST}>Skip for now</button>
      </div>
    </div>
  );
}
