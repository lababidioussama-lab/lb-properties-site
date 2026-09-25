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
  return { id, role };
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
  const { data } = await db.from("crm_users").select("role, active").eq("id", session.id).maybeSingle();
  if (!data || !data.active) return null;
  return { id: session.id, role: data.role === "admin" ? "admin" : "agent" };
}

export async function sessionFromCookies(): Promise<SessionUser | null> {
  return liveUser(readSession((await cookies()).get(CRM_COOKIE)?.value));
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MS / 1000,
};

/** Email + password → session user, or null. Handles owner bootstrap. */
export async function authenticate(email: string, password: string): Promise<SessionUser | "disabled" | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const normalized = email.trim().toLowerCase();

  const ownerEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const ownerPassword = process.env.ADMIN_PASSWORD;
  if (ownerEmail && ownerPassword && normalized === ownerEmail && safeEqual(password, ownerPassword)) {
    const { data } = await supabase
      .from("crm_users")
      .upsert(
        { email: ownerEmail, full_name: "Owner", role: "admin", active: true, password_hash: hashPassword(ownerPassword) },
        { onConflict: "email", ignoreDuplicates: false },
      )
      .select("id")
      .single();
    return data ? { id: data.id as string, role: "admin" } : null;
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
