import { OWNER_EMAIL, audit, rest, type Env } from "./core";
import { login, logout, signedIn } from "./auth";
import { ask, budgetUsd, chatsToday, dailyCap, decide, loadProposals, spendThisMonth } from "./engine";
import { ROSTER, byId } from "./roster";
import { handleUpdate, secretOk } from "./telegram";
import { agentPage, homePage, loginPage } from "./ui";

const SECURITY = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};

const html = (body: string, status = 200) => new Response(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", ...SECURITY } });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...SECURITY } });

export default {
  async fetch(req: Request, env: Env, ctx: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    /* Telegram talks to this address only, and only with the secret it was given. */
    if (path === "/tg" && req.method === "POST") {
      if (!secretOk(env, req.headers.get("x-telegram-bot-api-secret-token"))) return new Response("no", { status: 401 });
      const update = (await req.json().catch(() => null)) as Record<string, unknown> | null;
      if (update) ctx.waitUntil(handleUpdate(env, update).catch((e) => console.error("[tg]", e instanceof Error ? e.message : e)));
      return new Response("ok");
    }

    if (path === "/api/login" && req.method === "POST") return login(req, env);
    if (path === "/api/logout" && req.method === "POST") return logout();

    const uid = await signedIn(req, env);
    if (!uid) return path.startsWith("/api/") ? json({ ok: false, error: "unauthorised" }, 401) : html(loginPage(), path === "/" ? 200 : 401);

    // Everything below needs the owner's session, and a same-site origin for anything that changes state.
    if (req.method === "POST") {
      const origin = req.headers.get("origin");
      if (origin && origin !== url.origin) return json({ ok: false, error: "bad_origin" }, 403);
    }
    const user = await rest(env, `crm_users?select=id&id=eq.${encodeURIComponent(uid)}&email=eq.${encodeURIComponent(OWNER_EMAIL)}&active=eq.true&role=eq.admin&limit=1`);
    if (!Array.isArray(user.data) || !user.data.length) return json({ ok: false, error: "unauthorised" }, 401);

    if (path === "/" && req.method === "GET") {
      const pending = new Map<string, number>();
      for (const p of await loadProposals(env)) if (!p.decision) pending.set(p.agent, (pending.get(p.agent) ?? 0) + 1);
      const [spend, today] = await Promise.all([spendThisMonth(env), chatsToday(env)]);
      return html(homePage(pending, { waiting: [...pending.values()].reduce((x, y) => x + y, 0), today, spend: spend.usd, budget: budgetUsd(env), telegram: !!env.TELEGRAM_CHAT_ID }));
    }

    const m = /^\/a\/([a-z0-9]+)$/.exec(path);
    if (m && req.method === "GET") {
      const a = byId(m[1]);
      if (!a) return html(loginPage(), 404);
      const [props, chat] = await Promise.all([
        loadProposals(env).then((all) => all.filter((p) => p.agent === a.id)),
        rest(env, `crm_audit?select=detail&entity=eq.agent_chat&order=created_at.desc&limit=30`),
      ]);
      const rows = (Array.isArray(chat.data) ? chat.data : []) as { detail: { role: string; text: string; to?: string; agent?: string } }[];
      const mine = rows.filter((r) => (r.detail.role === "user" ? r.detail.to === a.id : r.detail.agent === a.id)).reverse().map((r) => ({ role: r.detail.role, text: r.detail.text }));
      return html(agentPage(a, props, mine));
    }

    if (path === "/api/chat" && req.method === "POST") {
      const b = (await req.json().catch(() => ({}))) as { agent?: string; text?: string };
      const a = byId(String(b.agent));
      const text = String(b.text ?? "").trim().slice(0, 3000);
      if (!a || !text) return json({ ok: false, error: "invalid" }, 400);
      if ((await chatsToday(env)) >= dailyCap(env)) return json({ ok: false, error: "daily_cap" }, 429);
      try {
        const r = await ask(env, a, text, "office");
        return json({ ok: true, text: r.text, proposals: r.proposals });
      } catch (e) {
        if (e instanceof Error && e.message === "budget") return json({ ok: false, error: "budget" }, 402);
        return json({ ok: false, error: "upstream" }, 502);
      }
    }

    if (path === "/api/decide" && req.method === "POST") {
      const b = (await req.json().catch(() => ({}))) as { id?: string; outcome?: string; text?: string };
      if (!b.id || (b.outcome !== "approved" && b.outcome !== "rejected")) return json({ ok: false, error: "invalid" }, 400);
      const r = await decide(env, b.id, b.outcome, { text: b.text });
      await audit(env, "agent_log", "decision", { id: b.id, outcome: b.outcome, via: "office" }, uid);
      return json(r, r.ok ? 200 : 409);
    }

    void ROSTER;
    return json({ ok: false, error: "not_found" }, 404);
  },
};
