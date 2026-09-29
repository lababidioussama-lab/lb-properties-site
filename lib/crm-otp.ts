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

/** What the code opens. Carried in the ticket so the second step knows
    which session to hand out, and named in the email so the owner can tell
    a Documents code from a CRM one at a glance. */
export type OtpPurpose = "crm" | "documents" | "dbsearch";

interface Ticket extends SessionUser {
  email: string;
  p?: OtpPurpose;
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

export function issueTicket(user: SessionUser, email: string, purpose: OtpPurpose = "crm"): { cookie: string; code: string } | null {
  const k = key();
  if (!k) return null;
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const nonce = randomBytes(12).toString("hex");
  const t: Ticket = { ...user, email, p: purpose, iat: Date.now(), exp: Date.now() + OTP_TTL_MS, nonce, h: hmac(k, `${code}.${nonce}.${user.id}`) };
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

/* What each kind of code is called in its email, so a Documents or DB Search
   code is never mistaken for an ordinary CRM one. */
const PURPOSE_COPY: Record<OtpPurpose, { label: string; name: string; scope: string }> = {
  crm: { label: "PROPERTIES CRM", name: "CRM sign-in", scope: "" },
  documents: { label: "DOCUMENTS SIGN-IN", name: "Documents sign-in", scope: "It opens the Documents suite only. If you did not try to open the Documents, someone has the admin password — change it now." },
  dbsearch: { label: "DB SEARCH SIGN-IN", name: "DB Search sign-in", scope: "It opens DB Search only. If you did not try to open DB Search, someone knows your password: change it now and tell your admin." },
};

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** "Chrome on Windows" from a user-agent string — enough for the owner to recognise their own device. */
export function deviceOf(ua: string | null | undefined): string {
  const s = String(ua ?? "");
  const browser = /Edg\//.test(s) ? "Edge" : /OPR\//.test(s) ? "Opera" : /Chrome\//.test(s) ? "Chrome" : /Firefox\//.test(s) ? "Firefox" : /Safari\//.test(s) ? "Safari" : "a browser";
  const os = /iPhone|iPad/.test(s) ? "iPhone" : /Android/.test(s) ? "Android" : /Windows/.test(s) ? "Windows" : /Mac OS X/.test(s) ? "Mac" : /Linux/.test(s) ? "Linux" : "an unknown device";
  return `${browser} on ${os}`;
}

export async function sendCode(to: string, code: string, purpose: OtpPurpose = "crm", context?: { device?: string }): Promise<boolean> {
  const copy = PURPOSE_COPY[purpose];
  const special = purpose !== "crm";
  const docs = special;
  const from = process.env.OTP_FROM || "Lababidi Properties CRM <security@lababidiproperties.com>";
  const label = copy.label;
  const lead = special ? `Your <strong>${copy.name}</strong> code is` : "Your sign-in code is";
  const when = new Date().toLocaleString("en-GB", { timeZone: "Asia/Dubai", weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const details = special
    ? `<table style="width:100%;border-collapse:collapse;font-size:13px;color:#464c55;margin:0 0 18px"><tr><td style="padding:5px 0;color:#62676f;width:100px">Account</td><td style="padding:5px 0">${esc(to)}</td></tr><tr><td style="padding:5px 0;color:#62676f">Requested</td><td style="padding:5px 0">${esc(when)} (Dubai)</td></tr>${context?.device ? `<tr><td style="padding:5px 0;color:#62676f">From</td><td style="padding:5px 0">${esc(context.device)}</td></tr>` : ""}</table>`
    : "";
  const warn = special
    ? `It expires in 10 minutes. ${copy.scope}`
    : "It expires in 10 minutes. If you did not try to sign in, ignore this email and tell your admin — someone may know your password.";
  const subject = `${code} is your Lababidi ${special ? copy.name.replace(" sign-in", "") : "CRM"} sign-in code`;
  const text = `${special ? copy.name + ". " : ""}Your Lababidi ${special ? copy.name.replace(" sign-in", "") : "CRM"} sign-in code is ${code}. It expires in 10 minutes.`;
  const html = `
  <div style="font-family:Helvetica,Arial,sans-serif;background:#f4f3ef;padding:32px 16px">
    <div style="max-width:440px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e7e5df">
      <div style="background:#0b1a2b;padding:22px 28px;color:#ffffff;letter-spacing:.18em;font-size:15px">LABABIDI <span style="color:#d4b87f;font-size:10px;letter-spacing:.3em">${label}</span></div>
      <div style="padding:28px">
        ${docs ? `<p style="margin:0 0 16px;display:inline-block;background:#f6efe0;color:#8a6a2f;font-size:11px;font-weight:700;letter-spacing:.14em;padding:5px 10px;border-radius:4px">${label}</p>` : ""}
        <p style="margin:0 0 8px;color:#464c55;font-size:14px">${lead}</p>
        <p style="margin:0 0 18px;font-size:34px;font-weight:700;letter-spacing:.3em;color:#0b2a4a">${code}</p>
        ${details}
        <p style="margin:0;color:#7b8089;font-size:13px;line-height:1.6">${warn}</p>
      </div>
    </div>
  </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  }).catch(() => null);
  return !!res?.ok;
}
