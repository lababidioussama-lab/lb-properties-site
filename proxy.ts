import { NextResponse, type NextRequest } from "next/server";
import { LOCALES } from "@/lib/i18n/types";

/* Next 16 renamed the `middleware` file convention to `proxy`. */

const DEFAULT_LOCALE = "en";

/* The CRM's own hostname, e.g. crm.lababidiproperties.com. When set, the CRM
   is served at that host's root and /admin on the public site sends people
   there. Unset (local dev, preview URLs) keeps /admin working as before. */
const CRM_HOST = process.env.CRM_HOST?.toLowerCase();

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];

  if (CRM_HOST) {
    if (host === CRM_HOST) {
      if (pathname === "/") {
        const url = request.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.rewrite(url);
      }
      if (pathname === "/admin" || pathname.startsWith("/admin/")) return NextResponse.next();
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      return NextResponse.redirect(new URL(`https://${CRM_HOST}/`));
    }
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) return NextResponse.next();

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
