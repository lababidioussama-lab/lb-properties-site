"use client";

import { useEffect, useMemo, useState } from "react";
import { quarterOf, slabOutcome, commissionOf, type CrmAgentDocument, type CrmAgentRequest, type CrmDeal, type CrmListing, type CrmUser } from "@/lib/crm";
import { api, money, INPUT, BTN, Label, Card } from "./shared";
import { MyRequests } from "./AgentRequests";
import { AgentDocuments } from "./AgentDocuments";
import { Avatar } from "./Avatar";
import { useTable } from "./useTable";

export function AgentProfileView({ me, isAdmin, deals, listings, onMeUpdate }: {
  me: CrmUser; isAdmin: boolean; deals: CrmDeal[]; listings: CrmListing[]; onMeUpdate?: (u: CrmUser) => void;
}) {
  const requests = useTable<CrmAgentRequest>("requests");
  const documents = useTable<CrmAgentDocument>("agent_documents");
  const [f, setF] = useState({
    phone: me.phone ?? "", languages: me.languages ?? "", specialties: me.specialties ?? "",
    bio: me.bio ?? "", avatar_url: me.avatar_url ?? "",
  });
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaved(false);
    const r = await api<{ user: CrmUser }>("PATCH", "users", { id: me.id, ...f });
    if (r.user) { setSaved(true); onMeUpdate?.(r.user as CrmUser); }
  }

  const thisQuarter = quarterOf(new Date());
  const stats = useMemo(() => {
    const mine = deals.filter((d) => d.agent_id === me.id && quarterOf(d.closed_at) === thisQuarter);
    return {
      deals: mine.length,
      earned: mine.reduce((s, d) => s + (commissionOf(d) * Number(d.agent_split_pct)) / 100, 0),
      revenue: mine.reduce((s, d) => s + Number(d.price_aed), 0),
    };
  }, [deals, me.id, thisQuarter]);
  const outcome = slabOutcome(stats.revenue, me.quarterly_target_aed);

  return (
    <div className="max-w-2xl space-y-5">
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <Avatar name={me.full_name} url={f.avatar_url} size="lg" />
          <div>
            <div className="text-[17px] font-medium text-[var(--text-primary)]">{me.full_name}</div>
            <div className="text-[12.5px] capitalize text-[var(--text-muted)]">{me.role}</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <label className="col-span-2"><Label>Photo link</Label><input value={f.avatar_url} onChange={(e) => setF({ ...f, avatar_url: e.target.value })} placeholder="https://…" className={INPUT} /></label>
          <label><Label>Phone</Label><input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={INPUT} /></label>
          <label><Label>Languages</Label><input value={f.languages} onChange={(e) => setF({ ...f, languages: e.target.value })} placeholder="English, Arabic" className={INPUT} /></label>
          <label className="col-span-2"><Label>Specialises in</Label><input value={f.specialties} onChange={(e) => setF({ ...f, specialties: e.target.value })} placeholder="Dubai Marina, JVC" className={INPUT} /></label>
          <label className="col-span-2"><Label>Short bio</Label><textarea rows={3} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} className={`${INPUT} resize-none`} /></label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={save} className={BTN}>Save profile</button>
          {saved && <span className="text-[12px] text-emerald-700">Saved</span>}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">This quarter · {thisQuarter}</h3>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div><div className="figure text-[24px] font-semibold text-[var(--text-primary)]">{stats.deals}</div><div className="text-[11px] text-[var(--text-muted)]">Deals</div></div>
          <div><div className="figure text-[24px] font-semibold text-[var(--text-primary)]">{money(stats.earned)}</div><div className="text-[11px] text-[var(--text-muted)]">Earned</div></div>
          <div><div className={`figure text-[24px] font-semibold ${outcome.tone}`}>{outcome.pct}%</div><div className="text-[11px] text-[var(--text-muted)]">Of target</div></div>
        </div>
        <p className={`mt-3 text-center text-[12px] ${outcome.tone}`}>{outcome.label}</p>
        {!isAdmin && <p className="mt-2 text-center text-[11px] text-[var(--text-muted)]">Slab % and quarterly target are set by an admin, under Team.</p>}
      </Card>

      <AgentDocuments t={documents} onlyUserId={me.id} />
      <MyRequests t={requests} listings={listings} onlyUserId={me.id} />
    </div>
  );
}
