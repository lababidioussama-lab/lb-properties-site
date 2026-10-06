"use client";

import { useCallback, useEffect, useState } from "react";

import type { SessionUser } from "@/lib/crm-auth";
import type { CrmUser } from "@/lib/crm";
import { setCrmTheme, type CrmTheme } from "@/lib/crm-theme";
import { api } from "../shared";
import { Stars } from "../Stars";
import { DbSearch, DS_VIEWS, type DsView } from "./DbSearch";

/**
 * DB Search on its own link (/admin/db-search), opened from the CRM in a new
 * tab, looking as dbsearchdubai.com does. Same CRM sign-in, same separate DB
 * Search code, same audit; only the window is new. A lead opened from here,
 * and Back to CRM, go to the CRM's own tab.
 */
export function DbSearchApp({ me, demo = false }: { me: SessionUser; demo?: boolean }) {
  if (demo && typeof window !== "undefined") (window as { __CRM_DEMO__?: boolean }).__CRM_DEMO__ = true;
  const [view, setViewState] = useState<DsView>("ds_search");
  const [email, setEmail] = useState("");
  const [theme, setTheme] = useState<CrmTheme>("dark");
  /* Portfolio in the CRM hands a name over as ?q= to search straight away. */
  const [initialSearch] = useState(() => (typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("q")));

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    const fromHash = () => {
      const id = window.location.hash.slice(1) as DsView;
      if ((DS_VIEWS as string[]).includes(id)) setViewState(id === "ds_home" ? "ds_search" : id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    void api<{ users: CrmUser[] }>("GET", "users").then((r) => setEmail(r.users?.find((x) => x.id === me.id)?.email ?? ""));
    return () => window.removeEventListener("hashchange", fromHash);
  }, [me.id]);

  const setView = useCallback((v: DsView) => {
    setViewState(v);
    if (window.location.hash !== `#${v}`) history.pushState(null, "", `#${v}`);
    window.scrollTo({ top: 0 });
  }, []);
  const flip = () => { const next = theme === "dark" ? "light" : "dark"; setCrmTheme(next); setTheme(next); };
  const crm = demo ? "/admin?demo" : "/admin";

  return (
    <div className="relative min-h-[100dvh] text-[var(--text-primary)]">
      <Stars />
      <div className="crm-progress" aria-hidden="true" />
      <DbSearch
        view={view}
        onView={setView}
        meEmail={email}
        theme={theme}
        onTheme={flip}
        crmHref={crm}
        initialSearch={initialSearch}
        onOpenLead={(id) => window.open(`${crm}${demo ? "&" : "?"}lead=${encodeURIComponent(id)}#pipeline`, "lababidi-crm")}
      />
    </div>
  );
}
