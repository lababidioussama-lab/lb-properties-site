import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdmin, LEADS_TABLE } from "@/lib/supabase";
import { hashPassword, liveUser, sameOrigin, sessionFromRequest, type SessionUser } from "@/lib/crm-auth";
import { PORTALS, PORTAL_LABEL, ingestPortalLead, portalSecret, type Portal } from "@/lib/portal-intake";
import { licenceValid, ACTIVITY_KINDS, CONTACT_KINDS, CONTACT_STATUSES, LEAD_SLA_HOURS, LOST_REASONS, STAGES, STAGE_LABEL, STAR_LIMIT, complianceIssues, type Stage } from "@/lib/crm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ resource: string }> };
type Body = Record<string, unknown>;

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });
const ok = (data: Record<string, unknown>) => NextResponse.json({ ok: true, ...data });

const str = (v: unknown, max = 500): string | null => {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
};
const num = (v: unknown): number | null => {
  if (v === null || v === "" || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
};
const date = (v: unknown): string | null => {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const pick = <T extends string>(v: unknown, allowed: readonly T[]): T | null =>
  allowed.includes(v as T) ? (v as T) : null;

async function setup(request: NextRequest) {
  if (!sameOrigin(request)) return { error: fail("bad_origin", 403) } as const;
  const user = await liveUser(sessionFromRequest(request));
  if (!user) return { error: fail("unauthorised", 401) } as const;
  const db = getSupabaseAdmin();
  if (!db) return { error: fail("not_configured", 503) } as const;
  return { user, db } as const;
}

/** Agents may only touch rows they own. Admins touch everything. */
async function canAccess(
  db: SupabaseClient,
  user: SessionUser,
  table: string,
  id: string,
  ownerColumn: string,
): Promise<boolean> {
  if (user.role === "admin") return true;
  const { data } = await db.from(table).select(ownerColumn).eq("id", id).maybeSingle();
  return !!data && (data as unknown as Record<string, unknown>)[ownerColumn] === user.id;
}

/** RERA: an agent can only deal with a current BRN. */
async function hasLicence(db: SupabaseClient, userId: string | null | undefined) {
  if (!userId) return false;
  const { data } = await db.from("crm_users").select("role, brn_no, brn_expiry").eq("id", userId).maybeSingle();
  if (!data) return false;
  if (data.role === "admin" && !data.brn_no) return true;
  return licenceValid(data as { brn_no: string | null; brn_expiry: string | null });
}

async function logActivity(db: SupabaseClient, row: Body) {
  await db.from("crm_activities").insert(row);
}

async function audit(db: SupabaseClient, user: SessionUser, entity: string, entityId: string, action: string, detail: Body = {}) {
  await db.from("crm_audit").insert({ user_id: user.id, entity, entity_id: entityId, action, detail });
}

const OPEN_STAGES = ["new", "contacted", "viewing", "offer"];
const slaDeadline = () => new Date(Date.now() + LEAD_SLA_HOURS * 3_600_000).toISOString();

/** Leads whose agent let the clock run out go back to the open pool. */
async function expireLeads(db: SupabaseClient) {
  const { data } = await db
    .from(LEADS_TABLE)
    .update({ owner_id: null, expires_at: null })
    .lt("expires_at", new Date().toISOString())
    .in("stage", OPEN_STAGES)
    .not("owner_id", "is", null)
    .select("id");
  if (data?.length) {
    await db.from("crm_activities").insert(
      data.map((r) => ({ lead_id: r.id, kind: "system", body: "Expired with no update and returned to the open pool" })),
    );
  }
}

/** Pool leads are visible to every agent, but contact details stay hidden until claimed. */
/* An allow-list, not a deny-list: anything added to the lead row later
   (payload.raw from a portal carries the phone and email) stays hidden
   from agents until they claim the lead. */
const POOL_FIELDS = [
  "id", "created_at", "service", "source", "full_name", "locale", "stage", "owner_id", "contact_id",
  "deal_kind", "property_type", "beds", "budget_aed", "location", "ready_status", "starred", "expires_at",
] as const;
const mask = (lead: Body) => {
  const out: Body = Object.fromEntries(POOL_FIELDS.map((k) => [k, lead[k] ?? null]));
  const digits = String(lead.phone ?? "").replace(/\D/g, "");
  out.phone = digits ? `${"•".repeat(Math.max(4, digits.length - 2))}${digits.slice(-2)}` : "";
  out.email = null;
  out.notes = null;
  out.internal_notes = null;
  out.payload = {};
  out.next_follow_up_at = null;
  out.deal_value_aed = null;
  return out;
};

export async function GET(request: NextRequest, { params }: Ctx) {
  const s = await setup(request);
  if ("error" in s) return s.error;
  const { user, db } = s;
  const { resource } = await params;
  const q = request.nextUrl.searchParams;
  const mine = <B extends { eq: (c: string, v: string) => B }>(b: B, col: string) =>
    user.role === "admin" ? b : b.eq(col, user.id);

  switch (resource) {
    case "me":
      return ok({ user });
    case "leads": {
      await expireLeads(db);
      let query = db.from(LEADS_TABLE).select("*").order("created_at", { ascending: false }).limit(2000);
      if (user.role !== "admin") {
        query = query.or(`owner_id.eq.${user.id},and(owner_id.is.null,stage.in.(${OPEN_STAGES.join(",")}))`);
      }
      const { data, error } = await query;
      if (error) return fail(error.message, 502);
      const rows = (data ?? []) as Body[];
      return ok({ leads: user.role === "admin" ? rows : rows.map((l) => (l.owner_id ? l : mask(l))) });
    }
    case "contacts": {
      const { data, error } = await mine(
        db.from("crm_contacts").select("*").order("created_at", { ascending: false }).limit(2000),
        "owner_id",
      );
      return error ? fail(error.message, 502) : ok({ contacts: data });
    }
    case "audit": {
      if (user.role !== "admin") return fail("forbidden", 403);
      const { data, error } = await db.from("crm_audit").select("*").order("created_at", { ascending: false }).limit(500);
      return error ? fail(error.message, 502) : ok({ entries: data });
    }
    case "team_activity": {
      if (user.role !== "admin") return fail("forbidden", 403);
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const [sessions, actions, work] = await Promise.all([
        db.from("crm_audit").select("user_id, action, created_at, detail").eq("entity", "session").in("action", ["login", "logout", "login_failed", "otp_failed"]).gte("created_at", since).order("created_at", { ascending: false }).limit(5000),
        db.from("crm_audit").select("user_id, created_at").neq("entity", "session").gte("created_at", since).order("created_at", { ascending: false }).limit(5000),
        db.from("crm_activities").select("user_id, kind, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(10000),
      ]);
      const err = sessions.error ?? actions.error ?? work.error;
      if (err) return fail(err.message, 502);
      return ok({ sessions: sessions.data ?? [], actions: actions.data ?? [], activities: work.data ?? [] });
    }
    case "integrations": {
      if (user.role !== "admin") return fail("forbidden", 403);
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data } = await db.from("crm_audit").select("action, created_at, detail").eq("entity", "integration").gte("created_at", since).order("created_at", { ascending: false }).limit(2000);
      const log = (data ?? []) as { action: string; created_at: string; detail: { portal?: string; test?: boolean } }[];
      return ok({
        portals: PORTALS.map((p) => {
          const mine = log.filter((e) => e.detail?.portal === p && !e.detail?.test);
          return {
            portal: p,
            label: PORTAL_LABEL[p],
            configured: portalSecret(p).length >= 16,
            received30: mine.filter((e) => e.action === "lead_received").length,
            duplicates30: mine.filter((e) => e.action === "lead_duplicate").length,
            last: mine[0]?.created_at ?? null,
          };
        }),
      });
    }
    case "properties": {
      const contactId = q.get("contact_id");
      if (!contactId || !(await canAccess(db, user, "crm_contacts", contactId, "owner_id")))
        return fail("forbidden", 403);
      const { data } = await db.from("crm_properties").select("*").eq("contact_id", contactId);
      return ok({ properties: data ?? [] });
    }
    case "activities": {
      const leadId = q.get("lead_id");
      const contactId = q.get("contact_id");
      if (leadId && (await canAccess(db, user, LEADS_TABLE, leadId, "owner_id"))) {
        const { data } = await db.from("crm_activities").select("*").eq("lead_id", leadId).order("created_at", { ascending: false });
        return ok({ activities: data ?? [] });
      }
      if (contactId && (await canAccess(db, user, "crm_contacts", contactId, "owner_id"))) {
        const { data } = await db.from("crm_activities").select("*").eq("contact_id", contactId).order("created_at", { ascending: false });
        return ok({ activities: data ?? [] });
      }
      return fail("forbidden", 403);
    }
    case "tasks": {
      const { data, error } = await mine(
        db.from("crm_tasks").select("*").order("due_at", { ascending: true, nullsFirst: false }).limit(2000),
        "assignee_id",
      );
      return error ? fail(error.message, 502) : ok({ tasks: data });
    }
    case "users": {
      const cols: string = "id, full_name, role, active, phone, languages, specialties, bio, avatar_url, brn_no, brn_expiry, visa_expiry, emirates_id_expiry, rera_cert_date";
      // Pay (slab) and targets are admin-only, except an agent's own.
      const selection: string = user.role === "admin" ? `email, slab_pct, quarterly_target_aed, ${cols}` : cols;
      const { data } = await db
        .from("crm_users")
        .select(selection)
        .order("created_at");
      if (user.role !== "admin" && data) {
        const { data: self } = await db.from("crm_users").select("slab_pct, quarterly_target_aed").eq("id", user.id).maybeSingle();
        return ok({ users: (data as unknown as Body[]).map((u) => (u.id === user.id ? { ...u, ...(self ?? {}) } : u)) });
      }
      return ok({ users: data ?? [] });
    }
  }
  return fail("not_found", 404);
}

export async function POST(request: NextRequest, { params }: Ctx) {
  const s = await setup(request);
  if ("error" in s) return s.error;
  const { user, db } = s;
  const { resource } = await params;
  const b = ((await request.json().catch(() => ({}))) ?? {}) as Body;

  switch (resource) {
    case "integration_test": {
      if (user.role !== "admin") return fail("forbidden", 403);
      const portal = String(b.portal) as Portal;
      if (!PORTALS.includes(portal)) return fail("unknown_portal");
      const { status, ...result } = await ingestPortalLead(db, portal, {
        lead: { name: `Test lead (${PORTAL_LABEL[portal]})`, phone: `+97150${String(Date.now()).slice(-7)}`, email: "test@example.com", message: "This is a test enquiry sent from the Integrations page. Delete it any time." },
        property: { reference: "TEST-REF", title: "Test listing" },
        test: true,
      });
      return status === 200 ? ok(result) : fail(result.error ?? "failed", status);
    }
    case "contacts": {
      const full_name = str(b.full_name, 200);
      if (!full_name) return fail("name_required");
      const row = {
        full_name,
        phone: str(b.phone, 40),
        email: str(b.email, 320),
        nationality: str(b.nationality, 80),
        kind: pick(b.kind, CONTACT_KINDS) ?? "buyer",
        notes: str(b.notes, 4000),
        owner_id: user.role === "admin" ? (str(b.owner_id, 60) ?? user.id) : user.id,
      };
      const { data, error } = await db.from("crm_contacts").insert(row).select().single();
      if (error) return fail(error.message, 502);

      // Link the lead this contact was created from, if any.
      const leadId = str(b.lead_id, 60);
      if (leadId && (await canAccess(db, user, LEADS_TABLE, leadId, "owner_id"))) {
        await db.from(LEADS_TABLE).update({ contact_id: data.id }).eq("id", leadId);
      }
      return ok({ contact: data });
    }
    case "properties": {
      const contactId = str(b.contact_id, 60);
      if (!contactId || !(await canAccess(db, user, "crm_contacts", contactId, "owner_id")))
        return fail("forbidden", 403);
      const row = {
        contact_id: contactId,
        relation: pick(b.relation, ["owns", "wants"] as const) ?? "wants",
        community: str(b.community, 120),
        building: str(b.building, 120),
        unit: str(b.unit, 60),
        bedrooms: str(b.bedrooms, 20),
        price_aed: num(b.price_aed),
        notes: str(b.notes, 2000),
      };
      const { data, error } = await db.from("crm_properties").insert(row).select().single();
      return error ? fail(error.message, 502) : ok({ property: data });
    }
    case "activities": {
      const body = str(b.body, 4000);
      const kind = pick(b.kind, ACTIVITY_KINDS.filter((k) => k !== "system" && k !== "stage"));
      if (!body || !kind) return fail("invalid");
      const leadId = str(b.lead_id, 60);
      const contactId = str(b.contact_id, 60);
      if (leadId && !(await canAccess(db, user, LEADS_TABLE, leadId, "owner_id"))) return fail("forbidden", 403);
      if (contactId && !(await canAccess(db, user, "crm_contacts", contactId, "owner_id"))) return fail("forbidden", 403);
      if (!leadId && !contactId) return fail("invalid");
      const { data, error } = await db
        .from("crm_activities")
        .insert({ kind, body, lead_id: leadId, contact_id: contactId, user_id: user.id })
        .select()
        .single();
      if (!error && leadId && ["call", "whatsapp", "email", "meeting"].includes(kind)) {
        await db.from(LEADS_TABLE).update({ first_response_at: new Date().toISOString() }).eq("id", leadId).is("first_response_at", null);
      }
      if (!error && leadId) {
        await db.from(LEADS_TABLE).update({ expires_at: slaDeadline() }).eq("id", leadId)
          .not("owner_id", "is", null).in("stage", OPEN_STAGES);
      }
      return error ? fail(error.message, 502) : ok({ activity: data });
    }
    case "tasks": {
      const title = str(b.title, 300);
      if (!title) return fail("title_required");
      const row = {
        title,
        due_at: date(b.due_at),
        assignee_id: user.role === "admin" ? (str(b.assignee_id, 60) ?? user.id) : user.id,
        created_by: user.id,
        lead_id: str(b.lead_id, 60),
        contact_id: str(b.contact_id, 60),
      };
      const { data, error } = await db.from("crm_tasks").insert(row).select().single();
      return error ? fail(error.message, 502) : ok({ task: data });
    }
    case "users": {
      if (user.role !== "admin") return fail("forbidden", 403);
      const email = str(b.email, 320)?.toLowerCase();
      const full_name = str(b.full_name, 200);
      const password = typeof b.password === "string" ? b.password : "";
      if (!email || !full_name || password.length < 10) return fail("email_name_and_10char_password_required");
      const { data, error } = await db
        .from("crm_users")
        .insert({ email, full_name, role: pick(b.role, ["admin", "agent"] as const) ?? "agent", password_hash: hashPassword(password) })
        .select("id, email, full_name, role, active")
        .single();
      return error ? fail(error.message.includes("duplicate") ? "email_exists" : error.message, 502) : ok({ user: data });
    }
  }
  return fail("not_found", 404);
}

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const s = await setup(request);
  if ("error" in s) return s.error;
  const { user, db } = s;
  const { resource } = await params;
  const b = ((await request.json().catch(() => ({}))) ?? {}) as Body;
  const id = str(b.id, 60);
  if (!id) return fail("missing_id");
  const patch: Body = {};

  switch (resource) {
    case "leads": {
      const { data: current } = await db.from(LEADS_TABLE).select("owner_id, stage, starred, first_response_at").eq("id", id).maybeSingle();
      if (!current) return fail("not_found", 404);

      // Claim an unassigned lead from the open pool.
      if (b.claim) {
        if (user.role !== "admin" && !(await hasLicence(db, user.id))) return fail("licence_expired", 403);
        const { data, error } = await db
          .from(LEADS_TABLE)
          .update({ owner_id: user.id, expires_at: slaDeadline() })
          .eq("id", id)
          .is("owner_id", null)
          .in("stage", OPEN_STAGES)
          .select()
          .maybeSingle();
        if (error) return fail(error.message, 502);
        if (!data) return fail("already_claimed", 409);
        await logActivity(db, { lead_id: id, user_id: user.id, kind: "system", body: "Claimed from the open pool (contact details revealed)" });
        return ok({ lead: data });
      }

      if (!(await canAccess(db, user, LEADS_TABLE, id, "owner_id"))) return fail("forbidden", 403);
      const note = str(b.note, 2000);

      // Release back to the pool: reason and note are mandatory.
      if (b.release) {
        const reason = str(b.reason, 120);
        if (!reason || !note) return fail("reason_and_note_required");
        const { data, error } = await db.from(LEADS_TABLE).update({ owner_id: null, expires_at: null }).eq("id", id).select().single();
        if (error) return fail(error.message, 502);
        await logActivity(db, { lead_id: id, user_id: user.id, kind: "system", body: `Released to the pool: ${reason}. ${note}` });
        return ok({ lead: data });
      }

      if ("stage" in b) {
        const stage = pick(b.stage, STAGES);
        if (!stage) return fail("invalid_stage");
        if (stage === "lost") {
          const reason = pick(b.lost_reason, LOST_REASONS);
          if (!reason || !note) return fail("reason_and_note_required");
          patch.lost_reason = reason;
        }
        patch.stage = stage;
      }
      if ("owner_id" in b) {
        if (user.role !== "admin") return fail("forbidden", 403);
        patch.owner_id = str(b.owner_id, 60);
        if (patch.owner_id && !(await hasLicence(db, patch.owner_id as string))) return fail("agent_licence_expired", 422);
      }
      if ("starred" in b) {
        patch.starred = !!b.starred;
        if (patch.starred && !current.starred) {
          const { count } = await db.from(LEADS_TABLE).select("id", { count: "exact", head: true })
            .eq("owner_id", current.owner_id ?? user.id).eq("starred", true);
          if ((count ?? 0) >= STAR_LIMIT) return fail("star_limit");
        }
      }
      for (const [k, max] of [["property_type", 40], ["beds", 20], ["location", 120], ["medium", 40]] as const) {
        if (k in b) patch[k] = str(b[k], max);
      }
      if ("deal_kind" in b) patch.deal_kind = pick(b.deal_kind, ["sale", "rent"] as const);
      if ("ready_status" in b) patch.ready_status = pick(b.ready_status, ["ready", "offplan", "any"] as const);
      if ("budget_aed" in b) patch.budget_aed = num(b.budget_aed);
      if ("next_follow_up_at" in b) patch.next_follow_up_at = date(b.next_follow_up_at);
      if ("deal_value_aed" in b) patch.deal_value_aed = num(b.deal_value_aed);
      if ("partner_agency" in b) patch.partner_agency = str(b.partner_agency, 200);
      if ("partner_split_pct" in b) {
        const pct = Number(b.partner_split_pct);
        patch.partner_split_pct = Number.isFinite(pct) && pct >= 0 && pct <= 100 ? pct : null;
      }
      if ("partner_approved" in b) {
        if (user.role !== "admin") return fail("forbidden", 403);
        patch.partner_approved = !!b.partner_approved;
      }
      if ("internal_notes" in b) patch.internal_notes = str(b.internal_notes, 4000);
      if (!Object.keys(patch).length) return fail("empty_patch");

      if (current.stage === "new" && patch.stage && patch.stage !== "new") patch.first_response_at = new Date().toISOString();

      // Any real update restarts the clock; closed leads have none.
      const stageAfter = (patch.stage as string | undefined) ?? current.stage;
      const ownerAfter = "owner_id" in patch ? patch.owner_id : current.owner_id;
      patch.expires_at = ownerAfter && OPEN_STAGES.includes(stageAfter) ? slaDeadline() : null;

      const { data, error } = await db.from(LEADS_TABLE).update(patch).eq("id", id).select().single();
      if (error) return fail(error.message, 502);
      if (patch.stage) {
        const reason = patch.stage === "lost" ? ` (${patch.lost_reason}). ${note}` : "";
        await logActivity(db, { lead_id: id, user_id: user.id, kind: "stage", body: `Moved to ${STAGE_LABEL[patch.stage as Stage]}${reason}` });
      }
      return ok({ lead: data });
    }
    case "contacts": {
      if (!(await canAccess(db, user, "crm_contacts", id, "owner_id"))) return fail("forbidden", 403);
      for (const [k, max] of [["full_name", 200], ["phone", 40], ["email", 320], ["nationality", 80], ["notes", 4000]] as const) {
        if (k in b) patch[k] = str(b[k], max);
      }
      if ("kind" in b) patch.kind = pick(b.kind, CONTACT_KINDS) ?? "other";
      if ("owner_id" in b && user.role === "admin") patch.owner_id = str(b.owner_id, 60);
      if ("status" in b) patch.status = pick(b.status, CONTACT_STATUSES) ?? "need_to_validate";
      if (Array.isArray(b.roles)) patch.roles = b.roles.filter((r): r is string => typeof r === "string").slice(0, 8);
      if (patch.full_name === null) return fail("name_required");
      const { data, error } = await db.from("crm_contacts").update(patch).eq("id", id).select().single();
      if (!error && ("status" in patch)) await audit(db, user, "contact", id, "status_change", { status: patch.status });
      return error ? fail(error.message, 502) : ok({ contact: data });
    }
    case "tasks": {
      if (!(await canAccess(db, user, "crm_tasks", id, "assignee_id"))) return fail("forbidden", 403);
      if ("done" in b) patch.done_at = b.done ? new Date().toISOString() : null;
      if ("due_at" in b) patch.due_at = date(b.due_at);
      if ("title" in b) patch.title = str(b.title, 300);
      const { data, error } = await db.from("crm_tasks").update(patch).eq("id", id).select().single();
      return error ? fail(error.message, 502) : ok({ task: data });
    }
    case "users": {
      const self = id === user.id;
      if (user.role !== "admin" && !self) return fail("forbidden", 403);

      // Anyone edits their own business-card fields; only an admin touches access/pay.
      if ("phone" in b) patch.phone = str(b.phone, 40);
      if ("languages" in b) patch.languages = str(b.languages, 200);
      if ("specialties" in b) patch.specialties = str(b.specialties, 300);
      if ("bio" in b) patch.bio = str(b.bio, 1000);
      if ("avatar_url" in b) {
        const url = str(b.avatar_url, 500);
        patch.avatar_url = url && /^https?:\/\//.test(url) ? url : null;
      }

      if (user.role === "admin") {
        if ("role" in b) patch.role = pick(b.role, ["admin", "agent"] as const) ?? "agent";
        if ("active" in b) patch.active = !!b.active;
        if ("full_name" in b) patch.full_name = str(b.full_name, 200);
        if ("slab_pct" in b) patch.slab_pct = num(b.slab_pct) ?? 50;
        if ("quarterly_target_aed" in b) patch.quarterly_target_aed = num(b.quarterly_target_aed);
        if ("brn_no" in b) patch.brn_no = str(b.brn_no, 40);
        for (const k of ["brn_expiry", "visa_expiry", "emirates_id_expiry", "rera_cert_date"] as const) {
          if (k in b) patch[k] = typeof b[k] === "string" && /^\d{4}-\d{2}-\d{2}$/.test(b[k] as string) ? b[k] : null;
        }
        if (typeof b.password === "string") {
          if (b.password.length < 10) return fail("password_too_short");
          patch.password_hash = hashPassword(b.password);
        }
        if (self && (patch.active === false || patch.role === "agent")) return fail("cannot_demote_self");
      }
      if (!Object.keys(patch).length) return fail("empty_patch");
      const { data, error } = await db.from("crm_users").update(patch).eq("id", id)
        .select("id, email, full_name, role, active, slab_pct, quarterly_target_aed, phone, languages, specialties, bio, avatar_url, brn_no, brn_expiry, visa_expiry, emirates_id_expiry, rera_cert_date").single();
      return error ? fail(error.message, 502) : ok({ user: data });
    }
  }
  return fail("not_found", 404);
}

export async function DELETE(request: NextRequest, { params }: Ctx) {
  const s = await setup(request);
  if ("error" in s) return s.error;
  const { user, db } = s;
  const { resource } = await params;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return fail("missing_id");

  if (resource === "properties") {
    const { data } = await db.from("crm_properties").select("contact_id").eq("id", id).maybeSingle();
    if (!data || !(await canAccess(db, user, "crm_contacts", data.contact_id as string, "owner_id"))) return fail("forbidden", 403);
    await db.from("crm_properties").delete().eq("id", id);
    return ok({});
  }
  if (resource === "tasks") {
    if (!(await canAccess(db, user, "crm_tasks", id, "assignee_id"))) return fail("forbidden", 403);
    await db.from("crm_tasks").delete().eq("id", id);
    return ok({});
  }
  return fail("not_found", 404);
}
