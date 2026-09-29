/**
 * What the browser is allowed to see.
 *
 * Nothing here carries a phone number, an email address, an ID or passport
 * number, or raw_data. Numbers leave the server masked; the only way to a
 * real number is /api/ds/reveal, which is limited, reasoned and logged.
 */

import { asBeds, asDate, asLabel, asName, asNum, asPropId, first, fromRaw, partyOf, type OwnerRow } from "./rows";

/** How sure we are this person owns it now. */
export type OwnerStatus =
  | "confirmed" // a dated sale in unit_current_owner names them
  | "likely" // named by unit_current_owner, but the unit has no dated sale to check
  | "previous" // a later confirmed sale names someone else
  | "bought" // the record says Buyer, and nothing confirms or contradicts it
  | "sold" // the record says Seller
  | "unknown";

export interface DsProperty {
  community: string | null;
  building: string | null;
  unit: string | null;
  /** Villa / property / plot pre-registration number. */
  propertyNo: string | null;
  plot: string | null;
  /** DLD plot + sub-plot, e.g. 394-2829. */
  dmNo: string | null;
  type: string | null;
  beds: string | null;
  /** The unit is only stated when the source column says it; loaders mix sq m and sq ft. */
  size: { value: number; unit: "sq m" | "sq ft" | null } | null;
  price: number | null;
  date: string | null;
}

export interface DsPhone {
  masked: string;
  region: "uae_mobile" | "uae_landline" | "abroad";
}

export interface DsHit {
  /** Signed, user-bound, expiring handle for this owner record. The only way to open or reveal it. */
  ref: string;
  name: string;
  status: OwnerStatus;
  statusDate: string | null;
  nationality: string | null;
  property: DsProperty;
  phones: DsPhone[];
  hasEmail: boolean;
  inCrm: DsCrmLink | null;
  /** Source files disagree on this row — say so rather than present it as fact. */
  notes: string[];
}

export interface DsCrmLink {
  kind: "lead" | "contact" | "temp";
  id: string;
  name: string;
  stage: string | null;
  ownerName: string | null;
  mine: boolean;
}

/* ------------------------------------------------------------ fields */

const SQM_KEYS = ["actual area sqm", "builtup area sqm", "actual size sqm", "size sqm", "sqm"];
const SQFT_KEYS = ["size sqft", "area sqft", "sqft"];
const SIZE_KEYS = ["actualarea", "actualsize", "totalarea", "builtuparea", "builtup", "size", "areaowned"];

export function propertyOf(r: OwnerRow): DsProperty {
  const pick = (keys: string[]) => {
    for (const k of keys) {
      const v = asPropId(fromRaw(r, [k]));
      if (v) return v;
    }
    return null;
  };
  const community = first(asLabel(r.community_clean), asLabel(fromRaw(r, ["masterproject", "masterprojecten", "projectnameen", "projectname", "project", "areanameen", "areaname", "community", "communityname", "area"])), asLabel(r.project_name));
  let building = first(asLabel(r.building), asLabel(fromRaw(r, ["buildingnameen", "buildingname", "building", "subproject", "subprojecten", "tower", "towername"])));
  // A villa's "building" is often the community name again, or a stray number.
  if (building && (/^-?\d+(\.\d+)?$/.test(building.trim()) || building.trim().toLowerCase() === String(community ?? "").trim().toLowerCase())) building = null;

  const dmno = fromRaw(r, ["dmno"]) ?? fromRaw(r, ["municipality no"]);
  const dmsub = fromRaw(r, ["dmsubno"]) ?? fromRaw(r, ["municipality sub no"]);

  const sqm = asNum(fromRaw(r, SQM_KEYS));
  const sqft = sqm ? null : asNum(fromRaw(r, SQFT_KEYS));
  const other = sqm || sqft ? null : asNum(fromRaw(r, SIZE_KEYS));
  const size = sqm ? { value: sqm, unit: "sq m" as const } : sqft ? { value: sqft, unit: "sq ft" as const } : other ? { value: other, unit: null } : null;

  return {
    community,
    building,
    unit: asPropId(first(r.unit_clean, r.unit, fromRaw(r, ["unitnumber", "unitno", "unit", "flatnumber", "flatno", "apartmentno"]))),
    propertyNo: pick(["villanumber", "villano", "plotpreregno", "registration", "propertynumber", "propertyno"]),
    plot: pick(["plotnumber", "plotno", "landnumber", "land number"]),
    dmNo: dmno && dmsub ? `${String(dmno).trim()}-${String(dmsub).trim()}` : null,
    type: asLabel(fromRaw(r, ["propertytypeen", "propertytype", "propertysubtypeen", "usage", "type"])),
    beds: asBeds(fromRaw(r, ["roomsdescriptionen", "roomsdescription", "rooms", "bedrooms", "bedroom", "beds"])),
    size,
    price: asNum(fromRaw(r, ["procedurevalue", "transactionamount", "transactionvalue", "purchaseprice", "saleprice", "price", "amount", "value"])),
    date: asDate(fromRaw(r, ["regis", "instancedate", "transactiondate", "registrationdate", "regisdate", "purchasedate", "contractdate", "date"])),
  };
}

export const nameOf = (r: OwnerRow) =>
  first(asName(r.full_name), asName(fromRaw(r, ["ownernameen", "ownername", "nameen", "fullname", "name", "buyername", "sellername", "clientname", "partyname"]))) ?? "Name not recorded";

export const nationalityOf = (r: OwnerRow) =>
  asLabel(fromRaw(r, ["countrynameen", "countryname", "nationalityen", "nationality", "country"]));

/** What the row itself records, used when unit_current_owner has nothing to say. */
export function sideOf(r: OwnerRow): OwnerStatus {
  const p = partyOf(r);
  if (/buyer/.test(p)) return "bought";
  if (/seller/.test(p)) return "sold";
  return "unknown";
}

/* ------------------------------------------------------------ phones */

/** Digits in international form: 0501234567 → 971501234567. */
export function toInternational(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (/^05\d{8}$/.test(d)) d = "971" + d.slice(1);
  else if (/^5\d{8}$/.test(d)) d = "971" + d;
  else if (/^0[2-4679]\d{7}$/.test(d)) d = "971" + d.slice(1);
  else if (/^9710\d{8,9}$/.test(d)) d = "971" + d.slice(4);
  return d;
}

export function regionOf(raw: string): DsPhone["region"] {
  const d = toInternational(raw);
  if (/^9715\d{8}$/.test(d)) return "uae_mobile";
  if (/^971[2-4679]\d{7}$/.test(d)) return "uae_landline";
  return "abroad";
}

/** +971 50 ••• ••12 — the country and network prefix and the last two digits, nothing more. */
export function maskPhone(raw: string): string {
  const d = toInternational(raw);
  if (/^971\d{8,9}$/.test(d)) return `+971 ${d.slice(3, 5)} ••• ••${d.slice(-2)}`;
  return `+${d.slice(0, Math.max(1, d.length - 9))} ••• ••${d.slice(-2)}`;
}

/** A readable full number, for the one moment it is revealed. */
export function formatPhone(raw: string): string {
  const d = toInternational(raw);
  if (/^9715\d{8}$/.test(d)) return `+971 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  if (/^971\d{8}$/.test(d)) return `+971 ${d.slice(3, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return `+${d}`;
}

export const phoneCore = (raw: string) => raw.replace(/\D/g, "").slice(-9);
