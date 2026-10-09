import { ROSTER, addressedTo, byId, type Agent } from "./roster";
import { ask, budgetUsd, chatsToday, dailyCap, decide, loadProposals, route, spendThisMonth } from "./engine";
import { audit, same, type Env } from "./core";

/**
 * Telegram: the owner's line to the whole office.
 *
 * One bot, locked to one chat (TELEGRAM_CHAT_ID). Anyone else who writes to it
 * is told it is private and nothing else happens. Say a colleague's first name
 * first ("Karim, who owns 2104 in Marina Gate?") to talk to them directly;
 * otherwise Omar routes it, in front of you. Every proposal arrives with
 * Approve and Reject buttons.
 */

async function tg(env: Env, method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(10_000) }).catch(() => null);
  return res?.ok ? ((await res.json().catch(() => null)) as { result?: { message_id?: number } } | null) : null;
}

const say = (env: Env, chat: number, text: string, extra: Record<string, unknown> = {}) => tg(env, "sendMessage", { chat_id: chat, text: text.slice(0, 3900), disable_web_page_preview: true, ...extra });

const head = (a: Agent) => `${a.name} · ${a.title}`;

async function sayAs(env: Env, chat: number, a: Agent, text: string) {
  const body = `${head(a)}\n\n${text}`;
  for (let i = 0; i < body.length; i += 3800) await say(env, chat, body.slice(i, i + 3800));
}

async function sendProposal(env: Env, chat: number, id: string) {
  const p = (await loadProposals(env, 2)).find((x) => x.id === id);
  if (!p) return;
  const a = byId(p.agent);
  const what = p.kind === "reply" ? "Saves this reply in the lead's notes (you send it yourself)." : p.kind === "listing" ? "Updates the listing's title and description in the CRM (nothing goes to portals)." : "Records this. Nothing else happens.";
  await say(env, chat, `📝 For your approval\nFrom ${a?.name ?? "staff"}: ${p.title}\n\n${p.draft.text ?? ""}${p.draft.description_ar ? `\n\n${p.draft.description_ar}` : ""}\n\nIf you approve: ${what}`, {
    reply_markup: { inline_keyboard: [[{ text: "✅ Approve", callback_data: `ok:${id}` }, { text: "✖ Reject", callback_data: `no:${id}` }]] },
  });
}

const HELP = `Your office is open. Talk to anyone by starting with their first name:\n• Karim, who owns unit 2104 in Marina Gate?\n• Layla, what should I do first today?\n• Ines, write the advert for my newest listing.\nIf you name nobody, Omar sends it to the right person.\n\n/team lists everyone · /pending shows what waits · /usage shows spend.`;

export async function handleUpdate(env: Env, update: Record<string, any>): Promise<void> {
  const allowed = env.TELEGRAM_CHAT_ID ? Number(env.TELEGRAM_CHAT_ID) : null;
  const msg = update.message ?? update.callback_query?.message;
  const from = update.message?.from ?? update.callback_query?.from;
  const chat: number | undefined = msg?.chat?.id;
  if (!chat) return;

  if (allowed === null || chat !== allowed || msg.chat.type !== "private") {
    // Nobody but the owner's own chat is served. Strangers are told once and logged for the owner to see.
    await audit(env, "agent_chat", "tg_unknown", { chat, username: from?.username ?? null, name: [from?.first_name, from?.last_name].filter(Boolean).join(" ") || null, paired: allowed !== null });
    if (update.message) await say(env, chat, "This is a private office. Nothing here is available to you.");
    return;
  }

  if (update.callback_query) {
    const q = update.callback_query;
    const [kind, id] = String(q.data ?? "").split(":");
    if ((kind === "ok" || kind === "no") && id) {
      const r = await decide(env, id, kind === "ok" ? "approved" : "rejected");
      await tg(env, "answerCallbackQuery", { callback_query_id: q.id, text: r.ok ? (kind === "ok" ? "Approved" : "Rejected") : r.message.slice(0, 190) });
      await tg(env, "editMessageReplyMarkup", { chat_id: chat, message_id: q.message.message_id, reply_markup: { inline_keyboard: [] } });
      await say(env, chat, `${r.ok ? (kind === "ok" ? "✅" : "✖") : "⚠️"} ${r.message}`);
    } else await tg(env, "answerCallbackQuery", { callback_query_id: q.id });
    return;
  }

  const text: string = String(update.message?.text ?? "").trim();
  if (!text) { await say(env, chat, "I can read text for now. Type it and I will pass it on."); return; }

  if (/^\/start\b/i.test(text) || /^\/help\b/i.test(text)) { await say(env, chat, HELP); return; }
  if (/^\/team\b/i.test(text)) {
    const lines = ROSTER.map((a) => `${a.emoji} ${a.name.split(" ")[0]} · ${a.title}`);
    await say(env, chat, `Your team of ${ROSTER.length} (all AI):\n\n${lines.join("\n")}`);
    return;
  }
  if (/^\/usage\b/i.test(text)) {
    const s = await spendThisMonth(env);
    await say(env, chat, `AI spend this month (estimate): $${s.usd.toFixed(2)} of $${budgetUsd(env)}\nCalls: ${s.calls}\nThe office stops by itself at the limit. The exact figure is on the Anthropic console.`);
    return;
  }
  if (/^\/pending\b/i.test(text)) {
    const waiting = (await loadProposals(env)).filter((p) => !p.decision);
    if (!waiting.length) { await say(env, chat, "Nothing is waiting for you."); return; }
    await say(env, chat, `${waiting.length} waiting for you:`);
    for (const p of waiting.slice(0, 8)) await sendProposal(env, chat, p.id);
    return;
  }

  if ((await chatsToday(env)) >= dailyCap(env)) { await say(env, chat, `Daily limit of ${dailyCap(env)} messages reached. It resets at midnight Dubai time.`); return; }

  await tg(env, "sendChatAction", { chat_id: chat, action: "typing" });
  try {
    const named = addressedTo(text);
    let agent: Agent;
    let body = text;
    if (named && named.rest) { agent = named.agent; body = named.rest; }
    else if (named && !named.rest) { await sayAs(env, chat, named.agent, `Yes, Oussama? Tell me what you need.`); return; }
    else {
      const omar = byId("coordinator")!;
      agent = await route(env, text);
      if (agent.id !== "md") await sayAs(env, chat, omar, `Passing this to ${agent.name.split(" ")[0]}, our ${agent.title}.`);
    }
    const reply = await ask(env, agent, body, "telegram");
    await sayAs(env, chat, agent, reply.text);
    for (const id of reply.proposals) await sendProposal(env, chat, id);
  } catch (e) {
    if (e instanceof Error && e.message === "budget") { await say(env, chat, `The monthly AI budget of $${budgetUsd(env)} has been reached, so the office has stopped. Raise the limit when you are ready and I will resume.`); return; }
    console.error("[telegram] failed:", e instanceof Error ? e.message : e);
    await say(env, chat, "⚠️ I could not reach the AI service just now. Nothing was done. Please try again in a minute.");
  }
}

export const secretOk = (env: Env, header: string | null) => !!header && !!env.TELEGRAM_WEBHOOK_SECRET && same(header, env.TELEGRAM_WEBHOOK_SECRET);
