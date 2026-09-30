import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "@/lib/supabase";
import { SESSION_COOKIE_OPTIONS, liveUser, sameOrigin, sessionFromRequest, type Role } from "@/lib/crm-auth";

/**
 * Every gate DB Search in the CRM passes through, in one file.
 *
 *  1. A CRM session (the normal sign-in).
 *  2. A separate DB Search session for the SAME person, opened with their
 *     email, password and a code emailed as a "DB Search sign-in". It lasts
 *     two hours at most and ends after twenty idle minutes.
 *  3. The account is active, has DB Search access (admins always do) and
 *     is not locked.
 *  4. Daily limits per action, counted from the audit trail.
 *  5. Automatic lock on bursts that look like scraping.
 *  6. Record handles are signed and tied to the user, so nobody can ask the
 *     API for an owner they were never shown.
 */

export const DS_COOKIE = "lb_ds";
const DS_ABS_MS = 2 * 60 * 60 * 1000;
const DS_IDLE_MS = 20 * 60 * 1000;
const REF_MS = 2 * 60 * 60 * 1000;

function secret(): string | null {
  const s = process.env.SESSION_SECRET;
  return s && s.length >= 32 ? s : null;
}

const mac = (payload: string, key: string) => createHmac("sha256", key).update(payload).digest("base64url");

function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/* ------------------------------------------------------------ session */

interface DsSession { id: string; role: Role; abs: number; idle: number }

function sign(s: DsSession): string | null {
  const key = secret();
  if (!key) return null;
  const payload = `ds.${s.id}.${s.role}.${s.abs}.${s.idle}.${randomBytes(6).toString("hex")}`;
  return `${payload}.${mac(payload, key)}`;
}

export function createDsSession(user: { id: string; role: Role }): string | null {
  const now = Date.now();
  return sign({ id: user.id, role: user.role, abs: now + DS_ABS_MS, idle: now + DS_IDLE_MS });
}

export function readDsSession(value: string | undefined | null): DsSession | null {
  const key = secret();
  if (!key || !value) return null;
  const parts = value.split(".");
  if (parts.length !== 7 || parts[0] !== "ds") return null;
  const [, id, role, abs, idle, nonce, m] = parts;
  if (!same(m, mac(`ds.${id}.${role}.${abs}.${idle}.${nonce}`, key))) return null;
  const now = Date.now();
  if (!(Number(abs) > now) || !(Number(idle) > now)) return null;
  if (role !== "admin" && role !== "agent") return null;
  return { id, role, abs: Number(abs), idle: Number(idle) };
}

export const DS_COOKIE_OPTIONS = { ...SESSION_COOKIE_OPTIONS, maxAge: DS_ABS_MS / 1000 };

/* ------------------------------------------------------------ record handles */

/**
 * A handle for one owner record: which owner ids it covers, for whom, until
 * when. It may also carry what the card showed — the name and place in the
 * clear (signed, so they cannot be edited) and the email sealed with
 * AES-GCM, so a reveal returns exactly what the card had and nothing else.
 *
 * Ids are owners.id values, or `k:<ou_key>` for owner_units rows that have
 * no owners.id yet (DB Search's reveal_phones takes either).
 */
export interface RefInfo { ids: string[]; name?: string; where?: string; nat?: string; email?: string }

const sealKey = (key: string) => createHash("sha256").update(`${key}:ds-ref-seal`).digest();

function seal(text: string, key: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", sealKey(key), iv);
  const out = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), out]).toString("base64url");
}

function unseal(blob: string, key: string): string | null {
  try {
    const b = Buffer.from(blob, "base64url");
    const d = createDecipheriv("aes-256-gcm", sealKey(key), b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export function signRef(userId: string, ids: (string | number)[], extra?: { name?: string | null; where?: string | null; nat?: string | null; email?: string | null }): string {
  const key = secret() ?? "";
  const payload: Record<string, unknown> = { u: userId, i: ids.map(String).slice(0, 12), e: Date.now() + REF_MS };
  if (extra?.name) payload.n = extra.name.slice(0, 120);
  if (extra?.where) payload.w = extra.where.slice(0, 200);
  if (extra?.nat) payload.t = extra.nat.slice(0, 80);
  if (extra?.email && key) payload.m = seal(extra.email.slice(0, 200), key);
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${mac(body, key)}`;
}

const REF_ID = /^(-?\d{1,19}|k:.{1,300})$/;

export function readRefInfo(ref: unknown, userId: string): RefInfo | null {
  const key = secret();
  if (!key || typeof ref !== "string" || ref.length > 3000) return null;
  const [body, m] = ref.split(".");
  if (!body || !m || !same(m, mac(body, key))) return null;
  try {
    const r = JSON.parse(Buffer.from(body, "base64url").toString()) as { u: string; i: string[]; e: number; n?: string; w?: string; t?: string; m?: string };
    if (r.u !== userId || !(r.e > Date.now()) || !Array.isArray(r.i) || !r.i.length) return null;
    const ids = r.i.filter((x) => REF_ID.test(x));
    if (!ids.length) return null;
    return { ids, name: r.n, where: r.w, nat: r.t, email: r.m ? unseal(r.m, key) ?? undefined : undefined };
  } catch {
    return null;
  }
}

export function readRef(ref: unknown, userId: string): string[] | null {
  return readRefInfo(ref, userId)?.ids ?? null;
}

/** owners.id values only — the `k:` handles are not rows of `owners`. */
export const numericIds = (ids: string[]) => ids.filter((x) => /^-?\d{1,19}$/.test(x));

/* ------------------------------------------------------------ storage

   Nothing new is added to the database. Both the audit trail and each
   agent's DB Search settings live in the CRM's own crm_audit table:

     entity "dbsearch"     one row per action; entity_id = the agent
     entity "ds_settings"  a full snapshot of an agent's access, limits and
                           lock state; the newest row is the one in force,
                           and the older ones are the history of changes

   Only server code writes crm_audit, always with fixed entity names, so no
   request can forge a settings row. */

export interface DsSettings {
  access: boolean;
  searches: number;
  reveals: number;
  lists: number;
  lockedAt: string | null;
  lockReason: string | null;
}
const DEFAULT_SETTINGS: DsSettings = { access: false, searches: 200, reveals: 40, lists: 50, lockedAt: null, lockReason: null };

export async function getSettings(db: SupabaseClient, userId: string): Promise<DsSettings> {
  const { data } = await db.from("crm_audit").select("detail")
    .eq("entity", "ds_settings").eq("entity_id", userId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return { ...DEFAULT_SETTINGS, ...((data?.detail as Partial<DsSettings> | null) ?? {}) };
}

export async function putSettings(db: SupabaseClient, actorId: string | null, userId: string, patch: Partial<DsSettings>): Promise<DsSettings> {
  const next = { ...(await getSettings(db, userId)), ...patch };
  await db.from("crm_audit").insert({ user_id: actorId, entity: "ds_settings", entity_id: userId, action: "update", detail: next });
  return next;
}

/* ------------------------------------------------------------ audit + limits */

export type DsAction = "signin" | "signout" | "search" | "open" | "reveal" | "unit" | "portfolio" | "area" | "market" | "check" | "brokers" | "to_lead" | "to_contact" | "to_temp" | "denied" | "locked" | "admin";

/** Every lookup counts towards the daily search limit. */
export const LOOKUPS: DsAction[] = ["search", "unit", "portfolio", "area", "market", "check", "brokers"];

export interface DsUser {
  id: string;
  role: Role;
  name: string;
  limits: { searches: number; reveals: number; lists: number };
}

const clientIp = (r: NextRequest) =>
  r.headers.get("x-nf-client-connection-ip") ?? r.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;

export async function audit(db: SupabaseClient, user: { id: string }, action: DsAction, fields: { query?: string | null; target?: string | null; detail?: Record<string, unknown>; request?: NextRequest } = {}) {
  await db.from("crm_audit").insert({
    user_id: user.id,
    entity: "dbsearch",
    entity_id: user.id,
    action,
    detail: {
      ...(fields.detail ?? {}),
      query: fields.query?.slice(0, 300) ?? null,
      target: fields.target?.slice(0, 300) ?? null,
      ip: fields.request ? clientIp(fields.request) : null,
    },
  });
}

/** Midnight in Dubai (UTC+4, no daylight saving) — the day the limits reset on. */
export function dubaiMidnight(): string {
  const now = Date.now() + 4 * 3_600_000;
  const day = Math.floor(now / 86_400_000) * 86_400_000;
  return new Date(day - 4 * 3_600_000).toISOString();
}

export async function countSince(db: SupabaseClient, userId: string, actions: DsAction[], since: string): Promise<number> {
  const { count } = await db.from("crm_audit").select("id", { count: "exact", head: true })
    .eq("entity", "dbsearch").eq("entity_id", userId).in("action", actions).gte("created_at", since);
  return count ?? 0;
}

export async function usageToday(db: SupabaseClient, userId: string) {
  const since = dubaiMidnight();
  const [searches, reveals, lists] = await Promise.all([
    countSince(db, userId, LOOKUPS, since),
    countSince(db, userId, ["reveal", "to_lead", "to_contact"], since),
    countSince(db, userId, ["to_temp"], since),
  ]);
  return { searches, reveals, lists };
}

/** Bursts no person produces by hand. Crossing one locks DB Search for that agent until an admin unlocks it. */
const BURSTS: { actions: DsAction[]; minutes: number; max: number; reason: string }[] = [
  // Calling lists are capped per day on their own, so a list of 25 does not trip the reveal burst.
  { actions: ["reveal", "to_lead", "to_contact"], minutes: 10, max: 15, reason: "More than 15 numbers revealed within 10 minutes" },
  { actions: [...LOOKUPS, "open"], minutes: 5, max: 60, reason: "More than 60 searches within 5 minutes" },
];

export async function lockIfBurst(db: SupabaseClient, user: DsUser, request: NextRequest): Promise<boolean> {
  if (user.role === "admin") return false;
  for (const b of BURSTS) {
    const n = await countSince(db, user.id, b.actions, new Date(Date.now() - b.minutes * 60_000).toISOString());
    if (n >= b.max) {
      await putSettings(db, null, user.id, { lockedAt: new Date().toISOString(), lockReason: b.reason });
      await audit(db, user, "locked", { detail: { reason: b.reason }, request });
      return true;
    }
  }
  return false;
}

/* ------------------------------------------------------------ the gate */

export const fail = (error: string, status = 400, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: false, error, ...extra }, { status, headers: { "Cache-Control": "no-store" } });

export type Gate =
  | { ok: true; user: DsUser; db: SupabaseClient; done: (body: Record<string, unknown>, status?: number) => NextResponse }
  | { ok: false; response: NextResponse };

/**
 * Checks every gate and, on success, hands back `done()`, which answers the
 * request and slides the idle timer forward. Every DB Search API call starts here.
 */
export async function dsGate(request: NextRequest, { allowSignedOut = false } = {}): Promise<Gate> {
  if (!sameOrigin(request)) return { ok: false, response: fail("bad_origin", 403) };
  const crm = await liveUser(sessionFromRequest(request));
  if (!crm) return { ok: false, response: fail("unauthorised", 401) };
  const db = getSupabaseAdmin();
  if (!db) return { ok: false, response: fail("not_configured", 503) };

  const [{ data: row }, settings] = await Promise.all([
    db.from("crm_users").select("full_name, role, active").eq("id", crm.id).maybeSingle(),
    getSettings(db, crm.id),
  ]);
  if (!row || !row.active) return { ok: false, response: fail("unauthorised", 401) };
  const role: Role = row.role === "admin" ? "admin" : "agent";
  if (role !== "admin" && !settings.access) return { ok: false, response: fail("no_access", 403) };
  if (role !== "admin" && settings.lockedAt) return { ok: false, response: fail("locked", 423, { reason: settings.lockReason }) };

  const user: DsUser = {
    id: crm.id,
    role,
    name: (row.full_name as string) ?? "",
    limits: role === "admin"
      ? { searches: Infinity, reveals: Infinity, lists: Infinity }
      : { searches: settings.searches, reveals: settings.reveals, lists: settings.lists },
  };

  const ds = readDsSession(request.cookies.get(DS_COOKIE)?.value);
  // The DB Search session must belong to the person signed in to the CRM.
  if (!ds || ds.id !== crm.id) {
    if (allowSignedOut) return { ok: true, user, db, done: (body, status = 200) => NextResponse.json({ ok: true, ...body }, { status, headers: { "Cache-Control": "no-store" } }) };
    return { ok: false, response: fail("ds_signin_required", 401) };
  }

  const done = (body: Record<string, unknown>, status = 200) => {
    const res = NextResponse.json({ ok: true, ...body, session: { endsAt: ds.abs, idleMinutes: DS_IDLE_MS / 60_000 } }, { status, headers: { "Cache-Control": "no-store" } });
    const next = sign({ ...ds, idle: Math.min(ds.abs, Date.now() + DS_IDLE_MS) });
    if (next) res.cookies.set(DS_COOKIE, next, DS_COOKIE_OPTIONS);
    return res;
  };
  return { ok: true, user, db, done };
}

export function signedIn(request: NextRequest, userId: string): DsSession | null {
  const ds = readDsSession(request.cookies.get(DS_COOKIE)?.value);
  return ds && ds.id === userId ? ds : null;
}
