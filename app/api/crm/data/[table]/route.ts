import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAdmin, LEADS_TABLE } from "@/lib/supabase";
import { liveUser, sameOrigin, sessionFromRequest, type SessionUser } from "@/lib/crm-auth";
import { LEAD_SOURCES, LISTING_STATUSES, PROPERTY_TYPES, OWNER_REQUEST_STATUSES, TEMP_LEAD_STATUSES, REQUEST_KINDS, REQUEST_STATUSES, DOC_KINDS, PAYMENT_METHODS, complianceIssues, goamlRequired, kycMissing } from "@/lib/crm";

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
const url: Clean = (v) => (typeof v === "string" && /^https?:\/\//.test(v.trim()) ? v.trim().slice(0, 1000) : null);
const bool: Clean = (v) => (v === true || v === false ? v : null);
const obj: Clean = (v) => (v && typeof v === "object" && !Array.isArray(v) && JSON.stringify(v).length < 8000 ? v : null);
const list: Clean = (v) => (Array.isArray(v) && JSON.stringify(v).length < 20000 ? v.slice(0, 60) : null);
const photos: Clean = (v) =>
  Array.isArray(v) ? v.filter((u) => typeof u === "string" && /^https?:\/\//.test(u)).slice(0, 30) : [];

interface Spec {
  table: string;
  owner?: string;
  adminOnlyWrite?: boolean;
  /** Neither readable nor writable by agents. */
  adminOnly?: boolean;
  required: string[];
  fields: Record<string, Clean>;
  adminFields?: string[];
  order: [string, boolean];
}

const SPECS: Record<string, Spec> = {
  kyc: {
    table: "crm_kyc",
    owner: "owner_id",
    required: ["contact_id"],
    order: ["updated_at", false],
    fields: {
      contact_id: id, owner_id: id, party_type: oneOf(["individual", "company"]), legal_name: text(200), nationality: text(80),
      date_of_birth: day, emirates_id_no: text(40), emirates_id_expiry: day, passport_no: text(40), passport_expiry: day,
      trade_license_no: text(60), trade_license_expiry: day, ubo_details: text(2000), id_doc_url: url, passport_doc_url: url,
      is_pep: bool, pep_details: text(1000), sanctions_result: oneOf(["pending", "clear", "match"]), sanctions_checked_at: when,
      source_of_funds: text(1000), payment_method: oneOf(PAYMENT_METHODS), risk_rating: oneOf(["low", "medium", "high"]),
      status: oneOf(["incomplete", "complete", "approved"]), notes: text(2000),
    },
    adminFields: ["owner_id"],
  },
  tenancies: {
    table: "crm_tenancies",
    owner: "agent_id",
    required: ["property_label", "start_date", "end_date"],
    order: ["end_date", true],
    fields: {
      deal_id: id, listing_id: id, landlord_contact_id: id, tenant_contact_id: id, agent_id: id, property_label: text(200),
      start_date: day, end_date: day, annual_rent_aed: amount, cheques_count: amount, security_deposit_aed: amount,
      ejari_no: text(60), ejari_expiry: day, cheques: list, status: oneOf(["active", "renewing", "renewed", "ended"]),
      renewal_notice_sent_at: day, notes: text(2000),
    },
    adminFields: ["agent_id"],
  },
  invoices: {
    table: "crm_invoices",
    adminOnly: true,
    required: ["bill_to_name", "description"],
    order: ["issue_date", false],
    fields: {
      deal_id: id, bill_to_name: text(200), bill_to_trn: text(30), bill_to_address: text(400), description: text(1000),
      net_aed: amount, vat_pct: pct, issue_date: day, due_date: day, status: oneOf(["draft", "sent", "paid", "void"]),
      paid_aed: amount, paid_at: day, notes: text(1000),
    },
  },
  source_spend: {
    table: "crm_source_spend",
    adminOnly: true,
    required: ["month", "source", "amount_aed"],
    order: ["month", false],
    fields: { month: day, source: oneOf(LEAD_SOURCES), amount_aed: amount, notes: text(500) },
  },
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
      permit_expiry: day, permit_price_aed: amount, permit_agent_id: id, dld_unit_no: text(40),
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
      milestones: obj, noc_expiry: day, transfer_at: when, developer: text(120), project: text(160), unit_no: text(40),
      spa_signed_at: day, oqood_no: text(60), payment_plan: list, commission_trigger_pct: pct,
      developer_invoice_status: oneOf(["not_due", "sent", "paid"]), payment_method: oneOf(PAYMENT_METHODS),
      cash_amount_aed: amount, goaml_ref: text(80), goaml_reported_at: when, kyc_override_reason: text(500),
    },
    adminFields: ["agent_id", "agent_split_pct", "paid_at", "goaml_ref", "goaml_reported_at", "kyc_override_reason"],
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
  if (user.role !== "admin" && (spec.adminOnly || spec.adminOnlyWrite)) return false;
  if (user.role === "admin" || !spec.owner) return true;
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

type Db = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

/** Status is derived from the data, never trusted from the client; only an admin can approve a complete file. */
function kycDerived(merged: Row, userId: string, existing: Row | null, requested?: unknown): Row {
  const missing = kycMissing(merged as never);
  const out: Row = {};
  if (missing.length) {
    out.status = "incomplete";
    out.approved_by = null;
    out.approved_at = null;
  } else if (requested === "approved" || (existing?.status === "approved" && requested === undefined)) {
    out.status = "approved";
    if (existing?.status !== "approved") { out.approved_by = userId; out.approved_at = new Date().toISOString(); }
  } else out.status = "complete";
  if (existing && merged.sanctions_result !== existing.sanctions_result) {
    out.screened_by = userId;
    out.sanctions_checked_at = new Date().toISOString();
  }
  if (!existing && merged.sanctions_result && merged.sanctions_result !== "pending") {
    out.screened_by = userId;
    out.sanctions_checked_at = new Date().toISOString();
  }
  return out;
}

/** A deal cannot be recorded until the client's KYC file is complete. An admin may override, with a reason. */
async function kycGate(db: Db, row: Row, isAdmin: boolean): Promise<string | null> {
  if (isAdmin && row.kyc_override_reason) return null;
  if (!row.contact_id) return "kyc_contact_required";
  const { data } = await db.from("crm_kyc").select("*").eq("contact_id", row.contact_id as string).maybeSingle();
  return kycMissing(data as never).length ? "kyc_incomplete" : null;
}

const totals = (r: Row) => {
  const net = Number(r.net_aed ?? 0);
  const vat = Math.round(net * Number(r.vat_pct ?? 5)) / 100;
  return { vat_aed: vat, total_aed: Math.round((net + vat) * 100) / 100 };
};

/** Sequential tax-invoice numbers per year: LP-2026-0001. */
async function invoiceNumbers(db: Db, row: Row): Promise<Row> {
  const year = String(row.issue_date ?? new Date().toISOString()).slice(0, 4);
  const prefix = `LP-${year}-`;
  const { data } = await db.from("crm_invoices").select("number").like("number", `${prefix}%`).order("number", { ascending: false }).limit(1);
  const last = data?.[0] ? Number(String(data[0].number).slice(prefix.length)) : 0;
  return { number: `${prefix}${String(last + 1).padStart(4, "0")}`, ...totals(row) };
}

export async function GET(request: NextRequest, { params }: Ctx) {
  const c = await context(request);
  if ("error" in c) return c.error;
  const spec = SPECS[(await params).table];
  if (!spec) return fail("not_found", 404);
  if (spec.adminOnly && c.user.role !== "admin") return fail("forbidden", 403);
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
  if ((spec.adminOnlyWrite || spec.adminOnly) && c.user.role !== "admin") return fail("forbidden", 403);
  const row = clean(spec, body, c.user);

  if (name === "kyc") {
    // A KYC file belongs to its contact: only someone who can see the contact may open one.
    const { data: contact } = await c.db.from("crm_contacts").select("owner_id").eq("id", row.contact_id as string).maybeSingle();
    if (!contact || (c.user.role !== "admin" && contact.owner_id !== c.user.id)) return fail("forbidden", 403);
    row.owner_id = contact.owner_id ?? c.user.id;
    Object.assign(row, kycDerived(row, c.user.id, null));
  }
  if (name === "deals") {
    const gate = await kycGate(c.db, row, c.user.role === "admin");
    if (gate) return fail(gate, 422);
    row.goaml_required = goamlRequired(row as { payment_method?: string; cash_amount_aed?: number; price_aed?: number });
  }
  if (name === "invoices") Object.assign(row, await invoiceNumbers(c.db, row));
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
  if (name === "kyc") {
    const { data: existing } = await c.db.from("crm_kyc").select("*").eq("id", rowId).single();
    Object.assign(patch, kycDerived({ ...existing, ...patch }, c.user.id, existing, c.user.role === "admin" ? patch.status : undefined));
    patch.updated_at = new Date().toISOString();
  }
  if (name === "deals") {
    const { data: existing } = await c.db.from("crm_deals").select("*").eq("id", rowId).single();
    patch.goaml_required = goamlRequired({ ...existing, ...patch } as { payment_method?: string; cash_amount_aed?: number; price_aed?: number });
  }
  if (name === "invoices" && ("net_aed" in patch || "vat_pct" in patch)) {
    const { data: existing } = await c.db.from("crm_invoices").select("net_aed, vat_pct").eq("id", rowId).single();
    Object.assign(patch, totals({ ...existing, ...patch }));
  }

  // A listing cannot go live (status=available, exclusive marketing) without Form A, permit and photos.
  if (name === "listings" && (patch.status === "available" || patch.approval === "approved")) {
    const { data: existing } = await c.db.from("crm_listings").select("*").eq("id", rowId).single();
    const merged = { ...existing, ...patch };
    const { data: agent } = merged.agent_id
      ? await c.db.from("crm_users").select("brn_no, brn_expiry").eq("id", merged.agent_id).maybeSingle()
      : { data: null };
    const issues = complianceIssues(merged, agent);
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
