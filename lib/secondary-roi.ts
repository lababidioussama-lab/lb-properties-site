/**
 * Secondary-market net ROI engine.
 *
 * Both modes divide by TOTAL CAPITAL OUTLAY, not the headline price. That is
 * the whole point of the tool: a 7% "yield" quoted on the purchase price is
 * not the same number once DLD, agency and registration are paid, and the
 * gap is what catches buyers out on secondary deals.
 *
 *   Mode A (long let)
 *     Net Yield = (Gross Rent − Service Charges) / Total Outlay × 100
 *
 *   Mode B (short let)
 *     Net Yield = (Gross STR Income − Management − Service Charges − Utilities)
 *                 / Total Outlay × 100
 */

import { AREA_BY_ID, serviceChargeMid, type BedroomKey } from "./dubai-market";
import {
  MANAGEMENT_COMMISSION,
  OTA_COMMISSION,
  UTILITIES_PER_MONTH,
  CLEANING_PER_TURNOVER,
  AVG_STAY_NIGHTS,
  DET,
} from "./short-let-costs";

export type RoiMode = "longTerm" | "shortTerm";

/** Dubai Land Department and associated acquisition costs. */
export const TRANSACTION_COSTS = {
  /** DLD transfer fee */
  dldRate: 0.04,
  /** DLD admin charge on the transfer, AED */
  dldAdmin: 580,
  /** Broker commission */
  agencyRate: 0.02,
  /** Trustee office registration: AED 4,000 + 5% VAT above AED 500k */
  registration: 4_200,
  /** Title deed issuance, AED */
  titleDeed: 580,
} as const;

export interface TransactionBreakdown {
  price: number;
  dld: number;
  dldAdmin: number;
  agency: number;
  registration: number;
  titleDeed: number;
  totalFees: number;
  totalOutlay: number;
  /** Acquisition costs as a percentage of the headline price */
  feePctOfPrice: number;
}

export function transactionCosts(price: number): TransactionBreakdown {
  const dld = price * TRANSACTION_COSTS.dldRate;
  const agency = price * TRANSACTION_COSTS.agencyRate;
  const totalFees =
    dld +
    TRANSACTION_COSTS.dldAdmin +
    agency +
    TRANSACTION_COSTS.registration +
    TRANSACTION_COSTS.titleDeed;

  return {
    price,
    dld,
    dldAdmin: TRANSACTION_COSTS.dldAdmin,
    agency,
    registration: TRANSACTION_COSTS.registration,
    titleDeed: TRANSACTION_COSTS.titleDeed,
    totalFees,
    totalOutlay: price + totalFees,
    feePctOfPrice: (totalFees / price) * 100,
  };
}

export interface RoiBreakdown {
  mode: RoiMode;
  costs: TransactionBreakdown;

  grossAnnual: number;
  serviceChargeAnnual: number;
  managementAnnual: number;
  utilitiesAnnual: number;
  otherAnnual: number;
  totalCostsAnnual: number;
  netAnnual: number;

  /** Yield on the headline price — the number agents usually quote */
  grossYieldOnPrice: number;
  /** Yield on total capital outlay — the number that is actually true */
  netYieldOnOutlay: number;
  /** Percentage points lost between the two */
  yieldGap: number;

  paybackYears: number | null;
}

export function calculateSecondaryRoi(input: {
  mode: RoiMode;
  price: number;
  sqft: number;
  serviceChargePerSqft: number;
  /** Annual long-let rent, AED — used in long-let mode */
  annualRent: number;
  /** Short-let average daily rate and occupancy — used in short-let mode */
  adr: number;
  occupancy: number;
  bedroom: BedroomKey;
}): RoiBreakdown {
  const costs = transactionCosts(input.price);
  const serviceChargeAnnual = input.sqft * input.serviceChargePerSqft;

  let grossAnnual: number;
  let managementAnnual: number;
  let utilitiesAnnual: number;
  let otherAnnual: number;

  if (input.mode === "longTerm") {
    grossAnnual = input.annualRent;
    // Long lets are a fraction of the work, and priced accordingly.
    managementAnnual = grossAnnual * 0.05;
    utilitiesAnnual = 0; // the tenant's account
    otherAnnual = 0;
  } else {
    const occupiedNights = 365 * input.occupancy;
    grossAnnual = input.adr * occupiedNights;

    const commission = (MANAGEMENT_COMMISSION.min + MANAGEMENT_COMMISSION.max) / 2;
    managementAnnual = grossAnnual * (commission + OTA_COMMISSION);
    utilitiesAnnual = UTILITIES_PER_MONTH[input.bedroom] * 12;

    const rooms = input.bedroom === "studio" ? 1 : Number(input.bedroom[0]);
    otherAnnual =
      (occupiedNights / AVG_STAY_NIGHTS) * CLEANING_PER_TURNOVER +
      occupiedNights * rooms * DET.tourismDirhamPerRoomNight +
      rooms * DET.permitPerBedroomPerYear;
  }

  const totalCostsAnnual = serviceChargeAnnual + managementAnnual + utilitiesAnnual + otherAnnual;
  const netAnnual = grossAnnual - totalCostsAnnual;

  const grossYieldOnPrice = (grossAnnual / input.price) * 100;
  const netYieldOnOutlay = (netAnnual / costs.totalOutlay) * 100;

  return {
    mode: input.mode,
    costs,
    grossAnnual,
    serviceChargeAnnual,
    managementAnnual,
    utilitiesAnnual,
    otherAnnual,
    totalCostsAnnual,
    netAnnual,
    grossYieldOnPrice,
    netYieldOnOutlay,
    yieldGap: grossYieldOnPrice - netYieldOnOutlay,
    paybackYears: netAnnual > 0 ? costs.totalOutlay / netAnnual : null,
  };
}

/** Seed the engine from the market table so the visitor starts from something
    real rather than an empty form. */
export function defaultsFor(areaId: string, bedroom: BedroomKey) {
  const area = AREA_BY_ID.get(areaId);
  if (!area) return null;
  return {
    price: area.price[bedroom] ?? 0,
    annualRent: area.ltrRent[bedroom] ?? 0,
    adr: area.adr[bedroom] ?? 0,
    occupancy: area.occupancy,
    serviceChargePerSqft: serviceChargeMid(area),
  };
}
