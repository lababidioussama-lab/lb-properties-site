import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { SessionUser } from "./crm-auth";

/**
 * Second sign-in step: a 6-digit code emailed after the password checks out.
 *
 * The pending sign-in lives in a short-lived, HMAC-signed httpOnly cookie
 * (no database table needed). The cookie carries only a hash of the code,
 * so reading it does not reveal the code.
 */

export const OTP_COOKIE = "lb_crm_otp";
export const OTP_TTL_MS = 10 * 60_000;
const RESEND_COOLDOWN_MS = 30_000;
const MAX_TRIES = 5;

interface Ticket extends SessionUser {
  email: string;
  exp: number;
  iat: number;
  nonce: string;
  h: string;
}

function key(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

const hmac = (k: string, v: string) => createHmac("sha256", k).update(v).digest("hex");

function same(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export const otpDisabled = () => process.env.CRM_OTP_DISABLED === "true";
export const otpConfigured = () => !!process.env.RESEND_API_KEY;

export function issueTicket(user: SessionUser, email: string): { cookie: string; code: string } | null {
  const k = key();
  if (!k) return null;
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const nonce = randomBytes(12).toString("hex");
  const t: Ticket = { ...user, email, iat: Date.now(), exp: Date.now() + OTP_TTL_MS, nonce, h: hmac(k, `${code}.${nonce}.${user.id}`) };
  const body = Buffer.from(JSON.stringify(t)).toString("base64url");
  return { cookie: `${body}.${hmac(k, body)}`, code };
}

export function readTicket(value: string | undefined | null): Ticket | null {
  const k = key();
  if (!k || !value) return null;
  const [body, sig] = value.split(".");
  if (!body || !sig || !same(sig, hmac(k, body))) return null;
  try {
    const t = JSON.parse(Buffer.from(body, "base64url").toString()) as Ticket;
    return t.exp > Date.now() ? t : null;
  } catch {
    return null;
  }
}

const tries = new Map<string, number>();

export function checkCode(t: Ticket, code: string): "ok" | "wrong" | "locked" {
  const k = key();
  const used = tries.get(t.nonce) ?? 0;
  if (!k || used >= MAX_TRIES) return "locked";
  if (same(hmac(k, `${code.trim()}.${t.nonce}.${t.id}`), t.h)) {
    tries.delete(t.nonce);
    return "ok";
  }
  tries.set(t.nonce, used + 1);
  if (tries.size > 5_000) tries.clear();
  return used + 1 >= MAX_TRIES ? "locked" : "wrong";
}

export const canResend = (t: Ticket) => Date.now() - t.iat >= RESEND_COOLDOWN_MS;

export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 1)}${"•".repeat(Math.max(3, name.length - 1))}@${domain}`;
}

export async function sendCode(to: string, code: string): Promise<boolean> {
  const from = process.env.OTP_FROM || "Lababidi Properties CRM <security@lababidiproperties.com>";
  const html = `
  <div style="font-family:Helvetica,Arial,sans-serif;background:#f4f3ef;padding:32px 16px">
    <div style="max-width:440px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e7e5df">
      <div style="background:#0b1a2b;padding:22px 28px;color:#ffffff;letter-spacing:.18em;font-size:15px">LABABIDI <span style="color:#d4b87f;font-size:10px;letter-spacing:.3em">PROPERTIES CRM</span></div>
      <div style="padding:28px">
        <p style="margin:0 0 8px;color:#464c55;font-size:14px">Your sign-in code is</p>
        <p style="margin:0 0 18px;font-size:34px;font-weight:700;letter-spacing:.3em;color:#0b2a4a">${code}</p>
        <p style="margin:0;color:#7b8089;font-size:13px;line-height:1.6">It expires in 10 minutes. If you did not try to sign in, ignore this email and tell your admin — someone may know your password.</p>
      </div>
    </div>
  </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject: `${code} is your Lababidi CRM sign-in code`, html, text: `Your Lababidi CRM sign-in code is ${code}. It expires in 10 minutes.` }),
  }).catch(() => null);
  return !!res?.ok;
}
