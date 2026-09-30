"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Moon, Sun } from "lucide-react";

import type { SessionUser } from "@/lib/crm-auth";
import type { CrmUser } from "@/lib/crm";
import { setCrmTheme, type CrmTheme } from "@/lib/crm-theme";
import { api } from "../shared";
import { Stars } from "../Stars";
import { DbSearch, DS_TOOLS, DS_VIEWS, type DsView } from "./DbSearch";

/**
 * DB Search on its own link (/admin/db-search), opened from the CRM in a new
 * tab, laid out like dbsearchdubai.com: its name, the tool strip, the work.
 * Same CRM sign-in, same separate DB Search code, same audit — only the
 * window is new. A lead opened from here opens in the CRM tab.
 */
export function DbSearchApp({ me, demo = false }: { me: SessionUser; demo?: boolean }) {
  if (demo && typeof window !== "undefined") (window as { __CRM_DEMO__?: boolean }).__CRM_DEMO__ = true;
  const isAdmin = me.role === "admin";
  const [view, setViewState] = useState<DsView>("ds_search");
  const [email, setEmail] = useState("");
  const [theme, setTheme] = useState<CrmTheme>("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    const fromHash = () => {
      const id = window.location.hash.slice(1) as DsView;
      if ((DS_VIEWS as string[]).includes(id)) setViewState(id === "ds_home" ? "ds_search" : id);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    void api<{ users: CrmUser[] }>("GET", "users").then((r) => setEmail(r.users?.find((u) => u.id === me.id)?.email ?? ""));
    return () => window.removeEventListener("hashchange", fromHash);
  }, [me.id]);

  const setView = useCallback((v: DsView) => {
    setViewState(v);
    if (window.location.hash !== `#${v}`) history.pushState(null, "", `#${v}`);
    window.scrollTo({ top: 0 });
  }, []);
  const flip = () => { const next = theme === "dark" ? "light" : "dark"; setCrmTheme(next); setTheme(next); };
  const openLead = (id: string) => window.open(`/admin?lead=${encodeURIComponent(id)}#pipeline`, "lababidi-crm");
  const tools = DS_TOOLS.filter((t) => isAdmin || t.id !== "ds_access");

  return (
    <div className="relative min-h-screen text-[var(--text-primary)]">
      <Stars />
      <header className="sticky top-0 z-30 border-b border-[var(--hairline)] bg-white">
        <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 md:px-8">
          <Image src={theme === "dark" ? "/logo-icon-white.png" : "/logo-icon.png"} alt="" width={24} height={24} />
          <div className="leading-none">
            <div className="text-[16px] font-semibold tracking-[-0.01em]"><span className="text-[var(--accent)]">DB</span> Search</div>
            <div className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--text-muted)]">Lababidi Properties CRM</div>
          </div>
          <div className="flex-1" />
          <a href="/admin" target="lababidi-crm" className="hidden items-center gap-1 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] sm:inline-flex">
            Open the CRM <ArrowUpRight size={14} />
          </a>
          <button onClick={flip} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="grid h-8 w-8 place-items-center rounded-md border border-[var(--hairline-strong)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]">
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
        {/* The tool strip, in DB Search's own order. */}
        <nav aria-label="DB Search tools" className="mx-auto flex max-w-[1400px] gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:px-8">
          {tools.map((t) => (
            <button key={t.id} onClick={() => setView(t.id)} aria-current={view === t.id ? "page" : undefined}
              className={`h-8 shrink-0 rounded-md px-3 text-[13px] font-medium transition ${view === t.id ? "bg-[var(--accent-solid)] text-white shadow-[0_4px_12px_var(--accent-wash)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"}`}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-[1400px] px-4 pb-16 pt-5 md:px-8">
        <DbSearch view={view} onView={setView} meEmail={email} isAdmin={isAdmin} onOpenLead={openLead} />
      </main>
    </div>
  );
}
