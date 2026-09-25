/**
 * Short-let cost assumptions shared by the secondary-market ROI engine's
 * "holiday home" mode. Kept separate from a full holiday-home management
 * calculator (that service is not offered) — this file only holds the cost
 * constants the ROI illustration needs to model what a short-let unit would
 * cost to run, not a management-service pricing engine.
 */

import type { BedroomKey } from "./dubai-market";

/** Management commission band a short-let operator would typically charge. */
export const MANAGEMENT_COMMISSION = { min: 0.15, max: 0.2 } as const;

/** Booking-platform (Airbnb / Booking.com) take, blended across channels. */
export const OTA_COMMISSION = 0.16;

/**
 * Dubai Department of Economy and Tourism, holiday-home operation.
 *  - "Tourism Dirham" is levied per bedroom per occupied night. A studio is
 *    charged as one room. AED 10 for Standard, AED 15 for Deluxe grade; the
 *    model uses Standard.
 *  - The annual DET permit is charged per unit per bedroom.
 * Both are indicative and set by DET, not by us.
 */
export const DET = {
  tourismDirhamPerRoomNight: 10,
  permitPerBedroomPerYear: 370,
} as const;

/** Consumables, laundry and the cleaner's time between stays. */
export const CLEANING_PER_TURNOVER = 145;
/** Average nights a guest stays — sets how many turnovers a month costs. */
export const AVG_STAY_NIGHTS = 4.2;

/** Utilities (DEWA, chiller, internet) run to the owner on a short let. */
export const UTILITIES_PER_MONTH: Record<BedroomKey, number> = {
  studio: 620,
  "1bed": 820,
  "2bed": 1_150,
  "3bed": 1_600,
  "4bed": 2_400,
  "5bed": 3_100,
};
