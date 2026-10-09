"use client";

import { useState } from "react";
import { Lock } from "lucide-react";

import { BTN_GHOST, BTN_GO, Card } from "../shared";
import { DsAccess } from "./DsAccess";

export type DsCrmView = "ds_access";
export const DS_CRM_VIEWS: DsCrmView[] = ["ds_access"];

/**
 * The one DB Search screen that lives in the CRM: DB Search access, under
 * Team & rules. It reads DB Search data, so it uses the DB Search sign-in;
 * without it, it says so and links to DB Search. Every other tool is on
 * DB Search's own page.
 */
export function DsInCrm({ dbSearchHref }: { view: DsCrmView; dbSearchHref: string; onOpenLead: (id: string) => void }) {
  const [signedOut, setSignedOut] = useState(false);

  if (signedOut) {
    return (
      <Card className="flex flex-col items-start gap-3 p-6">
        <p className="flex items-center gap-2 text-[15px] font-bold"><Lock size={16} className="text-[var(--emerald)]" /> Sign in to DB Search first</p>
        <p className="max-w-[60ch] text-[13.5px] text-[var(--text-muted)]">This screen uses your DB Search sign-in. Open DB Search, sign in, then come back and try again.</p>
        <div className="flex gap-2">
          <a href={dbSearchHref} target="lababidi-db-search" className={BTN_GO}>Open DB Search</a>
          <button onClick={() => setSignedOut(false)} className={BTN_GHOST}>Try again</button>
        </div>
      </Card>
    );
  }
  return <DsAccess onExpired={() => setSignedOut(true)} />;
}
