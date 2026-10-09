import type { Metadata } from "next";
import { isCrmConfigured, sessionFromCookies } from "@/lib/crm-auth";
import { CrmLogin } from "@/components/crm/CrmLogin";
import { DbSearchApp } from "@/components/crm/dbsearch/DbSearchApp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "DB Search — Lababidi Properties CRM", robots: { index: false, follow: false, nocache: true } };

/** DB Search on its own link. The CRM sign-in guards it; DB Search then asks for its own code. */
export default async function DbSearchPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  if (process.env.NODE_ENV !== "production" && "demo" in params) {
    return <DbSearchApp me={params.demo === "agent" ? { id: "u2", role: "agent" } : { id: "u1", role: "admin" }} demo />;
  }
  const configured = isCrmConfigured();
  const session = configured ? await sessionFromCookies() : null;
  if (!session) return <CrmLogin configured={configured} />;
  return <DbSearchApp me={session} />;
}
