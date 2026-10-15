import { NextResponse, type NextRequest } from "next/server";

import { DOCS_COOKIE, liveUser, readDocsSession, sameOrigin } from "@/lib/crm-auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /documents/email — the Documents suite's "Email PDF" button.
 *
 * The page builds the PDF itself (as for Download PDF) and posts it here; it
 * is sent to the signed-in person's OWN email address, never to an address
 * typed on the page, so this cannot be used to send documents to anyone else.
 * Every send is recorded, and there is a cap per hour.
 */

const MAX_PDF_BASE64 = 2_000_000; // about 1.5 MB of PDF
const PER_HOUR = 20;

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return fail("bad_origin", 403);
  const session = await liveUser(readDocsSession(request.cookies.get(DOCS_COOKIE)?.value));
  if (!session) return fail("signin_required", 401);
  const db = getSupabaseAdmin();
  const key = process.env.RESEND_API_KEY;
  if (!db || !key) return fail("not_configured", 503);

  const b = (await request.json().catch(() => ({}))) as { pdf?: unknown; name?: unknown };
  const pdf = typeof b.pdf === "string" ? b.pdf.replace(/^data:application\/pdf;[^,]*,/, "") : "";
  if (!pdf || pdf.length > MAX_PDF_BASE64 || !/^[A-Za-z0-9+/=\s]+$/.test(pdf.slice(0, 200))) return fail(pdf.length > MAX_PDF_BASE64 ? "too_large" : "invalid", 400);
  const name = (typeof b.name === "string" ? b.name : "Document").replace(/[\\/:*?"<>|\r\n]+/g, "-").trim().slice(0, 120) || "Document";

  const since = new Date(Date.now() - 3_600_000).toISOString();
  const { count } = await db.from("crm_audit").select("id", { count: "exact", head: true }).eq("entity", "documents").eq("action", "emailed").eq("user_id", session.id).gte("created_at", since);
  if ((count ?? 0) >= PER_HOUR) return fail("rate_limited", 429);

  const { data: me } = await db.from("crm_users").select("email, full_name").eq("id", session.id).maybeSingle();
  const to = (me?.email as string | undefined)?.trim();
  if (!to) return fail("no_email", 400);

  const when = new Date().toLocaleString("en-GB", { timeZone: "Asia/Dubai", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.OTP_FROM || "Lababidi Properties CRM <security@lababidiproperties.com>",
      to: [to],
      subject: `${name}.pdf`,
      text: `${name}\n\nThe PDF is attached. Sent from Lababidi Documents on ${when} (Dubai).`,
      html: `<div style="font-family:Helvetica,Arial,sans-serif;background:#f4f3ef;padding:28px 16px"><div style="max-width:460px;margin:0 auto;background:#fff;border:1px solid #e7e5df;border-radius:12px;overflow:hidden"><div style="background:#0b1a2b;padding:18px 24px;color:#fff;letter-spacing:.18em;font-size:14px">LABABIDI <span style="color:#d4b87f;font-size:10px;letter-spacing:.3em">DOCUMENTS</span></div><div style="padding:24px;color:#464c55;font-size:14px;line-height:1.6"><p style="margin:0 0 6px;font-weight:700;color:#0b2a4a">${esc(name)}</p><p style="margin:0">The PDF is attached. Sent from Lababidi Documents on ${esc(when)} (Dubai).</p></div></div></div>`,
      attachments: [{ filename: `${name}.pdf`, content: pdf.replace(/\s+/g, "") }],
    }),
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!res?.ok) {
    console.error("[documents email] resend %s", res?.status ?? "no answer");
    return fail("email_failed", 502);
  }
  await db.from("crm_audit").insert({ user_id: session.id, entity: "documents", entity_id: null, action: "emailed", detail: { name, kb: Math.round((pdf.length * 3) / 4 / 1024) } });
  const shown = to.replace(/^(.).*(@.*)$/, "$1•••$2");
  return NextResponse.json({ ok: true, to: shown }, { headers: { "Cache-Control": "no-store" } });
}
