import type { SupabaseClient } from "@supabase/supabase-js";
import { LEADS_TABLE } from "./supabase";
import { LEAD_SLA_HOURS } from "./crm";

export const PORTALS = ["bayut", "dubizzle", "property_finder"] as const;
export type Portal = (typeof PORTALS)[number];
export const PORTAL_LABEL: Record<Portal, string> = { bayut: "Bayut", dubizzle: "Dubizzle", property_finder: "Property Finder" };
const LABEL = PORTAL_LABEL;
const OPEN = ["new", "contacted", "viewing", "offer"];

export function portalSecret(portal: Portal) {
  return process.env[`${portal.toUpperCase()}_WEBHOOK_SECRET`] || process.env.PORTAL_WEBHOOK_SECRET || "";
}

/** Every leaf value in the payload, keyed by its lower-cased field name. */
function flatten(value: unknown, out: Map<string, unknown> = new Map(), key = ""): Map<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value)) flatten(v, out, k.toLowerCase());
  } else if (Array.isArray(value)) {
    value.forEach((v) => flatten(v, out, key));
  } else if (key && value != null && value !== "" && !out.has(key)) {
    out.set(key, value);
  }
  return out;
}

const pick = (f: Map<string, unknown>, keys: string[], max = 500) => {
  for (const k of keys) {
    const v = f.get(k);
    if (v != null && String(v).trim()) return String(v).trim().slice(0, max);
  }
  return null;
};

export interface IngestResult { ok: boolean; id?: string; duplicate?: boolean; assigned_to?: string | null; error?: string; status: number }

/**
 * Turn one portal payload into a CRM lead. Fields are found by name anywhere
 * in the JSON, since each portal and API version nests them differently.
 * Deduplicates by phone against open leads from the last 30 days, assigns to
 * the listing's agent (matched on ref_code) or the least-loaded active agent,
 * and records it in the lead timeline and the audit log.
 */
export async function ingestPortalLead(db: SupabaseClient, portal: Portal, raw: object): Promise<IngestResult> {
  const f = flatten(raw);

  const first = pick(f, ["first_name", "firstname"]);
  const last = pick(f, ["last_name", "lastname"]);
  const full_name = pick(f, ["full_name", "fullname", "name", "client_name", "contact_name", "customer_name", "sender_name", "user_name"], 200)
    ?? ([first, last].filter(Boolean).join(" ") || null);
  const phone = pick(f, ["phone", "mobile", "phone_number", "mobile_number", "contact_phone", "cell", "telephone", "whatsapp", "msisdn"], 40);
  const email = pick(f, ["email", "email_address", "contact_email", "sender_email"], 320);
  const message = pick(f, ["message", "comment", "comments", "enquiry", "inquiry", "body", "notes", "text"], 3000);
  const reference = pick(f, ["reference", "property_reference", "listing_reference", "reference_number", "ref", "ref_no", "agent_reference", "external_id"], 80);
  const listingTitle = pick(f, ["property_title", "listing_title", "ad_title", "title"], 200);
  const adId = pick(f, ["ad_id", "listing_id", "property_id", "ad_external_id"], 80);

  if (!full_name && !phone) return { ok: false, error: "missing_contact", status: 422 };

  const digits = (phone ?? "").replace(/\D/g, "").slice(-9);
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();

  // Same person enquiring again: keep one lead, note the new enquiry on it.
  if (digits.length >= 7) {
    const { data: recent } = await db.from(LEADS_TABLE).select("id, phone, owner_id").gte("created_at", since).in("stage", OPEN).limit(2000);
    const dup = recent?.find((l) => String(l.phone ?? "").replace(/\D/g, "").endsWith(digits));
    if (dup) {
      await db.from("crm_activities").insert({ lead_id: dup.id, kind: "system", body: `Enquired again via ${LABEL[portal]}${reference ? ` (ref ${reference})` : ""}${message ? `: ${message}` : ""}` });
      await db.from("crm_audit").insert({ entity: "integration", entity_id: dup.id, action: "lead_duplicate", detail: { portal, reference } });
      return { ok: true, id: dup.id as string, duplicate: true, status: 200 };
    }
  }

  // Owner: the listing's agent if we can match the reference, else the least-loaded agent.
  let owner: string | null = null;
  if (reference) {
    const { data: listing } = await db.from("crm_listings").select("agent_id").eq("ref_code", reference).maybeSingle();
    owner = (listing?.agent_id as string | null) ?? null;
  }
  if (!owner) {
    const [{ data: agents }, { data: open }] = await Promise.all([
      db.from("crm_users").select("id").eq("role", "agent").eq("active", true),
      db.from(LEADS_TABLE).select("owner_id").in("stage", OPEN).not("owner_id", "is", null).limit(5000),
    ]);
    const load = new Map<string, number>((agents ?? []).map((a) => [a.id as string, 0]));
    open?.forEach((l) => load.has(l.owner_id as string) && load.set(l.owner_id as string, (load.get(l.owner_id as string) ?? 0) + 1));
    owner = [...load.entries()].sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
  }

  const { data: lead, error } = await db
    .from(LEADS_TABLE)
    .insert({
      full_name: full_name ?? "Portal enquiry",
      phone: phone ?? "unknown",
      email,
      notes: [listingTitle && `Listing: ${listingTitle}`, reference && `Ref: ${reference}`, message].filter(Boolean).join("\n") || null,
      source: portal,
      service: "advisory",
      stage: "new",
      owner_id: owner,
      expires_at: owner ? new Date(Date.now() + LEAD_SLA_HOURS * 3_600_000).toISOString() : null,
      payload: { portal, reference, ad_id: adId, raw },
      user_agent: `portal:${portal}`,
    })
    .select("id")
    .single();
  if (error || !lead) return { ok: false, error: error?.message ?? "insert_failed", status: 502 };

  await db.from("crm_activities").insert({ lead_id: lead.id, kind: "system", body: `Lead received from ${LABEL[portal]}${reference ? ` (ref ${reference})` : ""}` });
  await db.from("crm_audit").insert({ entity: "integration", entity_id: lead.id, action: "lead_received", detail: { portal, reference, assigned_to: owner, test: (raw as { test?: unknown }).test === true } });

  return { ok: true, id: lead.id as string, assigned_to: owner, status: 200 };
}
