// Supabase Edge Function: opens the encrypted Documents suite for the CRM.
//
// Why it exists: unlocking the file takes about a quarter of a second of
// computing (a deliberately slow key derivation), far more than Cloudflare's
// free plan allows per request. The CRM, after it has checked that the person
// is the signed-in admin, sends the still-encrypted file here with the
// password; this function unlocks it and sends the page back. Nothing is stored
// and the password is used only for that one request.
//
// Who may call it: only a caller holding this project's own service key (the
// CRM server does); see the "password" function.
import { Buffer } from "node:buffer";
import { createDecipheriv, pbkdf2Sync, timingSafeEqual } from "node:crypto";
import { gunzipSync } from "node:zlib";

const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function same(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

function decrypt(page: string, password: string): string | null {
  const m = /var S="([^"]+)",I="([^"]+)",N=(\d+),C="([^"]+)"/.exec(page);
  if (!m) return null;
  const [, s, i, n, c] = m;
  try {
    const key = pbkdf2Sync(password, Buffer.from(s, "base64"), Number(n), 32, "sha256");
    const data = Buffer.from(c, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(i, "base64"));
    decipher.setAuthTag(data.subarray(data.length - 16));
    const zipped = Buffer.concat([decipher.update(data.subarray(0, data.length - 16)), decipher.final()]);
    return gunzipSync(zipped).toString("utf8");
  } catch {
    return null; // wrong password or a damaged file
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  const bearer = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (serviceKey.length < 40 || !same(bearer, serviceKey)) return new Response("forbidden", { status: 403 });

  const password = req.headers.get("x-documents-password") ?? "";
  if (!password || password.length > 200) return new Response("password needed", { status: 400 });

  const page = await req.text();
  if (page.length < 1000 || page.length > 12_000_000) return new Response("bad file", { status: 400 });

  const html = decrypt(page, password);
  if (!html) return new Response("that password does not open the file", { status: 422 });
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
});
