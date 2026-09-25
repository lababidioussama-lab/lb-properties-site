import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAdmin, LEADS_TABLE } from "@/lib/supabase";
import { liveUser, sameOrigin, sessionFromRequest, type SessionUser } from "@/lib/crm-auth";
import { LEAD_SOURCES, LISTING_STATUSES, PROPERTY_TYPES, OWNER_REQUEST_STATUSES, TEMP_LEAD_STATUSES, REQUEST_KINDS, REQUEST_STATUSES, DOC_KINDS, complianceIssues } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ table: string }> };
type Row = Record<string, unknown>;
type Clean = (v: unknown) => unknown;

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

const text = (max: number): Clean => (v) => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};
const amount: Clean = (v) => {
  if (v === null || v === "" || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const pct: Clean = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
};
const oneOf = (allowed: readonly string[]): Clean => (v) => (allowed.includes(v as string) ? v : null);
const when: Clean = (v) => {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const day: Clean = (v) => {
  const iso = when(v);
  return iso ? (iso as string).slice(0, 10) : null;
};
const id = text(60);
const photos: Clean = (v) =>
  Array.isArray(v) ? v.filter((u) => typeof u === "string" && /^https?:\/\//.test(u)).slice(0, 30) : [];

interface Spec {
  table: string;
  owner?: string;
  adminOnlyWrite?: boolean;
  required: string[];
  fields: Record<string, Clean>;
  adminFields?: string[];
  order: [string, boolean];
}

const SPECS: Record<string, Spec> = {
  listings: {
    table: "crm_listings",
    owner: "agent_id",
    required: ["title"],
    order: ["created_at", false],
    fields: {
      title: text(200), purpose: oneOf(["sale", "rent"]), property_type: oneOf(PROPERTY_TYPES),
      community: text(120), building: text(120), unit: text(40), bedrooms: text(20),
      size_sqft: amount, price_aed: amount, permit_no: text(40), status: oneOf(LISTING_STATUSES),
      owner_contact_id: id, agent_id: id, description: text(4000), photos,
      form_a_start: day, form_a_end: day, permit_status: oneOf(["none", "under_process", "approved", "expired"]),
      key_status: text(40), exclusive: (v) => v === true,
      approval: oneOf(["pending", "approved", "rejected"]), approval_note: text(500),
      off_market: (v) => v === true, low_performing: (v) => v === true,
      price_reduced_at: when, price_was_aed: amount,
    },
    adminFields: ["agent_id", "approval", "approval_note"],
  },
  deals: {
    table: "crm_deals",
    owner: "agent_id",
    required: ["title"],
    order: ["closed_at", false],
    fields: {
      title: text(200), deal_type: oneOf(["sale", "rent", "offplan"]), lead_id: id, listing_id: id,
      contact_id: id, agent_id: id, price_aed: amount, commission_pct: pct, agent_split_pct: pct,
      closed_at: day, paid_at: day, notes: text(2000),
    },
    adminFields: ["agent_id", "agent_split_pct", "paid_at"],
  },
  events: {
    table: "crm_events",
    owner: "agent_id",
    required: ["title", "starts_at"],
    order: ["starts_at", true],
    fields: {
      title: text(200), kind: oneOf(["viewing", "meeting", "call", "handover"]), starts_at: when,
      ends_at: when, status: oneOf(["scheduled", "done", "cancelled"]), agent_id: id, lead_id: id,
      contact_id: id, listing_id: id, location: text(300), notes: text(2000),
    },
    adminFields: ["agent_id"],
  },
  templates: {
    table: "crm_templates",
    adminOnlyWrite: true,
    required: ["name", "body"],
    order: ["created_at", true],
    fields: { name: text(80), body: text(2000) },
  },
  owner_requests: {
    table: "crm_owner_requests",
    owner: "owner_id",
    required: ["owner_name", "phone"],
    order: ["created_at", false],
    fields: {
      owner_name: text(200), phone: text(40), email: text(320), purpose: oneOf(["sale", "rent"]),
      property_type: text(40), community: text(120), building: text(120), asking_price_aed: amount,
      notes: text(2000), status: oneOf(OWNER_REQUEST_STATUSES), owner_id: id, listing_id: id,
    },
    adminFields: ["owner_id"],
  },
  temp_leads: {
    table: "crm_temp_leads",
    owner: "owner_id",
    required: ["full_name", "phone"],
    order: ["created_at", false],
    fields: {
      full_name: text(200), phone: text(40), source: text(60),
      status: oneOf(TEMP_LEAD_STATUSES), notes: text(2000), owner_id: id,
    },
    adminFields: ["owner_id"],
  },
  campaigns: {
    table: "crm_campaigns",
    adminOnlyWrite: true,
    required: ["message"],
    order: ["created_at", false],
    fields: { message: text(4000), recipients: amount },
  },
  requests: {
    table: "crm_requests",
    owner: "user_id",
    required: ["title", "kind"],
    order: ["created_at", false],
    fields: {
      kind: oneOf(REQUEST_KINDS), title: text(200), details: text(2000), listing_id: id,
      status: oneOf(REQUEST_STATUSES), admin_note: text(1000), user_id: id,
    },
    adminFields: ["status", "admin_note", "user_id"],
  },
  agent_documents: {
    table: "crm_agent_documents",
    owner: "user_id",
    required: ["title", "url"],
    order: ["created_at", false],
    fields: {
      title: text(200), url: (v) => (typeof v === "string" && /^https?:\/\//.test(v) ? v : null),
      kind: oneOf(DOC_KINDS), user_id: id,
    },
    adminFields: ["user_id"],
  },
};

function clean(spec: Spec, body: Row, user: SessionUser): Row {
  const out: Row = {};
  for (const [key, fn] of Object.entries(spec.fields)) {
    if (!(key in body)) continue;
    if (user.role !== "admin" && spec.adminFields?.includes(key)) continue;
    const value = fn(body[key]);
    if (value !== null || body[key] === null || body[key] === "") out[key] = value;
  }
  return out;
}

async function allowed(spec: Spec, user: SessionUser, rowId: string) {
  if (user.role === "admin" || !spec.owner) return !spec.adminOnlyWrite || user.role === "admin";
  const db = getSupabaseAdmin()!;
  const { data } = await db.from(spec.table).select(spec.owner).eq("id", rowId).maybeSingle();
  return !!data && (data as unknown as Row)[spec.owner] === user.id;
}

async function context(request: NextRequest) {
  if (!sameOrigin(request)) return { error: fail("bad_origin", 403) } as const;
  const user = await liveUser(sessionFromRequest(request));
  const db = getSupabaseAdmin();
  if (!user) return { error: fail("unauthorised", 401) } as const;
  if (!db) return { error: fail("not_configured", 503) } as const;
  return { user, db } as const;
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const c = await context(request);
  if ("error" in c) return c.error;
  const spec = SPECS[(await params).table];
  if (!spec) return fail("not_found", 404);
  let query = c.db.from(spec.table).select("*").order(spec.order[0], { ascending: spec.order[1] }).limit(3000);
  if (spec.owner && c.user.role !== "admin") query = query.eq(spec.owner, c.user.id);
  const { data, error } = await query;
  return error ? fail(error.message, 502) : NextResponse.json({ ok: true, rows: data });
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const c = await context(request);
  if ("error" in c) return c.error;
  const name = (await params).table;
  const body = ((await request.json().catch(() => ({}))) ?? {}) as Row;

  // Bulk lead import from portals / spreadsheets.
  if (name === "leads") {
    const input = Array.isArray(body.rows) ? (body.rows as Row[]).slice(0, 1000) : [];
    const rows = input
      .map((r) => ({
        full_name: text(200)(r.full_name),
        phone: text(40)(r.phone),
        email: text(320)(r.email),
        notes: text(4000)(r.notes),
        source: oneOf(LEAD_SOURCES)(r.source) ?? "other",
        service: "advisory",
        owner_id: c.user.role === "admin" ? (id(r.owner_id) ?? null) : c.user.id,
      }))
      .filter((r) => r.full_name && r.phone && String(r.phone).length >= 5);
    if (!rows.length) return fail("no_valid_rows");
    const { data, error } = await c.db.from(LEADS_TABLE).insert(rows).select();
    return error ? fail(error.message, 502) : NextResponse.json({ ok: true, rows: data, skipped: input.length - rows.length });
  }

  const spec = SPECS[name];
  if (!spec) return fail("not_found", 404);
  if (spec.adminOnlyWrite && c.user.role !== "admin") return fail("forbidden", 403);
  const row = clean(spec, body, c.user);
  if (spec.required.some((k) => !row[k])) return fail(`${spec.required.join(", ")} required`);
  if (spec.owner && (c.user.role !== "admin" || !row[spec.owner])) row[spec.owner] = c.user.id;
  if (name === "listings") row.ref_code = `${row.purpose === "rent" ? (row.property_type === "villa" ? "VR" : "AR") : (row.property_type === "villa" ? "VS" : "AS")}-${String(Date.now()).slice(-6)}`;
  const { data, error } = await c.db.from(spec.table).insert(row).select().single();
  return error ? fail(error.message, 502) : NextResponse.json({ ok: true, row: data });
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const c = await context(request);
  if ("error" in c) return c.error;
  const name = (await params).table;
  const spec = SPECS[name];
  if (!spec) return fail("not_found", 404);
  const body = ((await request.json().catch(() => ({}))) ?? {}) as Row;
  const rowId = id(body.id) as string | null;
  if (!rowId || !(await allowed(spec, c.user, rowId))) return fail("forbidden", 403);
  const patch = clean(spec, body, c.user);

  // A listing cannot go live (status=available, exclusive marketing) without Form A, permit and photos.
  if (name === "listings" && (patch.status === "available" || patch.approval === "approved")) {
    const { data: existing } = await c.db.from("crm_listings").select("*").eq("id", rowId).single();
    const merged = { ...existing, ...patch };
    const issues = complianceIssues(merged);
    if (issues.length) return fail(`Cannot publish: ${issues.join(", ")}`, 422);
  }

  if (!Object.keys(patch).length) return fail("empty_patch");
  const { data, error } = await c.db.from(spec.table).update(patch).eq("id", rowId).select().single();
  if (!error && name === "listings" && "approval" in patch) {
    await c.db.from("crm_audit").insert({ user_id: c.user.id, entity: "listing", entity_id: rowId, action: "approval", detail: { approval: patch.approval, note: patch.approval_note ?? null } });
  }
  return error ? fail(error.message, 502) : NextResponse.json({ ok: true, row: data });
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const c = await context(request);
  if ("error" in c) return c.error;
  const spec = SPECS[(await params).table];
  if (!spec) return fail("not_found", 404);
  const rowId = request.nextUrl.searchParams.get("id");
  if (!rowId || !(await allowed(spec, c.user, rowId))) return fail("forbidden", 403);
  const { error } = await c.db.from(spec.table).delete().eq("id", rowId);
  return error ? fail(error.message, 502) : NextResponse.json({ ok: true });
}
