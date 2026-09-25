import { NextResponse, type NextRequest } from "next/server";
import { LOCALES } from "@/lib/i18n/types";

/* Next 16 renamed the `middleware` file convention to `proxy`. */

const DEFAULT_LOCALE = "en";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  /* Everything except API routes, Next internals and static files.
     `admin` is excluded too: it is the operator's own tool, deliberately
     outside the locale tree, and redirecting it to /en/admin would land on
     a route that does not exist. */
  matcher: ["/((?!api|admin|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};
