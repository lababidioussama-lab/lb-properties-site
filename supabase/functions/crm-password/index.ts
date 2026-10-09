// Supabase Edge Function: password hashing for the CRM.
//
// Why it exists: hashing a password takes about 40 ms of computing, more than
// Cloudflare's free plan allows per request. The CRM sends the password here
// instead, over HTTPS, and gets back a hash or a yes/no. It stores nothing and
// reads nothing from the database.
//
// Who may call it: only a caller holding this project's own service key (the
// CRM server does). Supabase checks the key's signature before the function
// runs, and the function then requires the exact key, so the public anon key
// is refused. No extra secret is needed.
import { Buffer } from "node:buffer";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (serviceKey.length < 40 || !same(bearer, serviceKey)) return json({ error: "forbidden" }, 403);

  let body: { op?: string; password?: unknown; stored?: unknown };
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  if (typeof body.password !== "string" || body.password.length > 200) return json({ error: "bad_password" }, 400);

  if (body.op === "hash") {
    const salt = randomBytes(16).toString("hex");
    return json({ hash: `${salt}:${scryptSync(body.password, salt, 64).toString("hex")}` });
  }
  if (body.op === "verify") {
    const [salt, hash] = String(body.stored ?? "").split(":");
    if (!salt || !hash) return json({ ok: false });
    return json({ ok: same(scryptSync(body.password, salt, 64).toString("hex"), hash) });
  }
  return json({ error: "unknown_op" }, 400);
});
