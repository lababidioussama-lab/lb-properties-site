import path from "node:path";
import { createDecipheriv, pbkdf2Sync } from "node:crypto";
import { gunzipSync } from "node:zlib";

/**
 * The Documents suite, served only to a signed-in admin.
 *
 * The file in the repository stays encrypted (AES-256-GCM over gzip, key from
 * PBKDF2-SHA256) — the same format the page has always used — so the repo and
 * any copy of it never hold the documents in the clear. The admin's
 * email-password-code sign-in is the only lock: the server decrypts the suite
 * itself with DOCUMENTS_PASSWORD, or with ADMIN_PASSWORD when the suite is
 * locked with the admin's password. If neither opens it, the encrypted page
 * is served and asks for its password as before.
 */

export const SUITE_FILE = path.join(process.cwd(), "private", "documents", "suite.html");

let cache: { salt: string; html: string } | null = null;

/* The suite file: on Cloudflare it lives in a private key-value store that has no
   web address; anywhere else it is read from disk. */
async function readSuite(): Promise<string> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const store = (getCloudflareContext().env as { PRIVATE_FILES?: { get: (k: string, type: "text") => Promise<string | null> } }).PRIVATE_FILES;
    const text = await store?.get("suite.html", "text");
    if (text) return text;
  } catch { /* not running on Cloudflare */ }
  const { readFile } = await import("node:fs/promises");
  return readFile(SUITE_FILE, "utf8");
}

export function decryptSuite(page: string, password: string): string | null {
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

/** The suite file's raw bytes, from the private store on Cloudflare or from disk elsewhere. */
async function readSuiteBytes(): Promise<ArrayBuffer> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const store = (getCloudflareContext().env as { PRIVATE_FILES?: { get: (k: string, type: "arrayBuffer") => Promise<ArrayBuffer | null> } }).PRIVATE_FILES;
    const bytes = await store?.get("suite.html", "arrayBuffer");
    if (bytes) return bytes;
  } catch { /* not running on Cloudflare */ }
  const { readFile } = await import("node:fs/promises");
  const buf = await readFile(SUITE_FILE);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/**
 * The page to send to a signed-in admin. When SUITE_SERVICE_URL is set (the
 * Cloudflare setup), the heavy unlocking is done by the Supabase Edge Function
 * in supabase/functions/suite and its answer is passed straight through, so
 * this server spends almost no computing time. Otherwise it unlocks the file
 * itself, as loadSuite does.
 */
export async function openSuite(): Promise<{ body: string | ReadableStream<Uint8Array>; unlocked: boolean }> {
  const url = process.env.SUITE_SERVICE_URL;
  const key = process.env.PASSWORD_SERVICE_SECRET;
  if (url && key) {
    const bytes = await readSuiteBytes();
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "x-hash-secret": key, "Content-Type": "text/html" },
        body: bytes,
        signal: AbortSignal.timeout(25_000),
      });
      if (res.ok && res.body) return { body: res.body, unlocked: true };
      console.error(`[documents] the unlock service answered ${res.status}; serving the locked page.`);
    } catch (e) {
      console.error("[documents] the unlock service is unreachable:", e instanceof Error ? e.message : e);
    }
    return { body: new TextDecoder().decode(bytes), unlocked: false };
  }
  const { html, unlocked } = await loadSuite();
  return { body: html, unlocked };
}

export async function loadSuite(): Promise<{ html: string; unlocked: boolean }> {
  const page = await readSuite();
  /* The key that opens the file: DOCUMENTS_PASSWORD when it is set, and
     otherwise the admin's own setup password, since the suite is locked with
     the same one. Either way the admin never types it a second time. */
  const keys = [process.env.DOCUMENTS_PASSWORD, process.env.ADMIN_PASSWORD].filter((k): k is string => !!k);
  if (!keys.length) return { html: page, unlocked: false };

  const salt = /var S="([^"]+)"/.exec(page)?.[1] ?? "";
  if (cache?.salt === salt) return { html: cache.html, unlocked: true };

  for (const key of keys) {
    const html = decryptSuite(page, key);
    if (html) {
      cache = { salt, html };
      return { html, unlocked: true };
    }
  }
  console.error("[documents] neither DOCUMENTS_PASSWORD nor ADMIN_PASSWORD opens the suite; serving the locked page.");
  return { html: page, unlocked: false };
}
