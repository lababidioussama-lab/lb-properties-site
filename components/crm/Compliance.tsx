"use client";

import { useState, type ReactNode } from "react";
import { ShieldAlert, ShieldCheck, Landmark, IdCard, Building2, HandCoins, KeyRound, UserCheck } from "lucide-react";
import { complianceIssues, daysLeft, kycMissing, licenceAlerts, type CrmContact, type CrmDeal, type CrmKyc, type CrmListing, type CrmTenancy, type CrmUser } from "@/lib/crm";
import { money, shortDate, INPUT, BTN, Card } from "./shared";
import { renewalState } from "./Rentals";
import type { Table } from "./useTable";

interface Item { key: string; title: ReactNode; detail: ReactNode; level: "red" | "amber"; action?: ReactNode; onOpen?: () => void }

function Section({ icon: Icon, title, hint, items, empty }: { icon: typeof ShieldAlert; title: string; hint: string; items: Item[]; empty: string }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${items.length ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}><Icon size={17} /></span>
        <div className="flex-1">
          <h3 className="text-[14px] font-semibold">{title} <span className="figure ms-1 text-[var(--text-muted)]">{items.length}</span></h3>
          <p className="text-[12px] text-[var(--text-muted)]">{hint}</p>
        </div>
      </div>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 text-[12.5px] text-emerald-700"><ShieldCheck size={14} /> {empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((i) => (
            <li key={i.key} className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border px-3 py-2 text-[12.5px] ${i.level === "red" ? "border-red-200 bg-red-50/50" : "border-amber-200 bg-amber-50/50"}`}>
              <button onClick={i.onOpen} disabled={!i.onOpen} className="min-w-0 flex-1 text-start enabled:hover:underline">
                <span className="font-medium">{i.title}</span>
                <span className={`block text-[11.5px] ${i.level === "red" ? "text-red-700" : "text-amber-800"}`}>{i.detail}</span>
              </button>
              {i.action}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function GoamlAction({ deal, deals }: { deal: CrmDeal; deals: Table<CrmDeal> }) {
  const [ref, setRef] = useState("");
  return (
    <span className="flex items-center gap-1.5">
      <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="goAML ref" className={`${INPUT} !h-8 !w-32`} />
      <button disabled={ref.trim().length < 3} onClick={() => deals.update(deal.id, { goaml_ref: ref.trim(), goaml_reported_at: new Date().toISOString() })} className={`${BTN} !h-8`}>Mark reported</button>
    </span>
  );
}

/** Admin: everything that could get the brokerage fined, in one place. */
export function ComplianceView({ users, contacts, listings, deals, kyc, tenancies, onOpenContact, onGo }: {
  users: CrmUser[];
  contacts: CrmContact[];
  listings: CrmListing[];
  deals: Table<CrmDeal>;
  kyc: Table<CrmKyc>;
  tenancies: CrmTenancy[];
  onOpenContact: (id: string) => void;
  onGo: (view: "deals" | "listings" | "team" | "rentals") => void;
}) {
  const name = (id: string | null) => contacts.find((c) => c.id === id)?.full_name ?? "Unknown client";
  const agent = (id: string | null) => users.find((u) => u.id === id);

  const goaml: Item[] = deals.rows.filter((d) => d.goaml_required && !d.goaml_reported_at).map((d) => ({
    key: d.id, level: "red", title: d.title,
    detail: `${d.payment_method === "crypto" ? "Virtual assets" : "Cash"} ${money(d.cash_amount_aed ?? d.price_aed)} · closed ${shortDate(d.closed_at)} — file a REAR on goAML`,
    action: <GoamlAction deal={d} deals={deals} />,
  }));

  const dealKyc: Item[] = deals.rows.filter((d) => d.kyc_override_reason || (d.contact_id && kycMissing(kyc.rows.find((k) => k.contact_id === d.contact_id)).length)).map((d) => ({
    key: d.id, level: d.kyc_override_reason ? "amber" : "red", title: `${d.title} · ${name(d.contact_id)}`,
    detail: d.kyc_override_reason ? `Recorded with an admin override: ${d.kyc_override_reason}` : `KYC incomplete: ${kycMissing(kyc.rows.find((k) => k.contact_id === d.contact_id)).join(", ")}`,
    onOpen: d.contact_id ? () => onOpenContact(d.contact_id!) : undefined,
  }));

  const approve: Item[] = kyc.rows.filter((k) => k.status === "complete").map((k) => ({
    key: k.id, level: k.risk_rating === "high" || k.is_pep ? "red" : "amber", title: k.legal_name ?? name(k.contact_id),
    detail: `Complete, waiting for compliance approval${k.is_pep ? " · PEP — enhanced due diligence" : ""}${k.risk_rating === "high" ? " · high risk" : ""}`,
    action: <button onClick={() => kyc.update(k.id, { status: "approved" })} className={`${BTN} !h-8`}>Approve</button>,
    onOpen: () => onOpenContact(k.contact_id),
  }));
  const matches: Item[] = kyc.rows.filter((k) => k.sanctions_result === "match").map((k) => ({
    key: `m-${k.id}`, level: "red", title: k.legal_name ?? name(k.contact_id),
    detail: "Possible sanctions match — stop the deal, check the UAE Local Terrorist List and UN list, and report on goAML (FFR) if confirmed",
    onOpen: () => onOpenContact(k.contact_id),
  }));

  const ids: Item[] = kyc.rows.flatMap((k) => ([["Emirates ID", k.emirates_id_expiry], ["Passport", k.passport_expiry], ["Trade licence", k.trade_license_expiry]] as const)
    .filter(([, d]) => d && daysLeft(d) <= 30)
    .map(([label, d]) => ({
      key: `${k.id}-${label}`, level: daysLeft(d!) < 0 ? "red" as const : "amber" as const, title: `${k.legal_name ?? name(k.contact_id)} · ${label}`,
      detail: daysLeft(d!) < 0 ? `Expired ${shortDate(d!)} — collect a new copy` : `Expires ${shortDate(d!)} (${daysLeft(d!)} days)`,
      onOpen: () => onOpenContact(k.contact_id),
    })));

  const licences: Item[] = users.filter((u) => u.active).flatMap((u) => licenceAlerts(u)
    .filter((a) => u.role === "agent" || a.level !== "missing")
    .map((a) => ({ key: `${u.id}-${a.text}`, level: a.level === "soon" ? "amber" as const : "red" as const, title: u.full_name, detail: `${a.text}${a.level !== "soon" && u.role === "agent" && /BRN/.test(a.text) ? " — receives no new leads" : ""}`, onOpen: () => onGo("team") })));

  const listingItems: Item[] = listings.filter((l) => l.status === "available" || l.approval === "approved").flatMap((l) => {
    const issues = complianceIssues(l, agent(l.agent_id) ?? null).filter((x) => x !== "No photos");
    const soon = l.permit_expiry && daysLeft(l.permit_expiry) >= 0 && daysLeft(l.permit_expiry) <= 14 ? [`Permit expires in ${daysLeft(l.permit_expiry)} days`] : [];
    const all = [...issues, ...soon];
    return all.length ? [{ key: l.id, level: issues.length ? "red" as const : "amber" as const, title: `${l.title}${l.permit_no ? ` · permit ${l.permit_no}` : ""}`, detail: all.join(" · "), onOpen: () => onGo("listings") }] : [];
  });

  const dealDates: Item[] = deals.rows.flatMap((d) => {
    const out: Item[] = [];
    if (d.noc_expiry && !d.milestones?.title_deed && daysLeft(d.noc_expiry) <= 7) out.push({ key: `noc-${d.id}`, level: daysLeft(d.noc_expiry) < 0 ? "red" : "amber", title: d.title, detail: daysLeft(d.noc_expiry) < 0 ? "Developer NOC expired — reapply before transfer" : `NOC expires in ${daysLeft(d.noc_expiry)} days`, onOpen: () => onGo("deals") });
    if (d.transfer_at && daysLeft(d.transfer_at) >= 0 && daysLeft(d.transfer_at) <= 7) out.push({ key: `tr-${d.id}`, level: "amber", title: d.title, detail: `Transfer on ${shortDate(d.transfer_at)} — confirm manager's cheques, NOC and trustee booking`, onOpen: () => onGo("deals") });
    return out;
  });

  const rentals: Item[] = tenancies.filter((t) => t.status === "active" || t.status === "renewing").flatMap((t) => {
    const out: Item[] = [];
    if (!t.ejari_no) out.push({ key: `ej-${t.id}`, level: "red", title: t.property_label, detail: "No Ejari registration", onOpen: () => onGo("rentals") });
    const r = renewalState(t);
    if (r.urgent) out.push({ key: `rn-${t.id}`, level: r.d <= 90 ? "red" : "amber", title: t.property_label, detail: `Tenancy ends ${shortDate(t.end_date)} — ${r.label}`, onOpen: () => onGo("rentals") });
    if (t.cheques.some((c) => c.status === "bounced")) out.push({ key: `bc-${t.id}`, level: "red", title: t.property_label, detail: "Bounced cheque — contact the tenant and landlord", onOpen: () => onGo("rentals") });
    return out;
  });

  const total = goaml.length + matches.length + dealKyc.length + approve.length + ids.length + licences.length + listingItems.length + dealDates.length + rentals.length;
  const red = [goaml, matches, dealKyc, approve, ids, licences, listingItems, dealDates, rentals].flat().filter((i) => i.level === "red").length;

  return (
    <div className="space-y-5">
      <Card className={`flex flex-wrap items-center gap-4 px-5 py-4 ${red ? "border-red-200" : ""}`}>
        {red ? <ShieldAlert size={22} className="text-red-600" /> : <ShieldCheck size={22} className="text-emerald-600" />}
        <div className="flex-1">
          <div className="text-[15px] font-semibold">{total === 0 ? "Nothing needs attention" : `${total} item${total === 1 ? "" : "s"} need attention · ${red} urgent`}</div>
          <p className="text-[12.5px] text-[var(--text-muted)]">UAE AML law (Federal Decree-Law 20/2018), RERA advertising and licensing rules, Ejari and DLD transfer requirements.</p>
        </div>
      </Card>
      <div className="grid gap-5 xl:grid-cols-2">
        <Section icon={Landmark} title="goAML reports due" hint="Cash or virtual-asset deals of AED 55,000+." items={goaml} empty="No reports outstanding." />
        <Section icon={ShieldAlert} title="Sanctions matches" hint="Possible matches found during screening." items={matches} empty="No matches." />
        <Section icon={UserCheck} title="KYC files to approve" hint="Complete files waiting for the compliance officer." items={approve} empty="Nothing to approve." />
        <Section icon={HandCoins} title="Deals with a KYC gap" hint="Deals whose client file is incomplete or was overridden." items={dealKyc} empty="Every deal has a complete KYC file." />
        <Section icon={IdCard} title="Client IDs expiring" hint="Emirates ID, passport or trade licence within 30 days." items={ids} empty="No client IDs expiring." />
        <Section icon={IdCard} title="Agent licences" hint="BRN, visa and Emirates ID. Expired BRN = no leads." items={licences} empty="Every agent is licensed." />
        <Section icon={Building2} title="Live listings with permit problems" hint="Trakheesi permit, Form A, price and agent must match the ad." items={listingItems} empty="Every live listing is compliant." />
        <Section icon={HandCoins} title="NOCs and transfers" hint="NOCs expiring within 7 days, transfers this week." items={dealDates} empty="Nothing due this week." />
        <Section icon={KeyRound} title="Rentals" hint="Missing Ejari, renewals inside 90–120 days, bounced cheques." items={rentals} empty="All tenancies in order." />
      </div>
    </div>
  );
}
