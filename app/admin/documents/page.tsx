import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DOCS_COOKIE, isCrmConfigured, liveUser, readDocsSession, sessionFromCookies } from "@/lib/crm-auth";
import { CrmLogin } from "@/components/crm/CrmLogin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The Documents sign-in: the CRM's own login page, worded for the suite.
 *  An admin already signed in to the CRM needs only the password here. */
export default async function DocumentsSignIn() {
  const session = await liveUser(readDocsSession((await cookies()).get(DOCS_COOKIE)?.value));
  if (session?.role === "admin") redirect("/documents");
  const crm = await sessionFromCookies();
  return <CrmLogin configured={isCrmConfigured()} purpose="documents" crmSignedIn={crm?.role === "admin"} />;
}
