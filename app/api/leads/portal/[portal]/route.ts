import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { PORTALS, ingestPortalLead, portalSecret, type Portal } from "@/lib/portal-intake";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Property portals POST leads here: /api/leads/portal/<portal>?token=<secret>
   (or the secret in an x-webhook-secret header). See lib/portal-intake.ts. */

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ portal: string }> }) {
  const portal = (await params).portal as Portal;
  if (!PORTALS.includes(portal)) return NextResponse.json({ ok: false, error: "unknown_portal" }, { status: 404 });

  const secret = portalSecret(portal);
  const given = request.nextUrl.searchParams.get("token") || request.headers.get("x-webhook-secret") || "";
  if (!secret || secret.length < 16) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  if (!same(given, secret)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });

  const text = await request.text();
  if (text.length > 100_000) return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
  let raw: unknown = null;
  try { raw = JSON.parse(text); } catch { raw = null; }
  if (!raw || typeof raw !== "object") return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });

  const { status, ...result } = await ingestPortalLead(db, portal, raw);
  return NextResponse.json(result, { status });
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ portal: string }> }) {
  const { portal } = await params;
  return NextResponse.json({ ok: PORTALS.includes(portal as Portal), portal, method: "POST JSON with ?token=<secret>" });
}
