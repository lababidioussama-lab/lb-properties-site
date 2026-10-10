import { OWNER_EMAIL, audit, rest, type Env } from "./core";
import { login, logout, signedIn } from "./auth";
import { ask, budgetUsd, chatsToday, dailyCap, decide, loadProposals, meeting, officeLog, spendThisMonth } from "./engine";
import { ROSTER, byId } from "./roster";
import { handleUpdate, secretOk } from "./telegram";
import { agentPage, homePage, loginPage } from "./ui";
import { makePdf } from "./pdf";

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
      if (!update) return new Response("ok");
      /* Telegram repeats an update it thinks was not received. Each one is handled once. */
      const uid = String(update.update_id ?? "");
      if (uid) {
        const seen = await rest(env, `crm_audit?select=id&entity=eq.agent_inbox&action=eq.update&detail->>id=eq.${encodeURIComponent(uid)}&limit=1`);
        if (Array.isArray(seen.data) && seen.data.length) return new Response("ok");
        await audit(env, "agent_inbox", "update", { id: uid });
      }
      /* A long draft can take a minute. The request stays open while the colleague works (up to 50 s),
         and the platform then allows the remainder to finish in the background. */
      const work = handleUpdate(env, update).catch((e) => console.error("[tg]", e instanceof Error ? e.message : e));
      ctx.waitUntil(work);
      await Promise.race([work, new Promise((r) => setTimeout(r, 50_000))]);
      return new Response("ok");
    }

    if (path === "/api/login" && req.method === "POST") return login(req, env);
    if (path === "/api/logout" && req.method === "POST") return logout();

    const uid = await signedIn(req, env);
    /* Not signed in: the API says so; any page goes to the sign-in form. A page never answers 401,
       because the browser then shows its own "access denied" screen instead of the form. */
    const toSignIn = () => new Response(null, { status: 302, headers: { Location: "/", "Cache-Control": "no-store", "Set-Cookie": "lb_agents=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict" } });
    if (!uid) return path.startsWith("/api/") ? json({ ok: false, error: "unauthorised" }, 401) : path === "/" ? html(loginPage()) : toSignIn();

    // Everything below needs the owner's session, and a same-site origin for anything that changes state.
    if (req.method === "POST") {
      const origin = req.headers.get("origin");
      if (origin && origin !== url.origin) return json({ ok: false, error: "bad_origin" }, 403);
    }
    const user = await rest(env, `crm_users?select=id&id=eq.${encodeURIComponent(uid)}&email=eq.${encodeURIComponent(OWNER_EMAIL)}&active=eq.true&role=eq.admin&limit=1`);
    if (!Array.isArray(user.data) || !user.data.length) {
      if (path.startsWith("/api/")) return json({ ok: false, error: "unauthorised" }, 401);
      // The account check failed (or the database did not answer): show the sign-in form rather than an error.
      return path === "/" ? new Response(loginPage(), { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", ...SECURITY, "Set-Cookie": "lb_agents=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict" } }) : toSignIn();
    }

    if (path === "/" && req.method === "GET") {
      const pending = new Map<string, number>();
      for (const p of await loadProposals(env)) if (!p.decision) pending.set(p.agent, (pending.get(p.agent) ?? 0) + 1);
      const [spend, today, log] = await Promise.all([spendThisMonth(env), chatsToday(env), officeLog(env)]);
      return html(homePage(pending, { waiting: [...pending.values()].reduce((x, y) => x + y, 0), today, spend: spend.usd, budget: budgetUsd(env), telegram: !!env.TELEGRAM_CHAT_ID, log }));
    }

    const m = /^\/a\/([a-z0-9]+)$/.exec(path);
    if (m && req.method === "GET") {
      const a = byId(m[1]);
      if (!a) return new Response(null, { status: 302, headers: { Location: "/" } });
      const [props, chat] = await Promise.all([
        loadProposals(env).then((all) => all.filter((p) => p.agent === a.id)),
        rest(env, `crm_audit?select=detail&entity=eq.agent_chat&order=created_at.desc&limit=30`),
      ]);
      const rows = (Array.isArray(chat.data) ? chat.data : []) as { detail: { role: string; text: string; to?: string; agent?: string } }[];
      const mine = rows.filter((r) => (r.detail.role === "user" ? r.detail.to === a.id : r.detail.agent === a.id)).reverse().map((r) => ({ role: r.detail.role, text: r.detail.text }));
      return html(agentPage(a, props, mine));
    }

    if (path === "/api/meeting" && (req.method === "GET" || req.method === "POST")) {
      const m = await meeting(env, req.method === "POST");
      return m ? json({ ok: true, at: m.at, lines: m.lines }) : json({ ok: false, error: (await spendThisMonth(env)).usd >= budgetUsd(env) ? "budget" : "upstream" }, 200);
    }

    if (path === "/api/pdf" && req.method === "GET") {
      const p = (await loadProposals(env)).find((x) => x.id === url.searchParams.get("id"));
      if (!p) return json({ ok: false, error: "not_found" }, 404);
      const made = makePdf(p.title, p.draft.text ?? "", `DRAFT for review - not valid until signed - prepared by ${byId(p.agent)?.name ?? "staff"} (AI), Lababidi Properties`);
      return new Response(made.bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="draft.pdf"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
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
    // An address that does not exist goes back to the office rather than to an error screen.
    return path.startsWith("/api/") ? json({ ok: false, error: "not_found" }, 404) : new Response(null, { status: 302, headers: { Location: "/" } });
  },
};
