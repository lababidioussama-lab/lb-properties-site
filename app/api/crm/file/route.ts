import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { liveUser, sessionFromRequest } from "@/lib/crm-auth";
import { FILE_BUCKET, parseFilePath } from "@/lib/crm-files";

export const runtime = "nodejs";

/** Serve a private CRM file to a signed-in user who may see it. */
export async function GET(request: NextRequest) {
  const user = await liveUser(sessionFromRequest(request));
  if (!user) return new NextResponse("Sign in required", { status: 401 });
  const file = parseFilePath(request.nextUrl.searchParams.get("p"));
  if (!file) return new NextResponse("Not found", { status: 404 });
  if (file.folder === "docs" && user.role !== "admin" && file.ownerId !== user.id) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const db = getSupabaseAdmin();
  if (!db) return new NextResponse("Not configured", { status: 503 });
  const { data, error } = await db.storage.from(FILE_BUCKET).download(file.path);
  if (error || !data) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(data.stream(), {
    headers: {
      "Content-Type": data.type || "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": file.folder === "avatars" ? "private, max-age=86400" : "private, no-store",
      // Only sniff-checked images and PDFs are ever stored, so nothing here can run script.
      "X-Content-Type-Options": "nosniff",
    },
  });
}
