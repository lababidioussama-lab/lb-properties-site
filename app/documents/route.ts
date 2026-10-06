import { NextResponse, type NextRequest } from "next/server";
import { DOCS_COOKIE, liveUser, readDocsSession } from "@/lib/crm-auth";
import { loadSuite } from "@/lib/documents-suite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Nothing here may be cached, indexed, framed or leak its URL onward. */
const HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store, max-age=0",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
};

/**
 * /documents — the document suite, for the admin only.
 *
 * Without a Documents session this sends the visitor to /admin/documents,
 * the CRM's own sign-in page worded for the suite: admin email and password,
 * then a 6-digit code emailed as a "Documents sign-in" (a separate 4-hour
 * session from the CRM's). The browser carries any #LP-H01 across the
 * redirect, and the sign-in page returns here with it.
 */
export async function GET(request: NextRequest) {
  const session = await liveUser(readDocsSession(request.cookies.get(DOCS_COOKIE)?.value));
  if (!session || session.role !== "admin") {
    return NextResponse.redirect(new URL("/admin/documents", request.url), {
      status: 307,
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  }
  const { html } = await loadSuite();
  return new NextResponse(html, { status: 200, headers: HEADERS });
}
