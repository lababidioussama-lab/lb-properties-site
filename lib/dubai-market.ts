/**
 * Dubai market reference table.
 *
 * One row per community, carrying everything the three calculators need:
 * RERA/Mollak service-charge bands, long-let rents, and short-let nightly
 * rates and occupancy. Keeping them on ONE record is deliberate — the
 * long-let and short-let engines must be comparing the same building, or
 * the LTR-vs-STR uplift they show would be meaningless.
 *
 * These are indicative market ranges maintained as reviewable constants,
 * not a live feed. Every figure the UI derives from them is labelled as an
 * estimate, and the service-charge lookup states that the binding number is
 * the one on the Mollak statement for the specific building.
 */

export type BedroomKey = "studio" | "1bed" | "2bed" | "3bed" | "4bed" | "5bed";

export const BEDROOM_KEYS: BedroomKey[] = ["studio", "1bed", "2bed", "3bed", "4bed", "5bed"];

/**
 * Typical internal area by unit size, sq ft — seeds the service-charge
 * calculator so the visitor is not forced to know it.
 *
 * Medians of recorded DLD sale sizes, not estimates. The studio figure had
 * been guessed at 480 and is really 413, which was inflating every studio
 * service charge on the site by 16%. 4-bed is thinner (272 sales) and mixes
 * apartments with villas, so it skews large. 5-bed had no reliable sample
 * and remains an estimate.
 */
export const TYPICAL_SQFT: Record<BedroomKey, number> = {
  studio: 413, // 2,762 sales
  "1bed": 751, // 19,103 sales
  "2bed": 1_281, // 11,084 sales
  "3bed": 1_852, // 2,734 sales
  "4bed": 4_755, // 272 sales — villa-weighted
  "5bed": 4_600, // estimate: no reliable sample
};

/* ============================================================================
   PROVENANCE — read before trusting or editing any number in this file.

   `price` is PARTLY REAL, and the split is currently NOT RECOVERABLE.
   70 cells are medians of recorded DLD transactions from
   `property_transactions` (registrations from 2023-07-01 onward, residential
   units only, each cell backed by at least 25 sales). Regenerate with
   scratchpad/dld_prices.py + apply_prices.py.

   WARNING — this note read "70 of the 87 cells" and was stale. The table
   has since grown to 36 areas holding 150 price cells, so the 70 DLD-backed
   cells are now a MINORITY: roughly 80 cells are estimates, and nothing in
   this file marks which is which. A rounding-granularity probe does not
   separate them cleanly enough to label individual cells, and guessing
   would be exactly the invention this file exists to prevent.

   Consequence: any UI reading `price` must describe it as the price table
   with that mix disclosed, NOT as "DLD medians". The market charts do this.
   To restore per-cell provenance, re-run dld_prices.py over the current 36
   areas and have apply_prices.py record which cells it wrote — a per-cell
   flag, not a count in a comment, which is what went stale here.

   IMPORTANT: the transaction table currently ends in 2024. Dubai prices have
   moved since, so treat these as a 2024 baseline rather than today's asking
   price. No uplift factor has been applied — inventing one would put us back
   where we started.

   `ltrRent` is REAL. 130 cells are medians of live Property Finder asking
   rents across 29 communities, each backed by at least 10 listings, with a
   4% asking-to-achieved haircut applied — landlords settle below ask, and
   erring toward understating yield is the safe direction for an investor
   tool. Cells failing the sample-size or monotonicity checks were dropped
   rather than published. Regenerate with scratchpad/scrape_rents.py +
   apply_rents.py. These are ASKING rents; registered Ejari contracts would
   be strictly better if that source ever becomes available.

   `adr`, `occupancy` and `serviceCharge` are STILL ESTIMATES.
   Short-let rates have no free public source. Service charges are set per
   BUILDING and published only through Mollak, which renders nothing without
   an owner login — and a single community figure would be wrong anyway,
   since a serviced tower and a low-rise on the same street differ by
   multiples. The UI already says the binding number is the Mollak statement
   for the specific building, which is the honest treatment.
   ========================================================================= */

/** When the DLD-derived figures were pulled. */
export const PRICE_DATA = {
  source: "DLD property_transactions",
  registrationsFrom: "2023-07-01",
  latestRegistration: "2024-12-30",
  pulledOn: "2026-08-15",
  minSalesPerCell: 25,
  /* Cells the DLD pull actually wrote, against the table's current size.
     Held here rather than in prose so the disclosure the UI renders cannot
     drift from the table the way the comment above it did. `totalCells` is
     asserted, not counted at runtime, precisely so that adding an area
     without re-running the pull shows up as a number that no longer adds
     up rather than as a silently re-based percentage. */
  dldBackedCells: 70,
  totalCells: 150,
} as const;

export interface Area {
  id: string;
  /** RERA Mollak service charge band, AED per sq ft per year */
  serviceCharge: [number, number];
  /** Annual long-let rent, AED, by unit size. Missing = not offered here. */
  ltrRent: Partial<Record<BedroomKey, number>>;
  /** Short-let average daily rate, AED, by unit size */
  adr: Partial<Record<BedroomKey, number>>;
  /** Realistic annual occupancy for a professionally managed unit, 0–1 */
  occupancy: number;
  /** Indicative purchase price, AED, by unit size */
  price: Partial<Record<BedroomKey, number>>;
  assetType: "apartment" | "villa" | "mixed";
}

export const AREAS: Area[] = [
  {
    id: "downtown",
    serviceCharge: [20, 30],
    ltrRent: { studio: 86_000, "1bed": 115_000, "2bed": 168_000, "3bed": 265_000, "4bed": 1_344_000, "5bed": 1_728_000 },
    adr: { studio: 420, "1bed": 620, "2bed": 980, "3bed": 1_480 },
    occupancy: 0.82,
    price: { studio: 1_330_000, "1bed": 2_150_000, "2bed": 3_600_000, "3bed": 5_540_000, "4bed": 22_780_000 },
    assetType: "apartment",
  },
  {
    id: "dubaiMarina",
    serviceCharge: [14, 28],
    ltrRent: { studio: 72_000, "1bed": 86_000, "2bed": 134_000, "3bed": 240_000, "4bed": 384_000, "5bed": 720_000 },
    adr: { studio: 370, "1bed": 545, "2bed": 850, "3bed": 1_250 },
    occupancy: 0.84,
    price: { studio: 930_000, "1bed": 1_660_000, "2bed": 2_620_000, "3bed": 3_580_000, "4bed": 8_380_000 },
    assetType: "apartment",
  },
  {
    id: "palmJumeirah",
    serviceCharge: [18, 25],
    ltrRent: { studio: 115_000, "1bed": 182_000, "2bed": 192_000, "3bed": 374_000, "4bed": 1_152_000, "5bed": 2_304_000 },
    adr: { "1bed": 880, "2bed": 1_450, "3bed": 2_350, "4bed": 4_200 },
    occupancy: 0.79,
    price: { studio: 1_390_000, "1bed": 2_620_000, "2bed": 4_100_000, "3bed": 6_120_000, "4bed": 18_000_000 },
    assetType: "mixed",
  },
  {
    id: "jvc",
    serviceCharge: [13, 22],
    ltrRent: { studio: 46_000, "1bed": 72_000, "2bed": 109_000, "3bed": 144_000, "4bed": 230_000, "5bed": 230_000 },
    adr: { studio: 245, "1bed": 340, "2bed": 500, "3bed": 720 },
    occupancy: 0.76,
    price: { studio: 660_000, "1bed": 950_000, "2bed": 1_460_000, "3bed": 1_920_000 },
    assetType: "apartment",
  },
  {
    id: "businessBay",
    serviceCharge: [15, 25],
    ltrRent: { studio: 60_000, "1bed": 96_000, "2bed": 134_000, "3bed": 210_000, "4bed": 614_000 },
    adr: { studio: 345, "1bed": 500, "2bed": 790, "3bed": 1_150 },
    occupancy: 0.80,
    price: { studio: 1_130_000, "1bed": 1_660_000, "2bed": 2_560_000, "3bed": 4_450_000, "4bed": 14_160_000 },
    assetType: "apartment",
  },
  {
    id: "jlt",
    serviceCharge: [13, 20],
    ltrRent: { studio: 58_000, "1bed": 76_000, "2bed": 143_000, "3bed": 154_000, "4bed": 274_000, "5bed": 480_000 },
    adr: { studio: 300, "1bed": 435, "2bed": 660, "3bed": 940 },
    occupancy: 0.78,
    price: { studio: 1_130_000, "1bed": 1_600_000, "2bed": 2_630_000, "3bed": 3_780_000 },
    assetType: "apartment",
  },
  {
    id: "creekHarbour",
    serviceCharge: [16, 24],
    ltrRent: { studio: 70_000, "1bed": 105_000, "2bed": 155_000, "3bed": 225_000 },
    adr: { studio: 360, "1bed": 530, "2bed": 820, "3bed": 1_200 },
    occupancy: 0.77,
    price: { studio: 1_150_000, "1bed": 1_840_000, "2bed": 2_840_000, "3bed": 4_400_000 },
    assetType: "apartment",
  },
  {
    id: "emaarBeachfront",
    serviceCharge: [20, 28],
    ltrRent: { "1bed": 145_000, "2bed": 225_000, "3bed": 340_000 },
    adr: { "1bed": 780, "2bed": 1_250, "3bed": 1_880 },
    occupancy: 0.81,
    price: { "1bed": 2_400_000, "2bed": 3_900_000, "3bed": 6_200_000 },
    assetType: "apartment",
  },
  {
    id: "dubaiHills",
    serviceCharge: [12, 18],
    ltrRent: { studio: 65_000, "1bed": 86_000, "2bed": 149_000, "3bed": 250_000, "4bed": 413_000, "5bed": 960_000 },
    adr: { "1bed": 480, "2bed": 760, "3bed": 1_450, "4bed": 2_150, "5bed": 2_950 },
    occupancy: 0.72,
    price: { "1bed": 1_680_000, "2bed": 2_900_000, "3bed": 4_140_000, "4bed": 7_200_000, "5bed": 10_500_000 },
    assetType: "mixed",
  },
  {
    id: "arabianRanches",
    serviceCharge: [4, 8],
    ltrRent: { "3bed": 226_000, "4bed": 401_000, "5bed": 480_000 },
    adr: { "3bed": 1_350, "4bed": 1_900, "5bed": 2_600 },
    occupancy: 0.68,
    price: { "3bed": 3_900_000, "4bed": 5_600_000, "5bed": 8_200_000 },
    assetType: "villa",
  },
  /* ---------------------------------------------------------------------
     Wider freehold coverage.

     Same caveat as the communities above: these are indicative citywide
     bands for the calculators, not a valuation and not a live feed. They
     are deliberately conservative, because a yield tool that flatters is
     worse than useless to an investor, and everything the site renders
     from them already sits behind the "indicative ranges" disclaimer.

     When these need to be real rather than indicative they should be
     derived from transaction data, not hand-edited here.
     --------------------------------------------------------------------- */
  {
    id: "jvt",
    serviceCharge: [11, 18],
    ltrRent: { studio: 46_000, "1bed": 75_000, "2bed": 106_000, "3bed": 146_000, "5bed": 432_000 },
    adr: { studio: 260, "1bed": 350, "2bed": 520, "3bed": 720 },
    occupancy: 0.74,
    price: { studio: 610_000, "1bed": 1_000_000, "2bed": 1_490_000, "3bed": 2_100_000 },
    assetType: "mixed",
  },
  {
    id: "alFurjan",
    serviceCharge: [12, 19],
    ltrRent: { studio: 43_000, "1bed": 72_000, "2bed": 96_000, "3bed": 125_000, "4bed": 336_000, "5bed": 432_000 },
    adr: { studio: 270, "1bed": 370, "2bed": 550, "3bed": 780 },
    occupancy: 0.75,
    price: { studio: 540_000, "1bed": 980_000, "2bed": 1_490_000, "3bed": 2_050_000 },
    assetType: "mixed",
  },
  {
    id: "arjan",
    serviceCharge: [10, 16],
    ltrRent: { studio: 48_000, "1bed": 72_000, "2bed": 110_000, "3bed": 158_000 },
    adr: { studio: 235, "1bed": 320, "2bed": 470 },
    occupancy: 0.72,
    price: { studio: 640_000, "1bed": 1_050_000, "2bed": 1_520_000, "3bed": 2_250_000 },
    assetType: "apartment",
  },
  {
    id: "motorCity",
    serviceCharge: [12, 18],
    ltrRent: { studio: 53_000, "1bed": 72_000, "2bed": 110_000, "3bed": 168_000 },
    adr: { studio: 265, "1bed": 360, "2bed": 530, "3bed": 740 },
    occupancy: 0.73,
    price: { studio: 650_000, "1bed": 1_070_000, "2bed": 1_430_000, "3bed": 2_020_000 },
    assetType: "mixed",
  },
  {
    id: "sportsCity",
    serviceCharge: [10, 16],
    ltrRent: { studio: 43_000, "1bed": 58_000, "2bed": 86_000, "3bed": 122_000, "5bed": 528_000 },
    adr: { studio: 225, "1bed": 305, "2bed": 445, "3bed": 620 },
    occupancy: 0.7,
    price: { studio: 520_000, "1bed": 780_000, "2bed": 1_180_000, "3bed": 1_700_000 },
    assetType: "apartment",
  },
  {
    id: "siliconOasis",
    serviceCharge: [9, 15],
    ltrRent: { studio: 43_000, "1bed": 60_000, "2bed": 86_000, "3bed": 125_000, "4bed": 216_000, "5bed": 259_000 },
    adr: { studio: 215, "1bed": 295, "2bed": 435, "3bed": 600 },
    occupancy: 0.69,
    price: { studio: 490_000, "1bed": 740_000, "2bed": 1_120_000, "3bed": 1_620_000 },
    assetType: "mixed",
  },
  {
    id: "damacHills",
    serviceCharge: [13, 20],
    ltrRent: { studio: 43_000, "1bed": 67_000, "2bed": 125_000, "3bed": 170_000, "4bed": 240_000, "5bed": 456_000 },
    adr: { studio: 260, "1bed": 355, "2bed": 520, "3bed": 880, "4bed": 1_150, "5bed": 1_500 },
    occupancy: 0.73,
    price: { studio: 540_000, "1bed": 1_040_000, "2bed": 1_800_000, "3bed": 2_900_000, "4bed": 3_900_000, "5bed": 5_400_000 },
    assetType: "mixed",
  },
  {
    id: "damacHills2",
    serviceCharge: [8, 13],
    ltrRent: { studio: 38_000, "1bed": 51_000, "3bed": 96_000, "4bed": 115_000, "5bed": 136_000 },
    adr: { "3bed": 620, "4bed": 780, "5bed": 960 },
    occupancy: 0.66,
    price: { "1bed": 670_000, "2bed": 980_000, "3bed": 1_500_000, "4bed": 1_950_000, "5bed": 2_500_000 },
    assetType: "villa",
  },
  {
    id: "townSquare",
    serviceCharge: [9, 14],
    ltrRent: { studio: 43_000, "1bed": 62_000, "2bed": 93_000, "3bed": 134_000, "4bed": 173_000 },
    adr: { studio: 215, "1bed": 290, "2bed": 430, "3bed": 660, "4bed": 850 },
    occupancy: 0.7,
    price: { studio: 500_000, "1bed": 830_000, "2bed": 1_220_000, "3bed": 1_660_000, "4bed": 2_650_000 },
    assetType: "mixed",
  },
  {
    id: "mbrCity",
    serviceCharge: [15, 24],
    ltrRent: { studio: 48_000, "1bed": 82_000, "2bed": 144_000, "3bed": 192_000, "4bed": 250_000, "5bed": 1_248_000 },
    adr: { studio: 345, "1bed": 480, "2bed": 720, "3bed": 1_050, "4bed": 1_480 },
    occupancy: 0.78,
    price: { studio: 1_000_000, "1bed": 1_550_000, "2bed": 2_400_000, "3bed": 3_700_000, "4bed": 5_500_000 },
    assetType: "mixed",
  },
  {
    id: "bluewaters",
    serviceCharge: [26, 38],
    ltrRent: { "1bed": 185_000, "2bed": 280_000, "3bed": 400_000, "4bed": 560_000 },
    adr: { "1bed": 1_050, "2bed": 1_650, "3bed": 2_400, "4bed": 3_300 },
    occupancy: 0.84,
    price: { "1bed": 3_400_000, "2bed": 5_400_000, "3bed": 8_200_000, "4bed": 12_000_000 },
    assetType: "apartment",
  },
  {
    id: "jbr",
    serviceCharge: [18, 28],
    ltrRent: { studio: 72_000, "1bed": 115_000, "2bed": 153_000, "3bed": 187_000, "4bed": 274_000 },
    adr: { studio: 470, "1bed": 700, "2bed": 1_060, "3bed": 1_520, "4bed": 2_100 },
    occupancy: 0.85,
    price: { studio: 1_250_000, "1bed": 1_800_000, "2bed": 2_400_000, "3bed": 2_700_000, "4bed": 5_100_000 },
    assetType: "apartment",
  },
  {
    id: "cityWalk",
    serviceCharge: [22, 32],
    ltrRent: { studio: 95_000, "1bed": 125_000, "2bed": 230_000, "3bed": 383_000 },
    adr: { studio: 520, "1bed": 760, "2bed": 1_150, "3bed": 1_680 },
    occupancy: 0.83,
    price: { studio: 1_500_000, "1bed": 2_350_000, "2bed": 3_600_000, "3bed": 5_600_000 },
    assetType: "apartment",
  },
  {
    id: "difc",
    serviceCharge: [22, 34],
    ltrRent: { studio: 86_000, "1bed": 130_000, "2bed": 191_000, "3bed": 288_000 },
    adr: { studio: 500, "1bed": 730, "2bed": 1_120, "3bed": 1_620 },
    occupancy: 0.81,
    price: { studio: 1_400_000, "1bed": 2_200_000, "2bed": 3_500_000, "3bed": 5_300_000 },
    assetType: "apartment",
  },
  {
    id: "dubaiHarbour",
    serviceCharge: [20, 30],
    ltrRent: { "1bed": 139_000, "2bed": 202_000, "3bed": 336_000, "4bed": 523_000 },
    adr: { "1bed": 850, "2bed": 1_320, "3bed": 1_950, "4bed": 2_700 },
    occupancy: 0.82,
    price: { "1bed": 2_800_000, "2bed": 5_300_000, "3bed": 7_950_000, "4bed": 9_200_000 },
    assetType: "apartment",
  },
  {
    id: "dubaiIslands",
    serviceCharge: [14, 22],
    ltrRent: { studio: 62_000, "1bed": 134_000, "2bed": 154_000, "3bed": 200_000 },
    adr: { studio: 330, "1bed": 490, "2bed": 740, "3bed": 1_050 },
    occupancy: 0.75,
    price: { studio: 900_000, "1bed": 1_450_000, "2bed": 2_300_000, "3bed": 3_400_000 },
    assetType: "apartment",
  },
  {
    id: "theGreens",
    serviceCharge: [13, 19],
    ltrRent: { studio: 60_000, "1bed": 85_000, "2bed": 125_000, "3bed": 175_000 },
    adr: { studio: 300, "1bed": 405, "2bed": 590, "3bed": 820 },
    occupancy: 0.76,
    price: { studio: 750_000, "1bed": 1_150_000, "2bed": 1_750_000, "3bed": 2_500_000 },
    assetType: "apartment",
  },
  {
    id: "barshaHeights",
    serviceCharge: [11, 17],
    ltrRent: { studio: 58_000, "1bed": 68_000, "2bed": 106_000, "3bed": 149_000 },
    adr: { studio: 250, "1bed": 335, "2bed": 490, "3bed": 680 },
    occupancy: 0.71,
    price: { studio: 560_000, "1bed": 830_000, "2bed": 1_250_000, "3bed": 1_800_000 },
    assetType: "apartment",
  },
  {
    id: "emiratesLiving",
    serviceCharge: [10, 16],
    ltrRent: { "2bed": 165_000, "3bed": 235_000, "4bed": 346_000, "5bed": 400_000 },
    adr: { "2bed": 800, "3bed": 1_100, "4bed": 1_480, "5bed": 1_950 },
    occupancy: 0.74,
    price: { "2bed": 2_600_000, "3bed": 3_600_000, "4bed": 5_000_000, "5bed": 7_000_000 },
    assetType: "villa",
  },
  {
    id: "tilalAlGhaf",
    serviceCharge: [12, 19],
    ltrRent: { "3bed": 192_000, "4bed": 432_000, "5bed": 768_000 },
    adr: { "3bed": 1_150, "4bed": 1_500, "5bed": 1_980 },
    occupancy: 0.74,
    price: { "3bed": 3_900_000, "4bed": 5_200_000, "5bed": 7_400_000 },
    assetType: "villa",
  },
  {
    id: "theValley",
    serviceCharge: [9, 14],
    ltrRent: { "3bed": 134_000, "4bed": 178_000, "5bed": 235_000 },
    adr: { "3bed": 720, "4bed": 920, "5bed": 1_180 },
    occupancy: 0.68,
    price: { "3bed": 2_300_000, "4bed": 3_000_000, "5bed": 3_900_000 },
    assetType: "villa",
  },
  {
    id: "emaarSouth",
    serviceCharge: [9, 15],
    ltrRent: { studio: 42_000, "1bed": 62_000, "2bed": 92_000, "3bed": 145_000, "4bed": 185_000 },
    adr: { studio: 215, "1bed": 300, "2bed": 450, "3bed": 720, "4bed": 920 },
    occupancy: 0.69,
    price: { studio: 520_000, "1bed": 910_000, "2bed": 1_400_000, "3bed": 2_630_000, "4bed": 2_900_000 },
    assetType: "mixed",
  },
  {
    id: "mudon",
    serviceCharge: [9, 15],
    ltrRent: { "2bed": 130_000, "3bed": 192_000, "4bed": 235_000, "5bed": 265_000 },
    adr: { "2bed": 640, "3bed": 820, "4bed": 1_050, "5bed": 1_320 },
    occupancy: 0.7,
    price: { "2bed": 2_000_000, "3bed": 2_650_000, "4bed": 3_400_000, "5bed": 4_300_000 },
    assetType: "villa",
  },
  {
    id: "dubaiSciencePark",
    serviceCharge: [11, 17],
    ltrRent: { studio: 53_000, "1bed": 82_000, "2bed": 144_000, "3bed": 245_000 },
    adr: { studio: 245, "1bed": 330, "2bed": 490 },
    occupancy: 0.72,
    price: { studio: 580_000, "1bed": 880_000, "2bed": 1_350_000 },
    assetType: "apartment",
  },
  {
    id: "rashidYachts",
    serviceCharge: [16, 24],
    ltrRent: { "1bed": 110_000, "2bed": 165_000, "3bed": 240_000 },
    adr: { "1bed": 620, "2bed": 940, "3bed": 1_380 },
    occupancy: 0.78,
    price: { "1bed": 1_900_000, "2bed": 2_950_000, "3bed": 4_400_000 },
    assetType: "apartment",
  },
  {
    id: "dubaiSouth",
    serviceCharge: [10, 16],
    ltrRent: { studio: 40_000, "1bed": 58_000, "2bed": 82_000, "3bed": 125_000 },
    adr: { studio: 210, "1bed": 300, "2bed": 430, "3bed": 640 },
    occupancy: 0.70,
    price: { studio: 600_000, "1bed": 980_000, "2bed": 1_250_000, "3bed": 1_900_000 },
    assetType: "mixed",
  },
];

export const AREA_BY_ID = new Map(AREAS.map((a) => [a.id, a]));

/**
 * The plausibility gate for a computed yield, in one place so that the band
 * and the per-bedroom figure can never disagree about what is publishable.
 *
 * Discard implausible pairs rather than publish them. Not every cell has
 * the same provenance — see the PROVENANCE block above — so dividing a real
 * rent by an estimated price manufactures a yield that looks precise and is
 * meaningless. Dubai Hills computed to 9.1% that way, from a genuine 5-bed
 * rent over a guessed 5-bed price. REIDIN puts the citywide range at 4.5%
 * (villas) to 7.1% (apartments), so anything outside 3–9% is an artefact of
 * mismatched inputs, not a market observation.
 */
export const YIELD_GATE: readonly [number, number] = [3, 9];

/**
 * Gross yield for one unit type, computed rather than asserted.
 *
 * Price and rent are the SAME snapshot, which is what avoids the trap that
 * made appreciation underivable: no year-on-year comparison, no shifting
 * sample composition, no off-plan/ready mix drift.
 */
export function grossYieldFor(area: Area, bedroom: BedroomKey): number | null {
  const rent = area.ltrRent[bedroom];
  const price = area.price[bedroom];
  if (!rent || !price) return null;
  const y = (rent / price) * 100;
  return y >= YIELD_GATE[0] && y <= YIELD_GATE[1] ? y : null;
}

/**
 * The [low, high] band across the bedroom types an area actually offers,
 * because a single community figure hides that a studio and a 3-bed in the
 * same tower can yield two points apart.
 */
export function grossYieldBand(area: Area): [number, number] | null {
  const yields: number[] = [];
  for (const bed of BEDROOM_KEYS) {
    const y = grossYieldFor(area, bed);
    if (y !== null) yields.push(y);
  }
  if (yields.length === 0) return null;
  return [
    Math.round(Math.min(...yields) * 10) / 10,
    Math.round(Math.max(...yields) * 10) / 10,
  ];
}

/**
 * Price per sq ft — DERIVED, and the derivation matters.
 *
 * `price[bed]` is a per-community DLD median. `TYPICAL_SQFT[bed]` is a
 * CITYWIDE DLD median size for that unit type. The ratio is therefore not a
 * community's own median AED/sq ft: it is what its median price works out to
 * at the citywide typical size for that bedroom count. Where a community's
 * units run larger than the city median — Downtown, Palm — this overstates
 * AED/sq ft, and where they run smaller it understates it.
 *
 * It is still the right comparison to publish, because the denominator is
 * held CONSTANT across every community. That is the same discipline that
 * makes grossYieldBand() safe and that a year-on-year median failed: nothing
 * varies between the bars except the thing being compared. A per-community
 * median size would be more accurate per row and less comparable across
 * rows, and it is not in this table anyway.
 *
 * The UI labels this as derived rather than as a DLD median. Do not relabel
 * it without changing the arithmetic.
 */
export function pricePerSqft(area: Area, bedroom: BedroomKey): number | null {
  const price = area.price[bedroom];
  if (!price) return null;
  return price / TYPICAL_SQFT[bedroom];
}

export function areasFor(bedroom: BedroomKey): Area[] {
  return AREAS.filter((a) => a.adr[bedroom] !== undefined);
}

/**
 * Which unit sizes an area can actually be modelled at.
 *
 * This is gated by the data the CHOSEN MODE needs, which is not the same
 * set. `adr` (short-let nightly rate) is the thinnest column in the table —
 * mostly studio to 3-bed — while `ltrRent` and `price` run to 5-bed in many
 * communities. Gating everything on `adr` silently hid the 4- and 5-bed
 * options from the long-let calculator even where both a real DLD price and
 * a real listing rent existed: Dubai Marina offered only studio–3-bed
 * despite having both for a 4-bed.
 *
 * Long-let needs a price AND a rent — the yield is one over the other, and
 * seeding either at zero produces a meaningless answer rather than an empty
 * field. Short-let needs the nightly rate and a price for the outlay.
 */
export function bedroomsFor(
  areaId: string,
  mode: "longTerm" | "shortTerm" = "shortTerm",
): BedroomKey[] {
  const area = AREA_BY_ID.get(areaId);
  if (!area) return BEDROOM_KEYS;

  return BEDROOM_KEYS.filter((k) =>
    mode === "longTerm"
      ? area.price[k] !== undefined && area.ltrRent[k] !== undefined
      : area.adr[k] !== undefined && area.price[k] !== undefined,
  );
}

/** Midpoint of the service-charge band, AED per sq ft per year. */
export function serviceChargeMid(area: Area): number {
  return (area.serviceCharge[0] + area.serviceCharge[1]) / 2;
}
