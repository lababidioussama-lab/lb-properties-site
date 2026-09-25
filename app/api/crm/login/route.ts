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

/** Count recent session events in the audit log — shared across every server instance. */
async function countRecent(action: string, match: { userId?: string; email?: string; nonce?: string }, withinMs: number) {
  const db = getSupabaseAdmin();
  if (!db) return { count: 0, last: 0 };
  let q = db.from("crm_audit").select("created_at").eq("entity", "session").eq("action", action)
    .gte("created_at", new Date(Date.now() - withinMs).toISOString()).order("created_at", { ascending: false }).limit(50);
  if (match.userId) q = q.eq("user_id", match.userId);
  if (match.email) q = q.eq("detail->>email", match.email);
  if (match.nonce) q = q.eq("detail->>nonce", match.nonce);
  const { data } = await q;
  return { count: data?.length ?? 0, last: data?.[0] ? new Date(data[0].created_at as string).getTime() : 0 };
}

const MAX_CODE_EMAILS = 5;
const MAX_WRONG_PASSWORDS = 8;
const MAX_WRONG_CODES = 5;

/** Send a sign-in code, at most five per account per 15 minutes and one per 30 seconds. */
async function sendLimited(userId: string, email: string, ticket: { code: string; cookie: string }, nonce: string) {
  const sent = await countRecent("otp_sent", { userId }, 15 * 60_000);
  if (sent.count >= MAX_CODE_EMAILS) return "rate_limited";
  if (Date.now() - sent.last < 30_000) return "wait";
  if (!(await sendCode(email, ticket.code))) return "email_failed";
  await logSession(userId, "otp_sent", { nonce });
  return null;
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
  const ip = request.headers.get("x-nf-client-connection-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
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
      if (!next) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
      const problem = await sendLimited(ticket.id, ticket.email, next, readTicket(next.cookie)!.nonce);
      if (problem) return NextResponse.json({ ok: false, error: problem }, { status: problem === "email_failed" ? 502 : 429 });
      const response = NextResponse.json({ ok: true, step: "otp", hint: maskEmail(ticket.email) });
      response.cookies.set(OTP_COOKIE, next.cookie, OTP_COOKIE_OPTIONS);
      return response;
    }

    // A code works once, and five wrong tries lock it — tracked in the database, not in memory.
    if ((await countRecent("otp_used", { nonce: ticket.nonce }, 20 * 60_000)).count > 0) {
      return NextResponse.json({ ok: false, error: "code_expired" }, { status: 401 });
    }
    if ((await countRecent("otp_failed", { nonce: ticket.nonce }, 20 * 60_000)).count >= MAX_WRONG_CODES) {
      return NextResponse.json({ ok: false, error: "code_locked" }, { status: 401 });
    }
    const result = checkCode(ticket, body.code as string);
    if (result !== "ok") {
      await logSession(ticket.id, "otp_failed", { ip, agent, nonce: ticket.nonce });
      return NextResponse.json({ ok: false, error: result === "locked" ? "code_locked" : "code_wrong" }, { status: 401 });
    }
    await logSession(ticket.id, "otp_used", { nonce: ticket.nonce });
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
  const email = body.email.trim().toLowerCase().slice(0, 120);
  if ((await countRecent("login_failed", { email }, 15 * 60_000)).count >= MAX_WRONG_PASSWORDS) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
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
  if (!ticket) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  const problem = await sendLimited(user.id, email, ticket, readTicket(ticket.cookie)!.nonce);
  if (problem) return NextResponse.json({ ok: false, error: problem }, { status: problem === "email_failed" ? 502 : 429 });
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
