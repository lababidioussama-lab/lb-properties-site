import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { getSupabaseAdmin } from "./supabase";

/**
 * CRM accounts: one row per person in crm_users, scrypt-hashed passwords,
 * and an HMAC-signed httpOnly session cookie carrying the user id and role.
 *
 * The owner bootstraps the first admin with ADMIN_EMAIL + ADMIN_PASSWORD in
 * the environment; signing in with those creates (or refreshes) that admin
 * row. Agents are then created from the Team screen.
 */

export const CRM_COOKIE = "lb_crm";
const SESSION_MS = 10 * 60 * 60 * 1000;

export type Role = "admin" | "agent";
export interface SessionUser {
  id: string;
  role: Role;
  /** When the session was opened (ms). Absent on a user made in code. */
  iat?: number;
}

/* A dedicated secret only. Falling back to ADMIN_PASSWORD would let anyone
   who learns the owner password forge an admin session and skip the
   emailed code. */
function secret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

export function isCrmConfigured(): boolean {
  return secret() !== null && !!process.env.ADMIN_EMAIL;
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) {
    timingSafeEqual(x, x);
    return false;
  }
  return timingSafeEqual(x, y);
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

const DUMMY_HASH = `${"0".repeat(32)}:${"0".repeat(128)}`;

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  return safeEqual(scryptSync(password, salt, 64).toString("hex"), hash);
}

const sign = (payload: string, key: string) =>
  createHmac("sha256", key).update(payload).digest("hex");

export function createSession(user: SessionUser): string | null {
  const key = secret();
  if (!key) return null;
  const payload = `${user.id}.${user.role}.${Date.now() + SESSION_MS}.${randomBytes(6).toString("hex")}`;
  return `${payload}.${sign(payload, key)}`;
}

export function readSession(value: string | undefined | null): SessionUser | null {
  const key = secret();
  if (!key || !value) return null;
  const parts = value.split(".");
  if (parts.length !== 5) return null;
  const [id, role, expiry, nonce, mac] = parts;
  if (!safeEqual(mac, sign(`${id}.${role}.${expiry}.${nonce}`, key))) return null;
  if (!(Number(expiry) > Date.now())) return null;
  if (role !== "admin" && role !== "agent") return null;
  return { id, role, iat: Number(expiry) - SESSION_MS };
}

/** Reject state-changing requests sent from another site (CSRF defence on top of SameSite). */
export function sameOrigin(request: NextRequest): boolean {
  if (request.method === "GET" || request.method === "HEAD") return true;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

export function sessionFromRequest(request: NextRequest): SessionUser | null {
  return readSession(request.cookies.get(CRM_COOKIE)?.value);
}

/** The cookie proves who signed in; the database decides what they can do
    now. A deactivated or demoted user loses access on their next request
    rather than when their 10-hour cookie runs out. */
export async function liveUser(session: SessionUser | null): Promise<SessionUser | null> {
  if (!session) return null;
  const db = getSupabaseAdmin();
  if (!db) return null;
  const [{ data }, cut] = await Promise.all([
    db.from("crm_users").select("role, active").eq("id", session.id).maybeSingle(),
    sessionCut(session.id),
  ]);
  if (!data || !data.active) return null;
  // "Sign out everywhere" and password changes end every session opened before them.
  if (cut && session.iat != null && session.iat < cut) return null;
  return { id: session.id, role: data.role === "admin" ? "admin" : "agent" };
}

/* "Sign out everywhere": a moment per person, kept in crm_audit (entity
   "session_cut") like the DB Search settings, so nothing new is stored in the
   schema. Sessions opened before it stop working. Cached briefly so a page
   load does not ask for it on every request. */
const cuts = new Map<string, { read: number; cut: number }>();
async function sessionCut(userId: string): Promise<number> {
  const hit = cuts.get(userId);
  if (hit && Date.now() - hit.read < 20_000) return hit.cut;
  const { data } = await getSupabaseAdmin()!.from("crm_audit").select("created_at")
    .eq("entity", "session_cut").eq("entity_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const cut = data?.created_at ? new Date(data.created_at as string).getTime() : 0;
  if (cuts.size > 500) cuts.clear();
  cuts.set(userId, { read: Date.now(), cut });
  return cut;
}

/** End every CRM, DB Search and Documents session this person has open. */
export async function cutSessions(userId: string, actorId: string | null, why: string) {
  // The moment is ours, not the database's, so a session made a few ms later is safely after it.
  const at = new Date();
  await getSupabaseAdmin()?.from("crm_audit").insert({ user_id: actorId, entity: "session_cut", entity_id: userId, action: "cut", detail: { why }, created_at: at.toISOString() });
  cuts.set(userId, { read: Date.now(), cut: at.getTime() });
}

export async function sessionFromCookies(): Promise<SessionUser | null> {
  return liveUser(readSession((await cookies()).get(CRM_COOKIE)?.value));
}

/* The Documents suite has its own, shorter session, opened by its own
   emailed code. The token starts with "docs." so it can never be read as a
   CRM session (whose second part must be a role), nor a CRM token as this. */
export const DOCS_COOKIE = "lb_docs";
const DOCS_MS = 4 * 60 * 60 * 1000;

export function createDocsSession(userId: string): string | null {
  const key = secret();
  if (!key) return null;
  const payload = `docs.${userId}.${Date.now() + DOCS_MS}.${randomBytes(6).toString("hex")}`;
  return `${payload}.${sign(payload, key)}`;
}

export function readDocsSession(value: string | undefined | null): SessionUser | null {
  const key = secret();
  if (!key || !value) return null;
  const parts = value.split(".");
  if (parts.length !== 5 || parts[0] !== "docs") return null;
  const [, id, expiry, nonce, mac] = parts;
  if (!safeEqual(mac, sign(`docs.${id}.${expiry}.${nonce}`, key))) return null;
  if (!(Number(expiry) > Date.now())) return null;
  return { id, role: "admin", iat: Number(expiry) - DOCS_MS };
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MS / 1000,
};

export const DOCS_COOKIE_OPTIONS = { ...SESSION_COOKIE_OPTIONS, maxAge: DOCS_MS / 1000 };

/** Email + password → session user, or null. Handles owner bootstrap. */
export async function authenticate(email: string, password: string): Promise<SessionUser | "disabled" | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const normalized = email.trim().toLowerCase();

  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const ownerPassword = process.env.ADMIN_PASSWORD;
  if (ownerEmail && ownerPassword && normalized === ownerEmail) {
    /* The setup password (ADMIN_PASSWORD) is the owner's FIRST key, not a
       permanent one: it creates the owner's account, and keeps working only
       until he changes his password in the CRM. After that only the new
       password opens the account, so anyone who once learned the setup
       password is locked out. ADMIN_PASSWORD_RESET=true is the break-glass:
       set it on the server to let the setup password in again. */
    const { data: existing } = await supabase.from("crm_users").select("id, password_hash").eq("email", ownerEmail).maybeSingle();
    const stored = (existing as { password_hash?: string | null } | null)?.password_hash ?? null;
    const stillSetup = !stored || verifyPassword(ownerPassword, stored);
    const breakGlass = process.env.ADMIN_PASSWORD_RESET === "true";
    if ((stillSetup || breakGlass || !existing) && safeEqual(password, ownerPassword)) {
      /* Update in place when the row exists: an upsert rewrote full_name to
         "Owner" on every sign-in, wiping the name set in My profile. The hash
         is written only when there is none or on break-glass, so signing in
         never overwrites a password he has since changed. */
      const fields: Record<string, unknown> = { role: "admin", active: true };
      if (!stored || breakGlass) fields.password_hash = hashPassword(ownerPassword);
      const { data } = existing
        ? await supabase.from("crm_users").update(fields).eq("id", (existing as { id: string }).id).select("id").single()
        : await supabase.from("crm_users").insert({ email: ownerEmail, full_name: "Owner", ...fields, password_hash: hashPassword(ownerPassword) }).select("id").single();
      return data ? { id: data.id as string, role: "admin" } : null;
    }
  }

  const { data } = await supabase
    .from("crm_users")
    .select("id, role, password_hash, active")
    .eq("email", normalized)
    .maybeSingle();
  // Hash even for unknown emails so response time does not reveal which accounts exist.
  const valid = verifyPassword(password, (data?.password_hash as string) ?? DUMMY_HASH);
  if (!data || !valid) return null;
  // Only someone who knows the password learns the account is switched off.
  if (!data.active) return "disabled";
  return { id: data.id as string, role: data.role as Role };
}
