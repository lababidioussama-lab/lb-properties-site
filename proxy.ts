import { NextResponse, type NextRequest } from "next/server";

/* Next 16 renamed the `middleware` file convention to `proxy`.

   This Worker is the CRM, DB Search and the Documents only. The public website
   is a separate Worker on the main address. On the CRM's own host (CRM_HOST,
   e.g. crm.lababidiproperties.com) the sign-in page is the home page; any other
   address that reaches this Worker (the test address, for instance) gets the
   same pages at /admin and /documents. */

const CRM_HOST = process.env.CRM_HOST?.toLowerCase();

const isPrivate = (pathname: string) =>
  pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/documents" || pathname.startsWith("/documents/");

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get("host") ?? "").toLowerCase().split(":")[0];

  if (pathname === "/" || (CRM_HOST && host === CRM_HOST && !isPrivate(pathname))) {
    const url = request.nextUrl.clone();
    if (pathname === "/") {
      url.pathname = "/admin";
      return NextResponse.rewrite(url);
    }
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  /* Everything except API routes, Next internals and static files. */
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\.[\w]+$).*)"],
};
