import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

/**
 * Password hashing (scrypt).
 *
 * Hashing a password is deliberately heavy work, about 40 ms of computing.
 * That is fine on an ordinary server, but Cloudflare's free plan allows about
 * 10 ms per request, so there the work is done by a small Supabase Edge
 * Function instead (supabase/functions/password): this server sends it the
 * password over HTTPS with a shared secret, and it answers. Waiting for that
 * answer costs no computing time here. Without PASSWORD_SERVICE_URL the work
 * is done locally, as before, with the same hash format, so nothing stored
 * changes and either side can check the other's hashes.
 */

const serviceUrl = () => process.env.PASSWORD_SERVICE_URL;
const serviceKey = () => process.env.PASSWORD_SERVICE_SECRET;

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) {
    timingSafeEqual(x, x);
    return false;
  }
  return timingSafeEqual(x, y);
}

async function ask(body: Record<string, string>): Promise<Record<string, unknown>> {
  const res = await fetch(serviceUrl()!, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-hash-secret": serviceKey() ?? "" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`password service answered ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

const remote = () => !!serviceUrl() && !!serviceKey();

export async function hashPassword(password: string): Promise<string> {
  if (remote()) {
    const out = await ask({ op: "hash", password });
    if (typeof out.hash !== "string") throw new Error("password service gave no hash");
    return out.hash;
  }
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

/** True only when the password matches. Any failure of the service counts as "no", never as "yes". */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (remote()) {
    try {
      return (await ask({ op: "verify", password, stored })).ok === true;
    } catch (e) {
      console.error("[password] service unavailable:", e instanceof Error ? e.message : e);
      return false;
    }
  }
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  return same(scryptSync(password, salt, 64).toString("hex"), hash);
}
