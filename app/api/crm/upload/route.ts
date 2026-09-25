import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { liveUser, sameOrigin, sessionFromRequest } from "@/lib/crm-auth";
import { FILE_BUCKET, FILE_TYPES, MAX_UPLOAD_BYTES, fileUrl, looksLike, type FileKind } from "@/lib/crm-files";

export const runtime = "nodejs";

const fail = (error: string, status = 400) => NextResponse.json({ ok: false, error }, { status });

/** Upload one file (multipart: file, kind = avatar | doc, optional user_id for admins). */
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return fail("bad_origin", 403);
  const user = await liveUser(sessionFromRequest(request));
  if (!user) return fail("unauthorised", 401);
  const db = getSupabaseAdmin();
  if (!db) return fail("not_configured", 503);

  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64_000) return fail("too_large", 413);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const kind = form?.get("kind") as FileKind | null;
  if (!(file instanceof File) || (kind !== "avatar" && kind !== "doc")) return fail("file_required");
  if (file.size > MAX_UPLOAD_BYTES) return fail("too_large", 413);

  const type = FILE_TYPES[file.type];
  if (!type || !type.kinds.includes(kind)) return fail("unsupported_type", 415);
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!looksLike(file.type, bytes)) return fail("unsupported_type", 415);

  // Admins may file a document for another team member; everyone else only for themselves.
  const requested = form?.get("user_id");
  const ownerId = user.role === "admin" && typeof requested === "string" && /^[0-9a-f-]{36}$/.test(requested) ? requested : user.id;

  const path = `${kind === "avatar" ? "avatars" : "docs"}/${ownerId}/${randomBytes(16).toString("hex")}.${type.ext}`;
  const { error } = await db.storage.from(FILE_BUCKET).upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) return fail(error.message, 502);
  return NextResponse.json({ ok: true, url: fileUrl(path), name: file.name.slice(0, 200) });
}
