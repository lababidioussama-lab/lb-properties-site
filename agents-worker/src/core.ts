export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SESSION_SECRET: string;
  ANTHROPIC_API_KEY: string;
  RESEND_API_KEY: string;
  OTP_FROM?: string;
  PASSWORD_SERVICE_URL: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_WEBHOOK_SECRET: string;
  TELEGRAM_CHAT_ID?: string;
  AGENT_DAILY_CAP?: string;
}

/** The only person who may ever open the offices or give the agents orders. */
export const OWNER_EMAIL = "lababidioussama@gmail.com";
export const MODEL = "claude-sonnet-5-5";
export const SITE = "https://agents.lababidiproperties.com";

const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

export async function hmac(key: string, data: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", k, enc.encode(data)));
}

export function same(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export const rand = (bytes = 6) => hex(crypto.getRandomValues(new Uint8Array(bytes)).buffer);

/* ---------------------------------------------------------------- database */

export async function rest(env: Env, path: string, init: RequestInit & { count?: boolean } = {}): Promise<{ ok: boolean; status: number; data: unknown; count: number | null }> {
  const headers: Record<string, string> = {
    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.count) headers.Prefer = "count=exact";
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, { ...init, headers, signal: AbortSignal.timeout(12_000) });
  const text = await res.text();
  let data: unknown = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  const range = res.headers.get("content-range");
  const count = range && range.includes("/") && !range.endsWith("/*") ? Number(range.split("/")[1]) : null;
  return { ok: res.ok, status: res.status, data, count };
}

export async function audit(env: Env, entity: string, action: string, detail: Record<string, unknown>, userId: string | null = null, entityId: string | null = null): Promise<string | null> {
  const r = await rest(env, "crm_audit", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ user_id: userId, entity, entity_id: entityId, action, detail }) });
  return r.ok && Array.isArray(r.data) ? ((r.data[0] as { id?: string })?.id ?? null) : null;
}

export async function recent(env: Env, entity: string, action: string, match: Record<string, string>, withinMs: number): Promise<{ count: number; last: number }> {
  const since = new Date(Date.now() - withinMs).toISOString();
  const filters = Object.entries(match).map(([k, v]) => `detail->>${k}=eq.${encodeURIComponent(v)}`).join("&");
  const r = await rest(env, `crm_audit?select=created_at&entity=eq.${entity}&action=eq.${action}&created_at=gte.${since}${filters ? "&" + filters : ""}&order=created_at.desc&limit=50`);
  const rows = Array.isArray(r.data) ? (r.data as { created_at: string }[]) : [];
  return { count: rows.length, last: rows[0] ? Date.parse(rows[0].created_at) : 0 };
}

/** Midnight in Dubai (UTC+4), as an ISO string. */
export function dubaiMidnight(): string {
  const now = Date.now() + 4 * 3_600_000;
  return new Date(Math.floor(now / 86_400_000) * 86_400_000 - 4 * 3_600_000).toISOString();
}
