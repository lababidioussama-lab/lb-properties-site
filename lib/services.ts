/**
 * Service catalogue: maintenance tiers and relocation pricing.
 * All prices are AED and are converted for display only.
 */

import type { Dictionary } from "./i18n/types";

export const ANNUAL_DISCOUNT = 0.15;

export type PlanId = "standard" | "premium" | "ultra";

/** Every feature row every plan is measured against, in display order.
    Keeping one shared list is what makes the tiers line up visually
    instead of each card listing only its own wins. */
export const PLAN_FEATURES = [
  "visits",
  "acFilter",
  "acCoil",
  "ductCleaning",
  "plumbing",
  "electrical",
  "emergency",
  "response",
  "pest",
  "pool",
  "landscaping",
  "supervisor",
] as const;

export type PlanFeature = (typeof PLAN_FEATURES)[number];

/** A feature is either absent, included as a plain tick, or has a value. */
export type FeatureValue = false | true | keyof Dictionary["maintenance"]["values"];

export interface Plan {
  id: PlanId;
  monthlyAed: number;
  featured: boolean;
  features: Record<PlanFeature, FeatureValue>;
}

export const PLANS: Plan[] = [
  {
    id: "standard",
    monthlyAed: 449,
    featured: false,
    features: {
      visits: "quarterly",
      acFilter: true,
      acCoil: false,
      ductCleaning: false,
      plumbing: true,
      electrical: true,
      emergency: false,
      response: "hours48",
      pest: false,
      pool: false,
      landscaping: false,
      supervisor: false,
    },
  },
  {
    id: "premium",
    monthlyAed: 899,
    featured: true,
    features: {
      visits: "biMonthly",
      acFilter: true,
      acCoil: true,
      ductCleaning: "annual",
      plumbing: true,
      electrical: true,
      emergency: true,
      response: "hours8",
      pest: "quarterly",
      pool: false,
      landscaping: false,
      supervisor: false,
    },
  },
  {
    id: "ultra",
    monthlyAed: 1899,
    featured: false,
    features: {
      visits: "monthly",
      acFilter: true,
      acCoil: true,
      ductCleaning: "twiceYear",
      plumbing: true,
      electrical: true,
      emergency: true,
      response: "hours2",
      pest: "monthly",
      pool: "weekly",
      landscaping: "weekly",
      supervisor: true,
    },
  },
];

export function planPrice(plan: Plan, billing: "monthly" | "annual"): {
  monthlyAed: number;
  annualAed: number;
} {
  const monthly =
    billing === "annual" ? plan.monthlyAed * (1 - ANNUAL_DISCOUNT) : plan.monthlyAed;
  return { monthlyAed: monthly, annualAed: monthly * 12 };
}

/** Indicative relocation ranges, AED. Shown as ranges because the real
    number depends on volume and floor access — quoting a single figure we
    can't honour would be worse than an honest band. */
export const RELOCATION_ESTIMATES = {
  move: { from: 2_500, to: 14_000 },
  utilities: { from: 900, to: 2_800 },
  handover: { from: 1_500, to: 4_500 },
} as const;

export type RelocationCardId = keyof typeof RELOCATION_ESTIMATES;
