import { getSupabaseAdmin } from "./supabase";

/**
 * Security alerts to the owner's inbox: someone hammering a password, or
 * someone who has a password and is guessing the emailed code. One alert per
 * subject an hour, remembered in crm_audit like the other sign-in events, so
 * a sustained attack sends one email, not hundreds.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

export async function securityAlert(key: string, title: string, facts: [string, string | null | undefined][], advice: string) {
  const to = process.env.ADMIN_EMAIL?.trim();
  const db = getSupabaseAdmin();
  if (!to || !db || !process.env.RESEND_API_KEY) return;

  const since = new Date(Date.now() - 60 * 60_000).toISOString();
  const { data: sent } = await db.from("crm_audit").select("id").eq("entity", "session").eq("action", "alert_sent")
    .eq("detail->>key", key).gte("created_at", since).limit(1);
  if (sent?.length) return;
  await db.from("crm_audit").insert({ user_id: null, entity: "session", entity_id: null, action: "alert_sent", detail: { key, title } });

  const rows = facts.filter(([, v]) => v).map(([k, v]) =>
    `<tr><td style="padding:5px 0;color:#62676f;width:110px">${esc(k)}</td><td style="padding:5px 0;color:#1d2530">${esc(String(v))}</td></tr>`).join("");
  const when = new Date().toLocaleString("en-GB", { timeZone: "Asia/Dubai", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const html = `
  <div style="font-family:Helvetica,Arial,sans-serif;background:#f4f3ef;padding:32px 16px">
    <div style="max-width:460px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e7e5df">
      <div style="background:#7a1d14;padding:20px 28px;color:#ffffff;letter-spacing:.16em;font-size:14px">LABABIDI <span style="font-size:10px;letter-spacing:.28em;opacity:.85">SECURITY ALERT</span></div>
      <div style="padding:26px 28px">
        <p style="margin:0 0 14px;font-size:17px;font-weight:700;color:#1d2530">${esc(title)}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px;margin:0 0 16px"><tr><td style="padding:5px 0;color:#62676f;width:110px">When</td><td style="padding:5px 0;color:#1d2530">${esc(when)} (Dubai)</td></tr>${rows}</table>
        <p style="margin:0;color:#464c55;font-size:13px;line-height:1.6">${esc(advice)}</p>
        <p style="margin:14px 0 0;color:#7b8089;font-size:12px;line-height:1.6">Full detail is in the CRM under Team, Security. You will not get this same alert again for an hour.</p>
      </div>
    </div>
  </div>`;
  const text = `${title}\n${facts.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${advice}`;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.OTP_FROM || "Lababidi Properties CRM <security@lababidiproperties.com>", to: [to], subject: `Security alert: ${title}`, html, text }),
  }).catch(() => null);
}
