import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DOCS_COOKIE, isCrmConfigured, liveUser, readDocsSession } from "@/lib/crm-auth";
import { CrmLogin } from "@/components/crm/CrmLogin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The Documents sign-in: the CRM's own login page, worded for the suite. */
export default async function DocumentsSignIn() {
  const session = await liveUser(readDocsSession((await cookies()).get(DOCS_COOKIE)?.value));
  if (session?.role === "admin") redirect("/documents");
  return <CrmLogin configured={isCrmConfigured()} purpose="documents" />;
}
