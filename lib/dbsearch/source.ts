/**
 * Which data DB Search in the CRM reads, set by DS_DATA_SOURCE:
 *
 *   legacy (default)  today's tables: owners, phones, unit_current_owner, unit_rows
 *                     and the smart_search / search_* / list_communities functions.
 *   off               the old data is not read at all: every owner, phone, unit,
 *                     area and property-number lookup answers "no results" with a
 *                     short note, while the rest of the CRM keeps working.
 *   uae               the clean database (schema `uae`, lib/dbsearch/uae.ts): the same
 *                     screens, answered from it. Agent (broker) search and the
 *                     "already sold" flags are not in it yet and say so.
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
/* On the clean data (uae) almost everything has a new answer; these do not exist there yet. */
const NOT_IN_UAE = new Set(["brokers", "sold"]);

export const blockedBySource = (action: string) =>
  dataSource() === "off" ? OLD_DATA_ACTIONS.has(action) : dataSource() === "uae" ? NOT_IN_UAE.has(action) : false;
