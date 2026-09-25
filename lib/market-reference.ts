/**
 * Sourced market reference.
 *
 * Every figure here is a published third-party number with a name and a
 * date attached, not an estimate. It exists so that the parts of the site
 * that cannot be derived from transaction data — appreciation, the current
 * cost of borrowing, citywide yield benchmarks — rest on something citable
 * instead of on judgement.
 *
 * SOURCE: Global Property Guide, "United Arab Emirates' Residential
 * Property Market Analysis 2026", last updated June 2026, quoting REIDIN,
 * ValuStrat, Cavendish Maxwell and CBUAE.
 *
 * Re-check on the stated review date. A stale number that looks sourced is
 * more dangerous than an obvious estimate, because nobody questions it.
 */

export const MARKET_REFERENCE = {
  source: "Global Property Guide / REIDIN / ValuStrat / CBUAE",
  sourceUrl:
    "https://www.globalpropertyguide.com/middle-east/united-arab-emirates/price-history",
  asOf: "2026-06",
  reviewBy: "2026-10", // GPG's own next-update date
} as const;

/**
 * Dubai residential capital growth.
 *
 * This is the figure the DLD transaction data could NOT produce — a naive
 * year-on-year median there returns 44%/yr for Dubai Marina because the
 * sample size, unit-size mix and off-plan share all move at once. REIDIN
 * runs a proper hedonic index, which is what makes this usable.
 */
export const DUBAI_PRICE_GROWTH = {
  /** REIDIN Dubai house price index, y-o-y, Feb 2026. */
  nominalYoYPct: 10.79,
  /** Inflation-adjusted, Dec 2025. The honest number to quote to a buyer. */
  realYoYPct: 9.6,
  /** ValuStrat average transacted price, Q1 2026. */
  readyAedPerSqft: 1_691,
  readyYoYPct: 5.62,
  offPlanAedPerSqft: 2_031,
  offPlanYoYPct: 12.22,
} as const;

/**
 * Dubai rental growth, REIDIN, April 2026.
 *
 * Note the deceleration — this is the single most important piece of
 * context on the page. Rental growth fell from 6.2% to 1.5% in four months,
 * and villa rents are actually NEGATIVE. Any projection that assumes rents
 * keep climbing at 2024-25 rates is now wrong.
 */
export const DUBAI_RENT_GROWTH = {
  allResidentialYoYPct: 1.5, // down from 6.2% in Dec 2025
  apartmentsYoYPct: 2.1,
  villasYoYPct: -1.5,
  decelerating: true,
} as const;

/**
 * Citywide yield benchmarks, REIDIN April 2026.
 *
 * Used to sanity-check the yields this site computes from price and rent.
 * A community band that lands far outside these means an input is wrong.
 */
export const DUBAI_YIELD_BENCHMARK = {
  allResidentialPct: 6.57,
  apartmentsHighPct: 7.08,
  villasAvgPct: 4.54,
} as const;

/**
 * Cost of borrowing.
 *
 * CBUAE holds the base rate at 3.65% and 3-month EIBOR sat at 3.69% at the
 * end of May 2026. UAE mortgages are typically EIBOR plus a bank margin, or
 * a fixed introductory rate for one to five years.
 *
 * GPG states plainly that no consolidated figure for actual mortgage rates
 * is published, which is exactly why the calculator takes the rate as an
 * input rather than asserting one. The default below is EIBOR plus a
 * mid-market margin, and is labelled as indicative in the UI.
 */
export const UAE_RATES = {
  cbuaeBaseRatePct: 3.65,
  eibor3mPct: 3.69,
  /** Typical bank margin over EIBOR seen on residential lending. */
  typicalBankMarginPct: 1.0,
  /** EIBOR + margin. Used as the calculator's starting position. */
  get indicativeMortgageRatePct() {
    return Math.round((this.eibor3mPct + this.typicalBankMarginPct) * 100) / 100;
  },
} as const;
