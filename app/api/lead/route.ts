import { NextResponse, type NextRequest } from "next/server";
import { getSupabase, LEADS_TABLE } from "@/lib/supabase";
import { SERVICE_KEYS, type ServiceKey } from "@/lib/site-config";
import { isPlausiblePhone, type LeadPayload } from "@/lib/lead";
import { LOCALES, type Locale } from "@/lib/i18n/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------------------------------------------------------------------
   Rate limiting
   In-memory and therefore per-instance: it is a speed bump against a script,
   not a distributed quota. That is the right trade here — the table is
   insert-only and the real cost of abuse is noise in a lead list, so a
   shared store would be more moving parts than the problem justifies.
   ------------------------------------------------------------------------ */

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);

  // Opportunistic sweep so the map cannot grow without bound.
  if (hits.size > 5_000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > MAX_PER_WINDOW;
}

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

const trim = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const cleaned = value.trim();
  return cleaned ? cleaned.slice(0, max) : null;
};

/* The calculator state carried in with an enquiry: flat, small values only. */
function safeSelections(v: unknown): Record<string, string | number | boolean> {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [k, val] of Object.entries(v).slice(0, 30)) {
    if (typeof val === "number" || typeof val === "boolean") out[k.slice(0, 40)] = val;
    else if (typeof val === "string") out[k.slice(0, 40)] = val.slice(0, 200);
  }
  return out;
}

export async function POST(request: NextRequest) {
  const ip = clientIp(request);
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: Partial<LeadPayload>;
  try {
    const text = await request.text();
    if (text.length > 20_000) return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
    body = JSON.parse(text) as Partial<LeadPayload>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // Honeypot. Answer 200 rather than an error: a bot that learns it was
  // detected just adapts, and a real user can never reach this branch.
  if (typeof body.company === "string" && body.company.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const fullName = trim(body.fullName, 200);
  const phone = trim(body.phone, 40);
  const service = body.service as ServiceKey | undefined;

  if (!fullName || !phone) {
    return NextResponse.json({ ok: false, error: "missing_required" }, { status: 400 });
  }
  if (!isPlausiblePhone(phone)) {
    return NextResponse.json({ ok: false, error: "invalid_phone" }, { status: 400 });
  }
  if (!service || !SERVICE_KEYS.includes(service)) {
    return NextResponse.json({ ok: false, error: "invalid_service" }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    // Not configured is a deployment state, not a client error. The caller
    // treats this as "not persisted" and still completes the WhatsApp handoff.
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  /* Only the public columns are ever named here. The referral ledger —
     partner, status, commission — is never set from a web request, and the
     database revokes anon's privilege on those columns as well, so a
     forged payload cannot reach them even if this code changed. */
  const { error } = await supabase.from(LEADS_TABLE).insert({
    service,
    full_name: fullName,
    phone,
    email: trim(body.email, 320),
    notes: trim(body.notes, 4_000),
    // Must match the locale CHECK in 0001_concierge_leads.sql. A locale the
    // site serves but the database rejects is a silently lost enquiry.
    locale: LOCALES.includes((body.locale ?? "") as Locale) ? body.locale : "en",
    currency: ["AED", "USD", "EUR", "GBP"].includes(body.currency ?? "")
      ? body.currency
      : "AED",
    payload: safeSelections(body.selections),
    source: request.headers.get("referer")?.slice(0, 500) ?? null,
    user_agent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
  });

  if (error) {
    // Logged server-side only: the message can name the table and policy,
    // which is not something to hand back to an anonymous caller.
    console.error("[lead] insert failed:", error.message);
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
