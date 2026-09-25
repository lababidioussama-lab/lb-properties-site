import { NextResponse, type NextRequest } from "next/server";
import { buildSystemPrompt } from "@/lib/agent-knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------------------------------------------------------------------
   The key never leaves the server. GROQ_API_KEY has no NEXT_PUBLIC_ prefix,
   so it cannot be inlined into the client bundle, and the browser only ever
   talks to this route. Calling Groq directly from the client would publish
   the key to anyone who opens devtools.
   ------------------------------------------------------------------------ */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

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

function clientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

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

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const locale = typeof body.locale === "string" ? body.locale : "en";

  try {
    const upstream = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Groq sits behind Cloudflare, which has been observed returning
        // 403 "error code: 1010" to requests with a default client UA.
        "User-Agent": "Mozilla/5.0 (compatible; LBPropertiesConcierge/1.0)",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: buildSystemPrompt(locale) },
          ...history,
        ],
        temperature: 0.3, // Low: this answers factual questions about stock.
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      // Logged, never returned: the upstream body can echo request details.
      console.error("[chat] groq %s: %s", upstream.status, detail.slice(0, 400));
      return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
    }

    const data = (await upstream.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return NextResponse.json({ ok: false, error: "empty" }, { status: 502 });
    }

    return NextResponse.json({ ok: true, reply });
  } catch (cause) {
    console.error("[chat] request failed:", cause);
    return NextResponse.json({ ok: false, error: "upstream" }, { status: 502 });
  }
}
