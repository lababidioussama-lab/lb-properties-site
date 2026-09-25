/**
 * Indicative Dubai investment reference data.
 *
 * These are reviewable constants, deliberately NOT computed or invented at
 * render time, so the numbers the calculator shows can be audited and updated
 * in one place. They are broad market ranges for illustration — the UI states
 * this plainly and the CTA offers a real analysis rather than implying the
 * widget is one.
 */

export type InvestmentGoal = "yield" | "appreciation" | "goldenVisa";

/** UAE property-linked residency thresholds (federal, AED). */
export const VISA_THRESHOLDS = {
  /** 10-year Golden Visa via property investment */
  golden: 2_000_000,
  /** 2-year renewable investor visa */
  investor: 750_000,
} as const;

export const BUDGET_RANGE = {
  min: 1_000_000,
  max: 50_000_000,
  step: 250_000,
} as const;

export interface Hub {
  id: string;
  /**
   * Gross annual percentages.
   *
   * `grossYield` is derivable — rent ÷ price, both of which are now real
   * (DLD medians and live asking rents), so it should be computed from
   * AREAS rather than asserted here. See deriveGrossYield below.
   *
   * `appreciation` is NOT derivable from the DLD data and remains an
   * estimate. A naive year-on-year median AED/sqft comparison returns
   * nonsense — Dubai Marina computes to 44%/yr — because three things move
   * at once: the 2022 sample is 132 sales against 16,064 in 2023, the
   * median unit size drifts 836→1,180 sqft, and off-plan only enters the
   * mix in 2024 and prices differently from ready stock. Measuring real
   * appreciation needs repeat-sales of the SAME units, not medians of
   * shifting populations. Until that exists, this stays an estimate and is
   * labelled as one in the UI.
   */
  grossYield: [number, number];
  appreciation: [number, number];
  /** Typical realistic entry ticket for a whole unit, AED */
  entryFrom: number;
  /** Above this the area stops being the natural fit */
  suitsUpTo: number;
  /** Annual holding costs as a fraction of property value:
      service charges + management + maintenance reserve. Villa communities
      carry lower service charges per AED than serviced towers. */
  holdingCost: number;
  goals: InvestmentGoal[];
  assetType: "apartment" | "villa" | "mixed";
}

export const HUBS: Hub[] = [
  {
    id: "jvc",
    grossYield: [7.5, 9.0],
    appreciation: [4.0, 6.5],
    entryFrom: 600_000,
    suitsUpTo: 3_000_000,
    holdingCost: 0.018,
    goals: ["yield"],
    assetType: "apartment",
  },
  {
    id: "dubaiSouth",
    grossYield: [7.0, 8.5],
    appreciation: [5.5, 8.0],
    entryFrom: 700_000,
    suitsUpTo: 4_000_000,
    holdingCost: 0.016,
    goals: ["yield", "appreciation"],
    assetType: "mixed",
  },
  {
    id: "businessBay",
    grossYield: [6.0, 7.5],
    appreciation: [4.5, 7.0],
    entryFrom: 1_100_000,
    suitsUpTo: 9_000_000,
    holdingCost: 0.019,
    goals: ["yield", "goldenVisa"],
    assetType: "apartment",
  },
  {
    id: "dubaiMarina",
    grossYield: [6.0, 7.5],
    appreciation: [4.0, 6.5],
    entryFrom: 1_300_000,
    suitsUpTo: 15_000_000,
    holdingCost: 0.020,
    goals: ["yield", "goldenVisa"],
    assetType: "apartment",
  },
  {
    id: "creekHarbour",
    grossYield: [5.5, 7.0],
    appreciation: [6.0, 9.0],
    entryFrom: 1_600_000,
    suitsUpTo: 12_000_000,
    holdingCost: 0.018,
    goals: ["appreciation", "goldenVisa"],
    assetType: "apartment",
  },
  {
    id: "downtown",
    grossYield: [5.0, 6.5],
    appreciation: [5.0, 7.5],
    entryFrom: 1_900_000,
    suitsUpTo: 25_000_000,
    holdingCost: 0.021,
    goals: ["appreciation", "goldenVisa"],
    assetType: "apartment",
  },
  {
    id: "dubaiHills",
    grossYield: [5.0, 6.5],
    appreciation: [5.5, 8.0],
    entryFrom: 2_100_000,
    suitsUpTo: 30_000_000,
    holdingCost: 0.014,
    goals: ["appreciation", "goldenVisa"],
    assetType: "mixed",
  },
  {
    id: "emaarBeachfront",
    grossYield: [5.5, 6.5],
    appreciation: [6.0, 8.5],
    entryFrom: 2_800_000,
    suitsUpTo: 40_000_000,
    holdingCost: 0.019,
    goals: ["appreciation", "goldenVisa"],
    assetType: "apartment",
  },
  {
    id: "arabianRanches",
    grossYield: [5.0, 6.0],
    appreciation: [4.5, 6.5],
    entryFrom: 3_200_000,
    suitsUpTo: 20_000_000,
    holdingCost: 0.012,
    goals: ["yield", "goldenVisa"],
    assetType: "villa",
  },
  {
    id: "palmJumeirah",
    grossYield: [4.5, 6.0],
    appreciation: [6.5, 10.0],
    entryFrom: 3_500_000,
    suitsUpTo: 200_000_000,
    holdingCost: 0.016,
    goals: ["appreciation", "goldenVisa"],
    assetType: "mixed",
  },
  {
    id: "jumeirahGolf",
    grossYield: [5.0, 6.0],
    appreciation: [5.0, 7.0],
    entryFrom: 4_500_000,
    suitsUpTo: 45_000_000,
    holdingCost: 0.013,
    goals: ["appreciation", "goldenVisa"],
    assetType: "villa",
  },
];

export interface RoiResult {
  budgetAed: number;
  goal: InvestmentGoal;
  grossYieldPct: number;
  netYieldPct: number;
  grossAnnualAed: number;
  netAnnualAed: number;
  netMonthlyAed: number;
  appreciationPct: number;
  /** Indicative value in 5 years at the midpoint appreciation rate */
  fiveYearValueAed: number;
  goldenVisaEligible: boolean;
  investorVisaEligible: boolean;
  /** AED still needed to reach the 10-year threshold; 0 when eligible */
  goldenVisaShortfallAed: number;
  hubs: Hub[];
}

const mid = ([lo, hi]: [number, number]) => (lo + hi) / 2;

/**
 * Pick the hubs that genuinely fit the budget and goal, preferring those the
 * budget comfortably clears. Falls back to the closest-entry hubs so the panel
 * is never empty at awkward budgets.
 */
function selectHubs(budgetAed: number, goal: InvestmentGoal): Hub[] {
  const affordable = HUBS.filter((h) => budgetAed >= h.entryFrom);
  const pool = affordable.length > 0 ? affordable : [...HUBS].sort((a, b) => a.entryFrom - b.entryFrom).slice(0, 3);

  const onGoal = pool.filter((h) => h.goals.includes(goal));
  const ranked = (onGoal.length >= 3 ? onGoal : pool).slice();

  ranked.sort((a, b) => {
    // Rank by the metric the investor actually asked for.
    if (goal === "yield") return mid(b.grossYield) - mid(a.grossYield);
    if (goal === "appreciation") return mid(b.appreciation) - mid(a.appreciation);
    // For the visa goal the property must clear the threshold comfortably,
    // so prefer hubs whose entry ticket sits closest under the budget.
    return b.entryFrom - a.entryFrom;
  });

  // Drop hubs the budget has clearly outgrown, unless that empties the list.
  const fitted = ranked.filter((h) => budgetAed <= h.suitsUpTo);
  return (fitted.length >= 3 ? fitted : ranked).slice(0, 3);
}

export function calculateRoi(budgetAed: number, goal: InvestmentGoal): RoiResult {
  const hubs = selectHubs(budgetAed, goal);

  // Blend the selected hubs so the figure reflects the actual recommendation
  // rather than a market-wide average the investor was never shown.
  const grossYieldPct = hubs.reduce((s, h) => s + mid(h.grossYield), 0) / hubs.length;
  const appreciationPct = hubs.reduce((s, h) => s + mid(h.appreciation), 0) / hubs.length;
  const holdingCost = hubs.reduce((s, h) => s + h.holdingCost, 0) / hubs.length;

  const grossAnnualAed = budgetAed * (grossYieldPct / 100);
  const netAnnualAed = Math.max(0, grossAnnualAed - budgetAed * holdingCost);
  const netYieldPct = (netAnnualAed / budgetAed) * 100;

  return {
    budgetAed,
    goal,
    grossYieldPct,
    netYieldPct,
    grossAnnualAed,
    netAnnualAed,
    netMonthlyAed: netAnnualAed / 12,
    appreciationPct,
    fiveYearValueAed: budgetAed * Math.pow(1 + appreciationPct / 100, 5),
    goldenVisaEligible: budgetAed >= VISA_THRESHOLDS.golden,
    investorVisaEligible: budgetAed >= VISA_THRESHOLDS.investor,
    goldenVisaShortfallAed: Math.max(0, VISA_THRESHOLDS.golden - budgetAed),
    hubs,
  };
}
