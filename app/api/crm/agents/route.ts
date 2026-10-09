import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseAdmin, LEADS_TABLE } from "@/lib/supabase";
import { liveUser, sameOrigin, sessionFromRequest } from "@/lib/crm-auth";
import { toInternational } from "@/lib/dbsearch/model";
import {
  AGENT_ENTITY, BRIEFING_SYSTEM, LISTING_SYSTEM, MODEL, REPLY_SYSTEM, agentsConfigured, askClaude, dailyCap, draftsToday,
  fileProposal, jsonIn, loadDesk, mailToAdmin, type AgentKind, type Proposal,
} from "@/lib/agents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The AI agents' desk, for the admin only.
 *
 *   GET  ?view=count                         → how many drafts wait for a decision
 *   GET                                      → waiting drafts, recent decisions, today's use
 *   POST { action: "draft_reply",   lead_id, goal? }
 *   POST { action: "draft_listing", listing_id }
 *   POST { action: "briefing" }
 *   POST { action: "decide", id, decision: "approve" | "reject", final?, send_email?, note? }
 *
 * Drafting only files a proposal. Only "decide" with "approve" ever changes
 * anything in the CRM, and only by what the admin approved (their edited text).
 */

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });
const ok = (body: Record<string, unknown>) => NextResponse.json({ ok: true, ...body }, { headers: { "Cache-Control": "no-store" } });
const dbFail = (error: { message: string }) => { console.error("[agents] database:", error.message); return fail("server_error", 502); };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

async function admin(request: NextRequest) {
  if (!sameOrigin(request)) return { error: fail("bad_origin", 403) } as const;
  const me = await liveUser(sessionFromRequest(request));
  if (!me) return { error: fail("unauthorised", 401) } as const;
  if (me.role !== "admin") return { error: fail("forbidden", 403) } as const;
  const db = getSupabaseAdmin();
  if (!db) return { error: fail("not_configured", 503) } as const;
  return { me, db } as const;
}

export async function GET(request: NextRequest) {
  const g = await admin(request);
  if ("error" in g) return g.error;
  const { db } = g;
  try {
    const desk = await loadDesk(db);
    const waiting = desk.filter((p) => !p.decision);
    if (new URL(request.url).searchParams.get("view") === "count") return ok({ pending: waiting.length });
    const used = await draftsToday(db);
    const since = Date.now() - 86_400_000;
    const last24 = desk.filter((p) => Date.parse(p.created_at) > since);
    return ok({
      configured: agentsConfigured(), model: MODEL,
      waiting: waiting.reverse(), // oldest first: the one waiting longest is first
      decided: desk.filter((p) => p.decision).slice(0, 40),
      usage: { drafts_today: used, cap: dailyCap(), tokens_24h: { in: last24.reduce((t, p) => t + p.tokens.in, 0), out: last24.reduce((t, p) => t + p.tokens.out, 0) } },
    });
  } catch (e) {
    return dbFail({ message: e instanceof Error ? e.message : "desk" });
  }
}

export async function POST(request: NextRequest) {
  const g = await admin(request);
  if ("error" in g) return g.error;
  const { me, db } = g;
  const b = ((await request.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  const action = clip(b.action, 20);

  if (action === "decide") return decide(db, me.id, b);

  if (action !== "draft_reply" && action !== "draft_listing" && action !== "briefing") return fail("unknown_action");
  if (!agentsConfigured()) return fail("not_configured", 503);
  if ((await draftsToday(db)) >= dailyCap()) return fail("daily_cap", 429);

  try {
    if (action === "draft_reply") return await draftReply(db, me.id, clip(b.lead_id, 60), clip(b.goal, 300));
    if (action === "draft_listing") return await draftListing(db, me.id, clip(b.listing_id, 60));
    return await draftBriefing(db, me.id);
  } catch (e) {
    const code = e instanceof Error ? e.message : "";
    if (code === "upstream" || code === "empty") return fail("upstream", 502);
    console.error("[agents] drafting failed:", e);
    return fail("server_error", 502);
  }
}

/* ---------------------------------------------------------------- drafts */

type Db = NonNullable<ReturnType<typeof getSupabaseAdmin>>;

async function finish(db: Db, by: string, kind: AgentKind, title: string, target: Proposal["target"], draft: Record<string, unknown>, facts: Record<string, unknown>, used: { tokensIn: number; tokensOut: number }) {
  const id = await fileProposal(db, by, { kind, title, target, draft, facts, tokens: { in: used.tokensIn, out: used.tokensOut } });
  if (!id) return fail("server_error", 502);
  return ok({ id, kind, title, draft });
}

async function draftReply(db: Db, by: string, leadId: string, goal: string) {
  if (!UUID.test(leadId)) return fail("lead_required");
  const { data: lead, error } = await db.from(LEADS_TABLE).select("*").eq("id", leadId).maybeSingle();
  if (error) return dbFail(error);
  if (!lead) return fail("not_found", 404);

  // Someone who asked not to be contacted gets no draft at all.
  const phone = toInternational(String(lead.phone ?? ""));
  if (phone) {
    const { data: stop } = await db.from("wa_consent").select("opted_out_at").eq("phone", phone).not("opted_out_at", "is", null).limit(1);
    if (stop?.length) return fail("do_not_contact", 409);
  }

  const { data: acts } = await db.from("crm_activities").select("kind, body, created_at").eq("lead_id", leadId).order("created_at", { ascending: false }).limit(6);
  const facts = {
    name: clip(lead.full_name, 80), language: clip(lead.locale, 8) || "en", source: clip(lead.source, 60), stage: lead.stage,
    asked_for: { service: clip(lead.service, 60), kind: lead.deal_kind, property_type: clip(lead.property_type, 40), bedrooms: clip(lead.beds, 20), budget_aed: lead.budget_aed, location: clip(lead.location, 80), readiness: lead.ready_status },
    their_message_or_notes: clip(lead.notes, 800),
    recent_activity: (acts ?? []).map((a) => `${a.kind}: ${clip(a.body, 160)}`),
  };
  const out = await askClaude(REPLY_SYSTEM, JSON.stringify({ lead: facts, what_the_owner_wants_from_this_reply: goal || "a good first reply" }), 600);
  const j = jsonIn(out.text);
  const reply = clip(j?.reply, 1500);
  if (!reply) return fail("empty", 502);
  const draft = { reply, language: clip(j?.language, 8) || "en", next_step: clip(j?.next_step, 300), phone: String(lead.phone ?? "") };
  return finish(db, by, "reply", `Reply to ${facts.name || "a lead"}`, { type: "lead", id: leadId, label: facts.name || "Lead" }, draft, facts, out);
}

async function draftListing(db: Db, by: string, listingId: string) {
  if (!UUID.test(listingId)) return fail("listing_required");
  const { data: l, error } = await db.from("crm_listings").select("*").eq("id", listingId).maybeSingle();
  if (error) return dbFail(error);
  if (!l) return fail("not_found", 404);
  const facts = {
    title_now: clip(l.title, 160), purpose: l.purpose, property_type: l.property_type, community: clip(l.community, 80), building: clip(l.building, 80),
    bedrooms: clip(l.bedrooms, 20), size_sqft: l.size_sqft, price_aed: l.price_aed, status: l.status, exclusive: !!l.exclusive,
    permit_status: l.permit_status, photos_on_file: Array.isArray(l.photos) ? l.photos.length : 0, description_now: clip(l.description, 600),
  };
  const out = await askClaude(LISTING_SYSTEM, JSON.stringify({ listing: facts }), 1100);
  const j = jsonIn(out.text);
  const en = clip(j?.description_en, 1500), ar = clip(j?.description_ar, 2000);
  if (!en) return fail("empty", 502);
  const check = Array.isArray(j?.check) ? (j!.check as unknown[]).map((c) => clip(c, 160)).filter(Boolean).slice(0, 6) : [];
  const draft = { title: clip(j?.title, 100) || facts.title_now, description_en: en, description_ar: ar, check };
  return finish(db, by, "listing", `Advert text for ${facts.title_now || "a listing"}`, { type: "listing", id: listingId, label: facts.title_now || "Listing" }, draft, facts, out);
}

async function draftBriefing(db: Db, by: string) {
  const now = new Date();
  const iso = now.toISOString();
  const in36h = new Date(now.getTime() + 36 * 3_600_000).toISOString();
  const in30d = new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10);
  const today = iso.slice(0, 10);
  const open = ["new", "contacted", "viewing", "offer"];
  const [fresh, overdue, tasks, events, people, permits, failed] = await Promise.allSettled([
    db.from(LEADS_TABLE).select("full_name, source, created_at", { count: "exact" }).eq("stage", "new").is("owner_id", null).order("created_at", { ascending: true }).limit(5),
    db.from(LEADS_TABLE).select("full_name, stage, next_follow_up_at", { count: "exact" }).in("stage", open).lt("next_follow_up_at", iso).order("next_follow_up_at", { ascending: true }).limit(5),
    db.from("crm_tasks").select("title, due_at", { count: "exact" }).is("done_at", null).lt("due_at", in36h).order("due_at", { ascending: true }).limit(6),
    db.from("crm_events").select("title, kind, starts_at").eq("status", "scheduled").gte("starts_at", iso).lt("starts_at", in36h).order("starts_at", { ascending: true }).limit(6),
    db.from("crm_users").select("full_name, brn_expiry, visa_expiry, emirates_id_expiry").eq("active", true),
    db.from("crm_listings").select("title, permit_expiry").not("permit_expiry", "is", null).lt("permit_expiry", in30d).limit(6),
    db.from("crm_audit").select("id", { count: "exact", head: true }).eq("entity", "session").eq("action", "login_failed").gte("created_at", new Date(now.getTime() - 86_400_000).toISOString()),
  ]);
  const val = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);
  const rowsOf = (r: ReturnType<typeof val<{ data: unknown[] | null; count?: number | null }>>) => (r?.data ?? []) as Record<string, unknown>[];
  const f = val(fresh), o = val(overdue), t = val(tasks), p = val(people);
  const expiring: string[] = [];
  for (const u of (p?.data ?? []) as Record<string, string | null>[]) {
    for (const [label, key] of [["BRN", "brn_expiry"], ["Visa", "visa_expiry"], ["Emirates ID", "emirates_id_expiry"]] as const) {
      const d = u[key];
      if (d && d <= in30d) expiring.push(`${u.full_name}: ${label} ${d < today ? "expired" : "expires"} ${d}`);
    }
  }
  const facts = {
    date: today,
    new_enquiries_nobody_has_claimed: { count: f?.count ?? 0, oldest: rowsOf(f).map((r) => `${r.full_name} (${r.source ?? "?"}, ${String(r.created_at).slice(0, 10)})`) },
    follow_ups_overdue: { count: o?.count ?? 0, oldest: rowsOf(o).map((r) => `${r.full_name} (${r.stage}, due ${String(r.next_follow_up_at).slice(0, 10)})`) },
    tasks_due_or_overdue: { count: t?.count ?? 0, items: rowsOf(t).map((r) => `${r.title} (${String(r.due_at ?? "").slice(0, 10)})`) },
    viewings_and_meetings_next_36h: rowsOf(val(events)).map((r) => `${r.kind}: ${r.title} at ${String(r.starts_at).replace("T", " ").slice(0, 16)} UTC`),
    licences_and_ids_expiring_within_30_days: expiring.slice(0, 8),
    listing_permits_expiring_within_30_days: rowsOf(val(permits)).map((r) => `${r.title} (${r.permit_expiry})`),
    wrong_password_attempts_last_24h: (val(failed) as { count?: number | null } | null)?.count ?? 0,
  };
  const out = await askClaude(BRIEFING_SYSTEM, JSON.stringify({ facts }), 600);
  const text = clip(jsonIn(out.text)?.briefing, 1500);
  if (!text) return fail("empty", 502);
  return finish(db, by, "briefing", `Briefing for ${today}`, { type: "office", id: null, label: "Office" }, { briefing: text }, facts, out);
}

/* -------------------------------------------------------------- decisions */

async function decide(db: Db, by: string, b: Record<string, unknown>) {
  const id = clip(b.id, 60);
  const decision = clip(b.decision, 10);
  if (!UUID.test(id) || (decision !== "approve" && decision !== "reject")) return fail("bad_request");

  let desk: Proposal[];
  try { desk = await loadDesk(db); } catch (e) { return dbFail({ message: e instanceof Error ? e.message : "desk" }); }
  const p = desk.find((x) => x.id === id);
  if (!p) return fail("not_found", 404);
  if (p.decision) return fail("already_decided", 409);

  const note = clip(b.note, 300);
  if (decision === "reject") {
    const { error } = await db.from("crm_audit").insert({ user_id: by, entity: AGENT_ENTITY, entity_id: p.target.id, action: "rejected", detail: { proposal_id: id, kind: p.kind, note } });
    return error ? dbFail(error) : ok({ id, outcome: "rejected" });
  }

  // Approve: apply exactly what the admin approved, which may be their edit of the draft.
  const final = (b.final && typeof b.final === "object" ? (b.final as Record<string, unknown>) : {}) as Record<string, unknown>;
  let applied = "";
  const out: Record<string, unknown> = {};

  if (p.kind === "reply") {
    const text = clip(final.reply ?? p.draft.reply, 1500);
    if (!text || !p.target.id) return fail("empty", 400);
    const { error } = await db.from("crm_activities").insert({ lead_id: p.target.id, user_id: by, kind: "note", body: `AI draft approved by the owner (not sent yet): ${text}` });
    if (error) return dbFail(error);
    Object.assign(final, { reply: text });
    const digits = String(p.draft.phone ?? "").replace(/\D/g, "");
    out.whatsapp = digits ? `https://wa.me/${toInternational(digits)}?text=${encodeURIComponent(text)}` : null;
    applied = "Kept in the lead's notes. Nothing was sent: use the WhatsApp button to send it yourself.";
  } else if (p.kind === "listing") {
    const title = clip(final.title ?? p.draft.title, 200);
    const en = clip(final.description_en ?? p.draft.description_en, 1600);
    const ar = clip(final.description_ar ?? p.draft.description_ar, 2200);
    if (!en || !p.target.id) return fail("empty", 400);
    const patch: Record<string, unknown> = { description: ar ? `${en}\n\n${ar}` : en };
    if (title) patch.title = title;
    const { error } = await db.from("crm_listings").update(patch).eq("id", p.target.id);
    if (error) return dbFail(error);
    Object.assign(final, { title, description_en: en, description_ar: ar });
    applied = "The listing's title and description were updated in the CRM. Nothing was published to any portal.";
  } else {
    const text = clip(final.briefing ?? p.draft.briefing, 1800);
    Object.assign(final, { briefing: text });
    if (b.send_email === true) {
      const sent = await mailToAdmin(`Lababidi briefing, ${String(p.facts.date ?? "")}`, text);
      applied = sent ? "Emailed to you." : "Approved, but the email could not be sent.";
    } else applied = "Approved. Not emailed.";
  }

  const { error } = await db.from("crm_audit").insert({ user_id: by, entity: AGENT_ENTITY, entity_id: p.target.id, action: "approved", detail: { proposal_id: id, kind: p.kind, final, applied, note } });
  if (error) return dbFail(error);
  return ok({ id, outcome: "approved", applied, ...out });
}
