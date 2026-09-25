import { NextResponse, type NextRequest } from "next/server";
import {
  CRM_COOKIE,
  SESSION_COOKIE_OPTIONS,
  authenticate,
  createSession,
  isCrmConfigured,
} from "@/lib/crm-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, number[]>();

function throttled(key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  attempts.set(key, recent);
  if (attempts.size > 2_000) attempts.clear();
  return recent.length > MAX_ATTEMPTS;
}

export async function POST(request: NextRequest) {
  if (!isCrmConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  if (throttled(ip)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: unknown; password?: unknown };
  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const user = await authenticate(body.email, body.password);
  const value = user ? createSession(user) : null;
  if (!value) {
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(CRM_COOKIE, value, SESSION_COOKIE_OPTIONS);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CRM_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
