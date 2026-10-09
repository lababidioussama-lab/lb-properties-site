import { OWNER_EMAIL, audit, hmac, rand, recent, rest, same, type Env } from "./core";

/**
 * The same two-step gate as the CRM, for one person only.
 *  1. Email and password: the password is checked against the owner's CRM
 *     account by the same Supabase helper the CRM uses.
 *  2. A six-digit code emailed to that address, valid ten minutes, one use,
 *     five wrong tries.
 * Cookies here are signed with a different label from the CRM's, so a CRM
 * session can never open the offices (and the reverse).
 */

export const SESSION = "lb_agents";
export const TICKET = "lb_agents_otp";
const SESSION_MS = 10 * 3_600_000;
const TICKET_MS = 10 * 60_000;

const cookie = (name: string, value: string, maxAge: number) => `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
export const readCookie = (req: Request, name: string) => req.headers.get("cookie")?.split(/;\s*/).find((c) => c.startsWith(name + "="))?.slice(name.length + 1) ?? null;

export async function signedIn(req: Request, env: Env): Promise<string | null> {
  const v = readCookie(req, SESSION);
  const p = v?.split(".");
  if (!p || p.length !== 4) return null;
  const [uid, exp, nonce, mac] = p;
  if (!same(mac, await hmac(env.SESSION_SECRET, `agents|${uid}|${exp}|${nonce}`))) return null;
  return Number(exp) > Date.now() ? uid : null;
}

async function verifyPassword(env: Env, password: string, stored: string): Promise<boolean> {
  try {
    const res = await fetch(env.PASSWORD_SERVICE_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }, body: JSON.stringify({ op: "verify", password, stored }), signal: AbortSignal.timeout(8000) });
    return res.ok && ((await res.json()) as { ok?: boolean }).ok === true;
  } catch { return false; }
}

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra } });

async function sendCode(env: Env, code: string, device: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: env.OTP_FROM || "Lababidi Properties <security@lababidiproperties.com>", to: [OWNER_EMAIL],
      subject: `Your AI office code: ${code}`,
      text: `Your sign-in code for the Lababidi AI office is ${code}.\nIt works once and expires in 10 minutes.\nRequested from: ${device}\n\nIf this was not you, do not share the code: someone has your password. Change it in the CRM under Team.`,
    }),
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  return !!res?.ok;
}

const deviceOf = (ua: string) => (/iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows PC" : /Mac/.test(ua) ? "Mac" : "a browser");

export async function login(req: Request, env: Env): Promise<Response> {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return json({ ok: false, error: "bad_origin" }, 403);
  const ip = req.headers.get("cf-connecting-ip") ?? "unknown";
  const ua = (req.headers.get("user-agent") ?? "").slice(0, 160);
  const body = (await req.json().catch(() => ({}))) as { email?: string; password?: string; code?: string };

  /* ---- step 2: the emailed code ---- */
  if (typeof body.code === "string") {
    const t = readCookie(req, TICKET)?.split(".");
    if (!t || t.length !== 4) return json({ ok: false, error: "code_expired" }, 401);
    const [uid, exp, nonce, mac] = t;
    if (!(Number(exp) > Date.now())) return json({ ok: false, error: "code_expired" }, 401);
    const [used, wrong] = await Promise.all([recent(env, "session", "otp_used", { nonce }, 20 * 60_000), recent(env, "session", "otp_failed", { nonce }, 20 * 60_000)]);
    if (used.count > 0) return json({ ok: false, error: "code_expired" }, 401);
    if (wrong.count >= 5) return json({ ok: false, error: "code_locked" }, 401);
    const good = same(mac, await hmac(env.SESSION_SECRET, `agents-otp|${uid}|${exp}|${nonce}|${body.code.trim()}`));
    if (!good) {
      await audit(env, "session", "otp_failed", { nonce, ip, agent: ua, email: OWNER_EMAIL, site: "agents" }, uid);
      return json({ ok: false, error: "code_wrong" }, 401);
    }
    await audit(env, "session", "otp_used", { nonce, site: "agents" }, uid);
    await audit(env, "session", "login", { ip, agent: ua, site: "agents" }, uid);
    const sExp = Date.now() + SESSION_MS;
    const sNonce = rand(6);
    const value = `${uid}.${sExp}.${sNonce}.${await hmac(env.SESSION_SECRET, `agents|${uid}|${sExp}|${sNonce}`)}`;
    const h = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store" });
    h.append("Set-Cookie", cookie(SESSION, value, SESSION_MS / 1000));
    h.append("Set-Cookie", cookie(TICKET, "", 0));
    return new Response(JSON.stringify({ ok: true }), { headers: h });
  }

  /* ---- step 1: email and password ---- */
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 120);
  const password = String(body.password ?? "");
  if (!email || !password) return json({ ok: false, error: "invalid" }, 400);
  const [byEmail, byIp] = await Promise.all([recent(env, "session", "login_failed", { email }, 15 * 60_000), ip === "unknown" ? Promise.resolve({ count: 0, last: 0 }) : recent(env, "session", "login_failed", { ip }, 15 * 60_000)]);
  if (byEmail.count >= 8 || byIp.count >= 20) return json({ ok: false, error: "rate_limited" }, 429);

  const fail = async () => { await audit(env, "session", "login_failed", { email, ip, agent: ua, purpose: "agents" }); return json({ ok: false, error: "invalid_credentials" }, 401); };
  // Only the owner's address exists here. Anything else gets the same answer a wrong password gets.
  if (email !== OWNER_EMAIL) return fail();
  const u = await rest(env, `crm_users?select=id,password_hash,active,role&email=eq.${encodeURIComponent(OWNER_EMAIL)}&limit=1`);
  const row = (Array.isArray(u.data) ? u.data[0] : null) as { id: string; password_hash: string | null; active: boolean; role: string } | null;
  if (!row?.password_hash || !(await verifyPassword(env, password, row.password_hash))) return fail();
  if (!row.active || row.role !== "admin") return json({ ok: false, error: "account_disabled" }, 403);

  const sent = await recent(env, "session", "otp_sent", { site: "agents" }, 15 * 60_000);
  if (sent.count >= 5) return json({ ok: false, error: "rate_limited" }, 429);
  if (Date.now() - sent.last < 30_000) return json({ ok: false, error: "wait" }, 429);

  const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
  const nonce = rand(8);
  const exp = Date.now() + TICKET_MS;
  const ticket = `${row.id}.${exp}.${nonce}.${await hmac(env.SESSION_SECRET, `agents-otp|${row.id}|${exp}|${nonce}|${code}`)}`;
  const [delivered] = await Promise.all([sendCode(env, code, deviceOf(ua)), audit(env, "session", "otp_sent", { nonce, site: "agents" }, row.id)]);
  if (!delivered) return json({ ok: false, error: "email_failed" }, 502);
  return json({ ok: true, step: "otp", hint: "l•••••••••••s@gmail.com" }, 200, { "Set-Cookie": cookie(TICKET, ticket, TICKET_MS / 1000) });
}

export async function logout(): Promise<Response> {
  const h = new Headers({ "Content-Type": "application/json" });
  h.append("Set-Cookie", cookie(SESSION, "", 0));
  return new Response(JSON.stringify({ ok: true }), { headers: h });
}
