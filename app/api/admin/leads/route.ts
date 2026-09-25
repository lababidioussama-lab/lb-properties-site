import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, verifySessionValue } from "@/lib/admin-auth";
import {
  LEADS_TABLE,
  LEAD_STATUSES,
  getSupabaseAdmin,
  type LeadStatus,
} from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorised(request: NextRequest): boolean {
  return verifySessionValue(request.cookies.get(ADMIN_COOKIE)?.value);
}

/**
 * The ledger columns a PATCH is allowed to touch.
 *
 * An allow-list rather than a deny-list: the public columns — name, phone,
 * what the visitor actually submitted — are the record of the enquiry, and
 * editing them from the panel would quietly rewrite history. The ledger is
 * the operator's annotation on top, and only that is writable.
 */
type Patch = {
  partner?: string | null;
  status?: LeadStatus;
  commission_aed?: number | null;
  commission_paid_at?: string | null;
  referred_at?: string | null;
  internal_notes?: string | null;
};

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, max) : null;
};

export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ ok: false, error: "unauthorised" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from(LEADS_TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1_000);

  if (error) {
    console.error("[admin/leads] select failed:", error.message);
    return NextResponse.json({ ok: false, error: "query_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, leads: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json({ ok: false, error: "unauthorised" }, { status: 401 });
  }

  let body: { id?: unknown; patch?: Record<string, unknown> };
  try {
    body = (await request.json()) as { id?: unknown; patch?: Record<string, unknown> };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : null;
  if (!id) {
    return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400 });
  }

  const raw = body.patch ?? {};
  const patch: Patch = {};

  if ("partner" in raw) patch.partner = text(raw.partner, 200);

  if ("status" in raw) {
    const status = raw.status;
    if (!LEAD_STATUSES.includes(status as LeadStatus)) {
      return NextResponse.json({ ok: false, error: "invalid_status" }, { status: 400 });
    }
    patch.status = status as LeadStatus;

    /* Stamp the referral date the first time a lead leaves 'new'. The
       operator should not have to remember to set a date that the status
       change already implies — and an unstamped referral makes the
       partner-conversion figures meaningless. */
    if (status !== "new") patch.referred_at = new Date().toISOString();
  }

  if ("commission_aed" in raw) {
    const value = raw.commission_aed;
    if (value === null || value === "") {
      patch.commission_aed = null;
    } else {
      const amount = Number(value);
      if (!Number.isFinite(amount) || amount < 0) {
        return NextResponse.json(
          { ok: false, error: "invalid_commission" },
          { status: 400 },
        );
      }
      patch.commission_aed = Math.round(amount * 100) / 100;
    }
  }

  if ("commission_paid" in raw) {
    // A boolean from the UI, a timestamp in the table: the panel asks "has
    // this been paid", the ledger records when.
    patch.commission_paid_at = raw.commission_paid ? new Date().toISOString() : null;
  }

  if ("internal_notes" in raw) patch.internal_notes = text(raw.internal_notes, 4_000);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "empty_patch" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from(LEADS_TABLE)
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[admin/leads] update failed:", error.message);
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, lead: data });
}
