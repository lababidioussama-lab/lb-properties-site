"use client";

/**
 * Browser side of DB Search. Types mirror lib/dbsearch/model.ts — the server
 * never sends more than these shapes, so neither can the page show more.
 */

export type OwnerStatus = "confirmed" | "likely" | "previous" | "bought" | "sold" | "listed" | "unknown";

export interface DsProperty {
  community: string | null;
  building: string | null;
  unit: string | null;
  propertyNo: string | null;
  plot: string | null;
  dmNo: string | null;
  type: string | null;
  beds: string | null;
  size: { value: number; unit: "sq m" | "sq ft" | null } | null;
  price: number | null;
  date: string | null;
}

export interface DsPhone { masked: string; region: "uae_mobile" | "uae_landline" | "abroad" }
export interface DsCrmLink { kind: "lead" | "contact" | "temp"; id: string; name: string; stage: string | null; ownerName: string | null; mine: boolean }

export interface DsHit {
  ref: string;
  name: string;
  status: OwnerStatus;
  statusDate: string | null;
  nationality: string | null;
  property: DsProperty;
  phones: DsPhone[];
  hasEmail: boolean;
  inCrm: DsCrmLink | null;
  notes: string[];
}

export interface DsOwner {
  ref: string;
  name: string;
  nationality: string | null;
  phones: DsPhone[];
  hasEmail: boolean;
  inCrm: DsCrmLink | null;
  properties: { ref: string; status: OwnerStatus; statusDate: string | null; property: DsProperty }[];
}

/* ------------------------------------------------------------ DB Search results (lib/dbsearch/results.ts) */

export interface CcShared { n_units: number | null; level?: string | null }
export interface CcLine { k: string; label: string; parts: { pre?: string; v: string; shared?: CcShared | null }[]; multi?: boolean }
export interface CcModel {
  community: string | null;
  building: string | null;
  badge: { k: string; label: string; v: string } | null;
  lines: CcLine[];
  size: { v: number; u: string } | null;
  plotArea: { v: number; u: string } | null;
  beds: string | null;
  ptype: string | null;
  tx: { date: string | null; proc: string | null; value: number | null; party: string | null; label: string; noConsideration: boolean };
  nat: string | null;
  more: { label: string; v: string | number; suffix: string }[];
  notes: string[];
  nRec: number;
  gaps: string[];
  unreadable: string[];
  pMatch: boolean;
}
export interface SoldBanner { unit: string; date: string; price: number | null; gain: number | null; stale: boolean }
export interface DsCard {
  ref: string;
  name: string;
  buildingRecord: boolean;
  model: CcModel;
  email: string | null;
  phoneCount: number;
  inCrm: DsCrmLink | null;
  match: { name: string; more: number } | null;
  sold: SoldBanner | null;
  comm: string;
  find: string;
}
export interface DsViewEntry { c: number; also?: string[] }
export type DsNote =
  | { kind: "no_exact"; n: number }
  | { kind: "showing_all"; n: number; hidden: number }
  | { kind: "names_hidden"; n: number }
  | { kind: "contact_only"; n: number };
export interface DsView { entries: DsViewEntry[]; notes: DsNote[]; capped: number }
export interface DsResults { cards: DsCard[]; strict: DsView; loose: DsView }
export interface DamacSale { villa: string | null; sub_project: string | null; sale_type: string | null; sale_date: string | null; price: number | null; bua_sqft: number | null; payment_method: string | null; mortgage_amount: number | null; times_sold: number | null }
export interface DsSearchResult extends DsResults { communities: { community: string; ct: number }[]; hiddenEmpty: number; damac: DamacSale[] }
export interface DsCommunityResult extends DsResults { hiddenEmpty: number }
export interface DsAgentHit { name: string; company: string | null; phone: string | null; nationality: string | null; brn: string | null }
export interface DsPhoneResult extends DsResults { agent: DsAgentHit | null }
export interface DsRevealed { index: number; value: string; dial: string | null; dnc: boolean; inCrm: DsCrmLink | null }
export interface DsSoldFlag { comm: string; unitKey: string; unit: string | null; project: string | null; date: string | null; price: number | null; payment: string | null; confidence: string | null }
export interface DsStats { owners: number; properties: number; projects: number; phones: number }

export const REASONS = [
  { id: "owner_outreach", label: "Selling: owner outreach" },
  { id: "buyer_followup", label: "Buyer follow-up" },
  { id: "listing_check", label: "Checking a listing" },
] as const;

export interface DsUsage { searches: number; reveals: number; lists: number }
export interface DsLimits { searches: number; reveals: number; lists: number }

export interface DsSessionInfo {
  signedIn: boolean;
  user: { name: string; role: "admin" | "agent" };
  limits: DsLimits | null;
  usage: DsUsage | null;
  session?: { endsAt: number; idleMinutes: number };
}

export interface DsUnitResult {
  code: string;
  places: string[];
  chosen: string | null;
  current: { names: string[]; ref: string | null; confidence: "confirmed" | "likely"; date: string | null; amount: number | null; landNumber: string | null; transactions: number } | null;
  events: { name: string; date: string | null; amount: number | null; role: "Buyer" | "Seller" | "Mortgage" | "Side not recorded" }[];
}

export type DsResult<T> = (T & { ok: true; session?: { endsAt: number; idleMinutes: number } }) | { ok: false; error: string; [k: string]: unknown };

export async function ds<T>(method: "GET" | "POST" | "PATCH" | "DELETE", action: string, body?: Record<string, unknown>): Promise<DsResult<T>> {
  if (typeof window !== "undefined" && (window as { __CRM_DEMO__?: boolean }).__CRM_DEMO__) {
    const { demoDs } = await import("./demo");
    return demoDs(method, action, body) as Promise<DsResult<T>>;
  }
  try {
    const res = await fetch(`/api/ds/${action}`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return (await res.json().catch(() => ({ ok: false, error: `server_${res.status}` }))) as DsResult<T>;
  } catch {
    return { ok: false, error: "network" };
  }
}

/** Plain-language errors. The server's codes stay out of the agent's way. */
export const DS_ERRORS: Record<string, string> = {
  ds_signin_required: "Your DB Search session has ended. Sign in again to continue.",
  no_access: "Your account does not have DB Search access. Ask your admin to switch it on.",
  locked: "DB Search is locked on your account because of unusual activity. Your admin can unlock it.",
  daily_limit: "You have reached today's limit for this. It resets at midnight.",
  reason_required: "Choose why you need the number.",
  do_not_contact: "This owner is on the do-not-contact list. The number cannot be revealed or used.",
  already_in_crm: "This person is already in the CRM.",
  expired_ref: "This result is more than two hours old. Search again.",
  query_too_short: "Type at least two characters.",
  no_phone: "There is no usable number for this owner.",
  not_found: "Nothing found.",
  network: "Could not reach the server.",
};

export const dsError = (e: string) => DS_ERRORS[e] ?? `Something went wrong (${e}).`;

/* ------------------------------------------------------------ display */

export const STATUS_LABEL: Record<OwnerStatus, string> = {
  confirmed: "Current owner · confirmed",
  likely: "Likely current",
  previous: "Sold since",
  bought: "Bought",
  sold: "Sold",
  listed: "Owner on record",
  unknown: "Side not recorded",
};

/* Same house palette as the lead stages: green only for the confirmed owner. */
export const STATUS_STYLE: Record<OwnerStatus, string> = {
  confirmed: "bg-[#e8f3ec] text-[#285f3f] border-[#bfdcca]",
  likely: "bg-[#eef2f7] text-[#3d5a7a] border-[#d3dde9]",
  previous: "bg-[#f1f0ed] text-[#62615b] border-[#e1dfda]",
  bought: "bg-[#eef2f7] text-[#3d5a7a] border-[#d3dde9]",
  sold: "bg-[#f1f0ed] text-[#62615b] border-[#e1dfda]",
  listed: "bg-[#eef2f7] text-[#3d5a7a] border-[#d3dde9]",
  unknown: "bg-[#f1f0ed] text-[#62615b] border-[#e1dfda]",
};

export const REGION_LABEL: Record<DsPhone["region"], string> = { uae_mobile: "UAE mobile", uae_landline: "UAE landline", abroad: "Outside the UAE" };

export const aed = (n: number | null | undefined, short = false) => {
  if (n == null) return "—";
  if (short && n >= 1_000_000_000) return `AED ${(n / 1_000_000_000).toFixed(2).replace(/\.?0+$/, "")}B`;
  if (short && n >= 1_000_000) return `AED ${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (short && n >= 1_000) return `AED ${Math.round(n / 1_000)}K`;
  return `AED ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)}`;
};

export const monthYear = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : null;

export const fullDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null;

export const sizeText = (s: DsProperty["size"]) =>
  s ? `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(s.value)}${s.unit ? ` ${s.unit}` : ""}` : null;

export const placeText = (p: DsProperty) =>
  [p.unit && `Unit ${p.unit}`, p.building, p.community].filter(Boolean).join(" · ") || "Property not recorded";
