import { clientIp as clientAddress } from "@/lib/client";
import { NextResponse, type NextRequest } from "next/server";
import { CRM_COOKIE, DOCS_COOKIE, DOCS_COOKIE_OPTIONS, SESSION_COOKIE_OPTIONS, createDocsSession, authenticate, createSession, isCrmConfigured, sameOrigin, sessionFromRequest, liveUser } from "@/lib/crm-auth";
import { getSupabaseAdmin } from "@/lib/supabase";
import { OTP_COOKIE, OTP_TTL_MS, canResend, checkCode, deviceOf, issueTicket, maskEmail, otpConfigured, otpDisabled, readTicket, sendCode, type OtpPurpose } from "@/lib/crm-otp";
import { geoOf } from "@/lib/visits";
import { securityAlert } from "@/lib/crm-alerts";
import { DS_COOKIE, DS_COOKIE_OPTIONS, audit as dsAudit, createDsSession, getSettings as dsSettings } from "@/lib/dbsearch/guard";

const OTP_COOKIE_OPTIONS = { ...SESSION_COOKIE_OPTIONS, maxAge: OTP_TTL_MS / 1000 };

/** Sign-ins land in the audit log so the admin can see who uses the CRM and when. */
async function logSession(userId: string | null, action: string, detail: Record<string, unknown>) {
  await getSupabaseAdmin()?.from("crm_audit").insert({ user_id: userId, entity: "session", entity_id: userId, action, detail });
}

/** Count recent session events in the audit log — shared across every server instance. */
async function countRecent(action: string, match: { userId?: string; email?: string; nonce?: string; ip?: string }, withinMs: number) {
  const db = getSupabaseAdmin();
  if (!db) return { count: 0, last: 0 };
  let q = db.from("crm_audit").select("created_at").eq("entity", "session").eq("action", action)
    .gte("created_at", new Date(Date.now() - withinMs).toISOString()).order("created_at", { ascending: false }).limit(50);
  if (match.userId) q = q.eq("user_id", match.userId);
  if (match.email) q = q.eq("detail->>email", match.email);
  if (match.nonce) q = q.eq("detail->>nonce", match.nonce);
  if (match.ip) q = q.eq("detail->>ip", match.ip);
  const { data } = await q;
  return { count: data?.length ?? 0, last: data?.[0] ? new Date(data[0].created_at as string).getTime() : 0 };
}

const MAX_CODE_EMAILS = 5;
const MAX_WRONG_PASSWORDS = 8;
const MAX_WRONG_CODES = 5;
/* One address trying many accounts: each account's own limit never trips, so the address has one too. */
const MAX_WRONG_FROM_ADDRESS = 20;
const ALERT_AT_WRONG_PASSWORDS = 5;

/** Send a sign-in code, at most five per account per 15 minutes and one per 30 seconds. */
async function sendLimited(userId: string, email: string, ticket: { code: string; cookie: string }, nonce: string, purpose: OtpPurpose = "crm", device?: string) {
  const sent = await countRecent("otp_sent", { userId }, 15 * 60_000);
  if (sent.count >= MAX_CODE_EMAILS) return "rate_limited";
  if (Date.now() - sent.last < 30_000) return "wait";
  // The email and its note are sent side by side: each is a round trip, and the sign-in must answer within the host's ten seconds.
  const [delivered] = await Promise.all([sendCode(email, ticket.code, purpose, { device }), logSession(userId, "otp_sent", { nonce, purpose })]);
  return delivered ? null : "email_failed";
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
  if (!sameOrigin(request)) return NextResponse.json({ ok: false, error: "bad_origin" }, { status: 403 });
  if (!isCrmConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  const ip = clientAddress(request.headers);
  if (throttled(ip)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: unknown; password?: unknown; code?: unknown; resend?: unknown; purpose?: unknown };
  /* The same two steps open the Documents suite, but for the admin only, and
     the second step hands out a Documents session instead of a CRM one. */
  const purpose: OtpPurpose = body.purpose === "documents" ? "documents" : body.purpose === "dbsearch" ? "dbsearch" : "crm";
  const agent = request.headers.get("user-agent")?.slice(0, 160) ?? null;
  const device = deviceOf(agent);
  const geo = geoOf(request.headers);
  const place = [geo.city, geo.country].filter(Boolean).join(", ") || null;

  /** The cookie that step 2 sets, depending on what the code was issued for. */
  const signedIn = (user: { id: string; role: "admin" | "agent" }, forWhat: OtpPurpose) => {
    const response = NextResponse.json({ ok: true });
    if (forWhat === "documents") {
      const value = createDocsSession(user.id);
      if (!value) return null;
      response.cookies.set(DOCS_COOKIE, value, DOCS_COOKIE_OPTIONS);
    } else if (forWhat === "dbsearch") {
      const value = createDsSession(user);
      if (!value) return null;
      response.cookies.set(DS_COOKIE, value, DS_COOKIE_OPTIONS);
    } else {
      const value = createSession(user);
      if (!value) return null;
      response.cookies.set(CRM_COOKIE, value, SESSION_COOKIE_OPTIONS);
    }
    return response;
  };

  /* DB Search opens from inside the CRM, for the person already signed in
     there, and only if the admin has given them access. */
  const dbSearchRefusal = async (user: { id: string; role: "admin" | "agent" }) => {
    if (sessionFromRequest(request)?.id !== user.id) return "crm_session_required";
    if (user.role === "admin") return null;
    const s = await dsSettings(getSupabaseAdmin()!, user.id);
    if (!s.access) return "no_access";
    if (s.lockedAt) return "locked";
    return null;
  };

  // Step 2: the emailed code.
  if (typeof body.code === "string" || body.resend === true) {
    const ticket = readTicket(request.cookies.get(OTP_COOKIE)?.value);
    if (!ticket) return NextResponse.json({ ok: false, error: "code_expired" }, { status: 401 });

    if (body.resend === true) {
      if (!canResend(ticket)) return NextResponse.json({ ok: false, error: "wait" }, { status: 429 });
      const next = issueTicket({ id: ticket.id, role: ticket.role }, ticket.email, ticket.p);
      if (!next) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
      const problem = await sendLimited(ticket.id, ticket.email, next, readTicket(next.cookie)!.nonce, ticket.p, device);
      if (problem) return NextResponse.json({ ok: false, error: problem }, { status: problem === "email_failed" ? 502 : 429 });
      const response = NextResponse.json({ ok: true, step: "otp", hint: maskEmail(ticket.email) });
      response.cookies.set(OTP_COOKIE, next.cookie, OTP_COOKIE_OPTIONS);
      return response;
    }

    // A code works once, and five wrong tries lock it — tracked in the database, not in memory.
    const [usedBefore, wrongBefore] = await Promise.all([
      countRecent("otp_used", { nonce: ticket.nonce }, 20 * 60_000),
      countRecent("otp_failed", { nonce: ticket.nonce }, 20 * 60_000),
    ]);
    if (usedBefore.count > 0) {
      return NextResponse.json({ ok: false, error: "code_expired" }, { status: 401 });
    }
    if (wrongBefore.count >= MAX_WRONG_CODES) {
      return NextResponse.json({ ok: false, error: "code_locked" }, { status: 401 });
    }
    const result = checkCode(ticket, body.code as string);
    if (result !== "ok") {
      await logSession(ticket.id, "otp_failed", { ip, agent, nonce: ticket.nonce, email: ticket.email, ...geo });
      /* Five wrong codes means the password was right and the code was not:
         somebody else holds that password. The owner hears about it at once. */
      if (result === "locked") {
        await securityAlert(`code:${ticket.email}`, `Someone has the password of ${ticket.email}`, [["Account", ticket.email], ["From", place], ["Address", ip], ["Device", device]],
          "The right password was entered, then five wrong emailed codes. The code stopped them, but the password is known to someone else. Change that password now from Team, or ask the person to change it.");
      }
      return NextResponse.json({ ok: false, error: result === "locked" ? "code_locked" : "code_wrong" }, { status: 401 });
    }
    await logSession(ticket.id, "otp_used", { nonce: ticket.nonce });
    const forWhat: OtpPurpose = ticket.p === "documents" ? "documents" : ticket.p === "dbsearch" ? "dbsearch" : "crm";
    if (forWhat === "dbsearch") {
      const refusal = await dbSearchRefusal({ id: ticket.id, role: ticket.role });
      if (refusal) return NextResponse.json({ ok: false, error: refusal }, { status: 403 });
    }
    const response = signedIn({ id: ticket.id, role: ticket.role }, forWhat);
    if (!response) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
    await logSession(ticket.id, forWhat === "documents" ? "docs_login" : forWhat === "dbsearch" ? "ds_login" : "login", { ip, agent, ...geo });
    if (forWhat === "dbsearch") await dsAudit(getSupabaseAdmin()!, { id: ticket.id }, "signin", { detail: { device }, request });
    response.cookies.set(OTP_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
    return response;
  }

  // Step 1: email and password.
  if (typeof body.email !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }
  const email = body.email.trim().toLowerCase().slice(0, 120);
  const [wrongForEmail, wrongFromAddress] = await Promise.all([
    countRecent("login_failed", { email }, 15 * 60_000),
    ip === "unknown" ? Promise.resolve({ count: 0, last: 0 }) : countRecent("login_failed", { ip }, 15 * 60_000),
  ]);
  if (wrongForEmail.count >= MAX_WRONG_PASSWORDS) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  if (wrongFromAddress.count >= MAX_WRONG_FROM_ADDRESS) {
    if ((await countRecent("blocked_address", { ip }, 15 * 60_000)).count === 0) {
      await logSession(null, "blocked_address", { ip, agent, ...geo });
      await securityAlert(`address:${ip}`, "An address is attacking the CRM sign-in", [["Address", ip], ["From", place], ["Device", device], ["Last account tried", email]],
        "More than twenty wrong passwords came from one address in fifteen minutes. That address is now refused for fifteen minutes at a time. Nobody got in. No action is needed unless it keeps returning.");
    }
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  const user = await authenticate(email, body.password);
  if (user === "disabled") {
    return NextResponse.json({ ok: false, error: "account_disabled" }, { status: 403 });
  }
  if (!user) {
    await logSession(null, "login_failed", { email: email.slice(0, 120), ip, purpose, agent, ...geo });
    if ((await countRecent("login_failed", { email }, 15 * 60_000)).count >= ALERT_AT_WRONG_PASSWORDS
      // Only for a real account: guesses at invented addresses are shown on the Security screen, not emailed.
      && (await getSupabaseAdmin()?.from("crm_users").select("id").eq("email", email).maybeSingle())?.data) {
      await securityAlert(`password:${email}`, `Repeated wrong passwords for ${email}`, [["Account", email], ["From", place], ["Address", ip], ["Device", device]],
        "Five wrong passwords in fifteen minutes. After eight the account is paused for fifteen minutes. If this was not the account's owner, nothing was opened: the password was never guessed.");
    }
    return NextResponse.json({ ok: false, error: "invalid_credentials" }, { status: 401 });
  }
  // Agents have their own CRM login, but the Documents suite is the owner's.
  if (purpose === "documents" && user.role !== "admin") {
    await logSession(user.id, "docs_denied", { ip, agent, ...geo });
    return NextResponse.json({ ok: false, error: "admin_only" }, { status: 403 });
  }
  /* Company documents always ask for their own emailed code, even when the
     admin is already signed in to the CRM: one email and password, then a
     "Documents sign-in" code that opens only the Documents. */
  if (purpose === "dbsearch") {
    const refusal = await dbSearchRefusal(user);
    if (refusal) {
      await logSession(user.id, "ds_denied", { ip, agent, reason: refusal, ...geo });
      return NextResponse.json({ ok: false, error: refusal }, { status: 403 });
    }
  }

  /* CRM_OTP_DISABLED only ever skips the code for the CRM itself. DB Search
     and Company documents always ask for theirs, whatever the setting. */
  if (otpDisabled() && purpose === "crm") {
    const response = signedIn(user, purpose);
    if (!response) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
    await logSession(user.id, "login", { ip, agent, otp: false, ...geo });
    return response;
  }

  if (!otpConfigured()) return NextResponse.json({ ok: false, error: "otp_not_configured" }, { status: 503 });
  const ticket = issueTicket(user, email, purpose);
  if (!ticket) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  const problem = await sendLimited(user.id, email, ticket, readTicket(ticket.cookie)!.nonce, purpose, device);
  if (problem) return NextResponse.json({ ok: false, error: problem }, { status: problem === "email_failed" ? 502 : 429 });
  const response = NextResponse.json({ ok: true, step: "otp", hint: maskEmail(email) });
  response.cookies.set(OTP_COOKIE, ticket.cookie, OTP_COOKIE_OPTIONS);
  return response;
}

export async function DELETE(request: NextRequest) {
  const user = sessionFromRequest(request);
  if (user) await logSession(user.id, "logout", {});
  const response = NextResponse.json({ ok: true });
  // One sign-out closes all three: the CRM, DB Search and Company documents.
  for (const name of [CRM_COOKIE, DS_COOKIE, DOCS_COOKIE]) response.cookies.set(name, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
