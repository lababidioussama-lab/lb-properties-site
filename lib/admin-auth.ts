import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

/**
 * Admin session — a single shared password, signed into an expiring cookie.
 *
 * Deliberately not a user table, not OAuth, not a third-party auth SDK.
 * There is exactly one operator (the agent whose ledger this is), and the
 * only thing behind the gate is his own lead list. A login system with
 * accounts and resets would be more code to keep correct than the thing it
 * protects.
 *
 * What it does still do properly:
 *  - the password is never stored in the cookie, only an HMAC over an expiry
 *  - the cookie is httpOnly, so a script on the page cannot read it
 *  - comparisons are constant-time, so the gate cannot be probed a byte at
 *    a time
 *  - the signing secret is derived from the password itself, so there is no
 *    second secret to configure and forget
 */

export const ADMIN_COOKIE = "dec_admin";

/** Eight hours: long enough for a working day, short enough that a forgotten
    session on a shared machine expires on its own. */
const SESSION_MS = 8 * 60 * 60 * 1000;

function secret(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  // A blank or trivially short password would make the gate decorative.
  if (!password || password.length < 12) return null;
  return password;
}

/** Is the gate usable at all? Distinguishes "wrong password" from
    "nobody has configured one yet", which are very different fixes. */
export function isAdminConfigured(): boolean {
  return secret() !== null;
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("hex");
}

/** Constant-time string compare that does not leak length through timing
    of the comparison itself (length is still observable, which is fine —
    both operands here are fixed-width hex digests or operator input). */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    // Still burn a comparison so a length mismatch is not measurably faster.
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function checkPassword(candidate: unknown): boolean {
  const key = secret();
  if (!key || typeof candidate !== "string") return false;
  return safeEqual(candidate, key);
}

/** `<expiry>.<nonce>.<hmac>` — the nonce means two logins never produce the
    same cookie value, so one cannot be recognised in a log as "the" token. */
export function createSessionValue(): string | null {
  const key = secret();
  if (!key) return null;
  const expiry = Date.now() + SESSION_MS;
  const nonce = randomBytes(8).toString("hex");
  const payload = `${expiry}.${nonce}`;
  return `${payload}.${sign(payload, key)}`;
}

export function verifySessionValue(value: string | undefined | null): boolean {
  const key = secret();
  if (!key || !value) return false;

  const parts = value.split(".");
  if (parts.length !== 3) return false;
  const [expiryRaw, nonce, mac] = parts;

  if (!safeEqual(mac, sign(`${expiryRaw}.${nonce}`, key))) return false;

  const expiry = Number(expiryRaw);
  return Number.isFinite(expiry) && expiry > Date.now();
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MS / 1000,
};
