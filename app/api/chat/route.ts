import { clientIp as clientAddress } from "@/lib/client";
import { NextResponse, type NextRequest } from "next/server";
import { buildSystemPrompt } from "@/lib/agent-knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------------------------------------------------------------------
   The key never leaves the server. ANTHROPIC_API_KEY has no NEXT_PUBLIC_
   prefix, so it cannot be inlined into the client bundle, and the browser only
   ever talks to this route. Calling Claude directly from the client would
   publish the key to anyone who opens devtools.
   ------------------------------------------------------------------------ */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-5-5";

/* This chat is open to the public and every answer costs money, so the whole
   site shares a daily allowance (CHAT_DAILY_CAP, 150 answers a day unless set).
   The count is kept in a Cloudflare key-value store (CHAT_BUDGET); where there
   is none (a developer's machine) there is no cap. */
const DAILY_CAP = Math.max(1, Number(process.env.CHAT_DAILY_CAP) || 150);

async function takeFromDailyAllowance(): Promise<boolean> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const kv = (getCloudflareContext().env as { CHAT_BUDGET?: { get: (k: string) => Promise<string | null>; put: (k: string, v: string, o: { expirationTtl: number }) => Promise<void> } }).CHAT_BUDGET;
    if (!kv) return true;
    const day = new Date(Date.now() + 4 * 3_600_000).toISOString().slice(0, 10); // the Dubai day
    const key = `chat:${day}`;
    const used = Number((await kv.get(key)) ?? 0);
    if (used >= DAILY_CAP) return false;
    await kv.put(key, String(used + 1), { expirationTtl: 172_800 });
    return true;
  } catch (cause) {
    console.error("[chat] daily allowance unavailable:", cause);
    return true; // a broken counter should not take the chat down
  }
}

/* Tighter than the lead route: a chat turn costs real tokens, and an
   unattended script left looping is the expensive failure mode here. */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5_000) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }
  return recent.length > MAX_PER_WINDOW;
}

const clientIp = (request: NextRequest): string => clientAddress(request.headers);

interface Turn {
  role: "user" | "assistant";
  content: string;
}

/** Caps on what a client may send, so one request cannot buy a huge bill. */
const MAX_MESSAGE_CHARS = 1_500;
const MAX_HISTORY_TURNS = 12;

export async function POST(request: NextRequest) {
  if (rateLimited(clientIp(request))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: { messages?: unknown; locale?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ ok: false, error: "no_messages" }, { status: 400 });
  }

  // Re-validate every turn rather than trusting the shape sent by the client:
  // the history is round-tripped through the browser and is fully editable
  // there, so a crafted "assistant" turn could otherwise be used to talk the
  // model past its brief.
  const history: Turn[] = [];
  for (const raw of body.messages.slice(-MAX_HISTORY_TURNS)) {
    if (typeof raw !== "object" || raw === null) continue;
    const { role, content } = raw as Partial<Turn>;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string" || !content.trim()) continue;
    history.push({ role, content: content.slice(0, MAX_MESSAGE_CHARS) });
  }

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return NextResponse.json({ ok: false, error: "no_messages" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  // Claude wants the turns to alternate and to start with the visitor: drop a
  // leading greeting from the assistant and join any two turns in a row.
  const turns: Turn[] = [];
  for (const turn of history) {
    if (turns.length === 0 && turn.role !== "user") continue;
    const last = turns[turns.length - 1];
    if (last && last.role === turn.role) last.content += `

${turn.content}`;
    else turns.push({ ...turn });
  }

  if (!(await takeFromDailyAllowance())) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const locale = typeof body.locale === "string" ? body.locale : "en";

  try {
    const upstream = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        // The brief is the same for every visitor, so it is cached: after the
        // first answer it is billed at a tenth of the normal input price.
        system: [{ type: "text", text: buildSystemPrompt(locale), cache_control: { type: "ephemeral" } }],
        messages: turns,
        temperature: 0.3, // Low: this answers factual questions about stock.
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      // Logged, never returned: the upstream body can echo request details.
      console.error("[chat] anthropic %s: %s", upstream.status, detail.slice(0, 400));
      return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
    }

    const data = (await upstream.json()) as { content?: { type?: string; text?: string }[] };
    const reply = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("").trim();
    if (!reply) {
      return NextResponse.json({ ok: false, error: "empty" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, reply });
  } catch (cause) {
    console.error("[chat] request failed:", cause);
    return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  }
}
