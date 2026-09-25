"use client";

import { useState } from "react";
import { PartyPopper } from "lucide-react";
import type { CrmDeal, CrmLead, CrmListing } from "@/lib/crm";
import { api, money, INPUT, BTN, BTN_GHOST, Label } from "./shared";

/** Shown when an agent moves a lead to Won: turns it into a real, linked deal record. */
export function CloseDealForm({ lead, listings, agentSplitPct, onDone, onSkip }: {
  lead: CrmLead;
  listings: CrmListing[];
  agentSplitPct: number;
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
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!f.price_aed || Number(f.price_aed) <= 0) return setError("Enter the closing price.");
    setBusy(true);
    setError(null);
    const r = await api<{ row: CrmDeal }>("POST", "data/deals", {
      title: f.title, deal_type: f.deal_type, price_aed: f.price_aed, commission_pct: f.commission_pct,
      agent_split_pct: agentSplitPct, closed_at: f.closed_at,
      lead_id: lead.id, contact_id: lead.contact_id, listing_id: f.listing_id || null,
      agent_id: lead.owner_id,
    });
    setBusy(false);
    if (r.row) onDone(r.row as CrmDeal);
    else setError(r.error ?? "Could not save the deal.");
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
      </div>
      {f.price_aed && Number(f.commission_pct) > 0 && (
        <p className="text-[11px] text-[var(--text-muted)]">
          Commission ≈ {money((Number(f.price_aed) * Number(f.commission_pct)) / 100)}, agent share at {agentSplitPct}% ≈{" "}
          {money((Number(f.price_aed) * Number(f.commission_pct) * agentSplitPct) / 10000)}
        </p>
      )}
      {error && <p className="text-[12px] text-[#c0392b]">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className={BTN}>{busy ? "Saving…" : "Save deal"}</button>
        <button onClick={onSkip} className={BTN_GHOST}>Skip for now</button>
      </div>
    </div>
  );
}
