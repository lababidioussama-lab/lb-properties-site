import { NextResponse, type NextRequest } from "next/server";
import {
  CRM_COOKIE,
  SESSION_COOKIE_OPTIONS,
  authenticate,
  createSession,
  isCrmConfigured,
  sessionFromRequest,
} from "@/lib/crm-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { OTP_COOKIE, OTP_TTL_MS, canResend, checkCode, issueTicket, maskEmail, otpConfigured, otpDisabled, readTicket, sendCode } from "@/lib/crm-otp";

const OTP_COOKIE_OPTIONS = { ...SESSION_COOKIE_OPTIONS, maxAge: OTP_TTL_MS / 1000 };

/** Sign-ins land in the audit log so the admin can see who uses the CRM and when. */
async function logSession(userId: string | null, action: string, detail: Record<string, unknown>) {
  await getSupabaseAdmin()?.from("crm_audit").insert({ user_id: userId, entity: "session", entity_id: userId, action, detail });
}

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

  const body = (await request.json().catch(() => ({}))) as { email?: unknown; password?: unknown; code?: unknown; resend?: unknown };
  const agent = request.headers.get("user-agent")?.slice(0, 160) ?? null;

  // Step 2: the emailed code.
  if (typeof body.code === "string" || body.resend === true) {
    const ticket = readTicket(request.cookies.get(OTP_COOKIE)?.value);
    if (!ticket) return NextResponse.json({ ok: false, error: "code_expired" }, { status: 401 });

    if (body.resend === true) {
      if (!canResend(ticket)) return NextResponse.json({ ok: false, error: "wait" }, { status: 429 });
      const next = issueTicket({ id: ticket.id, role: ticket.role }, ticket.email);
      if (!next || !(await sendCode(ticket.email, next.code))) return NextResponse.json({ ok: false, error: "email_failed" }, { status: 502 });
      const response = NextResponse.json({ ok: true, step: "otp", hint: maskEmail(ticket.email) });
      response.cookies.set(OTP_COOKIE, next.cookie, OTP_COOKIE_OPTIONS);
      return response;
    }

    const result = checkCode(ticket, body.code as string);
    if (result !== "ok") {
      await logSession(ticket.id, "otp_failed", { ip, agent });
      return NextResponse.json({ ok: false, error: result === "locked" ? "code_locked" : "code_wrong" }, { status: 401 });
    }
    const value = createSession({ id: ticket.id, role: ticket.role });
    if (!value) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
    await logSession(ticket.id, "login", { ip, agent });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(CRM_COOKIE, value, SESSION_COOKIE_OPTIONS);
    response.cookies.set(OTP_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
    return response;
  }

  // Step 1: email and password.
  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const email = body.email.trim().toLowerCase();
  const user = await authenticate(email, body.password);
  if (!user) {
    await logSession(null, "login_failed", { email: email.slice(0, 120), ip });
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }

  if (otpDisabled()) {
    const value = createSession(user);
    if (!value) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
    await logSession(user.id, "login", { ip, agent, otp: false });
    const response = NextResponse.json({ ok: true });
    response.cookies.set(CRM_COOKIE, value, SESSION_COOKIE_OPTIONS);
    return response;
  }

  if (!otpConfigured()) return NextResponse.json({ ok: false, error: "otp_not_configured" }, { status: 503 });
  const ticket = issueTicket(user, email);
  if (!ticket || !(await sendCode(email, ticket.code))) {
    return NextResponse.json({ ok: false, error: "email_failed" }, { status: 502 });
  }
  const response = NextResponse.json({ ok: true, step: "otp", hint: maskEmail(email) });
  response.cookies.set(OTP_COOKIE, ticket.cookie, OTP_COOKIE_OPTIONS);
  return response;
}

export async function DELETE(request: NextRequest) {
  const user = sessionFromRequest(request);
  if (user) await logSession(user.id, "logout", {});
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CRM_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
