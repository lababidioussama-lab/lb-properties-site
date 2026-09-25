import { isCrmConfigured, sessionFromCookies } from "@/lib/crm-auth";
import { CrmLogin } from "@/components/crm/CrmLogin";
import { CrmApp } from "@/components/crm/CrmApp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  // Sample-data preview, local development only. Never available on the live site.
  if (process.env.NODE_ENV !== "production" && "demo" in (await searchParams)) {
    return <CrmApp me={{ id: "u1", role: "admin" }} demo />;
  }

  const configured = isCrmConfigured();
  const session = configured ? await sessionFromCookies() : null;
  if (!session) return <CrmLogin configured={configured} />;
  return <CrmApp me={session} />;
}
