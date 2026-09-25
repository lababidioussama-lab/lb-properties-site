/**
 * The shared shape of a lead, used by the drawer, the API route and the
 * WhatsApp message builder alike — so what gets stored and what gets sent
 * can never drift apart.
 */

import { SITE, type ServiceKey } from "./site-config";
import { formatCurrency, type CurrencyCode } from "./currency";
import type { InvestmentGoal } from "./investment-data";
import type { Locale } from "./i18n/types";

export interface LeadSelections {
  /* Investor advisory */
  budgetAed?: number;
  goal?: InvestmentGoal;
  hubs?: string[];
  netAnnualAed?: number;

  /* Secondary market net ROI */
  roiMode?: string;
  roiArea?: string;
  roiBedroom?: string;
  roiPriceAed?: number;
  roiNetYieldPct?: number;
  roiServiceChargeAed?: number;

  /* Mortgage advisory. The cash figure is carried deliberately: it is the
     number that decides whether an introduction is worth making, and an
     advisor who sees it first can qualify the lead before calling. */
  mortgageBuyerType?: string;
  mortgagePropertyStatus?: string;
  mortgagePriceAed?: number;
  mortgageLoanAed?: number;
  mortgageMonthlyAed?: number;
  mortgageCashRequiredAed?: number;

  /* Everything else */
  planId?: string;
  billing?: "monthly" | "annual";
  relocationCard?: string;
  fitoutPackage?: string;
  fitoutMaterial?: string;
  floorPlanName?: string;

  /* Off-plan project enquiry, carried in from a listing card so the advisor
     opens the conversation already knowing which allocation is meant. */
  project?: string;
  projectDeveloper?: string;
  projectCommunity?: string;
}

export interface LeadPayload {
  service: ServiceKey;
  fullName: string;
  phone: string;
  email?: string;
  notes?: string;
  locale: Locale;
  currency: CurrencyCode;
  selections: LeadSelections;
  /** Anti-spam honeypot: must be empty. Real users never see this field. */
  company?: string;
}

const SERVICE_LABEL: Record<ServiceKey, string> = {
  advisory: "Investor Advisory",
  netRoi: "Net ROI & Service Charges",
  relocation: "Relocation & Utilities",
  maintenance: "Home Maintenance",
  fitout: "Interior Fit-Out",
  construction: "Construction & Renovations",
  mortgage: "Mortgage Advisory",
};

const GOAL_LABEL: Record<InvestmentGoal, string> = {
  yield: "High rental yield",
  appreciation: "Capital appreciation",
  goldenVisa: "10-year Golden Visa",
};

/**
 * Build the pre-filled WhatsApp message. Deliberately written in English
 * regardless of site locale — it is read by the advisor, not the client,
 * and a consistent format is what makes it scannable on a phone.
 */
export function buildWhatsAppMessage(lead: LeadPayload): string {
  const lines: string[] = [
    `New enquiry — ${SERVICE_LABEL[lead.service]}`,
    "",
    `Name: ${lead.fullName}`,
    `Phone: ${lead.phone}`,
  ];

  if (lead.email) lines.push(`Email: ${lead.email}`);

  const s = lead.selections;
  const detail: string[] = [];

  if (s.budgetAed !== undefined) {
    detail.push(`Budget: ${formatCurrency(s.budgetAed, lead.currency)}`);
  }
  if (s.goal) detail.push(`Objective: ${GOAL_LABEL[s.goal]}`);
  if (s.netAnnualAed !== undefined) {
    detail.push(`Modelled net return: ${formatCurrency(s.netAnnualAed, lead.currency)} / yr`);
  }
  if (s.hubs?.length) detail.push(`Hubs shown: ${s.hubs.join(", ")}`);

  if (s.roiMode) detail.push(`ROI mode: ${s.roiMode}`);
  if (s.roiArea) {
    detail.push(`Target: ${[s.roiBedroom, s.roiArea].filter(Boolean).join(" · ")}`);
  }
  if (s.roiPriceAed !== undefined) {
    detail.push(`Price: ${formatCurrency(s.roiPriceAed, lead.currency)}`);
  }
  if (s.roiNetYieldPct !== undefined) {
    detail.push(`Modelled net yield: ${s.roiNetYieldPct.toFixed(2)}%`);
  }
  if (s.roiServiceChargeAed !== undefined) {
    detail.push(
      `Service charge: ${formatCurrency(s.roiServiceChargeAed, lead.currency)} / yr`,
    );
  }

  if (s.mortgageBuyerType) {
    detail.push(
      `Mortgage profile: ${[s.mortgageBuyerType, s.mortgagePropertyStatus]
        .filter(Boolean)
        .join(" · ")}`,
    );
  }
  if (s.mortgagePriceAed !== undefined) {
    detail.push(`Target price: ${formatCurrency(s.mortgagePriceAed, lead.currency)}`);
  }
  if (s.mortgageLoanAed !== undefined) {
    detail.push(`Indicative loan: ${formatCurrency(s.mortgageLoanAed, lead.currency)}`);
  }
  if (s.mortgageMonthlyAed !== undefined) {
    detail.push(`Monthly payment: ${formatCurrency(s.mortgageMonthlyAed, lead.currency)}`);
  }
  if (s.mortgageCashRequiredAed !== undefined) {
    detail.push(
      `Cash required: ${formatCurrency(s.mortgageCashRequiredAed, lead.currency)}`,
    );
  }

  if (s.planId) {
    detail.push(`Plan: ${s.planId}${s.billing ? ` (${s.billing})` : ""}`);
  }
  if (s.relocationCard) detail.push(`Relocation service: ${s.relocationCard}`);
  if (s.fitoutPackage) detail.push(`Package: ${s.fitoutPackage}`);
  if (s.fitoutMaterial) detail.push(`Material palette: ${s.fitoutMaterial}`);
  if (s.floorPlanName) detail.push(`Floor plan: ${s.floorPlanName}`);

  if (detail.length) {
    lines.push("", ...detail);
  }

  if (lead.notes?.trim()) {
    lines.push("", `Notes: ${lead.notes.trim()}`);
  }

  lines.push("", `Language: ${lead.locale.toUpperCase()} · Currency: ${lead.currency}`);

  return lines.join("\n");
}

export function buildWhatsAppUrl(lead: LeadPayload): string {
  return SITE.waLink(buildWhatsAppMessage(lead));
}

/** Loose on purpose: international formats vary wildly and rejecting a real
    client's number is far more costly than accepting a malformed one. */
export function isPlausiblePhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 15;
}
