import { NextResponse, type NextRequest } from "next/server";
import { LOCALES } from "@/lib/i18n/types";

/* Next 16 renamed the `middleware` file convention to `proxy`.

   This is the public website only. The CRM, DB Search and the Documents run
   on their own host (CRM_HOST, e.g. crm.lababidiproperties.com), so anyone
   who opens /admin or /documents here is sent there. */

const DEFAULT_LOCALE = "en";
const CRM_HOST = (process.env.CRM_HOST ?? "crm.lababidiproperties.com").toLowerCase();

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return NextResponse.redirect(new URL(`https://${CRM_HOST}/`));
  }
  if (pathname === "/documents" || pathname.startsWith("/documents/")) {
    return NextResponse.redirect(new URL(`https://${CRM_HOST}/documents`));
  }

  const hasLocale = LOCALES.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return NextResponse.next();

  // Honour the browser's stated preference on first landing, then hand over
  // to the explicit selector. Anything unrecognised falls back to English.
  const header = request.headers.get("accept-language") ?? "";
  const preferred = header
    .split(",")
    .map((part) => part.split(";")[0].trim().slice(0, 2).toLowerCase())
    .find((code) => (LOCALES as readonly string[]).includes(code));

  const target = new URL(request.nextUrl);
  target.pathname = `/${preferred ?? DEFAULT_LOCALE}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(target);
}

export const config = {
  /* Everything except API routes, Next internals and static files. */
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
