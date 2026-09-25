import { UAE_RATES } from "./market-reference";

/**
 * Dubai mortgage arithmetic.
 *
 * The numbers below are UAE Central Bank caps and standard market fees, not
 * a quote. Two things make a Dubai mortgage different from the calculator
 * most buyers arrive having used:
 *
 *  1. The LTV cap depends on residency, price band and whether it is your
 *     first property — an expat buying a second home can borrow 60%, not 80%.
 *  2. The transaction costs — 4% DLD, 2% agency, mortgage registration —
 *     CANNOT be financed. They are cash on top of the deposit, and they are
 *     what actually determines whether a buyer can complete.
 *
 * A calculator that omits point 2 tells someone they can afford a property
 * they cannot, which is the single most common way these tools mislead.
 */

export type BuyerType = "resident" | "national" | "nonResident";
export type PropertyStatus = "first" | "second" | "offPlan";

/**
 * Loan-to-value caps.
 *
 * Residents and nationals follow the Central Bank mortgage regulation. The
 * non-resident row is not a regulatory cap — the regulation does not address
 * non-residents — but the bank policy ceiling most lenders apply in practice.
 */
export const LTV_CAPS: Record<BuyerType, Record<PropertyStatus, number>> = {
  // Expat resident: 80% under AED 5M, 70% above — handled by PRICE_BAND below.
  resident: { first: 0.8, second: 0.6, offPlan: 0.5 },
  national: { first: 0.85, second: 0.65, offPlan: 0.5 },
  nonResident: { first: 0.6, second: 0.5, offPlan: 0.5 },
};

/** Above this price the first-property cap drops by 10 points. */
export const HIGH_VALUE_THRESHOLD = 5_000_000;

/** Debt burden ratio: total monthly obligations may not exceed this share
    of monthly income. A hard Central Bank limit, not a bank preference. */
export const MAX_DBR = 0.5;

export const TERM_YEARS = { min: 5, max: 25, default: 25 } as const;
/* Bounds span the fixed introductory offers at the low end and the
   post-intro EIBOR-plus-margin reversion at the high end. The default is
   not a guess: it is 3-month EIBOR plus a mid-market bank margin, sourced
   and dated in market-reference.ts. GPG notes no consolidated figure for
   actual UAE mortgage rates is published, which is why this stays an input
   the visitor can move rather than a number the site asserts. */
export const RATE_PCT = {
  min: 2.99,
  max: 9,
  default: UAE_RATES.indicativeMortgageRatePct,
} as const;

/* Standard transaction costs. Percentages are of the stated base. */
export const FEES = {
  dldTransferPct: 0.04, // of price
  dldAdminAed: 580,
  agencyPct: 0.02, // of price, + 5% VAT
  vatPct: 0.05,
  trusteeAed: 4_200,
  /** Mortgage registration with DLD: 0.25% of the LOAN, not the price. */
  mortgageRegPct: 0.0025,
  mortgageRegAdminAed: 290,
  /** Bank arrangement/processing fee, of the loan. */
  bankArrangementPct: 0.01,
  valuationAed: 3_150,
  /** Annual life cover, of the outstanding balance. */
  lifeInsurancePctPerYear: 0.005,
  /** Annual buildings insurance, of property value. */
  propertyInsurancePctPerYear: 0.0005,
} as const;

export interface MortgageInput {
  priceAed: number;
  buyerType: BuyerType;
  status: PropertyStatus;
  ratePct: number;
  termYears: number;
  /** Gross monthly income, for the affordability check. Optional. */
  monthlyIncomeAed?: number;
  /** Existing monthly commitments — other loans, cards, school fees. */
  monthlyCommitmentsAed?: number;
}

export interface MortgageResult {
  maxLtv: number;
  loanAed: number;
  depositAed: number;
  monthlyPaymentAed: number;
  /** Deposit + all non-financeable transaction costs. */
  cashRequiredAed: number;
  fees: {
    dldTransfer: number;
    agency: number;
    trustee: number;
    mortgageRegistration: number;
    bankArrangement: number;
    valuation: number;
    total: number;
  };
  insuranceMonthlyAed: number;
  totalInterestAed: number;
  totalRepaidAed: number;
  /** Present only when income was supplied. */
  affordability?: {
    dbr: number;
    maxAffordableMonthly: number;
    passes: boolean;
    /** Price this income supports at the same rate, term and LTV. */
    maxPriceAed: number;
  };
}

/** LTV ceiling after the high-value band adjustment. */
export function maxLtvFor(
  buyerType: BuyerType,
  status: PropertyStatus,
  priceAed: number,
): number {
  const base = LTV_CAPS[buyerType][status];
  // The 10-point step applies to the first-property caps only; the second
  // -home and off-plan caps are already below the high-value ceiling.
  if (status === "first" && priceAed > HIGH_VALUE_THRESHOLD) return base - 0.1;
  return base;
}

/** Standard amortising payment. Handles a 0% rate without dividing by zero. */
export function monthlyPayment(principal: number, annualRatePct: number, years: number): number {
  const n = Math.round(years * 12);
  if (n <= 0) return 0;
  const r = annualRatePct / 100 / 12;
  if (r === 0) return principal / n;
  const factor = Math.pow(1 + r, n);
  return (principal * r * factor) / (factor - 1);
}

export function calculateMortgage(input: MortgageInput): MortgageResult {
  const { priceAed, buyerType, status, ratePct, termYears } = input;

  const maxLtv = maxLtvFor(buyerType, status, priceAed);
  const loanAed = Math.round(priceAed * maxLtv);
  const depositAed = priceAed - loanAed;

  const dldTransfer = priceAed * FEES.dldTransferPct + FEES.dldAdminAed;
  const agency = priceAed * FEES.agencyPct * (1 + FEES.vatPct);
  const trustee = FEES.trusteeAed;
  const mortgageRegistration = loanAed * FEES.mortgageRegPct + FEES.mortgageRegAdminAed;
  const bankArrangement = loanAed * FEES.bankArrangementPct * (1 + FEES.vatPct);
  const valuation = FEES.valuationAed;
  const totalFees =
    dldTransfer + agency + trustee + mortgageRegistration + bankArrangement + valuation;

  const monthlyPaymentAed = monthlyPayment(loanAed, ratePct, termYears);

  /* Insurance is quoted annually but paid monthly, and lenders include it in
     the affordability test — so it belongs in the monthly figure a buyer
     compares against their income, not in a footnote. */
  const insuranceMonthlyAed =
    (loanAed * FEES.lifeInsurancePctPerYear + priceAed * FEES.propertyInsurancePctPerYear) / 12;

  const totalRepaidAed = monthlyPaymentAed * termYears * 12;

  const result: MortgageResult = {
    maxLtv,
    loanAed,
    depositAed,
    monthlyPaymentAed,
    // The number that actually decides whether a purchase can complete.
    cashRequiredAed: depositAed + totalFees,
    fees: {
      dldTransfer,
      agency,
      trustee,
      mortgageRegistration,
      bankArrangement,
      valuation,
      total: totalFees,
    },
    insuranceMonthlyAed,
    totalInterestAed: totalRepaidAed - loanAed,
    totalRepaidAed,
  };

  const income = input.monthlyIncomeAed ?? 0;
  if (income > 0) {
    const commitments = input.monthlyCommitmentsAed ?? 0;
    const servicing = monthlyPaymentAed + insuranceMonthlyAed;
    const maxAffordableMonthly = Math.max(0, income * MAX_DBR - commitments);

    /* Work the sum backwards: the affordable monthly payment implies a
       principal, and the principal implies a price at this LTV. */
    const r = ratePct / 100 / 12;
    const n = Math.round(termYears * 12);
    const affordablePrincipal =
      r === 0
        ? maxAffordableMonthly * n
        : (maxAffordableMonthly * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n));

    result.affordability = {
      dbr: (servicing + commitments) / income,
      maxAffordableMonthly,
      passes: (servicing + commitments) / income <= MAX_DBR,
      maxPriceAed: maxLtv > 0 ? affordablePrincipal / maxLtv : 0,
    };
  }

  return result;
}
