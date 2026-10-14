/**
 * Which data DB Search in the CRM reads, set by DS_DATA_SOURCE:
 *
 *   legacy (default)  today's tables: owners, phones, unit_current_owner, unit_rows
 *                     and the smart_search / search_* / list_communities functions.
 *   off               the old data is not read at all: every owner, phone, unit,
 *                     area and property-number lookup answers "no results" with a
 *                     short note, while the rest of the CRM keeps working.
 *   uae               reserved for the clean `uae` schema; until it is built it
 *                     behaves exactly like off.
 *
 * Only this CRM reads the variable. dbsearchdubai.com is a separate app and is
 * not affected.
 */

export type DsSource = "legacy" | "off" | "uae";

export function dataSource(): DsSource {
  const v = (process.env.DS_DATA_SOURCE ?? "").trim().toLowerCase();
  return v === "off" || v === "uae" ? v : "legacy";
}

export const legacyData = () => dataSource() === "legacy";

export const DATA_OFF_NOTE = "The new database is being prepared — search will return when it is uploaded.";

/**
 * The DB Search actions that read the old owner data. Everything else (sign-in,
 * access and limits, the do-not-contact check, the DLD permit cache and live
 * scraper, live portal listings, the Investors workbook) keeps working.
 */
const OLD_DATA_ACTIONS = new Set(["search", "community", "phone", "sold", "owner", "reveal", "unit", "add", "area", "area_send", "pnumber", "brokers", "suggest", "stats"]);

/** True when this action must answer "no results" because the old data is switched off. */
export const blockedBySource = (action: string) => !legacyData() && OLD_DATA_ACTIONS.has(action);
