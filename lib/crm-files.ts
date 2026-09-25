/**
 * CRM file storage (Supabase Storage, private bucket "crm-files").
 *
 * Files are never public. The browser only ever sees /api/crm/file?p=<path>,
 * which checks the CRM session on every request. Paths encode who a file
 * belongs to, so permissions follow from the path alone:
 *   avatars/<userId>/<random>.jpg   any signed-in team member may view
 *   docs/<userId>/<random>.<ext>    only that user, or an admin
 */

export const FILE_BUCKET = "crm-files";
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // Netlify functions accept ~6 MB bodies.

export type FileKind = "avatar" | "doc";

export const FILE_TYPES: Record<string, { ext: string; kinds: FileKind[] }> = {
  "image/jpeg": { ext: "jpg", kinds: ["avatar", "doc"] },
  "image/png": { ext: "png", kinds: ["avatar", "doc"] },
  "image/webp": { ext: "webp", kinds: ["avatar", "doc"] },
  "image/heic": { ext: "heic", kinds: ["doc"] },
  "application/pdf": { ext: "pdf", kinds: ["doc"] },
};

const PATH_RE = /^(avatars|docs)\/([0-9a-f-]{36})\/([0-9a-f]{32})\.(jpg|png|webp|heic|pdf)$/;

export function parseFilePath(p: string | null | undefined) {
  const m = (p ?? "").match(PATH_RE);
  return m ? { folder: m[1] as "avatars" | "docs", ownerId: m[2], path: m[0] } : null;
}

export const fileUrl = (path: string) => `/api/crm/file?p=${encodeURIComponent(path)}`;

/** The storage path inside one of our own file URLs, or null for anything else. */
export function pathFromUrl(url: string | null | undefined): string | null {
  if (!url?.startsWith("/api/crm/file?p=")) return null;
  const parsed = parseFilePath(decodeURIComponent(url.slice("/api/crm/file?p=".length)));
  return parsed?.path ?? null;
}

/** Content sniffing: the declared type must match the file's first bytes. */
export function looksLike(type: string, b: Uint8Array): boolean {
  const at = (i: number, ...bytes: number[]) => bytes.every((x, j) => b[i + j] === x);
  switch (type) {
    case "image/jpeg": return at(0, 0xff, 0xd8, 0xff);
    case "image/png": return at(0, 0x89, 0x50, 0x4e, 0x47);
    case "image/webp": return at(0, 0x52, 0x49, 0x46, 0x46) && at(8, 0x57, 0x45, 0x42, 0x50);
    case "image/heic": return at(4, 0x66, 0x74, 0x79, 0x70);
    case "application/pdf": return at(0, 0x25, 0x50, 0x44, 0x46);
    default: return false;
  }
}
