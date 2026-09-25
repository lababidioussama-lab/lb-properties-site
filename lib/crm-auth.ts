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

function secret(): string | null {
  const s = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  return s && s.length >= 12 ? s : null;
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

export function sessionFromRequest(request: NextRequest): SessionUser | null {
  return readSession(request.cookies.get(CRM_COOKIE)?.value);
}

export async function sessionFromCookies(): Promise<SessionUser | null> {
  return readSession((await cookies()).get(CRM_COOKIE)?.value);
}

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MS / 1000,
};

/** Email + password → session user, or null. Handles owner bootstrap. */
export async function authenticate(email: string, password: string): Promise<SessionUser | null> {
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
  if (!data || !data.active || !verifyPassword(password, data.password_hash as string)) return null;
  return { id: data.id as string, role: data.role as Role };
}
