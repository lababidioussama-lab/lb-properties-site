import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client.
 *
 * The key here is the ANON key, which is public by design — it is a signed
 * JWT asserting nothing but the `anon` role. What actually protects the
 * table is the RLS policy: insert-only, with no select policy, so this
 * client can file a lead and can never read one back.
 *
 * It is still kept off the client bundle (no NEXT_PUBLIC_ prefix, imported
 * only from the route handler) so the browser never advertises which
 * backend is behind the form, and so the route can rate-limit centrally.
 */

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "estate-concierge" } },
  });
  return cached;
}

/**
 * Service-role client — the ONLY thing that can read a lead back or touch
 * the referral ledger.
 *
 * The anon client above is deliberately powerless: RLS gives it insert and
 * no select, and the column grants keep it away from partner/status/
 * commission entirely. That is what makes the public form safe, and it is
 * also why the ledger needs a second client rather than a wider policy.
 *
 * This key bypasses RLS completely. It must never be imported into a client
 * component — no NEXT_PUBLIC_ prefix, and every caller is a route handler or
 * a server component that has already checked the admin session.
 */
let cachedAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (cachedAdmin) return cachedAdmin;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  cachedAdmin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "estate-concierge-admin" } },
  });
  return cachedAdmin;
}

export const LEADS_TABLE = "concierge_leads";

/** Ledger vocabulary, mirroring the CHECK in 0001_concierge_leads.sql.
    Kept here so the UI, the PATCH validator and the database agree. */
export const LEAD_STATUSES = [
  "new",
  "referred",
  "contacted",
  "quoted",
  "won",
  "lost",
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** A row as the ledger reads it — public columns plus the referral columns. */
export interface LedgerLead {
  id: string;
  created_at: string;
  service: string;
  full_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  locale: string;
  currency: string;
  payload: Record<string, unknown>;
  source: string | null;
  partner: string | null;
  referred_at: string | null;
  status: LeadStatus;
  commission_aed: number | null;
  commission_paid_at: string | null;
  internal_notes: string | null;
}
